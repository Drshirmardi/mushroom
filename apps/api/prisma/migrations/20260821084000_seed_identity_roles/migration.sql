-- System roles are required reference data, not optional development fixtures.
INSERT INTO "roles" ("id", "code", "description", "updated_at")
VALUES
    (gen_random_uuid(), 'PATIENT', 'Patient application access', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'DOCTOR', 'Doctor clinical access', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'STAFF', 'Clinic staff access', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'ADMIN', 'Administrative access', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "description" = EXCLUDED."description",
    "updated_at" = CURRENT_TIMESTAMP;
