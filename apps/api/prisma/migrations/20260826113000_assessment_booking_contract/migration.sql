-- Freeze the versioned main-assessment and booking-prerequisite contract.
CREATE TYPE "assessment_version_status" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "patient_assessment_state" AS ENUM ('IN_PROGRESS', 'COMPLETE', 'INVALIDATED');
CREATE TYPE "booking_assessment_requirement" AS ENUM ('NOT_REQUIRED', 'REQUIRED');

CREATE TABLE "assessment_versions" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "assessment_key" VARCHAR(100) NOT NULL,
  "version_number" INTEGER NOT NULL,
  "locale" VARCHAR(16) NOT NULL DEFAULT 'fa-IR',
  "title" VARCHAR(255) NOT NULL,
  "structure" JSONB NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "status" "assessment_version_status" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMPTZ(3),
  "retired_at" TIMESTAMPTZ(3),
  "published_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "assessment_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_versions_version_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "assessment_versions_key_title_check" CHECK (btrim("assessment_key") <> '' AND btrim("title") <> ''),
  CONSTRAINT "assessment_versions_content_hash_check" CHECK ("content_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "assessment_versions_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "published_at" IS NULL AND "retired_at" IS NULL)
    OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "retired_at" IS NULL)
    OR ("status" = 'RETIRED' AND "published_at" IS NOT NULL AND "retired_at" IS NOT NULL AND "retired_at" >= "published_at")
  )
);

CREATE UNIQUE INDEX "assessment_versions_version_key" ON "assessment_versions"("clinic_id", "assessment_key", "locale", "version_number");
CREATE UNIQUE INDEX "assessment_versions_id_clinic_key" ON "assessment_versions"("id", "clinic_id");
CREATE UNIQUE INDEX "assessment_versions_one_published_idx" ON "assessment_versions"("clinic_id", "assessment_key", "locale") WHERE "status" = 'PUBLISHED';

CREATE TABLE "patient_assessment_submissions" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "assessment_version_id" UUID NOT NULL,
  "attempt_number" INTEGER NOT NULL DEFAULT 1,
  "state" "patient_assessment_state" NOT NULL DEFAULT 'IN_PROGRESS',
  "answers" JSONB NOT NULL DEFAULT '{}',
  "score" DECIMAL(8,2),
  "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(3),
  "invalidated_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "patient_assessment_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_assessment_submissions_attempt_check" CHECK ("attempt_number" > 0),
  CONSTRAINT "patient_assessment_submissions_state_check" CHECK (
    ("state" = 'IN_PROGRESS' AND "completed_at" IS NULL AND "invalidated_at" IS NULL)
    OR ("state" = 'COMPLETE' AND "completed_at" IS NOT NULL AND "invalidated_at" IS NULL)
    OR ("state" = 'INVALIDATED' AND "invalidated_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "patient_assessment_submissions_attempt_key" ON "patient_assessment_submissions"("patient_id", "assessment_version_id", "attempt_number");
CREATE INDEX "patient_assessment_submissions_eligibility_idx" ON "patient_assessment_submissions"("patient_id", "state", "completed_at");

CREATE TABLE "booking_eligibility_policies" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "assessment_requirement" "booking_assessment_requirement" NOT NULL DEFAULT 'NOT_REQUIRED',
  "required_assessment_version_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "booking_eligibility_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booking_eligibility_policies_requirement_check" CHECK (
    ("assessment_requirement" = 'NOT_REQUIRED' AND "required_assessment_version_id" IS NULL)
    OR ("assessment_requirement" = 'REQUIRED' AND "required_assessment_version_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "booking_eligibility_policies_clinic_id_key" ON "booking_eligibility_policies"("clinic_id");

ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patient_assessment_submissions" ADD CONSTRAINT "patient_assessment_submissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_assessment_submissions" ADD CONSTRAINT "patient_assessment_submissions_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_eligibility_policies" ADD CONSTRAINT "booking_eligibility_policies_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_eligibility_policies" ADD CONSTRAINT "booking_eligibility_policies_required_version_fkey" FOREIGN KEY ("required_assessment_version_id", "clinic_id") REFERENCES "assessment_versions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_published_assessment_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'published assessment versions are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'RETIRED' THEN
    RAISE EXCEPTION 'retired assessment versions are immutable';
  END IF;
  IF OLD.status = 'PUBLISHED' AND NEW.status NOT IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'published assessment versions cannot return to draft';
  END IF;
  IF OLD.status = 'PUBLISHED' AND (
    NEW.clinic_id IS DISTINCT FROM OLD.clinic_id
    OR NEW.assessment_key IS DISTINCT FROM OLD.assessment_key
    OR NEW.version_number IS DISTINCT FROM OLD.version_number
    OR NEW.locale IS DISTINCT FROM OLD.locale
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.structure IS DISTINCT FROM OLD.structure
    OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
    OR NEW.published_at IS DISTINCT FROM OLD.published_at
    OR NEW.published_by_user_id IS DISTINCT FROM OLD.published_by_user_id
  ) THEN
    RAISE EXCEPTION 'published assessment versions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "assessment_versions_immutable_after_publish"
BEFORE UPDATE OR DELETE ON "assessment_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_published_assessment_mutation();
