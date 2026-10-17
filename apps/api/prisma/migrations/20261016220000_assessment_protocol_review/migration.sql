-- CreateTable
CREATE TABLE "assessment_protocol_reviews" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "review_number" INTEGER NOT NULL,
    "decision" VARCHAR(20) NOT NULL,
    "questionnaire_content_hash" CHAR(64) NOT NULL,
    "algorithm_id" VARCHAR(80) NOT NULL,
    "algorithm_version" INTEGER NOT NULL,
    "consent_policy_version_id" UUID NOT NULL,
    "consent_content_hash" CHAR(64) NOT NULL,
    "protocol_hash" CHAR(64) NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_session_id" UUID NOT NULL,
    "doctor_profile_id" UUID NOT NULL,
    "withdrawal_of_id" UUID,
    "withdrawal_reason" VARCHAR(500),
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_protocol_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_protocol_reviews_withdrawal_key" ON "assessment_protocol_reviews"("withdrawal_of_id");

-- CreateIndex
CREATE INDEX "assessment_protocol_reviews_clinic_created_idx" ON "assessment_protocol_reviews"("clinic_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_protocol_reviews_source_number_key" ON "assessment_protocol_reviews"("assessment_version_id", "review_number");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_protocol_reviews_command_key" ON "assessment_protocol_reviews"("clinic_id", "actor_user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "assessment_protocol_reviews" ADD CONSTRAINT "assessment_protocol_reviews_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_protocol_reviews" ADD CONSTRAINT "assessment_protocol_reviews_assessment_version_id_clinic_i_fkey" FOREIGN KEY ("assessment_version_id", "clinic_id") REFERENCES "assessment_versions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_protocol_reviews" ADD CONSTRAINT "assessment_protocol_reviews_consent_policy_version_id_fkey" FOREIGN KEY ("consent_policy_version_id") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_protocol_reviews" ADD CONSTRAINT "assessment_protocol_reviews_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_protocol_reviews" ADD CONSTRAINT "assessment_protocol_reviews_actor_session_id_fkey" FOREIGN KEY ("actor_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_protocol_reviews" ADD CONSTRAINT "assessment_protocol_reviews_doctor_profile_id_clinic_id_fkey" FOREIGN KEY ("doctor_profile_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_protocol_reviews" ADD CONSTRAINT "assessment_protocol_reviews_withdrawal_of_id_fkey" FOREIGN KEY ("withdrawal_of_id") REFERENCES "assessment_protocol_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE assessment_protocol_reviews ADD CONSTRAINT assessment_protocol_review_shape CHECK (
 review_number>0 AND decision IN ('APPROVED','WITHDRAWN') AND algorithm_id='WEIGHTED_SUM' AND algorithm_version=1
 AND questionnaire_content_hash ~ '^[a-f0-9]{64}$' AND consent_content_hash ~ '^[a-f0-9]{64}$'
 AND protocol_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$'
 AND idempotency_key ~ '^[!-~]{8,200}$'
 AND ((decision='APPROVED' AND withdrawal_of_id IS NULL AND withdrawal_reason IS NULL)
   OR (decision='WITHDRAWN' AND withdrawal_of_id IS NOT NULL AND withdrawal_reason IS NOT NULL AND length(btrim(withdrawal_reason)) BETWEEN 1 AND 500))
);
CREATE FUNCTION assessment_protocol_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous assessment_protocol_reviews; source assessment_versions; policy consent_policy_versions;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Assessment protocol reviews are immutable retained history'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||NEW.assessment_version_id::text,0));
 SELECT * INTO previous FROM assessment_protocol_reviews WHERE assessment_version_id=NEW.assessment_version_id ORDER BY review_number DESC LIMIT 1;
 IF NEW.review_number<>COALESCE(previous.review_number,0)+1 THEN RAISE EXCEPTION 'Protocol review numbers must be consecutive'; END IF;
 IF previous.id IS NOT NULL AND NEW.created_at<previous.created_at THEN RAISE EXCEPTION 'Protocol review time must be monotonic'; END IF;
 SELECT * INTO source FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id;
 IF NOT FOUND OR source.content_hash<>NEW.questionnaire_content_hash THEN RAISE EXCEPTION 'Exact same-clinic questionnaire hash required'; END IF;
 SELECT * INTO policy FROM consent_policy_versions WHERE id=NEW.consent_policy_version_id AND clinic_id=NEW.clinic_id FOR SHARE;
 IF NOT FOUND OR policy.policy_key<>'ASSESSMENT_PROCESSING' OR policy.locale<>source.locale OR policy.content_hash<>NEW.consent_content_hash THEN RAISE EXCEPTION 'Exact same-clinic assessment-processing consent required'; END IF;
 IF guidance_lock_doctor(NEW.actor_user_id,NEW.clinic_id) IS DISTINCT FROM NEW.doctor_profile_id THEN RAISE EXCEPTION 'Qualified scoped physician review required'; END IF;
 PERFORM id FROM sessions WHERE id=NEW.actor_session_id AND user_id=NEW.actor_user_id AND revoked_at IS NULL AND expires_at>now() FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active owned physician session required'; END IF;
 IF NEW.decision='APPROVED' THEN
  IF source.status<>'PUBLISHED' OR source.published_at IS NULL OR policy.status<>'ACTIVE' OR policy.activated_at IS NULL THEN RAISE EXCEPTION 'Active protocol source and consent required'; END IF;
 ELSE
  IF previous.id IS NULL OR previous.decision<>'APPROVED' OR previous.id<>NEW.withdrawal_of_id
   OR ROW(previous.clinic_id,previous.assessment_version_id,previous.questionnaire_content_hash,previous.algorithm_id,previous.algorithm_version,previous.consent_policy_version_id,previous.consent_content_hash,previous.protocol_hash)
   IS DISTINCT FROM ROW(NEW.clinic_id,NEW.assessment_version_id,NEW.questionnaire_content_hash,NEW.algorithm_id,NEW.algorithm_version,NEW.consent_policy_version_id,NEW.consent_content_hash,NEW.protocol_hash) THEN
   RAISE EXCEPTION 'Only the current exact approval may be withdrawn';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_protocol_review_guard BEFORE INSERT OR UPDATE OR DELETE ON assessment_protocol_reviews FOR EACH ROW EXECUTE FUNCTION assessment_protocol_review_guard();
