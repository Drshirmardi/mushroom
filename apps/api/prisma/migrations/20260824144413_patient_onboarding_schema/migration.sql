-- CreateEnum
CREATE TYPE "clinic_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "consent_policy_status" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "medical_intake_submission_state" AS ENUM ('DRAFT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "medical_intake_revision_state" AS ENUM ('DRAFT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "medical_intake_data_origin" AS ENUM ('PATIENT_SELF_REPORTED');

-- CreateEnum
CREATE TYPE "medical_intake_recording_mode" AS ENUM ('PATIENT_ENTRY', 'ADMIN_ON_BEHALF_CORRECTION');

-- CreateEnum
CREATE TYPE "medical_intake_mutation_operation" AS ENUM ('ADMIN_CORRECTION', 'COMPLETE');

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
    "status" "clinic_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(80),
    "last_name" VARCHAR(100),
    "email" VARCHAR(254),
    "city_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_medical_intakes" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "assigned_schema_version" INTEGER NOT NULL DEFAULT 1,
    "current_revision_number" INTEGER NOT NULL DEFAULT 0,
    "completed_revision_number" INTEGER,
    "submission_state" "medical_intake_submission_state" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patient_medical_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_medical_intake_revisions" (
    "id" UUID NOT NULL,
    "intake_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "assigned_schema_version" INTEGER NOT NULL,
    "revision_state" "medical_intake_revision_state" NOT NULL,
    "birth_date" DATE,
    "sex_at_birth" VARCHAR(32),
    "height_cm" INTEGER,
    "weight_kg" DECIMAL(6,2),
    "blood_type" VARCHAR(16),
    "allergy_report" JSONB,
    "chronic_condition_report" JSONB,
    "current_medication_report" JSONB,
    "sleep_duration_band" VARCHAR(40),
    "exercise_frequency" VARCHAR(40),
    "stress_level" VARCHAR(24),
    "tobacco_use" VARCHAR(16),
    "data_origin" "medical_intake_data_origin" NOT NULL DEFAULT 'PATIENT_SELF_REPORTED',
    "recording_mode" "medical_intake_recording_mode" NOT NULL,
    "reported_patient_id" UUID NOT NULL,
    "recorded_by_user_id" UUID,
    "correction_reason" VARCHAR(500),
    "completed_at" TIMESTAMPTZ(3),
    "completed_consent_record_id" UUID,
    "mutation_operation" "medical_intake_mutation_operation",
    "mutation_key" VARCHAR(255),
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_medical_intake_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_policy_versions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "policy_key" VARCHAR(100) NOT NULL,
    "version_number" INTEGER NOT NULL,
    "locale" VARCHAR(16) NOT NULL DEFAULT 'fa-IR',
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "status" "consent_policy_status" NOT NULL DEFAULT 'DRAFT',
    "activated_at" TIMESTAMPTZ(3),
    "retired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "consent_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consent_records" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "policy_version_id" UUID NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_by_user_id" UUID,
    "accepted_by_session_id" UUID,
    "withdrawn_at" TIMESTAMPTZ(3),
    "withdrawn_by_user_id" UUID,
    "withdrawn_by_session_id" UUID,
    "acceptance_idempotency_key" VARCHAR(255),
    "withdrawal_idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE INDEX "patient_profiles_clinic_created_at_idx" ON "patient_profiles"("clinic_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "patient_medical_intakes_patient_id_key" ON "patient_medical_intakes"("patient_id");

