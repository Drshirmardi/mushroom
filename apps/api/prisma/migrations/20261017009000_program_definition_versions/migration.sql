BEGIN;

-- CreateTable
CREATE TABLE "program_definition_versions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "program_key" VARCHAR(100) NOT NULL,
    "locale" VARCHAR(40) NOT NULL,
    "version_number" INTEGER NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "summary" VARCHAR(2000) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "body" TEXT NOT NULL,
    "eligibility_description" VARCHAR(4000) NOT NULL,
    "safety" JSONB NOT NULL,
    "content_references" JSONB NOT NULL,
    "doctor_service_id" UUID,
    "service_snapshot" JSONB,
    "content_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" UUID NOT NULL,
    "created_session_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_user_id" UUID,
    "approved_doctor_id" UUID,
    "approved_session_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "revoked_by_user_id" UUID,
    "revoked_session_id" UUID,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "program_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_definitions_clinic_status_created_idx" ON "program_definition_versions"("clinic_id", "status", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "program_definitions_identity_version_key" ON "program_definition_versions"("clinic_id", "program_key", "locale", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "program_definitions_command_key" ON "program_definition_versions"("clinic_id", "created_by_user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_doctor_service_id_clinic_id_fkey" FOREIGN KEY ("doctor_service_id", "clinic_id") REFERENCES "doctor_services"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_created_session_id_fkey" FOREIGN KEY ("created_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_approved_doctor_id_fkey" FOREIGN KEY ("approved_doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_approved_session_id_fkey" FOREIGN KEY ("approved_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_definition_versions" ADD CONSTRAINT "program_definition_versions_revoked_session_id_fkey" FOREIGN KEY ("revoked_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No legacy content, patient treatment, permissions or actual program is promoted.
CREATE FUNCTION program_definition_shape(safety jsonb, refs jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE field text; ref jsonb; item jsonb; seen text[]:='{}';
BEGIN
 IF jsonb_typeof(safety) IS DISTINCT FROM 'object' OR safety-ARRAY['intendedAudience','limitations','contraindications','seekProfessionalCare']<>'{}'::jsonb OR NOT safety ?& ARRAY['intendedAudience','limitations','contraindications','seekProfessionalCare'] THEN RETURN false; END IF;
 FOREACH field IN ARRAY ARRAY['intendedAudience','limitations','seekProfessionalCare'] LOOP
  IF jsonb_typeof(safety->field) IS DISTINCT FROM 'string' OR COALESCE(length(btrim(safety->>field)),0)=0 THEN RETURN false; END IF;
 END LOOP;
 IF length(safety->>'intendedAudience')>1000 OR length(safety->>'limitations')>4000 OR length(safety->>'seekProfessionalCare')>2000 OR jsonb_typeof(safety->'contraindications') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(safety->'contraindications')>20 THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(safety->'contraindications') LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' OR length(btrim(item#>>'{}')) NOT BETWEEN 1 AND 1000 THEN RETURN false; END IF;
 END LOOP;
 IF jsonb_typeof(refs) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(refs)>50 THEN RETURN false; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(refs) LOOP
  IF jsonb_typeof(ref) IS DISTINCT FROM 'object' OR ref-ARRAY['id','contentHash']<>'{}'::jsonb OR NOT COALESCE(ref->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' AND ref->>'contentHash' ~ '^[a-f0-9]{64}$',false) OR ref->>'id'=ANY(seen) THEN RETURN false; END IF;
  seen:=array_append(seen,ref->>'id');
 END LOOP;
 RETURN true;
END $$;
ALTER TABLE program_definition_versions ADD CONSTRAINT program_definition_shape_check CHECK (COALESCE(
 version_number>0 AND program_key ~ '^[A-Z][A-Z0-9_]{2,99}$' AND locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$'
 AND length(btrim(title))>0 AND length(btrim(summary))>0 AND length(btrim(category))>0 AND length(btrim(body)) BETWEEN 1 AND 100000 AND length(btrim(eligibility_description))>0
 AND content_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{8,200}$'
 AND program_definition_shape(safety,content_references)
 AND ((kind='READY_EDUCATION' AND jsonb_array_length(content_references)>=1 AND doctor_service_id IS NULL AND service_snapshot IS NULL)
   OR (kind='CUSTOM_PROFESSIONAL_PLAN' AND doctor_service_id IS NOT NULL AND jsonb_typeof(service_snapshot)='object'))
 AND ((status='DRAFT' AND approved_at IS NULL AND revoked_at IS NULL) OR (status='APPROVED' AND approved_at IS NOT NULL AND revoked_at IS NULL) OR (status='REVOKED' AND revoked_at IS NOT NULL))
 AND ((approved_at IS NULL AND approved_by_user_id IS NULL AND approved_doctor_id IS NULL AND approved_session_id IS NULL)
   OR (approved_at>=created_at AND approved_by_user_id IS NOT NULL AND approved_doctor_id IS NOT NULL AND approved_session_id IS NOT NULL))
 AND ((revoked_at IS NULL AND revoked_by_user_id IS NULL AND revoked_session_id IS NULL)
   OR (revoked_at>=COALESCE(approved_at,created_at) AND revoked_by_user_id IS NOT NULL AND revoked_session_id IS NOT NULL)),false));

CREATE FUNCTION program_definition_service_snapshot(target uuid, scope uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('id',ds.id,'doctorId',ds.doctor_id,'serviceId',ds.service_id,'visitMode',ds.visit_mode,'durationMinutes',ds.duration_minutes)
 FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id AND d.clinic_id=ds.clinic_id JOIN services s ON s.id=ds.service_id AND s.clinic_id=ds.clinic_id
 WHERE ds.id=target AND ds.clinic_id=scope AND ds.is_active AND ds.publication_status='PUBLISHED' AND ds.published_at IS NOT NULL
 AND d.is_active AND d.publication_status='PUBLISHED' AND d.published_at IS NOT NULL AND s.is_active AND s.publication_status='PUBLISHED' AND s.published_at IS NOT NULL
$$;
CREATE FUNCTION program_definition_dependencies(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_definition_versions p JOIN clinics clinic ON clinic.id=p.clinic_id AND clinic.status='ACTIVE' WHERE p.id=target
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p.content_references) ref LEFT JOIN guidance_content_versions g ON g.id=(ref->>'id')::uuid
   WHERE g.id IS NULL OR g.clinic_id<>p.clinic_id OR g.locale<>p.locale OR g.content_hash<>ref->>'contentHash' OR g.status<>'APPROVED' OR guidance_doctor_id(g.approved_by_user_id,g.clinic_id) IS DISTINCT FROM g.approved_doctor_id)
 AND (p.doctor_service_id IS NULL OR p.service_snapshot=program_definition_service_snapshot(p.doctor_service_id,p.clinic_id)))
$$;
CREATE FUNCTION program_definition_usable(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_definition_versions p WHERE p.id=target AND p.status='APPROVED' AND guidance_doctor_id(p.approved_by_user_id,p.clinic_id)=p.approved_doctor_id AND program_definition_dependencies(p.id))
$$;
CREATE FUNCTION program_definition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; actor_session uuid; previous program_definition_versions; ref jsonb; content guidance_content_versions;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Program definition history is retained'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) THEN RAISE EXCEPTION 'Program definition is immutable'; END IF;
  IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  IF OLD.status='REVOKED' OR NEW.status NOT IN('APPROVED','REVOKED') OR OLD.status=NEW.status THEN RAISE EXCEPTION 'Program lifecycle is final'; END IF;
  IF NEW.status='APPROVED' THEN actor:=NEW.approved_by_user_id; actor_session:=NEW.approved_session_id;
  ELSE actor:=NEW.revoked_by_user_id; actor_session:=NEW.revoked_session_id;
   IF ROW(NEW.approved_at,NEW.approved_by_user_id,NEW.approved_doctor_id,NEW.approved_session_id) IS DISTINCT FROM ROW(OLD.approved_at,OLD.approved_by_user_id,OLD.approved_doctor_id,OLD.approved_session_id) THEN RAISE EXCEPTION 'Program approval evidence is immutable'; END IF;
  END IF;
 ELSE
  IF NEW.status<>'DRAFT' OR NEW.approved_at IS NOT NULL OR NEW.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Program begins as draft'; END IF;
  actor:=NEW.created_by_user_id; actor_session:=NEW.created_session_id;
 END IF;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=actor_session AND s.user_id=actor AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active owned program command session required'; END IF;
 PERFORM c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.id=NEW.clinic_id AND c.status='ACTIVE' AND a.user_id=actor FOR SHARE OF c,a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active program clinic membership required'; END IF;
 IF TG_OP='INSERT' OR NEW.status='REVOKED' AND OLD.approved_at IS NULL AND guidance_doctor_id(actor,NEW.clinic_id) IS NULL THEN
  PERFORM ur.role_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=actor AND r.code='ADMIN' FOR SHARE OF ur,r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Program administrator required'; END IF;
 ELSE
  IF guidance_lock_doctor(actor,NEW.clinic_id) IS NULL OR NEW.status='APPROVED' AND guidance_doctor_id(actor,NEW.clinic_id) IS DISTINCT FROM NEW.approved_doctor_id THEN RAISE EXCEPTION 'Qualified program physician required'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.status='REVOKED' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('program-version:'||NEW.clinic_id::text||':'||NEW.program_key||':'||NEW.locale,0));
  SELECT * INTO previous FROM program_definition_versions WHERE clinic_id=NEW.clinic_id AND program_key=NEW.program_key AND locale=NEW.locale ORDER BY version_number DESC LIMIT 1;
  IF NEW.version_number<>COALESCE(previous.version_number,0)+1 OR previous.id IS NOT NULL AND previous.kind<>NEW.kind THEN RAISE EXCEPTION 'Consecutive stable program identity required'; END IF;
 END IF;
 IF NOT program_definition_shape(NEW.safety,NEW.content_references) THEN RAISE EXCEPTION 'Program safety and exact source shape required'; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(NEW.content_references) ORDER BY value->>'id' LOOP
  SELECT * INTO content FROM guidance_content_versions WHERE id=(ref->>'id')::uuid AND clinic_id=NEW.clinic_id FOR SHARE;
  IF content.id IS NULL OR content.locale<>NEW.locale OR content.content_hash<>ref->>'contentHash' OR content.status<>'APPROVED' OR guidance_lock_doctor(content.approved_by_user_id,NEW.clinic_id) IS DISTINCT FROM content.approved_doctor_id THEN RAISE EXCEPTION 'Exact approved program educational source required'; END IF;
 END LOOP;
 IF NEW.doctor_service_id IS NOT NULL THEN
  PERFORM ds.id FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id AND d.clinic_id=ds.clinic_id JOIN services s ON s.id=ds.service_id AND s.clinic_id=ds.clinic_id WHERE ds.id=NEW.doctor_service_id AND ds.clinic_id=NEW.clinic_id FOR SHARE OF ds,d,s;
  IF NEW.service_snapshot IS DISTINCT FROM program_definition_service_snapshot(NEW.doctor_service_id,NEW.clinic_id) OR NEW.service_snapshot IS NULL THEN RAISE EXCEPTION 'Exact published program professional service required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_definition_guard BEFORE INSERT OR UPDATE OR DELETE ON program_definition_versions FOR EACH ROW EXECUTE FUNCTION program_definition_guard();
COMMIT;
