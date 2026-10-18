BEGIN;
-- AlterTable
ALTER TABLE "program_purchases" ADD COLUMN     "care_authorization_id" UUID,
ADD COLUMN     "custom_request_id" UUID;

-- CreateTable
CREATE TABLE "custom_program_plan_versions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "treatment_plan_id" UUID NOT NULL,
    "care_authorization_id" UUID NOT NULL,
    "source_intake_revision_id" UUID NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" UUID NOT NULL,
    "created_session_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_at" TIMESTAMPTZ(3),
    "issued_by_user_id" UUID,
    "issued_session_id" UUID,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by_user_id" UUID,
    "revoked_session_id" UUID,
    "revocation_reason" VARCHAR(32),

    CONSTRAINT "custom_program_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_plan_native_key" ON "custom_program_plan_versions"("treatment_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_plan_request_version_key" ON "custom_program_plan_versions"("request_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_plan_command_key" ON "custom_program_plan_versions"("request_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_plan_native_clinic_key" ON "custom_program_plan_versions"("treatment_plan_id", "clinic_id");

-- CreateIndex
CREATE INDEX "program_purchases_custom_request_created_idx" ON "program_purchases"("custom_request_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_custom_request_id_clinic_id_fkey" FOREIGN KEY ("custom_request_id", "clinic_id") REFERENCES "custom_program_requests"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_care_authorization_id_fkey" FOREIGN KEY ("care_authorization_id") REFERENCES "custom_program_care_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_request_id_clinic_id_fkey" FOREIGN KEY ("request_id", "clinic_id") REFERENCES "custom_program_requests"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_treatment_plan_id_clinic_id_fkey" FOREIGN KEY ("treatment_plan_id", "clinic_id") REFERENCES "treatment_plans"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_care_authorization_id_fkey" FOREIGN KEY ("care_authorization_id") REFERENCES "custom_program_care_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_source_intake_revision_id_fkey" FOREIGN KEY ("source_intake_revision_id") REFERENCES "patient_medical_intake_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_created_session_id_fkey" FOREIGN KEY ("created_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_issued_session_id_fkey" FOREIGN KEY ("issued_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_plan_versions" ADD CONSTRAINT "custom_program_plan_versions_revoked_session_id_fkey" FOREIGN KEY ("revoked_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Financial right and current care are independent. A paid receipt survives privacy withdrawal.
CREATE FUNCTION custom_program_request_paid(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_purchases p JOIN billing_intents i ON i.program_purchase_id=p.id JOIN program_access_grants g ON g.purchase_id=p.id
 JOIN custom_program_requests r ON r.id=p.custom_request_id AND r.clinic_id=p.clinic_id AND r.patient_id=p.patient_id
 WHERE r.id=target AND i.purpose='PROGRAM' AND i.status='PAID' AND g.patient_id=r.patient_id AND g.clinic_id=r.clinic_id);
$$;
CREATE FUNCTION custom_program_request_live_purchase(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_purchases p JOIN billing_intents i ON i.program_purchase_id=p.id WHERE p.custom_request_id=target AND ((i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP) OR (i.status='PAID' AND EXISTS(SELECT 1 FROM program_access_grants g WHERE g.purchase_id=p.id))));
$$;
CREATE FUNCTION custom_program_clinician_current(target uuid,actor uuid,actor_session uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM custom_program_requests r JOIN doctor_profiles d ON d.id=r.doctor_id AND d.clinic_id=r.clinic_id JOIN sessions s ON s.user_id=d.user_id
 WHERE r.id=target AND d.user_id=actor AND s.id=actor_session AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND guidance_doctor_id(actor,r.clinic_id)=d.id
 AND custom_program_request_paid(r.id) AND EXISTS(SELECT 1 FROM custom_program_care_authorizations a WHERE a.request_id=r.id AND custom_program_care_current(a.id))
 AND EXISTS(SELECT 1 FROM doctor_specialties ds JOIN specialties specialty ON specialty.id=ds.specialty_id AND specialty.clinic_id=ds.clinic_id WHERE ds.doctor_id=d.id AND ds.clinic_id=d.clinic_id AND specialty.is_active AND specialty.publication_status='PUBLISHED' AND specialty.published_at IS NOT NULL)
 AND (SELECT count(DISTINCT permission.permission) FROM user_roles ur JOIN roles role ON role.id=ur.role_id JOIN clinical_role_permissions permission ON permission.role_id=role.id WHERE ur.user_id=actor AND role.code='DOCTOR' AND permission.permission IN('CLINICAL_RECORD_VIEW','CLINICAL_RECORD_EDIT'))=2);
$$;
CREATE FUNCTION custom_program_lock_clinician(target uuid,actor uuid,actor_session uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE request custom_program_requests;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||target::text,0));
 SELECT * INTO request FROM custom_program_requests WHERE id=target;
 IF request.id IS NULL OR NOT custom_program_clinician_current(target,actor,actor_session) THEN RETURN false; END IF;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=actor_session AND s.user_id=actor AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u;
 IF NOT FOUND OR guidance_lock_doctor(actor,request.clinic_id) IS DISTINCT FROM request.doctor_id OR NOT custom_program_lock_source(request.publication_id,false) THEN RETURN false; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles role ON role.id=ur.role_id WHERE p.id=request.patient_id AND p.clinic_id=request.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND role.code='PATIENT' FOR SHARE OF p,u,c,ur,role;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM specialty.id FROM doctor_specialties ds JOIN specialties specialty ON specialty.id=ds.specialty_id AND specialty.clinic_id=ds.clinic_id WHERE ds.doctor_id=request.doctor_id AND ds.clinic_id=request.clinic_id AND specialty.is_active AND specialty.publication_status='PUBLISHED' AND specialty.published_at IS NOT NULL FOR SHARE OF ds,specialty;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM permission.role_id FROM user_roles ur JOIN roles role ON role.id=ur.role_id JOIN clinical_role_permissions permission ON permission.role_id=role.id WHERE ur.user_id=actor AND role.code='DOCTOR' AND permission.permission IN('CLINICAL_RECORD_VIEW','CLINICAL_RECORD_EDIT') FOR SHARE OF ur,role,permission;
 PERFORM a.id FROM custom_program_care_authorizations a JOIN patient_consent_records consent ON consent.id=a.care_consent_record_id JOIN consent_policy_versions policy ON policy.id=consent.policy_version_id WHERE a.request_id=target AND a.withdrawn_at IS NULL AND custom_program_care_current(a.id) FOR SHARE OF a,consent,policy;
 RETURN custom_program_clinician_current(target,actor,actor_session);
END $$;
CREATE FUNCTION custom_program_intake_current(target uuid,source_revision uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM custom_program_requests request JOIN patient_medical_intakes intake ON intake.patient_id=request.patient_id AND intake.clinic_id=request.clinic_id
 JOIN patient_medical_intake_revisions revision ON revision.intake_id=intake.id AND revision.reported_patient_id=request.patient_id JOIN patient_consent_records consent ON consent.id=revision.completed_consent_record_id AND consent.patient_id=request.patient_id
 JOIN consent_policy_versions policy ON policy.id=consent.policy_version_id AND policy.clinic_id=request.clinic_id
 WHERE request.id=target AND revision.id=source_revision AND intake.submission_state='COMPLETE' AND intake.current_revision_number=intake.completed_revision_number AND revision.revision_number=intake.completed_revision_number AND revision.revision_state='COMPLETE'
 AND revision.completed_at IS NOT NULL AND consent.withdrawn_at IS NULL AND policy.policy_key='MEDICAL_INTAKE_PROCESSING' AND consent.content_hash=policy.content_hash);
$$;
-- Hash the actual native advice, never a second mutable clinical payload. Operational tasks are separate.
CREATE FUNCTION custom_program_native_hash(target uuid) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object('schemaVersion',1,'id',p.id,'clinicId',p.clinic_id,'patientId',p.patient_id,'title',p.title,
 'medications',COALESCE((SELECT jsonb_agg(to_jsonb(m)-ARRAY['created_at','updated_at'] ORDER BY m.id) FROM treatment_medications m WHERE m.treatment_plan_id=p.id),'[]'::jsonb),
 'sessions',COALESCE((SELECT jsonb_agg(to_jsonb(s)-ARRAY['created_at','updated_at'] ORDER BY s.position,s.id) FROM treatment_session_plans s WHERE s.treatment_plan_id=p.id),'[]'::jsonb),
 'exercises',COALESCE((SELECT jsonb_agg(to_jsonb(e)-ARRAY['created_at','updated_at'] ORDER BY e.id) FROM exercise_plans e WHERE e.treatment_plan_id=p.id),'[]'::jsonb),
 'nutrition',COALESCE((SELECT jsonb_agg(to_jsonb(n)-ARRAY['created_at','updated_at'] ORDER BY n.id) FROM nutrition_plans n WHERE n.treatment_plan_id=p.id),'[]'::jsonb))::text,'UTF8')),'hex') FROM treatment_plans p WHERE p.id=target;
