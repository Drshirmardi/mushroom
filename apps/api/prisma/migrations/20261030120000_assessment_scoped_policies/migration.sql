BEGIN;
ALTER TABLE consent_policy_versions
  ADD COLUMN assessment_offering_version_id UUID,
  ADD CONSTRAINT consent_policy_assessment_offering_fk
    FOREIGN KEY (assessment_offering_version_id)
    REFERENCES assessment_offering_versions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT consent_policy_assessment_purpose_check CHECK (
    assessment_offering_version_id IS NULL OR policy_key IN (
      'ASSESSMENT_PROCESSING', 'ASSESSMENT_PURCHASE_TERMS', 'COUPLES_RESULT_SHARING'
    )
  );

DROP INDEX consent_policy_versions_one_active_idx;
CREATE UNIQUE INDEX consent_policy_versions_one_active_idx
  ON consent_policy_versions (clinic_id, policy_key, locale)
  WHERE status = 'ACTIVE' AND assessment_offering_version_id IS NULL;
CREATE UNIQUE INDEX consent_policy_versions_offering_active_idx
  ON consent_policy_versions (assessment_offering_version_id, policy_key, locale)
  WHERE status = 'ACTIVE' AND assessment_offering_version_id IS NOT NULL;
CREATE INDEX consent_policy_versions_offering_idx
  ON consent_policy_versions (assessment_offering_version_id);

CREATE FUNCTION assessment_policy_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source assessment_offering_versions;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.assessment_offering_version_id
      IS DISTINCT FROM NEW.assessment_offering_version_id THEN
    RAISE EXCEPTION 'Assessment policy scope is immutable';
  END IF;
  IF NEW.assessment_offering_version_id IS NOT NULL THEN
    SELECT * INTO source FROM assessment_offering_versions
      WHERE id = NEW.assessment_offering_version_id FOR SHARE;
    IF NOT FOUND OR source.clinic_id <> NEW.clinic_id OR source.locale <> NEW.locale THEN
      RAISE EXCEPTION 'Assessment policy must match offering clinic and locale';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER assessment_policy_scope_guard
  BEFORE INSERT OR UPDATE ON consent_policy_versions
  FOR EACH ROW EXECUTE FUNCTION assessment_policy_scope_guard();

COMMIT;
