-- Make the explicit Phase 07 prescription-issuance capability available to the
-- current default clinical issuer only. Future role-to-capability changes use
-- the existing clinical_role_permissions mapping; ADMIN and STAFF are not
-- granted this capability implicitly.
INSERT INTO "clinical_role_permissions" ("role_id", "permission")
SELECT "id", 'PRESCRIPTION_ISSUE'::"clinical_permission"
FROM "roles"
WHERE "code" = 'DOCTOR'
ON CONFLICT ("role_id", "permission") DO NOTHING;