$$;
CREATE FUNCTION custom_program_native_effective(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM custom_program_plan_versions v JOIN treatment_plans p ON p.id=v.treatment_plan_id AND p.clinic_id=v.clinic_id AND p.patient_id=v.patient_id
 WHERE v.treatment_plan_id=target AND v.status='ISSUED' AND v.issued_at IS NOT NULL AND v.revoked_at IS NULL AND p.state IN('ACTIVE','COMPLETED') AND custom_program_request_paid(v.request_id)
 AND NOT EXISTS(SELECT 1 FROM custom_program_plan_versions newer WHERE newer.request_id=v.request_id AND newer.version_number>v.version_number AND newer.issued_at IS NOT NULL));
$$;
CREATE FUNCTION custom_program_native_patient_allowed(target uuid,actor uuid,actor_session uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE version custom_program_plan_versions;
BEGIN
 SELECT * INTO version FROM custom_program_plan_versions WHERE treatment_plan_id=target;
 IF version.id IS NULL THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||version.request_id::text,0));
 RETURN custom_program_patient_session(version.patient_id,version.clinic_id,actor,actor_session) AND custom_program_native_effective(target);
END $$;
CREATE FUNCTION custom_program_purchase_lock(target uuid,care_id uuid,publication_id uuid,patient uuid,scope uuid,quoted boolean) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE request custom_program_requests;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||target::text,0));
 SELECT * INTO request FROM custom_program_requests WHERE id=target AND patient_id=patient AND clinic_id=scope AND custom_program_requests.publication_id=custom_program_purchase_lock.publication_id FOR SHARE;
 IF request.id IS NULL OR NOT custom_program_lock_source(request.publication_id,NOT quoted) THEN RETURN false; END IF;
 PERFORM a.id FROM custom_program_care_authorizations a JOIN patient_consent_records c ON c.id=a.care_consent_record_id JOIN consent_policy_versions p ON p.id=c.policy_version_id WHERE a.id=care_id AND a.request_id=request.id AND a.patient_id=patient AND a.clinic_id=scope FOR SHARE OF a,c,p;
 IF NOT FOUND OR NOT custom_program_care_current(care_id) THEN RETURN false; END IF;
 RETURN CASE WHEN quoted THEN program_publication_quoted(request.publication_id) ELSE program_publication_current(request.publication_id) END;
