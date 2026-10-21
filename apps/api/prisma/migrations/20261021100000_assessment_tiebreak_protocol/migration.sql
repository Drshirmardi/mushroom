-- Qualified exact-version review for the 11+1 engine; no automatic approvals.
ALTER TABLE assessment_protocol_reviews DROP CONSTRAINT assessment_protocol_review_shape;
ALTER TABLE assessment_protocol_reviews ADD CONSTRAINT assessment_protocol_review_shape CHECK (
 review_number>0 AND decision IN ('APPROVED','WITHDRAWN') AND algorithm_id IN ('WEIGHTED_SUM','DIMENSION_TIEBREAK') AND algorithm_version=1
 AND questionnaire_content_hash ~ '^[a-f0-9]{64}$' AND consent_content_hash ~ '^[a-f0-9]{64}$'
 AND protocol_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$'
 AND idempotency_key ~ '^[!-~]{8,200}$'
 AND ((decision='APPROVED' AND withdrawal_of_id IS NULL AND withdrawal_reason IS NULL)
   OR (decision='WITHDRAWN' AND withdrawal_of_id IS NOT NULL AND withdrawal_reason IS NOT NULL AND length(btrim(withdrawal_reason)) BETWEEN 1 AND 500))
);
CREATE OR REPLACE FUNCTION assessment_protocol_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous assessment_protocol_reviews; source assessment_versions; policy consent_policy_versions;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Assessment protocol reviews are immutable retained history'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||NEW.assessment_version_id::text,0));
 SELECT * INTO previous FROM assessment_protocol_reviews WHERE assessment_version_id=NEW.assessment_version_id ORDER BY review_number DESC LIMIT 1;
 IF NEW.review_number<>COALESCE(previous.review_number,0)+1 THEN RAISE EXCEPTION 'Protocol review numbers must be consecutive'; END IF;
 IF previous.id IS NOT NULL AND NEW.created_at<previous.created_at THEN RAISE EXCEPTION 'Protocol review time must be monotonic'; END IF;
 SELECT * INTO source FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id;
 IF NOT FOUND OR (NEW.decision='APPROVED' AND source.content_hash<>NEW.questionnaire_content_hash) THEN RAISE EXCEPTION 'Exact same-clinic questionnaire hash required'; END IF;
 IF NEW.decision='APPROVED' AND (NEW.algorithm_id='DIMENSION_TIEBREAK') IS DISTINCT FROM COALESCE(source.structure->>'schemaVersion'='3',false) THEN RAISE EXCEPTION 'Review algorithm must match questionnaire engine'; END IF;
 SELECT * INTO policy FROM consent_policy_versions WHERE id=NEW.consent_policy_version_id AND clinic_id=NEW.clinic_id FOR SHARE;
 IF NOT FOUND OR policy.policy_key<>'ASSESSMENT_PROCESSING' OR policy.locale<>source.locale OR policy.content_hash<>NEW.consent_content_hash THEN RAISE EXCEPTION 'Exact same-clinic assessment-processing consent required'; END IF;
 IF guidance_lock_doctor(NEW.actor_user_id,NEW.clinic_id) IS DISTINCT FROM NEW.doctor_profile_id THEN RAISE EXCEPTION 'Qualified scoped physician review required'; END IF;
 PERFORM id FROM sessions WHERE id=NEW.actor_session_id AND user_id=NEW.actor_user_id AND revoked_at IS NULL AND expires_at>now() FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active owned physician session required'; END IF;
 IF NEW.decision='APPROVED' THEN
  IF NOT ((source.status='PUBLISHED' AND source.published_at IS NOT NULL) OR (source.status='DRAFT' AND source.structure->>'schemaVersion'='3' AND NEW.algorithm_id='DIMENSION_TIEBREAK')) OR policy.status<>'ACTIVE' OR policy.activated_at IS NULL THEN RAISE EXCEPTION 'Active protocol source and consent required'; END IF;
 ELSE
  IF previous.id IS NULL OR previous.decision<>'APPROVED' OR previous.id<>NEW.withdrawal_of_id
   OR ROW(previous.clinic_id,previous.assessment_version_id,previous.questionnaire_content_hash,previous.algorithm_id,previous.algorithm_version,previous.consent_policy_version_id,previous.consent_content_hash,previous.protocol_hash)
   IS DISTINCT FROM ROW(NEW.clinic_id,NEW.assessment_version_id,NEW.questionnaire_content_hash,NEW.algorithm_id,NEW.algorithm_version,NEW.consent_policy_version_id,NEW.consent_content_hash,NEW.protocol_hash) THEN
   RAISE EXCEPTION 'Only the current exact approval may be withdrawn';
  END IF;
 END IF;
 RETURN NEW;
END $$;
