-- CreateTable
CREATE TABLE "assessment_guidance_versions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "result_band_id" VARCHAR(100) NOT NULL,
    "version_number" INTEGER NOT NULL,
    "questionnaire_content_hash" CHAR(64) NOT NULL,
    "algorithm_id" VARCHAR(80) NOT NULL,
    "algorithm_version" INTEGER NOT NULL,
    "result_band_snapshot" JSONB NOT NULL,
    "content_references" JSONB NOT NULL,
    "service_references" JSONB NOT NULL,
    "recommend_consultation" BOOLEAN NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "content_hash" VARCHAR(64) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_user_id" UUID,
    "approved_doctor_id" UUID,
    "approved_session_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "revoked_by_user_id" UUID,
    "revoked_session_id" UUID,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "assessment_guidance_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_guidance_versions_clinic_status_created_idx" ON "assessment_guidance_versions"("clinic_id", "status", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_guidance_versions_source_version_key" ON "assessment_guidance_versions"("assessment_version_id", "result_band_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_guidance_versions_command_key" ON "assessment_guidance_versions"("clinic_id", "created_by_user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "assessment_guidance_versions" ADD CONSTRAINT "assessment_guidance_versions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_guidance_versions" ADD CONSTRAINT "assessment_guidance_versions_assessment_version_id_clinic__fkey" FOREIGN KEY ("assessment_version_id", "clinic_id") REFERENCES "assessment_versions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_guidance_versions" ADD CONSTRAINT "assessment_guidance_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_guidance_versions" ADD CONSTRAINT "assessment_guidance_versions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_guidance_versions" ADD CONSTRAINT "assessment_guidance_versions_approved_doctor_id_fkey" FOREIGN KEY ("approved_doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_guidance_versions" ADD CONSTRAINT "assessment_guidance_versions_approved_session_id_fkey" FOREIGN KEY ("approved_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_guidance_versions" ADD CONSTRAINT "assessment_guidance_versions_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_guidance_versions" ADD CONSTRAINT "assessment_guidance_versions_revoked_session_id_fkey" FOREIGN KEY ("revoked_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE assessment_guidance_versions ADD CONSTRAINT assessment_guidance_shape CHECK (
 version_number>0 AND length(btrim(result_band_id)) BETWEEN 1 AND 100
 AND algorithm_id='WEIGHTED_SUM' AND algorithm_version=1
 AND content_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND questionnaire_content_hash ~ '^[a-f0-9]{64}$'
 AND jsonb_typeof(result_band_snapshot)='object' AND result_band_snapshot->>'id'=result_band_id
 AND jsonb_typeof(content_references)='array' AND jsonb_array_length(content_references) BETWEEN 1 AND 10
 AND jsonb_typeof(service_references)='array' AND jsonb_array_length(service_references) BETWEEN 0 AND 10
 AND status IN ('DRAFT','APPROVED','REVOKED')
 AND ((approved_at IS NULL AND approved_by_user_id IS NULL AND approved_doctor_id IS NULL AND approved_session_id IS NULL)
   OR (approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL AND approved_doctor_id IS NOT NULL AND approved_session_id IS NOT NULL))
 AND (status<>'DRAFT' OR approved_at IS NULL) AND (status<>'APPROVED' OR approved_at IS NOT NULL)
 AND ((status='REVOKED' AND revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL AND revoked_session_id IS NOT NULL)
   OR (status<>'REVOKED' AND revoked_at IS NULL AND revoked_by_user_id IS NULL AND revoked_session_id IS NULL))
 AND (approved_at IS NULL OR approved_at>=created_at) AND (revoked_at IS NULL OR revoked_at>=COALESCE(approved_at,created_at))
);

CREATE FUNCTION assessment_guidance_check_sources(item assessment_guidance_versions) RETURNS void LANGUAGE plpgsql AS $$
DECLARE source assessment_versions; ref jsonb; seen uuid[] := ARRAY[]::uuid[];
BEGIN
 SELECT * INTO source FROM assessment_versions WHERE id=item.assessment_version_id AND clinic_id=item.clinic_id;
 IF NOT FOUND OR source.status NOT IN ('PUBLISHED','RETIRED') OR source.content_hash<>item.questionnaire_content_hash
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(source.structure->'resultBands') band WHERE band->>'id'=item.result_band_id AND band=item.result_band_snapshot) THEN
  RAISE EXCEPTION 'Exact published or retired questionnaire band required';
 END IF;
 PERFORM id FROM guidance_content_versions WHERE id IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(item.content_references)) FOR SHARE;
 FOR ref IN SELECT value FROM jsonb_array_elements(item.content_references) LOOP
  IF (ref->>'id')::uuid=ANY(seen) THEN RAISE EXCEPTION 'Unique guidance references required'; END IF;
  seen := array_append(seen,(ref->>'id')::uuid);
  IF NOT EXISTS(SELECT 1 FROM guidance_content_versions g WHERE g.id=(ref->>'id')::uuid AND g.clinic_id=item.clinic_id AND g.locale=source.locale AND g.status='APPROVED' AND g.content_hash=ref->>'contentHash' AND guidance_doctor_id(g.approved_by_user_id,g.clinic_id)=g.approved_doctor_id) THEN
   RAISE EXCEPTION 'Approved same-clinic exact guidance required';
  END IF;
 END LOOP;
 seen := ARRAY[]::uuid[];
 PERFORM id FROM services WHERE id IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(item.service_references)) FOR SHARE;
 PERFORM ds.id FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id WHERE ds.service_id IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(item.service_references)) FOR SHARE OF ds,d;
 FOR ref IN SELECT value FROM jsonb_array_elements(item.service_references) LOOP
  IF (ref->>'id')::uuid=ANY(seen) THEN RAISE EXCEPTION 'Unique service references required'; END IF;
  seen := array_append(seen,(ref->>'id')::uuid);
  IF NOT EXISTS(SELECT 1 FROM services s WHERE s.id=(ref->>'id')::uuid AND s.clinic_id=item.clinic_id AND s.is_active AND s.publication_status='PUBLISHED'
   AND ref=jsonb_build_object('id',s.id,'name',s.name,'description',s.description)
   AND EXISTS(SELECT 1 FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id WHERE ds.service_id=s.id AND ds.is_active AND ds.publication_status='PUBLISHED' AND d.is_active AND d.publication_status='PUBLISHED')) THEN
   RAISE EXCEPTION 'Visible same-clinic unchanged service required';
  END IF;
 END LOOP;