END $$;

CREATE OR REPLACE FUNCTION program_publication_quoted(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_offering_publications pub JOIN program_definition_versions d ON d.id=pub.program_definition_id AND d.clinic_id=pub.clinic_id
 JOIN consent_policy_versions t ON t.id=pub.terms_policy_version_id AND t.clinic_id=pub.clinic_id
 WHERE pub.id=target AND (pub.status='ACTIVE' OR (pub.status='RETIRED' AND pub.retirement_reason='REPLACED'))
 AND (d.kind='READY_EDUCATION' OR (d.kind='CUSTOM_PROFESSIONAL_PLAN' AND pub.access_mode='ONE_DELIVERY')) AND d.content_hash=pub.definition_content_hash AND program_definition_usable(d.id)
 AND ((d.kind='READY_EDUCATION' AND pub.access_mode IN('DAYS','PERPETUAL')) OR (d.kind='CUSTOM_PROFESSIONAL_PLAN' AND pub.access_mode='ONE_DELIVERY')) AND t.policy_key='PROGRAM_PURCHASE_TERMS' AND t.locale=pub.locale AND t.status='ACTIVE' AND t.activated_at IS NOT NULL AND t.content_hash=pub.terms_content_hash);
$$;

CREATE OR REPLACE FUNCTION program_has_live_purchase(target_patient uuid,definition_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_purchases p JOIN billing_intents i ON i.program_purchase_id=p.id
 LEFT JOIN program_access_grants g ON g.purchase_id=p.id
 WHERE p.custom_request_id IS NULL AND p.patient_id=target_patient AND p.program_definition_id=definition_id AND (
 (i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP) OR (i.status='PAID' AND g.id IS NOT NULL AND (g.ends_at IS NULL OR g.ends_at>CURRENT_TIMESTAMP))));
$$;

CREATE OR REPLACE FUNCTION program_grant_readable(grant_id uuid,target_patient uuid,as_of timestamptz DEFAULT CURRENT_TIMESTAMP) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_access_grants g JOIN program_purchases p ON p.id=g.purchase_id AND p.patient_id=g.patient_id AND p.clinic_id=g.clinic_id
 JOIN billing_intents i ON i.program_purchase_id=p.id AND i.patient_id=p.patient_id AND i.clinic_id=p.clinic_id
 JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics c ON c.id=g.clinic_id
 WHERE p.custom_request_id IS NULL AND g.id=grant_id AND g.patient_id=target_patient AND i.purpose='PROGRAM' AND i.status='PAID' AND (g.ends_at IS NULL OR g.ends_at>as_of)
 AND u.status='ACTIVE' AND c.status='ACTIVE' AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT')
 AND program_definition_usable(p.program_definition_id));
$$;


ALTER TABLE program_purchases DROP CONSTRAINT program_purchase_shape;
ALTER TABLE program_purchases ADD CONSTRAINT program_purchase_shape CHECK(COALESCE(
 amount_rial BETWEEN 0 AND 9000000000000000000 AND currency='IRR' AND publication_hash ~ '^[a-f0-9]{64}$'
 AND jsonb_typeof(snapshot)='object' AND octet_length(snapshot::text)<=8192
 AND snapshot->>'purchaseId'=id::text AND snapshot->>'publicationId'=publication_id::text AND snapshot->>'publicationHash'=publication_hash
 AND snapshot->>'programDefinitionId'=program_definition_id::text AND snapshot->>'termsConsentRecordId'=terms_consent_record_id::text
 AND snapshot->>'amountRial'=amount_rial::text AND snapshot->>'currency'=currency
 AND ((snapshot->'schemaVersion'='1'::jsonb AND custom_request_id IS NULL AND care_authorization_id IS NULL)
 OR (snapshot->'schemaVersion'='2'::jsonb AND custom_request_id IS NOT NULL AND care_authorization_id IS NOT NULL AND snapshot->>'customRequestId'=custom_request_id::text AND snapshot->>'careAuthorizationId'=care_authorization_id::text)),false));


