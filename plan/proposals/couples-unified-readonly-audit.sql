-- Read-only, aggregate-only audit before retiring legacy couples routes.
-- Run against DEV only. Do not run migrations, DELETE, UPDATE or TRUNCATE.
BEGIN TRANSACTION READ ONLY;

SELECT
  (SELECT count(*) FROM marriage_service_requests) AS phone_invitation_requests,
  (SELECT count(*) FROM educational_couple_sessions) AS educational_couple_sessions,
  (SELECT count(*) FROM couple_sessions) AS linked_account_sessions,
  (SELECT count(*) FROM couple_invitations) AS legacy_token_invitations,
  (SELECT count(*) FROM couple_assessment_sessions) AS legacy_couple_test_sessions;

SELECT
  (SELECT count(*) FROM educational_couple_sessions ec
   WHERE NOT EXISTS (SELECT 1 FROM marriage_service_requests mr WHERE mr.educational_id = ec.id))
   AS educational_sessions_without_phone_request,
  (SELECT count(*) FROM couple_sessions cs
   WHERE NOT EXISTS (SELECT 1 FROM marriage_service_requests mr WHERE mr.link_id = cs.id))
   AS links_without_phone_request,
  (SELECT count(*) FROM marriage_service_requests
   WHERE status = 'ACCEPTED' AND educational_id IS NULL)
   AS accepted_requests_without_educational_session;

SELECT status, count(*) AS requests
FROM marriage_service_requests
GROUP BY status
ORDER BY status;

SELECT
  (SELECT count(*) FROM assessment_purchases WHERE educational_couple_session_id IS NOT NULL)
    AS educational_couple_purchases,
  (SELECT count(*) FROM assessment_purchases WHERE couple_assessment_session_id IS NOT NULL)
    AS legacy_couple_purchases,
  (SELECT count(*) FROM assessment_access_grants WHERE educational_couple_participant_id IS NOT NULL)
    AS educational_couple_access_grants,
  (SELECT count(*) FROM assessment_access_grants WHERE couple_assessment_participant_id IS NOT NULL)
    AS legacy_couple_access_grants;

COMMIT;