END $$;

CREATE FUNCTION assessment_guidance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_version integer;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Assessment guidance history is retained'; END IF;
 IF TG_OP='INSERT' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('assessment-guidance:'||NEW.assessment_version_id::text||':'||NEW.result_band_id,0));
  IF NEW.status<>'DRAFT' OR NEW.approved_at IS NOT NULL OR NEW.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Mapping must start as draft'; END IF;
  SELECT COALESCE(max(version_number),0) INTO previous_version FROM assessment_guidance_versions WHERE assessment_version_id=NEW.assessment_version_id AND result_band_id=NEW.result_band_id;
  IF NEW.version_number<>previous_version+1 THEN RAISE EXCEPTION 'Mapping versions must be consecutive'; END IF;
  PERFORM assessment_guidance_check_sources(NEW);
  RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) IS DISTINCT FROM
 (to_jsonb(OLD)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) THEN RAISE EXCEPTION 'Assessment guidance snapshot is immutable'; END IF;
 IF NEW.status=OLD.status THEN
  IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN RAISE EXCEPTION 'Mapping evidence is immutable'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.status='REVOKED' OR NEW.status NOT IN ('APPROVED','REVOKED') OR (NEW.status='APPROVED' AND OLD.status<>'DRAFT') THEN RAISE EXCEPTION 'Mapping transition is final'; END IF;
 IF NEW.status='APPROVED' THEN
  IF guidance_lock_doctor(NEW.approved_by_user_id,NEW.clinic_id) IS DISTINCT FROM NEW.approved_doctor_id THEN RAISE EXCEPTION 'Qualified doctor approval required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM sessions WHERE id=NEW.approved_session_id AND user_id=NEW.approved_by_user_id AND revoked_at IS NULL AND expires_at>now()) THEN RAISE EXCEPTION 'Active owned approval session required'; END IF;
  PERFORM assessment_guidance_check_sources(NEW);
 ELSE
  IF ROW(NEW.approved_at,NEW.approved_by_user_id,NEW.approved_doctor_id,NEW.approved_session_id) IS DISTINCT FROM ROW(OLD.approved_at,OLD.approved_by_user_id,OLD.approved_doctor_id,OLD.approved_session_id) THEN RAISE EXCEPTION 'Mapping approval evidence is immutable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=NEW.revoked_session_id AND s.user_id=NEW.revoked_by_user_id AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE') THEN RAISE EXCEPTION 'Active owned revocation session required'; END IF;
  IF OLD.status='APPROVED' THEN
   IF guidance_lock_doctor(NEW.revoked_by_user_id,NEW.clinic_id) IS NULL THEN RAISE EXCEPTION 'Qualified doctor revocation required'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM clinical_clinic_accesses a JOIN user_roles ur ON ur.user_id=a.user_id JOIN roles r ON r.id=ur.role_id WHERE a.user_id=NEW.revoked_by_user_id AND a.clinic_id=NEW.clinic_id AND r.code='ADMIN') AND guidance_doctor_id(NEW.revoked_by_user_id,NEW.clinic_id) IS NULL THEN RAISE EXCEPTION 'Scoped author or doctor required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_guidance_guard BEFORE INSERT OR UPDATE OR DELETE ON assessment_guidance_versions FOR EACH ROW EXECUTE FUNCTION assessment_guidance_guard();