CREATE OR REPLACE FUNCTION program_purchase_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pub program_offering_publications; definition program_definition_versions;
BEGIN

 IF NEW.custom_request_id IS NOT NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('program-purchase:'||NEW.patient_id::text||':'||NEW.program_definition_id::text,0));
  IF NOT custom_program_purchase_lock(NEW.custom_request_id,NEW.care_authorization_id,NEW.publication_id,NEW.patient_id,NEW.clinic_id,false) OR custom_program_request_live_purchase(NEW.custom_request_id) THEN RAISE EXCEPTION 'Current exact custom request/care and unused commercial right required'; END IF;
  SELECT * INTO pub FROM program_offering_publications WHERE id=NEW.publication_id;
  SELECT * INTO definition FROM program_definition_versions WHERE id=pub.program_definition_id;
  IF definition.id<>NEW.program_definition_id OR definition.content_hash IS DISTINCT FROM NEW.snapshot->>'definitionContentHash' OR definition.title IS DISTINCT FROM NEW.snapshot->>'title' OR pub.publication_hash<>NEW.publication_hash OR pub.amount_rial<>NEW.amount_rial OR pub.currency<>NEW.currency OR pub.access_mode<>'ONE_DELIVERY' OR NEW.snapshot->>'accessMode'<>'ONE_DELIVERY' OR NEW.snapshot->'accessDurationDays' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Exact immutable custom purchase snapshot required'; END IF;
  PERFORM id FROM patient_consent_records WHERE id=NEW.terms_consent_record_id AND patient_id=NEW.patient_id AND policy_version_id=pub.terms_policy_version_id AND content_hash=pub.terms_content_hash AND withdrawn_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exact owned custom commercial terms required'; END IF;
  RETURN NEW;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-purchase:'||NEW.patient_id::text||':'||NEW.program_definition_id::text,0));
 SELECT * INTO pub FROM program_offering_publications WHERE id=NEW.publication_id AND clinic_id=NEW.clinic_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Same-clinic program tariff required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||NEW.clinic_id::text||':'||pub.program_key||':'||pub.locale,0));
 IF NOT program_publication_lock_definition(NEW.program_definition_id) THEN RAISE EXCEPTION 'Current approved program source required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id=pub.terms_policy_version_id FOR SHARE;
 IF NOT program_publication_current(pub.id) OR NOT program_publication_quoted(pub.id) THEN RAISE EXCEPTION 'Current ready educational publication required'; END IF;
 SELECT * INTO definition FROM program_definition_versions WHERE id=NEW.program_definition_id AND clinic_id=NEW.clinic_id;
 IF definition.id IS NULL OR definition.id<>pub.program_definition_id OR pub.publication_hash<>NEW.publication_hash OR pub.amount_rial<>NEW.amount_rial OR pub.currency<>NEW.currency
 OR NEW.snapshot->>'definitionContentHash' IS DISTINCT FROM definition.content_hash OR NEW.snapshot->>'title' IS DISTINCT FROM definition.title OR NEW.snapshot->>'accessMode' IS DISTINCT FROM pub.access_mode
 OR NEW.snapshot->'accessDurationDays' IS DISTINCT FROM COALESCE(to_jsonb(pub.access_duration_days),'null'::jsonb) THEN RAISE EXCEPTION 'Exact immutable program purchase snapshot required'; END IF;
 PERFORM id FROM patient_consent_records WHERE id=NEW.terms_consent_record_id AND patient_id=NEW.patient_id AND policy_version_id=pub.terms_policy_version_id AND content_hash=pub.terms_content_hash AND withdrawn_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exact owned program terms acceptance required'; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active independent patient required'; END IF;
 IF program_has_live_purchase(NEW.patient_id,NEW.program_definition_id) THEN RAISE EXCEPTION 'Existing pending purchase or owned unexpired program access'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION program_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase program_purchases; pub program_offering_publications;
BEGIN

 IF EXISTS(SELECT 1 FROM program_purchases WHERE id=NEW.purchase_id AND custom_request_id IS NOT NULL) THEN
  SELECT * INTO purchase FROM program_purchases WHERE id=NEW.purchase_id;
  IF purchase.patient_id<>NEW.patient_id OR purchase.clinic_id<>NEW.clinic_id OR NOT custom_program_purchase_lock(purchase.custom_request_id,purchase.care_authorization_id,purchase.publication_id,purchase.patient_id,purchase.clinic_id,true) OR EXISTS(SELECT 1 FROM program_purchases p JOIN program_access_grants g ON g.purchase_id=p.id WHERE p.custom_request_id=purchase.custom_request_id) THEN RAISE EXCEPTION 'Current unused owned custom payment right required'; END IF;
  IF NEW.ends_at IS NOT NULL OR abs(extract(epoch FROM (NEW.granted_at-CURRENT_TIMESTAMP)))>1 OR NOT EXISTS(SELECT 1 FROM billing_intents WHERE program_purchase_id=purchase.id AND expires_at>CURRENT_TIMESTAMP) THEN RAISE EXCEPTION 'Exact unexpired custom grant/DB clock required'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO purchase FROM program_purchases WHERE id=NEW.purchase_id;
 IF purchase.id IS NULL OR purchase.patient_id<>NEW.patient_id OR purchase.clinic_id<>NEW.clinic_id THEN RAISE EXCEPTION 'Exact owned program beneficiary required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-purchase:'||NEW.patient_id::text||':'||purchase.program_definition_id::text,0));
 SELECT * INTO pub FROM program_offering_publications WHERE id=purchase.publication_id;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||purchase.clinic_id::text||':'||pub.program_key||':'||pub.locale,0));
 IF NOT program_publication_lock_definition(purchase.program_definition_id) THEN RAISE EXCEPTION 'Current exact program clinical source required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id=pub.terms_policy_version_id FOR SHARE;
 IF NOT program_publication_quoted(pub.id) OR NOT EXISTS(SELECT 1 FROM billing_intents WHERE program_purchase_id=purchase.id AND expires_at>CURRENT_TIMESTAMP) THEN RAISE EXCEPTION 'Current exact unexpired program quote required'; END IF;
 IF abs(extract(epoch FROM (NEW.granted_at-CURRENT_TIMESTAMP)))>1 OR NEW.ends_at IS DISTINCT FROM (CASE WHEN pub.access_mode='DAYS' THEN NEW.granted_at+pub.access_duration_days*INTERVAL '24 hours' ELSE NULL END) THEN RAISE EXCEPTION 'Exact database program access period required'; END IF;
 IF EXISTS(SELECT 1 FROM program_access_grants g JOIN program_purchases p ON p.id=g.purchase_id WHERE g.patient_id=NEW.patient_id AND p.program_definition_id=purchase.program_definition_id AND (g.ends_at IS NULL OR g.ends_at>CURRENT_TIMESTAMP)) THEN RAISE EXCEPTION 'Existing unexpired program grant'; END IF;
 RETURN NEW;
