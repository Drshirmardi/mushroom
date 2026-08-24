-- Align persisted values with the Phase 02 canonical API contract. These
-- aliases were never exposed by an intake endpoint; the explicit mapping keeps
-- an upgrade safe should an early development database contain the old value.
ALTER TYPE "sleep_duration_band" RENAME VALUE 'LT_5_HOURS' TO 'LESS_THAN_5_HOURS';
ALTER TYPE "sleep_duration_band" RENAME VALUE 'FROM_5_TO_LT_7_HOURS' TO 'FROM_5_TO_LESS_THAN_7_HOURS';
ALTER TYPE "sleep_duration_band" RENAME VALUE 'GT_9_HOURS' TO 'MORE_THAN_9_HOURS';

ALTER TYPE "exercise_frequency" RENAME VALUE 'ONE_TO_TWO_PER_WEEK' TO 'ONCE_OR_TWICE_WEEKLY';
ALTER TYPE "exercise_frequency" RENAME VALUE 'THREE_TO_FOUR_PER_WEEK' TO 'THREE_OR_FOUR_TIMES_WEEKLY';

ALTER TYPE "tobacco_use" RENAME TO "tobacco_use_legacy";
CREATE TYPE "tobacco_use" AS ENUM ('NEVER', 'FORMER', 'CURRENT', 'UNKNOWN');
ALTER TABLE "patient_medical_intake_revisions"
  ALTER COLUMN "tobacco_use" TYPE "tobacco_use"
  USING (CASE "tobacco_use"::text
    WHEN 'PREFER_NOT_TO_SAY' THEN 'UNKNOWN'
    ELSE "tobacco_use"::text
  END)::"tobacco_use";
DROP TYPE "tobacco_use_legacy";
