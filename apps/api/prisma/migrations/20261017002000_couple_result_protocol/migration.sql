-- CreateTable
CREATE TABLE "couple_result_protocol_versions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "protocol_review_id" UUID NOT NULL,
    "disclosure_policy_version_id" UUID NOT NULL,
    "disclosure_content_hash" CHAR(64) NOT NULL,
    "questionnaire_content_hash" CHAR(64) NOT NULL,
    "version_number" INTEGER NOT NULL,
    "algorithm_id" VARCHAR(80) NOT NULL DEFAULT 'APPROVED_PAIR_LOOKUP',
    "algorithm_version" INTEGER NOT NULL DEFAULT 1,
    "pairs" JSONB NOT NULL,
    "content_references" JSONB NOT NULL,
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

    CONSTRAINT "couple_result_protocol_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "couple_result_protocol_clinic_status_created_idx" ON "couple_result_protocol_versions"("clinic_id", "status", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_result_protocol_source_number_key" ON "couple_result_protocol_versions"("assessment_version_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "couple_result_protocol_command_key" ON "couple_result_protocol_versions"("clinic_id", "created_by_user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_assessment_version_id_clin_fkey" FOREIGN KEY ("assessment_version_id", "clinic_id") REFERENCES "assessment_versions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_protocol_review_id_fkey" FOREIGN KEY ("protocol_review_id") REFERENCES "assessment_protocol_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_disclosure_policy_version__fkey" FOREIGN KEY ("disclosure_policy_version_id") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_created_session_id_fkey" FOREIGN KEY ("created_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_approved_doctor_id_clinic__fkey" FOREIGN KEY ("approved_doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_approved_session_id_fkey" FOREIGN KEY ("approved_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_result_protocol_versions" ADD CONSTRAINT "couple_result_protocol_versions_revoked_session_id_fkey" FOREIGN KEY ("revoked_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE couple_result_protocol_versions ADD CONSTRAINT couple_result_protocol_shape CHECK (COALESCE(
 version_number>0 AND algorithm_id='APPROVED_PAIR_LOOKUP' AND algorithm_version=1
 AND content_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND questionnaire_content_hash ~ '^[a-f0-9]{64}$' AND disclosure_content_hash ~ '^[a-f0-9]{64}$'
 AND idempotency_key ~ '^[!-~]{8,200}$' AND jsonb_typeof(pairs)='array' AND jsonb_array_length(pairs) BETWEEN 1 AND 528 AND octet_length(pairs::text)<=131072
 AND jsonb_typeof(content_references)='array' AND jsonb_array_length(content_references) BETWEEN 1 AND 50
 AND ((status='DRAFT' AND approved_at IS NULL AND revoked_at IS NULL) OR (status='APPROVED' AND approved_at IS NOT NULL AND revoked_at IS NULL) OR (status='REVOKED' AND revoked_at IS NOT NULL))
 AND ((approved_at IS NULL AND approved_by_user_id IS NULL AND approved_doctor_id IS NULL AND approved_session_id IS NULL)
   OR (approved_at>=created_at AND approved_by_user_id IS NOT NULL AND approved_doctor_id IS NOT NULL AND approved_session_id IS NOT NULL))
 AND ((revoked_at IS NULL AND revoked_by_user_id IS NULL AND revoked_session_id IS NULL)
   OR (revoked_at>=COALESCE(approved_at,created_at) AND revoked_by_user_id IS NOT NULL AND revoked_session_id IS NOT NULL)),false));

CREATE FUNCTION couple_result_protocol_dependencies(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM couple_result_protocol_versions joint JOIN assessment_versions v ON v.id=joint.assessment_version_id AND v.clinic_id=joint.clinic_id
  JOIN assessment_protocol_reviews review ON review.id=joint.protocol_review_id AND review.assessment_version_id=v.id AND review.clinic_id=v.clinic_id
  JOIN consent_policy_versions processing ON processing.id=review.consent_policy_version_id
  JOIN consent_policy_versions disclosure ON disclosure.id=joint.disclosure_policy_version_id
  WHERE joint.id=target AND v.status='PUBLISHED' AND v.content_hash=joint.questionnaire_content_hash AND review.questionnaire_content_hash=v.content_hash
   AND review.id=(SELECT id FROM assessment_protocol_reviews WHERE assessment_version_id=v.id ORDER BY review_number DESC LIMIT 1) AND review.decision='APPROVED'
   AND processing.status='ACTIVE' AND processing.content_hash=review.consent_content_hash AND processing.clinic_id=v.clinic_id
   AND guidance_doctor_id(review.actor_user_id,v.clinic_id)=review.doctor_profile_id
   AND disclosure.policy_key='COUPLES_RESULT_SHARING' AND disclosure.clinic_id=v.clinic_id AND disclosure.locale=v.locale AND disclosure.status='ACTIVE' AND disclosure.activated_at IS NOT NULL AND disclosure.content_hash=joint.disclosure_content_hash
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(joint.content_references) ref LEFT JOIN guidance_content_versions c ON c.id=(ref->>'id')::uuid
    WHERE c.id IS NULL OR c.clinic_id<>v.clinic_id OR c.locale<>v.locale OR c.status<>'APPROVED' OR c.content_hash<>ref->>'contentHash' OR guidance_doctor_id(c.approved_by_user_id,v.clinic_id) IS DISTINCT FROM c.approved_doctor_id));
$$;
CREATE FUNCTION couple_result_protocol_usable(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM couple_result_protocol_versions p WHERE p.id=target AND p.status='APPROVED' AND guidance_doctor_id(p.approved_by_user_id,p.clinic_id)=p.approved_doctor_id AND couple_result_protocol_dependencies(p.id));
$$;

CREATE FUNCTION couple_result_protocol_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; actor_session uuid; source assessment_versions; review assessment_protocol_reviews; disclosure consent_policy_versions;
 previous couple_result_protocol_versions; pair jsonb; ref jsonb; content guidance_content_versions; first_index bigint; second_index bigint; band_count int; seen text[]:='{}'; pair_key text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Joint protocol history is retained'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) THEN RAISE EXCEPTION 'Joint protocol definition is immutable'; END IF;
  IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  IF OLD.status='REVOKED' OR NEW.status NOT IN('APPROVED','REVOKED') OR OLD.status=NEW.status THEN RAISE EXCEPTION 'Joint protocol lifecycle is final'; END IF;
  IF NEW.status='APPROVED' THEN actor:=NEW.approved_by_user_id; actor_session:=NEW.approved_session_id;
  ELSE actor:=NEW.revoked_by_user_id; actor_session:=NEW.revoked_session_id;
   IF ROW(NEW.approved_at,NEW.approved_by_user_id,NEW.approved_doctor_id,NEW.approved_session_id) IS DISTINCT FROM ROW(OLD.approved_at,OLD.approved_by_user_id,OLD.approved_doctor_id,OLD.approved_session_id) THEN RAISE EXCEPTION 'Joint approval evidence is immutable'; END IF;
  END IF;
 ELSE
  IF NEW.status<>'DRAFT' OR NEW.approved_at IS NOT NULL OR NEW.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Joint protocol begins as a draft'; END IF;
  actor:=NEW.created_by_user_id; actor_session:=NEW.created_session_id;
 END IF;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=actor_session AND s.user_id=actor AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' FOR SHARE OF s,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active owned joint protocol session required'; END IF;
 PERFORM c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.id=NEW.clinic_id AND c.status='ACTIVE' AND a.user_id=actor FOR SHARE OF c,a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active same-clinic joint protocol membership required'; END IF;
 IF TG_OP='INSERT' THEN
  PERFORM ur.role_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=actor AND r.code='ADMIN' FOR SHARE OF ur,r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Joint protocol administrator required'; END IF;
 ELSIF NEW.status='REVOKED' AND OLD.approved_at IS NULL THEN
  IF guidance_lock_doctor(actor,NEW.clinic_id) IS NULL THEN
   PERFORM ur.role_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=actor AND r.code='ADMIN' FOR SHARE OF ur,r;
   IF NOT FOUND THEN RAISE EXCEPTION 'Joint protocol administrator required'; END IF;
  END IF;
 ELSE
  IF guidance_lock_doctor(actor,NEW.clinic_id) IS NULL OR NEW.status='APPROVED' AND guidance_doctor_id(actor,NEW.clinic_id) IS DISTINCT FROM NEW.approved_doctor_id THEN RAISE EXCEPTION 'Qualified joint protocol physician required'; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||NEW.assessment_version_id::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('couple-protocol:'||NEW.assessment_version_id::text,0));
 IF TG_OP='UPDATE' AND NEW.status='REVOKED' THEN RETURN NEW; END IF;
 SELECT * INTO source FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id FOR SHARE;
 IF source.id IS NULL OR source.status<>'PUBLISHED' OR source.content_hash<>NEW.questionnaire_content_hash THEN RAISE EXCEPTION 'Exact current joint source required'; END IF;
 SELECT * INTO review FROM assessment_protocol_reviews WHERE assessment_version_id=source.id ORDER BY review_number DESC LIMIT 1;
 IF review.id IS NULL OR review.id<>NEW.protocol_review_id OR review.decision<>'APPROVED' OR review.questionnaire_content_hash<>source.content_hash OR guidance_lock_doctor(review.actor_user_id,NEW.clinic_id) IS DISTINCT FROM review.doctor_profile_id THEN RAISE EXCEPTION 'Exact current individual protocol required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id IN(review.consent_policy_version_id,NEW.disclosure_policy_version_id) ORDER BY id FOR SHARE;
 SELECT * INTO disclosure FROM consent_policy_versions WHERE id=NEW.disclosure_policy_version_id AND clinic_id=NEW.clinic_id;
 IF disclosure.id IS NULL OR disclosure.status<>'ACTIVE' OR disclosure.activated_at IS NULL OR disclosure.policy_key<>'COUPLES_RESULT_SHARING' OR disclosure.locale<>source.locale OR disclosure.content_hash<>NEW.disclosure_content_hash
  OR NOT EXISTS(SELECT 1 FROM consent_policy_versions WHERE id=review.consent_policy_version_id AND status='ACTIVE' AND content_hash=review.consent_content_hash AND clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Exact active processing and joint disclosure required'; END IF;
 IF jsonb_typeof(source.structure->'resultBands') IS DISTINCT FROM 'array' OR jsonb_typeof(NEW.pairs) IS DISTINCT FROM 'array' OR jsonb_typeof(NEW.content_references) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Explicit joint definition arrays required'; END IF;
 band_count:=jsonb_array_length(source.structure->'resultBands');
 IF band_count NOT BETWEEN 1 AND 32 OR EXISTS(SELECT 1 FROM jsonb_array_elements(source.structure->'resultBands') b WHERE b->'requiresReview'='true'::jsonb) THEN RAISE EXCEPTION 'Supported individual result bands required'; END IF;
 FOR pair IN SELECT value FROM jsonb_array_elements(NEW.pairs) LOOP
  SELECT ordinality INTO first_index FROM jsonb_array_elements(source.structure->'resultBands') WITH ORDINALITY b WHERE b.value->>'id'=pair->>'firstBandId';
  SELECT ordinality INTO second_index FROM jsonb_array_elements(source.structure->'resultBands') WITH ORDINALITY b WHERE b.value->>'id'=pair->>'secondBandId';
  IF first_index IS NULL OR second_index IS NULL OR first_index>second_index OR jsonb_typeof(pair->'guidanceContentIds') IS DISTINCT FROM 'array' OR jsonb_typeof(pair->'recommendConsultation') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Exact canonical joint pair required'; END IF;
  pair_key:=first_index::text||':'||second_index::text; IF pair_key=ANY(seen) THEN RAISE EXCEPTION 'Duplicate unordered joint pair'; END IF; seen:=array_append(seen,pair_key);
  IF jsonb_array_length(pair->'guidanceContentIds') NOT BETWEEN 1 AND 5 OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(pair->'guidanceContentIds'))<>jsonb_array_length(pair->'guidanceContentIds') THEN RAISE EXCEPTION 'Unique bounded joint content required'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(pair->'guidanceContentIds') id WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.content_references) r WHERE r->>'id'=id)) THEN RAISE EXCEPTION 'Pinned joint content reference required'; END IF;
 END LOOP;
 IF NEW.status='APPROVED' AND jsonb_array_length(NEW.pairs)<>band_count*(band_count+1)/2 THEN RAISE EXCEPTION 'Exhaustive joint pair coverage required'; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(NEW.content_references))<>jsonb_array_length(NEW.content_references) THEN RAISE EXCEPTION 'Unique joint content references required'; END IF;
 PERFORM id FROM guidance_content_versions WHERE id IN(SELECT (value->>'id')::uuid FROM jsonb_array_elements(NEW.content_references)) ORDER BY id FOR SHARE;
 FOR ref IN SELECT value FROM jsonb_array_elements(NEW.content_references) LOOP
  SELECT * INTO content FROM guidance_content_versions WHERE id=(ref->>'id')::uuid;
  IF content.id IS NULL OR content.clinic_id<>NEW.clinic_id OR content.locale<>source.locale OR content.status<>'APPROVED' OR content.content_hash IS DISTINCT FROM ref->>'contentHash' OR guidance_lock_doctor(content.approved_by_user_id,NEW.clinic_id) IS DISTINCT FROM content.approved_doctor_id
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.pairs) p,jsonb_array_elements_text(p->'guidanceContentIds') used WHERE used=ref->>'id') THEN RAISE EXCEPTION 'Exact currently approved joint education required'; END IF;
 END LOOP;
 IF TG_OP='INSERT' THEN
  SELECT * INTO previous FROM couple_result_protocol_versions WHERE assessment_version_id=source.id ORDER BY version_number DESC LIMIT 1;
  IF NEW.version_number<>COALESCE(previous.version_number,0)+1 THEN RAISE EXCEPTION 'Consecutive retained joint versions required'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER couple_result_protocol_guard BEFORE INSERT OR UPDATE OR DELETE ON couple_result_protocol_versions FOR EACH ROW EXECUTE FUNCTION couple_result_protocol_guard();