END $$;

ALTER TABLE custom_program_plan_versions ADD CONSTRAINT custom_program_plan_shape CHECK(COALESCE(
 version_number>0 AND content_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{1,200}$'
 AND ((issued_at IS NULL AND issued_by_user_id IS NULL AND issued_session_id IS NULL) OR (issued_at IS NOT NULL AND issued_at>=created_at AND issued_by_user_id IS NOT NULL AND issued_session_id IS NOT NULL))
 AND ((status='DRAFT' AND issued_at IS NULL AND revoked_at IS NULL AND revoked_by_user_id IS NULL AND revoked_session_id IS NULL AND revocation_reason IS NULL)
 OR (status='ISSUED' AND issued_at IS NOT NULL AND revoked_at IS NULL AND revoked_by_user_id IS NULL AND revoked_session_id IS NULL AND revocation_reason IS NULL)
 OR (status='REVOKED' AND revoked_at IS NOT NULL AND revoked_at>=GREATEST(created_at,issued_at) AND revoked_by_user_id IS NOT NULL AND revoked_session_id IS NOT NULL AND revocation_reason IN('SAFETY_REVIEW','CORRECTION','OTHER'))),false));
CREATE FUNCTION custom_program_plan_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request custom_program_requests; native treatment_plans; actor uuid; actor_session uuid; current_version integer;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Custom native clinical version is retained evidence'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||NEW.request_id::text,0));
 SELECT * INTO request FROM custom_program_requests WHERE id=NEW.request_id;
 SELECT * INTO native FROM treatment_plans WHERE id=NEW.treatment_plan_id FOR UPDATE;
 IF request.id IS NULL OR request.patient_id<>NEW.patient_id OR request.clinic_id<>NEW.clinic_id OR native.id IS NULL OR native.patient_id<>NEW.patient_id OR native.clinic_id<>NEW.clinic_id OR NEW.content_hash IS DISTINCT FROM custom_program_native_hash(native.id) THEN RAISE EXCEPTION 'Exact owned native clinical content required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'DRAFT' OR native.state<>'DRAFT' OR NOT EXISTS(SELECT 1 FROM treatment_plans p WHERE p.id=native.id AND p.xmin::text::bigint=mod(txid_current(),4294967296)) OR EXISTS(SELECT 1 FROM treatment_tasks WHERE treatment_plan_id=native.id) THEN RAISE EXCEPTION 'New native draft in the exact custom preparation transaction required'; END IF;
  SELECT COALESCE(max(version_number),0) INTO current_version FROM custom_program_plan_versions WHERE request_id=NEW.request_id;
  IF NEW.version_number<>current_version+1 OR abs(extract(epoch FROM (NEW.created_at-GREATEST(CURRENT_TIMESTAMP,request.created_at))))>1 THEN RAISE EXCEPTION 'Consecutive custom clinical version and database time required'; END IF;
  actor:=NEW.created_by_user_id; actor_session:=NEW.created_session_id;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['status','issued_at','issued_by_user_id','issued_session_id','revoked_at','revoked_by_user_id','revoked_session_id','revocation_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','issued_at','issued_by_user_id','issued_session_id','revoked_at','revoked_by_user_id','revoked_session_id','revocation_reason']) THEN RAISE EXCEPTION 'Custom clinical source/author/content binding is immutable'; END IF;
  IF OLD.status='DRAFT' AND NEW.status='ISSUED' THEN
   IF NEW.version_number<>(SELECT max(version_number) FROM custom_program_plan_versions WHERE request_id=NEW.request_id) OR native.state<>'DRAFT' OR abs(extract(epoch FROM (NEW.issued_at-GREATEST(CURRENT_TIMESTAMP,NEW.created_at))))>1 THEN RAISE EXCEPTION 'Only exact latest reviewed custom draft may issue'; END IF;
   actor:=NEW.issued_by_user_id; actor_session:=NEW.issued_session_id;
  ELSIF OLD.status IN('DRAFT','ISSUED') AND NEW.status='REVOKED' THEN
   IF ROW(NEW.issued_at,NEW.issued_by_user_id,NEW.issued_session_id) IS DISTINCT FROM ROW(OLD.issued_at,OLD.issued_by_user_id,OLD.issued_session_id) OR abs(extract(epoch FROM (NEW.revoked_at-GREATEST(CURRENT_TIMESTAMP,NEW.created_at,NEW.issued_at))))>1 THEN RAISE EXCEPTION 'Final exact custom clinical revocation required'; END IF;
   actor:=NEW.revoked_by_user_id; actor_session:=NEW.revoked_session_id;
  ELSE RAISE EXCEPTION 'Custom clinical version cannot be edited, reset or reissued'; END IF;
 END IF;
 IF NOT custom_program_lock_clinician(NEW.request_id,actor,actor_session) THEN RAISE EXCEPTION 'Current assigned qualified paid care physician required'; END IF;
 IF NEW.status<>'REVOKED' THEN
  PERFORM a.id FROM custom_program_care_authorizations a WHERE a.id=NEW.care_authorization_id AND a.request_id=NEW.request_id AND custom_program_care_current(a.id) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exact current pinned custom care authorization required'; END IF;
  PERFORM revision.id FROM patient_medical_intake_revisions revision JOIN patient_medical_intakes intake ON intake.id=revision.intake_id JOIN patient_consent_records consent ON consent.id=revision.completed_consent_record_id WHERE revision.id=NEW.source_intake_revision_id FOR SHARE OF revision,intake,consent;
  IF NOT custom_program_intake_current(NEW.request_id,NEW.source_intake_revision_id) THEN RAISE EXCEPTION 'Exact current completed self-reported intake and processing consent required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER custom_program_plan_guard BEFORE INSERT OR UPDATE OR DELETE ON custom_program_plan_versions FOR EACH ROW EXECUTE FUNCTION custom_program_plan_guard();