-- CreateIndex
CREATE INDEX "patient_medical_intakes_clinic_state_updated_at_idx" ON "patient_medical_intakes"("clinic_id", "submission_state", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "patient_medical_intake_revisions_intake_revision_key" ON "patient_medical_intake_revisions"("intake_id", "revision_number");

-- CreateIndex
CREATE UNIQUE INDEX "patient_medical_intake_revisions_mutation_key" ON "patient_medical_intake_revisions"("intake_id", "mutation_operation", "mutation_key");

-- CreateIndex
CREATE UNIQUE INDEX "consent_policy_versions_version_key" ON "consent_policy_versions"("clinic_id", "policy_key", "locale", "version_number");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medical_intakes" ADD CONSTRAINT "patient_medical_intakes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medical_intakes" ADD CONSTRAINT "patient_medical_intakes_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medical_intake_revisions" ADD CONSTRAINT "patient_medical_intake_revisions_intake_id_fkey" FOREIGN KEY ("intake_id") REFERENCES "patient_medical_intakes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medical_intake_revisions" ADD CONSTRAINT "patient_medical_intake_revisions_reported_patient_id_fkey" FOREIGN KEY ("reported_patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medical_intake_revisions" ADD CONSTRAINT "patient_medical_intake_revisions_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medical_intake_revisions" ADD CONSTRAINT "patient_medical_intake_revisions_completed_consent_record__fkey" FOREIGN KEY ("completed_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_policy_versions" ADD CONSTRAINT "consent_policy_versions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_records" ADD CONSTRAINT "patient_consent_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_records" ADD CONSTRAINT "patient_consent_records_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_records" ADD CONSTRAINT "patient_consent_records_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_records" ADD CONSTRAINT "patient_consent_records_withdrawn_by_user_id_fkey" FOREIGN KEY ("withdrawn_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma cannot represent the Phase 02 partial uniqueness and lifecycle invariants.
ALTER TABLE "clinics"
  ADD CONSTRAINT "clinics_name_not_blank_check" CHECK (btrim("name") <> ''),
  ADD CONSTRAINT "clinics_time_zone_not_blank_check" CHECK (btrim("time_zone") <> '');
CREATE UNIQUE INDEX "clinics_one_active_idx" ON "clinics" (("status")) WHERE "status" = 'ACTIVE';

ALTER TABLE "patient_medical_intakes"
  ADD CONSTRAINT "patient_medical_intakes_revision_numbers_check"
    CHECK ("current_revision_number" >= 0 AND ("completed_revision_number" IS NULL OR ("completed_revision_number" >= 0 AND "completed_revision_number" <= "current_revision_number"))),
  ADD CONSTRAINT "patient_medical_intakes_complete_pointer_check"
    CHECK (("submission_state" = 'COMPLETE') = ("completed_revision_number" = "current_revision_number"));

ALTER TABLE "patient_medical_intake_revisions"
  ADD CONSTRAINT "patient_medical_intake_revisions_number_check" CHECK ("revision_number" > 0 AND "assigned_schema_version" > 0),
  ADD CONSTRAINT "patient_medical_intake_revisions_height_check" CHECK ("height_cm" IS NULL OR "height_cm" BETWEEN 20 AND 300),
  ADD CONSTRAINT "patient_medical_intake_revisions_weight_check" CHECK ("weight_kg" IS NULL OR "weight_kg" BETWEEN 0.5 AND 1000),
  ADD CONSTRAINT "patient_medical_intake_revisions_payload_hash_check" CHECK ("payload_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "patient_medical_intake_revisions_correction_check"
    CHECK (("recording_mode" = 'ADMIN_ON_BEHALF_CORRECTION') = ("correction_reason" IS NOT NULL)),
  ADD CONSTRAINT "patient_medical_intake_revisions_completion_check"
    CHECK (("revision_state" = 'COMPLETE') = ("completed_at" IS NOT NULL AND "completed_consent_record_id" IS NOT NULL)),
  ADD CONSTRAINT "patient_medical_intake_revisions_mutation_pair_check"
    CHECK (("mutation_operation" IS NULL) = ("mutation_key" IS NULL)),
  ADD CONSTRAINT "patient_medical_intake_revisions_mutation_state_check"
    CHECK (("revision_state" = 'COMPLETE' OR "recording_mode" = 'ADMIN_ON_BEHALF_CORRECTION') = ("mutation_operation" IS NOT NULL));

ALTER TABLE "consent_policy_versions"
  ADD CONSTRAINT "consent_policy_versions_content_hash_check" CHECK ("content_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "consent_policy_versions_lifecycle_check"
    CHECK (("status" = 'DRAFT' AND "activated_at" IS NULL AND "retired_at" IS NULL)
      OR ("status" = 'ACTIVE' AND "activated_at" IS NOT NULL AND "retired_at" IS NULL)
      OR ("status" = 'RETIRED' AND "activated_at" IS NOT NULL AND "retired_at" IS NOT NULL AND "retired_at" >= "activated_at"));
CREATE UNIQUE INDEX "consent_policy_versions_one_active_idx"
  ON "consent_policy_versions" ("clinic_id", "policy_key", "locale") WHERE "status" = 'ACTIVE';

ALTER TABLE "patient_consent_records"
  ADD CONSTRAINT "patient_consent_records_content_hash_check" CHECK ("content_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "patient_consent_records_withdrawal_pair_check"
    CHECK (("withdrawn_at" IS NULL) = ("withdrawn_by_user_id" IS NULL)
      AND ("withdrawn_at" IS NULL) = ("withdrawn_by_session_id" IS NULL)
      AND ("withdrawal_idempotency_key" IS NULL) = ("withdrawn_at" IS NULL));
CREATE UNIQUE INDEX "patient_consent_records_one_active_grant_idx"
  ON "patient_consent_records" ("patient_id", "policy_version_id") WHERE "withdrawn_at" IS NULL;
CREATE UNIQUE INDEX "patient_consent_records_acceptance_key_idx"
  ON "patient_consent_records" ("patient_id", "acceptance_idempotency_key") WHERE "acceptance_idempotency_key" IS NOT NULL;
CREATE UNIQUE INDEX "patient_consent_records_withdrawal_key_idx"
  ON "patient_consent_records" ("patient_id", "withdrawal_idempotency_key") WHERE "withdrawal_idempotency_key" IS NOT NULL;

-- The active clinic is release-managed reference data, never a legal-policy placeholder.
INSERT INTO "clinics" ("id", "name", "time_zone", "status", "updated_at")
SELECT gen_random_uuid(), 'کلینیک سبز زندگی', 'Asia/Tehran', 'ACTIVE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "clinics" WHERE "status" = 'ACTIVE');

-- Upgrade Phase 01 patient accounts without inventing profile or medical answers.
INSERT INTO "patient_profiles" ("id", "user_id", "clinic_id", "created_at", "updated_at")
SELECT gen_random_uuid(), "patient_users"."id", "active_clinic"."id", "patient_users"."created_at", "patient_users"."created_at"
FROM (
  SELECT DISTINCT "users"."id", "users"."created_at"
  FROM "users"
  JOIN "user_roles" ON "user_roles"."user_id" = "users"."id"
  JOIN "roles" ON "roles"."id" = "user_roles"."role_id" AND "roles"."code" = 'PATIENT'
) AS "patient_users"
CROSS JOIN (SELECT "id" FROM "clinics" WHERE "status" = 'ACTIVE') AS "active_clinic"
ON CONFLICT ("user_id") DO NOTHING;
