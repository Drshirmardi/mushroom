BEGIN;
-- PostgreSQL CHECK accepts UNKNOWN. An explicitly final tuple must reject every NULL hole.
ALTER TABLE custom_program_care_authorizations DROP CONSTRAINT custom_program_care_shape;
ALTER TABLE custom_program_care_authorizations ADD CONSTRAINT custom_program_care_shape CHECK (COALESCE(
 version_number>0 AND authorization_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{1,200}$' AND (
 (withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL AND withdrawn_session_id IS NULL AND withdrawal_reason IS NULL AND withdrawal_idempotency_key IS NULL) OR
 (withdrawn_at IS NOT NULL AND withdrawn_at>=accepted_at AND withdrawn_by_user_id IS NOT NULL AND withdrawn_session_id IS NOT NULL AND withdrawal_reason IN('PATIENT_WITHDRAWAL','SUPERSEDED') AND withdrawal_idempotency_key ~ '^[!-~]{1,200}$')),false));
COMMIT;