CREATE FUNCTION custom_program_native_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version custom_program_plan_versions; target uuid; old_target uuid;
BEGIN
 IF TG_TABLE_NAME='treatment_plans' THEN
  IF TG_OP='DELETE' THEN target:=OLD.id; ELSE target:=NEW.id; END IF;
 ELSE
  IF TG_OP='DELETE' THEN target:=OLD.treatment_plan_id; ELSE target:=NEW.treatment_plan_id; END IF;
  IF TG_OP='UPDATE' THEN old_target:=OLD.treatment_plan_id; END IF;
 END IF;
 SELECT * INTO version FROM custom_program_plan_versions WHERE treatment_plan_id=target OR treatment_plan_id=old_target LIMIT 1;
 IF version.id IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||version.request_id::text,0));
 IF TG_TABLE_NAME<>'treatment_plans' OR TG_OP<>'UPDATE' OR (to_jsonb(NEW)-ARRAY['state','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','updated_at']) THEN RAISE EXCEPTION 'Bound custom native clinical advice is immutable; create a new reviewed version'; END IF;
 IF OLD.state='DRAFT' AND NEW.state='ACTIVE' AND version.status='ISSUED' OR OLD.state='ACTIVE' AND NEW.state='COMPLETED' AND custom_program_native_effective(NEW.id) THEN RETURN NEW; END IF;
 IF NEW.state='VOIDED' AND (version.status='REVOKED' OR EXISTS(SELECT 1 FROM custom_program_plan_versions newer WHERE newer.request_id=version.request_id AND newer.version_number>version.version_number AND newer.status='ISSUED')) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Only exact issued/revoked/superseded custom native state transition allowed';
END $$;
CREATE TRIGGER custom_program_native_guard BEFORE UPDATE OR DELETE ON treatment_plans FOR EACH ROW EXECUTE FUNCTION custom_program_native_guard();
CREATE TRIGGER custom_program_medication_guard BEFORE INSERT OR UPDATE OR DELETE ON treatment_medications FOR EACH ROW EXECUTE FUNCTION custom_program_native_guard();
CREATE TRIGGER custom_program_session_guard BEFORE INSERT OR UPDATE OR DELETE ON treatment_session_plans FOR EACH ROW EXECUTE FUNCTION custom_program_native_guard();
CREATE TRIGGER custom_program_exercise_guard BEFORE INSERT OR UPDATE OR DELETE ON exercise_plans FOR EACH ROW EXECUTE FUNCTION custom_program_native_guard();
CREATE TRIGGER custom_program_nutrition_guard BEFORE INSERT OR UPDATE OR DELETE ON nutrition_plans FOR EACH ROW EXECUTE FUNCTION custom_program_native_guard();

