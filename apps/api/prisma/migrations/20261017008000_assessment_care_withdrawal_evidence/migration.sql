BEGIN;
-- Preserve applied57; SQL CHECK must reject a missing withdrawal command, not accept UNKNOWN.
ALTER TABLE assessment_care_shares DROP CONSTRAINT assessment_care_share_shape;
ALTER TABLE assessment_care_shares ADD CONSTRAINT assessment_care_share_shape CHECK (COALESCE(
 protocol_hash ~ '^[a-f0-9]{64}$' AND source_hash ~ '^[a-f0-9]{64}$' AND context_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND care_policy_content_hash ~ '^[a-f0-9]{64}$'
 AND idempotency_key ~ '^[!-~]{8,200}$' AND ((withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL AND withdrawn_session_id IS NULL AND withdrawal_idempotency_key IS NULL)
  OR (withdrawn_at>=accepted_at AND withdrawn_by_user_id IS NOT NULL AND withdrawn_session_id IS NOT NULL AND withdrawal_idempotency_key IS NOT NULL AND withdrawal_idempotency_key ~ '^[!-~]{8,200}$')),false));
COMMIT;
