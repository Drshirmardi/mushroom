BEGIN;

-- CreateTable
CREATE TABLE "program_offering_publications" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "program_definition_id" UUID NOT NULL,
    "definition_content_hash" CHAR(64) NOT NULL,
    "program_key" VARCHAR(100) NOT NULL,
    "locale" VARCHAR(40) NOT NULL,
    "publication_number" INTEGER NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
    "access_mode" VARCHAR(24) NOT NULL,
    "access_duration_days" INTEGER,
    "quote_ttl_seconds" INTEGER NOT NULL,
    "retention_policy_ref" VARCHAR(80) NOT NULL,
    "terms_policy_version_id" UUID NOT NULL,
    "terms_content_hash" CHAR(64) NOT NULL,
    "policy_snapshot" JSONB NOT NULL,
    "publication_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "published_by_user_id" UUID NOT NULL,
    "published_session_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMPTZ(3),
    "retired_by_user_id" UUID,
    "retired_session_id" UUID,
    "retirement_reason" VARCHAR(24),

    CONSTRAINT "program_offering_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_publications_clinic_status_created_idx" ON "program_offering_publications"("clinic_id", "status", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "program_publications_identity_number_key" ON "program_offering_publications"("clinic_id", "program_key", "locale", "publication_number");

-- CreateIndex
CREATE UNIQUE INDEX "program_publications_command_key" ON "program_offering_publications"("clinic_id", "published_by_user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "program_offering_publications" ADD CONSTRAINT "program_offering_publications_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_offering_publications" ADD CONSTRAINT "program_offering_publications_program_definition_id_fkey" FOREIGN KEY ("program_definition_id") REFERENCES "program_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_offering_publications" ADD CONSTRAINT "program_offering_publications_terms_policy_version_id_fkey" FOREIGN KEY ("terms_policy_version_id") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_offering_publications" ADD CONSTRAINT "program_offering_publications_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_offering_publications" ADD CONSTRAINT "program_offering_publications_published_session_id_fkey" FOREIGN KEY ("published_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_offering_publications" ADD CONSTRAINT "program_offering_publications_retired_by_user_id_fkey" FOREIGN KEY ("retired_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_offering_publications" ADD CONSTRAINT "program_offering_publications_retired_session_id_fkey" FOREIGN KEY ("retired_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No actual price, legal release, program or permission is seeded.
CREATE UNIQUE INDEX program_publications_one_active_key ON program_offering_publications(clinic_id,program_key,locale) WHERE status='ACTIVE';
ALTER TABLE program_offering_publications ADD CONSTRAINT program_publication_shape_check CHECK(COALESCE(
 publication_number>0 AND program_key ~ '^[A-Z][A-Z0-9_]{2,99}$' AND locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$'
 AND amount_rial BETWEEN 0 AND 9000000000000000000 AND currency='IRR' AND quote_ttl_seconds BETWEEN 60 AND 86400
 AND ((access_mode='DAYS' AND access_duration_days BETWEEN 1 AND 3650) OR (access_mode IN('PERPETUAL','ONE_DELIVERY') AND access_duration_days IS NULL))
 AND retention_policy_ref ~ '^[A-Za-z0-9._:-]{1,80}$' AND definition_content_hash ~ '^[a-f0-9]{64}$' AND terms_content_hash ~ '^[a-f0-9]{64}$' AND publication_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$'
 AND idempotency_key ~ '^[!-~]{8,200}$' AND policy_snapshot='{"schemaVersion":1,"ordinaryRefunds":false,"paymentPoint":"PRE_ACCESS_OR_REQUEST"}'::jsonb
 AND ((status='ACTIVE' AND retired_at IS NULL AND retired_by_user_id IS NULL AND retired_session_id IS NULL AND retirement_reason IS NULL)
  OR (status='RETIRED' AND retired_at>=created_at AND retired_by_user_id IS NOT NULL AND retired_session_id IS NOT NULL AND retirement_reason IN('REPLACED','MANUAL'))),false));

-- One reusable locking seam for the exact already-reviewed PG01 clinical proof.
CREATE FUNCTION program_publication_lock_definition(target uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE p program_definition_versions; ref jsonb; content guidance_content_versions;
BEGIN
 SELECT * INTO p FROM program_definition_versions WHERE id=target FOR SHARE;
 IF p.id IS NULL OR p.status<>'APPROVED' OR guidance_lock_doctor(p.approved_by_user_id,p.clinic_id) IS DISTINCT FROM p.approved_doctor_id THEN RETURN false; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(p.content_references) ORDER BY value->>'id' LOOP
  SELECT * INTO content FROM guidance_content_versions WHERE id=(ref->>'id')::uuid AND clinic_id=p.clinic_id FOR SHARE;
  IF content.id IS NULL OR content.status<>'APPROVED' OR content.locale<>p.locale OR content.content_hash<>ref->>'contentHash' OR guidance_lock_doctor(content.approved_by_user_id,p.clinic_id) IS DISTINCT FROM content.approved_doctor_id THEN RETURN false; END IF;
 END LOOP;
 IF p.doctor_service_id IS NOT NULL THEN
  PERFORM ds.id FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id AND d.clinic_id=ds.clinic_id JOIN services service ON service.id=ds.service_id AND service.clinic_id=ds.clinic_id WHERE ds.id=p.doctor_service_id AND ds.clinic_id=p.clinic_id FOR SHARE OF ds,d,service;
 END IF;
 RETURN program_definition_usable(p.id);
END $$;
CREATE FUNCTION program_publication_current(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_offering_publications p JOIN program_definition_versions d ON d.id=p.program_definition_id AND d.clinic_id=p.clinic_id
  JOIN consent_policy_versions terms ON terms.id=p.terms_policy_version_id AND terms.clinic_id=p.clinic_id
  WHERE p.id=target AND p.status='ACTIVE' AND p.program_key=d.program_key AND p.locale=d.locale AND p.definition_content_hash=d.content_hash AND program_definition_usable(d.id)
  AND p.publication_number=(SELECT max(publication_number) FROM program_offering_publications WHERE clinic_id=p.clinic_id AND program_key=p.program_key AND locale=p.locale)
  AND terms.policy_key='PROGRAM_PURCHASE_TERMS' AND terms.locale=p.locale AND terms.content_hash=p.terms_content_hash AND terms.status='ACTIVE' AND terms.activated_at IS NOT NULL
  AND ((d.kind='READY_EDUCATION' AND p.access_mode IN('DAYS','PERPETUAL')) OR (d.kind='CUSTOM_PROFESSIONAL_PLAN' AND p.access_mode='ONE_DELIVERY' AND EXISTS(SELECT 1 FROM doctor_services ds WHERE ds.id=d.doctor_service_id AND ds.clinic_id=p.clinic_id AND ds.currency='IRR' AND ds.price_amount=p.amount_rial))))
$$;
CREATE FUNCTION program_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; actor_session uuid; definition program_definition_versions; terms consent_policy_versions; previous program_offering_publications;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Program commercial history is retained'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['status','retired_at','retired_by_user_id','retired_session_id','retirement_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','retired_at','retired_by_user_id','retired_session_id','retirement_reason']) THEN RAISE EXCEPTION 'Program commercial snapshot is immutable'; END IF;
  IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  IF OLD.status<>'ACTIVE' OR NEW.status<>'RETIRED' THEN RAISE EXCEPTION 'Program commercial retirement is final'; END IF;
  actor:=NEW.retired_by_user_id;actor_session:=NEW.retired_session_id;
 ELSE
  IF NEW.status<>'ACTIVE' OR NEW.retired_at IS NOT NULL THEN RAISE EXCEPTION 'Program commercial publication begins active'; END IF;
  actor:=NEW.published_by_user_id;actor_session:=NEW.published_session_id;
 END IF;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=actor_session AND s.user_id=actor AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active owned program publication session required'; END IF;
 PERFORM c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.id=NEW.clinic_id AND c.status='ACTIVE' AND a.user_id=actor FOR SHARE OF c,a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active program publication clinic membership required'; END IF;
 PERFORM ur.role_id FROM user_roles ur JOIN roles role ON role.id=ur.role_id WHERE ur.user_id=actor AND role.code='ADMIN' FOR SHARE OF ur,role;
 IF NOT FOUND THEN RAISE EXCEPTION 'Actual program publication administrator required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||NEW.clinic_id::text||':'||NEW.program_key||':'||NEW.locale,0));
 IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
 IF NOT program_publication_lock_definition(NEW.program_definition_id) THEN RAISE EXCEPTION 'Current exact reviewed program definition required'; END IF;
 SELECT * INTO definition FROM program_definition_versions WHERE id=NEW.program_definition_id AND clinic_id=NEW.clinic_id;
 IF definition.id IS NULL OR definition.program_key<>NEW.program_key OR definition.locale<>NEW.locale OR definition.content_hash<>NEW.definition_content_hash THEN RAISE EXCEPTION 'Exact scoped program identity required'; END IF;
 IF NOT ((definition.kind='READY_EDUCATION' AND NEW.access_mode IN('DAYS','PERPETUAL')) OR (definition.kind='CUSTOM_PROFESSIONAL_PLAN' AND NEW.access_mode='ONE_DELIVERY')) THEN RAISE EXCEPTION 'Supported program access period required'; END IF;
 IF definition.kind='CUSTOM_PROFESSIONAL_PLAN' AND NOT EXISTS(SELECT 1 FROM doctor_services WHERE id=definition.doctor_service_id AND clinic_id=NEW.clinic_id AND currency='IRR' AND price_amount=NEW.amount_rial) THEN RAISE EXCEPTION 'Exact current professional service price required'; END IF;
 SELECT * INTO terms FROM consent_policy_versions WHERE id=NEW.terms_policy_version_id AND clinic_id=NEW.clinic_id FOR SHARE;
 IF terms.id IS NULL OR terms.policy_key<>'PROGRAM_PURCHASE_TERMS' OR terms.locale<>NEW.locale OR terms.status<>'ACTIVE' OR terms.activated_at IS NULL OR terms.content_hash<>NEW.terms_content_hash THEN RAISE EXCEPTION 'Exact active program purchase terms required'; END IF;
 SELECT * INTO previous FROM program_offering_publications WHERE clinic_id=NEW.clinic_id AND program_key=NEW.program_key AND locale=NEW.locale ORDER BY publication_number DESC LIMIT 1;
 IF NEW.publication_number<>COALESCE(previous.publication_number,0)+1 OR previous.id IS NOT NULL AND (previous.status<>'RETIRED' OR NEW.created_at<previous.retired_at) THEN RAISE EXCEPTION 'Consecutive immutable program commercial revision required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_publication_guard BEFORE INSERT OR UPDATE OR DELETE ON program_offering_publications FOR EACH ROW EXECUTE FUNCTION program_publication_guard();
COMMIT;