CREATE FUNCTION custom_program_plan_final_proof(target uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE version custom_program_plan_versions; native treatment_plans;
BEGIN
 SELECT * INTO version FROM custom_program_plan_versions WHERE id=target;
 IF version.id IS NULL THEN RETURN; END IF;
 SELECT * INTO native FROM treatment_plans WHERE id=version.treatment_plan_id;
 IF version.content_hash IS DISTINCT FROM custom_program_native_hash(native.id) OR version.status='DRAFT' AND native.state<>'DRAFT'
 OR version.status='REVOKED' AND native.state<>'VOIDED'
 OR version.status='ISSUED' AND ((EXISTS(SELECT 1 FROM custom_program_plan_versions n WHERE n.request_id=version.request_id AND n.version_number>version.version_number AND n.issued_at IS NOT NULL) AND native.state<>'VOIDED') OR (NOT EXISTS(SELECT 1 FROM custom_program_plan_versions n WHERE n.request_id=version.request_id AND n.version_number>version.version_number AND n.issued_at IS NOT NULL) AND native.state NOT IN('ACTIVE','COMPLETED'))) THEN RAISE EXCEPTION 'Exact custom reviewed version/native final state proof required'; END IF;
END $$;
CREATE FUNCTION custom_program_plan_deferred_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version_id uuid; request_id uuid; row_version custom_program_plan_versions; actor uuid; actor_session uuid;
BEGIN
 IF TG_TABLE_NAME='custom_program_plan_versions' THEN
  version_id:=NEW.id; request_id:=NEW.request_id;
  IF TG_OP='INSERT' THEN actor:=NEW.created_by_user_id; actor_session:=NEW.created_session_id;
  ELSIF NEW.status='ISSUED' THEN actor:=NEW.issued_by_user_id; actor_session:=NEW.issued_session_id;
  ELSE actor:=NEW.revoked_by_user_id; actor_session:=NEW.revoked_session_id; END IF;
  IF NOT EXISTS(SELECT 1 FROM patient_access_audits a WHERE a.resource_id=version_id AND a.patient_id=NEW.patient_id AND a.clinic_id=NEW.clinic_id AND a.actor_user_id=actor AND a.actor_session_id=actor_session AND a.resource_type IN('CUSTOM_PROGRAM_PLAN_CREATE','CUSTOM_PROGRAM_PLAN_ISSUE','CUSTOM_PROGRAM_PLAN_REVOKE') AND a.xmin::text::bigint=mod(txid_current(),4294967296)) THEN RAISE EXCEPTION 'Atomic exact custom clinical actor audit required'; END IF;
 ELSE
  SELECT v.id,v.request_id INTO version_id,request_id FROM custom_program_plan_versions v WHERE v.treatment_plan_id=NEW.id;
  IF version_id IS NOT NULL AND OLD.state='ACTIVE' AND NEW.state='COMPLETED' AND NOT EXISTS(SELECT 1 FROM patient_access_audits a WHERE a.resource_id=NEW.id AND a.resource_type='TREATMENT_PLAN' AND a.action='UPDATE' AND a.xmin::text::bigint=mod(txid_current(),4294967296) AND custom_program_clinician_current(custom_program_plan_deferred_proof.request_id,a.actor_user_id,a.actor_session_id)) THEN RAISE EXCEPTION 'Atomic assigned physician custom plan completion audit required'; END IF;
 END IF;
 IF version_id IS NOT NULL THEN
  FOR row_version IN SELECT v.* FROM custom_program_plan_versions v WHERE v.request_id=custom_program_plan_deferred_proof.request_id LOOP PERFORM custom_program_plan_final_proof(row_version.id); END LOOP;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER custom_program_plan_deferred_proof AFTER INSERT OR UPDATE ON custom_program_plan_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION custom_program_plan_deferred_proof();
CREATE CONSTRAINT TRIGGER custom_program_native_deferred_proof AFTER UPDATE ON treatment_plans DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION custom_program_plan_deferred_proof();

CREATE FUNCTION custom_program_activity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; old_target uuid; version custom_program_plan_versions;
BEGIN
 IF TG_TABLE_NAME='medication_adherence_logs' THEN
  IF TG_OP='DELETE' THEN SELECT treatment_plan_id INTO target FROM treatment_medications WHERE id=OLD.treatment_medication_id;
  ELSE SELECT treatment_plan_id INTO target FROM treatment_medications WHERE id=NEW.treatment_medication_id; END IF;
  IF TG_OP='UPDATE' THEN SELECT treatment_plan_id INTO old_target FROM treatment_medications WHERE id=OLD.treatment_medication_id; END IF;
 ELSE
  IF TG_OP='DELETE' THEN target:=OLD.treatment_plan_id; ELSE target:=NEW.treatment_plan_id; END IF;
  IF TG_OP='UPDATE' THEN old_target:=OLD.treatment_plan_id; END IF;
 END IF;
 SELECT * INTO version FROM custom_program_plan_versions WHERE treatment_plan_id=target OR treatment_plan_id=old_target LIMIT 1;
 IF version.id IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||version.request_id::text,0));
 IF TG_OP='DELETE' OR TG_TABLE_NAME<>'treatment_tasks' AND TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Bound custom activity history is retained immutable evidence'; END IF;
 IF TG_TABLE_NAME='treatment_tasks' THEN
  IF TG_OP='INSERT' THEN
   IF NOT custom_program_native_effective(target) OR NEW.state<>'SCHEDULED' OR NEW.completed_at IS NOT NULL OR NEW.scheduled_for<=CURRENT_TIMESTAMP THEN RAISE EXCEPTION 'Current issued custom plan/future scheduled task required'; END IF;
  ELSE
   IF OLD.state<>'SCHEDULED' OR NEW.state NOT IN('SCHEDULED','COMPLETED','CANCELLED') OR (to_jsonb(NEW)-ARRAY['state','scheduled_for','completed_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','scheduled_for','completed_at','updated_at']) THEN RAISE EXCEPTION 'Final exact custom task transition required'; END IF;
   IF NEW.state='COMPLETED' AND (NEW.completed_at IS NULL OR NEW.scheduled_for<>OLD.scheduled_for OR abs(extract(epoch FROM (NEW.completed_at-CURRENT_TIMESTAMP)))>1) OR NEW.state<>'COMPLETED' AND NEW.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Exact database custom task completion evidence required'; END IF;
   IF NOT custom_program_native_effective(target) AND NOT (NEW.state='CANCELLED' AND ((version.status='REVOKED') OR EXISTS(SELECT 1 FROM custom_program_plan_versions n WHERE n.request_id=version.request_id AND n.version_number>version.version_number AND n.status='ISSUED'))) THEN RAISE EXCEPTION 'Only effective or finally superseded/revoked custom task operation allowed'; END IF;
  END IF;
 ELSE
  IF NOT custom_program_native_effective(target) THEN RAISE EXCEPTION 'Current issued own custom activity required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER custom_program_task_guard BEFORE INSERT OR UPDATE OR DELETE ON treatment_tasks FOR EACH ROW EXECUTE FUNCTION custom_program_activity_guard();
