-- F12-PJ-R01: preserve every historical answer/result; refuse ambiguous legacy active attempts.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM patient_assessment_submissions WHERE state = 'IN_PROGRESS'
    GROUP BY patient_id, assessment_version_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Assessment reliability migration blocked: duplicate active attempts require reviewed resolution; no patient data was changed';
  END IF;
END $$;

ALTER TABLE patient_assessment_submissions
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT patient_assessment_submissions_revision_check CHECK (revision >= 0);

CREATE UNIQUE INDEX patient_assessment_submissions_one_active_idx
  ON patient_assessment_submissions(patient_id, assessment_version_id)
  WHERE state = 'IN_PROGRESS';

CREATE FUNCTION protect_assessment_submission_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state = 'IN_PROGRESS' AND (NEW.answers IS DISTINCT FROM OLD.answers OR NEW.state IS DISTINCT FROM OLD.state) THEN
    -- Older application writers omit revision; advance it without changing their wire contract.
    IF NEW.revision = OLD.revision THEN
      NEW.revision := OLD.revision + 1;
    ELSIF NEW.revision <> OLD.revision + 1 THEN
      RAISE EXCEPTION 'assessment submission revision must advance exactly once';
    END IF;
  ELSIF NEW.revision IS DISTINCT FROM OLD.revision THEN
    RAISE EXCEPTION 'assessment submission revision cannot change without an in-progress mutation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER patient_assessment_submissions_revision_guard
  BEFORE UPDATE ON patient_assessment_submissions
  FOR EACH ROW EXECUTE FUNCTION protect_assessment_submission_revision();

COMMIT;
