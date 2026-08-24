-- CreateEnum
CREATE TYPE "sex_at_birth" AS ENUM ('FEMALE', 'MALE', 'INTERSEX', 'UNKNOWN', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "blood_type" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "sleep_duration_band" AS ENUM ('LT_5_HOURS', 'FROM_5_TO_LT_7_HOURS', 'FROM_7_TO_9_HOURS', 'GT_9_HOURS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "exercise_frequency" AS ENUM ('NONE', 'ONE_TO_TWO_PER_WEEK', 'THREE_TO_FOUR_PER_WEEK', 'DAILY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "stress_level" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "tobacco_use" AS ENUM ('NEVER', 'FORMER', 'CURRENT', 'UNKNOWN', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "consent_source" AS ENUM ('PATIENT_APP');

-- AlterTable
ALTER TABLE "consent_policy_versions" ADD COLUMN     "published_by_user_id" UUID;

-- AlterTable
ALTER TABLE "patient_consent_records" ADD COLUMN     "acceptance_request_id" VARCHAR(128),
ADD COLUMN     "source" "consent_source" NOT NULL DEFAULT 'PATIENT_APP',
ADD COLUMN     "withdrawal_request_id" VARCHAR(128);

-- Preserve any valid future rows while tightening the snapshot fields to stable enums.
ALTER TABLE "patient_medical_intake_revisions"
  ALTER COLUMN "sex_at_birth" TYPE "sex_at_birth" USING "sex_at_birth"::"sex_at_birth",
  ALTER COLUMN "blood_type" TYPE "blood_type" USING "blood_type"::"blood_type",
  ALTER COLUMN "sleep_duration_band" TYPE "sleep_duration_band" USING "sleep_duration_band"::"sleep_duration_band",
  ALTER COLUMN "exercise_frequency" TYPE "exercise_frequency" USING "exercise_frequency"::"exercise_frequency",
  ALTER COLUMN "stress_level" TYPE "stress_level" USING "stress_level"::"stress_level",
  ALTER COLUMN "tobacco_use" TYPE "tobacco_use" USING "tobacco_use"::"tobacco_use";

-- AddForeignKey
ALTER TABLE "consent_policy_versions" ADD CONSTRAINT "consent_policy_versions_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_records" ADD CONSTRAINT "patient_consent_records_accepted_by_session_id_fkey" FOREIGN KEY ("accepted_by_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_records" ADD CONSTRAINT "patient_consent_records_withdrawn_by_session_id_fkey" FOREIGN KEY ("withdrawn_by_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patient_medical_intakes"
  ADD CONSTRAINT "patient_medical_intakes_assigned_schema_version_check"
    CHECK ("assigned_schema_version" > 0);

ALTER TABLE "consent_policy_versions"
  ADD CONSTRAINT "consent_policy_versions_version_number_check"
    CHECK ("version_number" > 0);

ALTER TABLE "patient_medical_intake_revisions"
  DROP CONSTRAINT "patient_medical_intake_revisions_correction_check",
  ADD CONSTRAINT "patient_medical_intake_revisions_correction_check"
    CHECK (("recording_mode" = 'ADMIN_ON_BEHALF_CORRECTION')
      = ("correction_reason" IS NOT NULL AND btrim("correction_reason") <> ''));

-- Actor and session references may be nulled by retention workflows. The event
-- timestamp and idempotency evidence remain the invariant for a withdrawal.
ALTER TABLE "patient_consent_records"
  DROP CONSTRAINT "patient_consent_records_withdrawal_pair_check",
  ADD CONSTRAINT "patient_consent_records_withdrawal_pair_check"
    CHECK (("withdrawn_at" IS NULL) = ("withdrawal_idempotency_key" IS NULL));