CREATE TRIGGER custom_program_adherence_guard BEFORE INSERT OR UPDATE OR DELETE ON medication_adherence_logs FOR EACH ROW EXECUTE FUNCTION custom_program_activity_guard();
CREATE TRIGGER custom_program_progress_guard BEFORE INSERT OR UPDATE OR DELETE ON treatment_progress_events FOR EACH ROW EXECUTE FUNCTION custom_program_activity_guard();
CREATE FUNCTION custom_program_activity_deferred_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; version custom_program_plan_versions; authorized boolean;
BEGIN
 IF TG_TABLE_NAME='medication_adherence_logs' THEN SELECT treatment_plan_id INTO target FROM treatment_medications WHERE id=NEW.treatment_medication_id; ELSE target:=NEW.treatment_plan_id; END IF;
 SELECT * INTO version FROM custom_program_plan_versions WHERE treatment_plan_id=target;
 IF version.id IS NULL THEN RETURN NULL; END IF;
 IF TG_TABLE_NAME='treatment_tasks' THEN
  SELECT EXISTS(SELECT 1 FROM patient_access_audits a WHERE a.patient_id=version.patient_id AND a.clinic_id=version.clinic_id AND a.xmin::text::bigint=mod(txid_current(),4294967296) AND (
   (a.resource_type='TREATMENT_TASK' AND a.resource_id=NEW.id AND custom_program_clinician_current(version.request_id,a.actor_user_id,a.actor_session_id))
   OR (TG_OP='UPDATE' AND NEW.state='COMPLETED' AND a.resource_type='PATIENT_TREATMENT_TASK' AND a.resource_id=NEW.id AND a.action='UPDATE' AND custom_program_patient_session(version.patient_id,version.clinic_id,a.actor_user_id,a.actor_session_id))
   OR (TG_OP='UPDATE' AND NEW.state='CANCELLED' AND a.resource_type IN('CUSTOM_PROGRAM_PLAN_ISSUE','CUSTOM_PROGRAM_PLAN_REVOKE') AND EXISTS(SELECT 1 FROM custom_program_plan_versions v WHERE v.id=a.resource_id AND v.request_id=version.request_id) AND custom_program_clinician_current(version.request_id,a.actor_user_id,a.actor_session_id)))) INTO authorized;
 ELSE
  SELECT EXISTS(SELECT 1 FROM patient_access_audits a WHERE a.patient_id=version.patient_id AND a.clinic_id=version.clinic_id AND a.xmin::text::bigint=mod(txid_current(),4294967296) AND custom_program_patient_session(version.patient_id,version.clinic_id,a.actor_user_id,a.actor_session_id) AND (
   (TG_TABLE_NAME='medication_adherence_logs' AND a.resource_type='MEDICATION_ADHERENCE' AND a.resource_id=NEW.id AND a.action='CREATE')
   OR (TG_TABLE_NAME='treatment_progress_events' AND ((a.resource_type='PATIENT_TREATMENT_TASK' AND a.resource_id=NEW.treatment_task_id AND a.action='UPDATE') OR (a.resource_type='MEDICATION_ADHERENCE' AND a.action='CREATE' AND EXISTS(SELECT 1 FROM medication_adherence_logs m JOIN treatment_medications medication ON medication.id=m.treatment_medication_id WHERE m.id=a.resource_id AND medication.treatment_plan_id=target AND m.treatment_task_id IS NOT DISTINCT FROM NEW.treatment_task_id AND m.xmin::text::bigint=mod(txid_current(),4294967296))))))) INTO authorized;
 END IF;
 IF NOT COALESCE(authorized,false) THEN RAISE EXCEPTION 'Atomic exact assigned/own custom activity audit required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER custom_program_task_proof AFTER INSERT OR UPDATE ON treatment_tasks DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION custom_program_activity_deferred_proof();
CREATE CONSTRAINT TRIGGER custom_program_adherence_proof AFTER INSERT ON medication_adherence_logs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION custom_program_activity_deferred_proof();
CREATE CONSTRAINT TRIGGER custom_program_progress_proof AFTER INSERT ON treatment_progress_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION custom_program_activity_deferred_proof();
COMMIT;
