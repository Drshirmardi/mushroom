-- CreateTable
CREATE TABLE "guidance_content_versions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "locale" VARCHAR(40) NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(240) NOT NULL,
    "summary" VARCHAR(500),
    "body" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "safety" JSONB NOT NULL,
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

    CONSTRAINT "guidance_content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guidance_content_versions_clinic_status_created_idx" ON "guidance_content_versions"("clinic_id", "status", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "guidance_content_versions_article_version_key" ON "guidance_content_versions"("clinic_id", "article_id", "locale", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "guidance_content_versions_command_key" ON "guidance_content_versions"("clinic_id", "created_by_user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "guidance_content_versions" ADD CONSTRAINT "guidance_content_versions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guidance_content_versions" ADD CONSTRAINT "guidance_content_versions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guidance_content_versions" ADD CONSTRAINT "guidance_content_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guidance_content_versions" ADD CONSTRAINT "guidance_content_versions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guidance_content_versions" ADD CONSTRAINT "guidance_content_versions_approved_doctor_id_fkey" FOREIGN KEY ("approved_doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guidance_content_versions" ADD CONSTRAINT "guidance_content_versions_approved_session_id_fkey" FOREIGN KEY ("approved_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guidance_content_versions" ADD CONSTRAINT "guidance_content_versions_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guidance_content_versions" ADD CONSTRAINT "guidance_content_versions_revoked_session_id_fkey" FOREIGN KEY ("revoked_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No legacy Article is promoted or changed by this migration.
ALTER TABLE guidance_content_versions ADD CONSTRAINT guidance_content_shape CHECK (
 version_number > 0 AND content_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$'
 AND length(btrim(title)) > 0 AND length(btrim(body)) > 0
 AND locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$'
 AND kind IN ('GENERAL_EDUCATION','DIETARY_EDUCATION','TEMPERAMENT_INTERPRETATION','PERSONALITY_DESCRIPTION')
 AND jsonb_typeof(provenance)='array' AND jsonb_array_length(provenance) BETWEEN 1 AND 20
 AND jsonb_typeof(safety)='object' AND safety ?& ARRAY['intendedAudience','limitations','contraindications','seekProfessionalCare']
 AND status IN ('DRAFT','APPROVED','REVOKED')
 AND ((approved_at IS NULL AND approved_by_user_id IS NULL AND approved_doctor_id IS NULL AND approved_session_id IS NULL)
   OR (approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL AND approved_doctor_id IS NOT NULL AND approved_session_id IS NOT NULL))
 AND (status <> 'DRAFT' OR approved_at IS NULL)
 AND (status <> 'APPROVED' OR approved_at IS NOT NULL)
 AND ((status='REVOKED' AND revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL AND revoked_session_id IS NOT NULL)
   OR (status<>'REVOKED' AND revoked_at IS NULL AND revoked_by_user_id IS NULL AND revoked_session_id IS NULL))
 AND (approved_at IS NULL OR approved_at >= created_at)
 AND (revoked_at IS NULL OR revoked_at >= COALESCE(approved_at,created_at))
);

CREATE FUNCTION guidance_doctor_id(actor uuid, scope uuid) RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT d.id FROM doctor_profiles d JOIN users u ON u.id=d.user_id
 JOIN clinics c ON c.id=d.clinic_id
 JOIN clinical_clinic_accesses a ON a.clinic_id=d.clinic_id AND a.user_id=u.id
 WHERE d.user_id=actor AND d.clinic_id=scope AND d.is_active AND d.publication_status='PUBLISHED'
 AND d.published_at IS NOT NULL AND u.status='ACTIVE' AND c.status='ACTIVE'
 AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=actor AND r.code='DOCTOR')
 AND EXISTS (SELECT 1 FROM user_roles ur JOIN clinical_role_permissions p ON p.role_id=ur.role_id WHERE ur.user_id=actor AND p.permission='CLINICAL_RECORD_SIGN')
$$;

CREATE FUNCTION guidance_lock_doctor(actor uuid, scope uuid) RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
 PERFORM u.id FROM users u WHERE u.id=actor FOR SHARE;
 PERFORM c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.id=scope AND a.user_id=actor FOR SHARE OF c,a;
 PERFORM d.id FROM doctor_profiles d WHERE d.user_id=actor AND d.clinic_id=scope FOR SHARE;
 PERFORM ur.role_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=actor FOR SHARE OF ur,r;
 PERFORM p.role_id FROM clinical_role_permissions p JOIN user_roles ur ON ur.role_id=p.role_id WHERE ur.user_id=actor AND p.permission='CLINICAL_RECORD_SIGN' FOR SHARE OF p;
 RETURN guidance_doctor_id(actor,scope);
END $$;

CREATE FUNCTION guidance_content_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_version integer;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Guidance history is retained'; END IF;
 IF TG_OP='INSERT' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('guidance-version:'||NEW.article_id::text||':'||NEW.locale,0));
  IF NEW.status<>'DRAFT' OR NEW.approved_at IS NOT NULL OR NEW.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Guidance must start as draft'; END IF;
  IF NOT EXISTS(SELECT 1 FROM articles WHERE id=NEW.article_id AND clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Guidance needs same-clinic article'; END IF;
  SELECT COALESCE(max(version_number),0) INTO previous_version FROM guidance_content_versions WHERE clinic_id=NEW.clinic_id AND article_id=NEW.article_id AND locale=NEW.locale;
  IF NEW.version_number<>previous_version+1 THEN RAISE EXCEPTION 'Guidance versions must be consecutive'; END IF;
  RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) THEN RAISE EXCEPTION 'Guidance snapshot is immutable'; END IF;
 IF NEW.status=OLD.status THEN
  IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN RAISE EXCEPTION 'Guidance evidence is immutable'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.status='REVOKED' OR NEW.status NOT IN ('APPROVED','REVOKED') OR (NEW.status='APPROVED' AND OLD.status<>'DRAFT') THEN RAISE EXCEPTION 'Guidance transition is final'; END IF;
 IF NEW.status='APPROVED' THEN
  IF guidance_lock_doctor(NEW.approved_by_user_id,NEW.clinic_id) IS DISTINCT FROM NEW.approved_doctor_id THEN RAISE EXCEPTION 'Qualified doctor approval required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM sessions WHERE id=NEW.approved_session_id AND user_id=NEW.approved_by_user_id AND revoked_at IS NULL AND expires_at>now()) THEN RAISE EXCEPTION 'Active owned approval session required'; END IF;
 ELSE
  IF ROW(NEW.approved_at,NEW.approved_by_user_id,NEW.approved_doctor_id,NEW.approved_session_id) IS DISTINCT FROM ROW(OLD.approved_at,OLD.approved_by_user_id,OLD.approved_doctor_id,OLD.approved_session_id) THEN RAISE EXCEPTION 'Guidance approval evidence is immutable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=NEW.revoked_session_id AND s.user_id=NEW.revoked_by_user_id AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE') THEN RAISE EXCEPTION 'Active owned revocation session required'; END IF;
  IF OLD.status='APPROVED' THEN
   IF guidance_lock_doctor(NEW.revoked_by_user_id,NEW.clinic_id) IS NULL THEN RAISE EXCEPTION 'Qualified doctor revocation required'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM clinical_clinic_accesses a JOIN user_roles ur ON ur.user_id=a.user_id JOIN roles r ON r.id=ur.role_id WHERE a.user_id=NEW.revoked_by_user_id AND a.clinic_id=NEW.clinic_id AND r.code='ADMIN') AND guidance_doctor_id(NEW.revoked_by_user_id,NEW.clinic_id) IS NULL THEN
   RAISE EXCEPTION 'Scoped author or doctor required';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guidance_content_guard BEFORE INSERT OR UPDATE OR DELETE ON guidance_content_versions FOR EACH ROW EXECUTE FUNCTION guidance_content_guard();
