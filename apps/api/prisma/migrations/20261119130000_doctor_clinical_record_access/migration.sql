-- Doctors need read and edit access to clinical records to carry out assigned
-- consultations. Signing, amendment, and prescription issuance stay separate.
INSERT INTO "clinical_role_permissions" ("role_id", "permission")
SELECT "id", permission::"clinical_permission"
FROM "roles"
CROSS JOIN (VALUES ('CLINICAL_RECORD_VIEW'), ('CLINICAL_RECORD_EDIT')) AS grants(permission)
WHERE "code" = 'DOCTOR'
ON CONFLICT ("role_id", "permission") DO NOTHING;
