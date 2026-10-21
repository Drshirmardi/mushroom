-- Keep completed results and their immutable source when an operator deletes an assessment.
ALTER TYPE assessment_version_status ADD VALUE IF NOT EXISTS 'DELETED';

BEGIN;
ALTER TABLE assessment_versions DROP CONSTRAINT assessment_versions_lifecycle_check;
ALTER TABLE assessment_versions ADD CONSTRAINT assessment_versions_lifecycle_check CHECK (
 status::text='DELETED' OR
 (status='DRAFT' AND published_at IS NULL AND retired_at IS NULL) OR
 (status='PUBLISHED' AND published_at IS NOT NULL AND retired_at IS NULL) OR
 (status='RETIRED' AND published_at IS NOT NULL AND retired_at IS NOT NULL AND retired_at>=published_at)
);

CREATE OR REPLACE FUNCTION prevent_published_assessment_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('DRAFT', 'RETIRED') THEN
      RAISE EXCEPTION 'published assessment versions are immutable';
    END IF;
    RETURN OLD;
  END IF;
  -- Deletion is a terminal visibility change; retain every immutable source field.
  IF TG_OP = 'UPDATE' AND NEW.status::text = 'DELETED' AND OLD.status::text <> 'DELETED' THEN
    IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'deletion must retain the original assessment source';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status::text = 'DELETED' THEN
    RAISE EXCEPTION 'deleted assessment versions are immutable retained history';
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


-- Serialize a required-policy assignment against deletion/publication row locks.
CREATE OR REPLACE FUNCTION enforce_required_assessment_policy_version() RETURNS trigger AS $$
BEGIN
  IF NEW.assessment_requirement = 'REQUIRED' THEN
    PERFORM id FROM assessment_versions WHERE id=NEW.required_assessment_version_id AND clinic_id=NEW.clinic_id AND status='PUBLISHED' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'required booking assessment must be published by the same clinic'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
