-- Complete the v1 assessment submission evidence and booking-policy defaults.
ALTER TABLE "patient_assessment_submissions"
  ADD COLUMN "result_snapshot" JSONB,
  ADD COLUMN "completion_idempotency_key" VARCHAR(255),
  ADD COLUMN "completion_payload_hash" CHAR(64);

ALTER TABLE "booking_eligibility_policies"
  ADD COLUMN "validity_days" INTEGER,
  ADD COLUMN "require_latest_published_version" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "patient_assessment_submissions"
  ADD CONSTRAINT "patient_assessment_submissions_answers_object_check"
    CHECK (jsonb_typeof("answers") = 'object'),
  ADD CONSTRAINT "patient_assessment_submissions_result_object_check"
    CHECK ("result_snapshot" IS NULL OR jsonb_typeof("result_snapshot") = 'object'),
  ADD CONSTRAINT "patient_assessment_submissions_completion_evidence_check"
    CHECK (
      ("completion_idempotency_key" IS NULL) = ("completion_payload_hash" IS NULL)
      AND ("completion_payload_hash" IS NULL OR "completion_payload_hash" ~ '^[0-9a-f]{64}$')
      AND (
        "state" <> 'IN_PROGRESS'
        OR ("result_snapshot" IS NULL AND "completion_idempotency_key" IS NULL)
      )
      AND (
        "state" <> 'COMPLETE'
        OR ("result_snapshot" IS NOT NULL AND "completion_idempotency_key" IS NOT NULL)
      )
    );

ALTER TABLE "booking_eligibility_policies"
  ADD CONSTRAINT "booking_eligibility_policies_validity_days_check"
    CHECK ("validity_days" IS NULL OR "validity_days" > 0);

CREATE UNIQUE INDEX "patient_assessment_submissions_completion_key_idx"
  ON "patient_assessment_submissions" ("patient_id", "completion_idempotency_key")
  WHERE "completion_idempotency_key" IS NOT NULL;

CREATE FUNCTION prevent_completed_assessment_submission_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state <> 'IN_PROGRESS' THEN
      RAISE EXCEPTION 'completed assessment submissions are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.state = 'INVALIDATED' THEN
    RAISE EXCEPTION 'invalidated assessment submissions are immutable';
  END IF;
  IF OLD.state = 'COMPLETE' AND (
    NEW.patient_id IS DISTINCT FROM OLD.patient_id
    OR NEW.assessment_version_id IS DISTINCT FROM OLD.assessment_version_id
    OR NEW.attempt_number IS DISTINCT FROM OLD.attempt_number
    OR NEW.answers IS DISTINCT FROM OLD.answers
    OR NEW.score IS DISTINCT FROM OLD.score
    OR NEW.result_snapshot IS DISTINCT FROM OLD.result_snapshot
    OR NEW.started_at IS DISTINCT FROM OLD.started_at
    OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
    OR NEW.completion_idempotency_key IS DISTINCT FROM OLD.completion_idempotency_key
    OR NEW.completion_payload_hash IS DISTINCT FROM OLD.completion_payload_hash
    OR NEW.state NOT IN ('COMPLETE', 'INVALIDATED')
  ) THEN
    RAISE EXCEPTION 'completed assessment submissions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "patient_assessment_submissions_immutable_after_complete"
BEFORE UPDATE OR DELETE ON "patient_assessment_submissions"
FOR EACH ROW EXECUTE FUNCTION prevent_completed_assessment_submission_mutation();

CREATE FUNCTION enforce_required_assessment_policy_version() RETURNS trigger AS $$
BEGIN
  IF NEW.assessment_requirement = 'REQUIRED' AND NOT EXISTS (
    SELECT 1
    FROM "assessment_versions"
    WHERE "id" = NEW.required_assessment_version_id
      AND "clinic_id" = NEW.clinic_id
      AND "status" = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'required booking assessment must be published by the same clinic';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "booking_eligibility_policies_require_published_version"
BEFORE INSERT OR UPDATE ON "booking_eligibility_policies"
FOR EACH ROW EXECUTE FUNCTION enforce_required_assessment_policy_version();

CREATE FUNCTION prevent_required_assessment_retirement() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'PUBLISHED' AND NEW.status = 'RETIRED' AND EXISTS (
    SELECT 1
    FROM "booking_eligibility_policies"
    WHERE "assessment_requirement" = 'REQUIRED'
      AND "required_assessment_version_id" = OLD.id
  ) THEN
    RAISE EXCEPTION 'required booking assessment cannot be retired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "assessment_versions_prevent_required_retirement"
BEFORE UPDATE ON "assessment_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_required_assessment_retirement();
