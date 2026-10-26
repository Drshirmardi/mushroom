BEGIN;
-- CreateTable
CREATE TABLE "custom_program_requests" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "publication_hash" CHAR(64) NOT NULL,
    "program_definition_id" UUID NOT NULL,
    "definition_content_hash" CHAR(64) NOT NULL,
    "doctor_service_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_session_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_program_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_program_care_authorizations" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "care_consent_record_id" UUID NOT NULL,
    "authorization_hash" CHAR(64) NOT NULL,
    "accepted_by_user_id" UUID NOT NULL,
    "accepted_session_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMPTZ(3),
    "withdrawn_by_user_id" UUID,
    "withdrawn_session_id" UUID,
    "withdrawal_reason" VARCHAR(24),
    "withdrawal_idempotency_key" VARCHAR(200),

    CONSTRAINT "custom_program_care_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_program_requests_patient_created_idx" ON "custom_program_requests"("clinic_id", "patient_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_requests_id_clinic_key" ON "custom_program_requests"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_requests_command_key" ON "custom_program_requests"("patient_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "custom_program_care_request_history_idx" ON "custom_program_care_authorizations"("request_id", "accepted_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_care_request_version_key" ON "custom_program_care_authorizations"("request_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_care_acceptance_command_key" ON "custom_program_care_authorizations"("patient_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "custom_program_care_withdrawal_command_key" ON "custom_program_care_authorizations"("patient_id", "withdrawal_idempotency_key");

-- AddForeignKey
ALTER TABLE "custom_program_requests" ADD CONSTRAINT "custom_program_requests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_requests" ADD CONSTRAINT "custom_program_requests_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_requests" ADD CONSTRAINT "custom_program_requests_publication_id_clinic_id_fkey" FOREIGN KEY ("publication_id", "clinic_id") REFERENCES "program_offering_publications"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_requests" ADD CONSTRAINT "custom_program_requests_program_definition_id_fkey" FOREIGN KEY ("program_definition_id") REFERENCES "program_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_requests" ADD CONSTRAINT "custom_program_requests_doctor_service_id_clinic_id_fkey" FOREIGN KEY ("doctor_service_id", "clinic_id") REFERENCES "doctor_services"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_requests" ADD CONSTRAINT "custom_program_requests_doctor_id_clinic_id_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_requests" ADD CONSTRAINT "custom_program_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_requests" ADD CONSTRAINT "custom_program_requests_created_session_id_fkey" FOREIGN KEY ("created_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_care_authorizations" ADD CONSTRAINT "custom_program_care_authorizations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_care_authorizations" ADD CONSTRAINT "custom_program_care_authorizations_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_care_authorizations" ADD CONSTRAINT "custom_program_care_authorizations_request_id_clinic_id_fkey" FOREIGN KEY ("request_id", "clinic_id") REFERENCES "custom_program_requests"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_care_authorizations" ADD CONSTRAINT "custom_program_care_authorizations_care_consent_record_id_fkey" FOREIGN KEY ("care_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_care_authorizations" ADD CONSTRAINT "custom_program_care_authorizations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_care_authorizations" ADD CONSTRAINT "custom_program_care_authorizations_accepted_session_id_fkey" FOREIGN KEY ("accepted_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_care_authorizations" ADD CONSTRAINT "custom_program_care_authorizations_withdrawn_by_user_id_fkey" FOREIGN KEY ("withdrawn_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_program_care_authorizations" ADD CONSTRAINT "custom_program_care_authorizations_withdrawn_session_id_fkey" FOREIGN KEY ("withdrawn_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX custom_program_care_one_open ON custom_program_care_authorizations(request_id) WHERE withdrawn_at IS NULL;
ALTER TABLE custom_program_requests ADD CONSTRAINT custom_program_request_shape CHECK (
 publication_hash ~ '^[a-f0-9]{64}$' AND definition_content_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{1,200}$');
ALTER TABLE custom_program_care_authorizations ADD CONSTRAINT custom_program_care_shape CHECK (
 version_number>0 AND authorization_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{1,200}$' AND (
 (withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL AND withdrawn_session_id IS NULL AND withdrawal_reason IS NULL AND withdrawal_idempotency_key IS NULL) OR
 (withdrawn_at IS NOT NULL AND withdrawn_at>=accepted_at AND withdrawn_by_user_id IS NOT NULL AND withdrawn_session_id IS NOT NULL AND withdrawal_reason IN('PATIENT_WITHDRAWAL','SUPERSEDED') AND withdrawal_idempotency_key ~ '^[!-~]{1,200}$')));

CREATE FUNCTION custom_program_patient_session(patient uuid,scope uuid,actor uuid,actor_session uuid) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN sessions s ON s.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
 WHERE p.id=patient AND p.clinic_id=scope AND u.id=actor AND s.id=actor_session AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,s,ur,r;
 RETURN FOUND;
END $$;
CREATE FUNCTION custom_program_source_available(target uuid,require_sale boolean) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_offering_publications pub JOIN program_definition_versions d ON d.id=pub.program_definition_id AND d.clinic_id=pub.clinic_id
 JOIN doctor_services ds ON ds.id=d.doctor_service_id AND ds.clinic_id=d.clinic_id JOIN doctor_profiles dr ON dr.id=ds.doctor_id AND dr.clinic_id=ds.clinic_id
 WHERE pub.id=target AND d.kind='CUSTOM_PROFESSIONAL_PLAN' AND d.content_hash=pub.definition_content_hash AND d.service_snapshot->>'doctorId'=dr.id::text
 AND guidance_doctor_id(dr.user_id,dr.clinic_id)=dr.id AND program_definition_usable(d.id) AND (NOT require_sale OR program_publication_current(pub.id)));
$$;
CREATE FUNCTION custom_program_lock_source(target uuid,require_sale boolean) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE pub program_offering_publications; physician doctor_profiles;
BEGIN
 SELECT * INTO pub FROM program_offering_publications WHERE id=target;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||pub.clinic_id::text||':'||pub.program_key||':'||pub.locale,0));
 IF NOT program_publication_lock_definition(pub.program_definition_id) THEN RETURN false; END IF;
 SELECT dr.* INTO physician FROM program_definition_versions d JOIN doctor_services ds ON ds.id=d.doctor_service_id JOIN doctor_profiles dr ON dr.id=ds.doctor_id WHERE d.id=pub.program_definition_id;
 IF physician.id IS NULL OR guidance_lock_doctor(physician.user_id,pub.clinic_id) IS DISTINCT FROM physician.id THEN RETURN false; END IF;
 IF require_sale THEN PERFORM id FROM consent_policy_versions WHERE id=pub.terms_policy_version_id FOR SHARE; END IF;
 RETURN custom_program_source_available(target,require_sale);
END $$;
CREATE FUNCTION custom_program_request_source_current(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM custom_program_requests r JOIN program_offering_publications p ON p.id=r.publication_id AND p.clinic_id=r.clinic_id JOIN program_definition_versions d ON d.id=p.program_definition_id
 WHERE r.id=target AND p.publication_hash=r.publication_hash AND d.id=r.program_definition_id AND d.content_hash=r.definition_content_hash AND d.doctor_service_id=r.doctor_service_id AND d.service_snapshot->>'doctorId'=r.doctor_id::text AND custom_program_source_available(p.id,false));
$$;
CREATE FUNCTION custom_program_care_current(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM custom_program_care_authorizations a JOIN custom_program_requests r ON r.id=a.request_id AND r.patient_id=a.patient_id AND r.clinic_id=a.clinic_id
 JOIN patient_consent_records c ON c.id=a.care_consent_record_id AND c.patient_id=a.patient_id JOIN consent_policy_versions p ON p.id=c.policy_version_id AND p.clinic_id=a.clinic_id
 JOIN program_definition_versions d ON d.id=r.program_definition_id JOIN patient_profiles patient ON patient.id=a.patient_id AND patient.clinic_id=a.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics clinic ON clinic.id=a.clinic_id
 WHERE a.id=target AND a.withdrawn_at IS NULL AND c.withdrawn_at IS NULL AND p.policy_key='CUSTOM_PROGRAM_CARE' AND p.status='ACTIVE' AND p.activated_at IS NOT NULL AND p.locale=d.locale AND p.content_hash=c.content_hash
 AND p.content_hash=encode(sha256(convert_to(p.body,'UTF8')),'hex') AND u.status='ACTIVE' AND clinic.status='ACTIVE' AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles role ON role.id=ur.role_id WHERE ur.user_id=u.id AND role.code='PATIENT')
 AND NOT EXISTS(SELECT 1 FROM custom_program_care_authorizations newer WHERE newer.request_id=a.request_id AND newer.version_number>a.version_number) AND custom_program_request_source_current(r.id));
$$;
CREATE FUNCTION custom_program_consent_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy consent_policy_versions; old_key text;
BEGIN
 IF TG_OP='DELETE' THEN SELECT * INTO policy FROM consent_policy_versions WHERE id=OLD.policy_version_id; ELSE SELECT * INTO policy FROM consent_policy_versions WHERE id=NEW.policy_version_id FOR SHARE; END IF;
 IF TG_OP='UPDATE' THEN SELECT policy_key INTO old_key FROM consent_policy_versions WHERE id=OLD.policy_version_id; END IF;
 IF policy.policy_key IS DISTINCT FROM 'CUSTOM_PROGRAM_CARE' AND old_key IS DISTINCT FROM 'CUSTOM_PROGRAM_CARE' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Custom care acceptance is immutable retained evidence'; END IF;
 IF policy.status<>'ACTIVE' OR policy.activated_at IS NULL OR policy.content_hash<>NEW.content_hash OR policy.content_hash<>encode(sha256(convert_to(policy.body,'UTF8')),'hex') OR NEW.source<>'PATIENT_APP' OR NEW.withdrawn_at IS NOT NULL
 OR NOT custom_program_patient_session(NEW.patient_id,policy.clinic_id,NEW.accepted_by_user_id,NEW.accepted_by_session_id) OR abs(extract(epoch FROM (NEW.accepted_at-CURRENT_TIMESTAMP)))>1 THEN RAISE EXCEPTION 'Exact active custom care consent and independent session required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER custom_program_consent_guard BEFORE INSERT OR UPDATE OR DELETE ON patient_consent_records FOR EACH ROW EXECUTE FUNCTION custom_program_consent_guard();
CREATE FUNCTION custom_program_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pub program_offering_publications; d program_definition_versions;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Custom program request is immutable retained evidence'; END IF;
 IF NOT custom_program_patient_session(NEW.patient_id,NEW.clinic_id,NEW.created_by_user_id,NEW.created_session_id) THEN RAISE EXCEPTION 'Current independent custom request patient/session required'; END IF;
 IF NOT custom_program_lock_source(NEW.publication_id,true) THEN RAISE EXCEPTION 'Current exact named professional publication required'; END IF;
 SELECT * INTO pub FROM program_offering_publications WHERE id=NEW.publication_id;
 SELECT * INTO d FROM program_definition_versions WHERE id=pub.program_definition_id;
 IF pub.clinic_id<>NEW.clinic_id OR pub.publication_hash<>NEW.publication_hash OR d.id<>NEW.program_definition_id OR d.content_hash<>NEW.definition_content_hash OR d.doctor_service_id IS DISTINCT FROM NEW.doctor_service_id OR d.service_snapshot->>'doctorId' IS DISTINCT FROM NEW.doctor_id::text THEN RAISE EXCEPTION 'Exact custom program source required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE clinic_id=NEW.clinic_id AND locale=d.locale AND policy_key='CUSTOM_PROGRAM_CARE' AND status='ACTIVE' AND activated_at IS NOT NULL AND content_hash=encode(sha256(convert_to(body,'UTF8')),'hex') FOR SHARE;
 IF NOT FOUND OR abs(extract(epoch FROM (NEW.created_at-CURRENT_TIMESTAMP)))>1 THEN RAISE EXCEPTION 'Current care policy and database request clock required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER custom_program_request_guard BEFORE INSERT OR UPDATE OR DELETE ON custom_program_requests FOR EACH ROW EXECUTE FUNCTION custom_program_request_guard();
CREATE FUNCTION custom_program_care_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request custom_program_requests; consent patient_consent_records; policy consent_policy_versions; prior custom_program_care_authorizations;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Custom care authority is retained evidence'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||NEW.request_id::text,0));
 SELECT * INTO request FROM custom_program_requests WHERE id=NEW.request_id;
 IF request.id IS NULL OR request.patient_id<>NEW.patient_id OR request.clinic_id<>NEW.clinic_id THEN RAISE EXCEPTION 'Exact owned custom request required'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.withdrawn_at IS NOT NULL OR NEW.withdrawn_at IS NULL OR (to_jsonb(NEW)-ARRAY['withdrawn_at','withdrawn_by_user_id','withdrawn_session_id','withdrawal_reason','withdrawal_idempotency_key']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['withdrawn_at','withdrawn_by_user_id','withdrawn_session_id','withdrawal_reason','withdrawal_idempotency_key'])
  OR NOT custom_program_patient_session(NEW.patient_id,NEW.clinic_id,NEW.withdrawn_by_user_id,NEW.withdrawn_session_id) OR abs(extract(epoch FROM (NEW.withdrawn_at-GREATEST(CURRENT_TIMESTAMP,OLD.accepted_at))))>1 THEN RAISE EXCEPTION 'Final scoped own custom care withdrawal required'; END IF;
  RETURN NEW;
 END IF;
 IF NOT custom_program_patient_session(NEW.patient_id,NEW.clinic_id,NEW.accepted_by_user_id,NEW.accepted_session_id) OR NEW.withdrawn_at IS NOT NULL OR NOT custom_program_lock_source(request.publication_id,false) OR NOT custom_program_request_source_current(request.id) THEN RAISE EXCEPTION 'Current custom source and independent patient acceptance required'; END IF;
 SELECT * INTO consent FROM patient_consent_records WHERE id=NEW.care_consent_record_id FOR SHARE;
 SELECT * INTO policy FROM consent_policy_versions WHERE id=consent.policy_version_id FOR SHARE;
 SELECT * INTO prior FROM custom_program_care_authorizations WHERE request_id=NEW.request_id ORDER BY version_number DESC LIMIT 1;
 IF consent.id IS NULL OR consent.patient_id<>NEW.patient_id OR consent.withdrawn_at IS NOT NULL OR policy.clinic_id<>NEW.clinic_id OR policy.policy_key<>'CUSTOM_PROGRAM_CARE' OR policy.status<>'ACTIVE' OR policy.activated_at IS NULL OR policy.content_hash<>consent.content_hash OR policy.locale IS DISTINCT FROM (SELECT locale FROM program_definition_versions WHERE id=request.program_definition_id)
 OR NEW.version_number<>COALESCE(prior.version_number,0)+1 OR (prior.id IS NOT NULL AND prior.withdrawn_at IS NULL)
 OR NEW.authorization_hash<>encode(sha256(convert_to(NEW.request_id::text||':'||NEW.care_consent_record_id::text||':'||NEW.version_number::text,'UTF8')),'hex')
 OR abs(extract(epoch FROM (NEW.accepted_at-GREATEST(CURRENT_TIMESTAMP,consent.accepted_at,prior.withdrawn_at))))>1 THEN RAISE EXCEPTION 'Exact current consecutive custom care authority required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER custom_program_care_guard BEFORE INSERT OR UPDATE OR DELETE ON custom_program_care_authorizations FOR EACH ROW EXECUTE FUNCTION custom_program_care_guard();
CREATE FUNCTION custom_program_care_supersession_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.withdrawal_reason='SUPERSEDED' AND NOT EXISTS(SELECT 1 FROM custom_program_care_authorizations next WHERE next.request_id=NEW.request_id AND next.version_number=NEW.version_number+1 AND next.accepted_by_user_id=NEW.withdrawn_by_user_id AND next.accepted_session_id=NEW.withdrawn_session_id AND next.accepted_at>=NEW.withdrawn_at) THEN RAISE EXCEPTION 'Supersession requires exact explicit next authorization'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER custom_program_care_supersession_proof AFTER UPDATE ON custom_program_care_authorizations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION custom_program_care_supersession_proof();
COMMIT;
