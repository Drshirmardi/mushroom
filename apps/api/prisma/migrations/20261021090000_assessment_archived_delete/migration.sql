-- Allow explicit deletion of unused archived assessments. All reference FKs remain ON DELETE RESTRICT.
-- Published/retired UPDATE immutability and published DELETE protection remain unchanged.
CREATE OR REPLACE FUNCTION prevent_published_assessment_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('DRAFT', 'RETIRED') THEN
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
