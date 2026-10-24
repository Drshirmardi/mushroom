ALTER TABLE patient_entry_policies
  ADD COLUMN profile_enforced_from timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Clinics with no assessment policy still need a stable rollout cutoff for profile collection.
INSERT INTO patient_entry_policies (clinic_id, enabled, assessment_version_id, profile_enforced_from, enforced_from, revision, updated_at)
SELECT id, false, NULL, CURRENT_TIMESTAMP, NULL, 1, CURRENT_TIMESTAMP
FROM clinics
ON CONFLICT (clinic_id) DO NOTHING;

CREATE OR REPLACE FUNCTION guard_patient_entry_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.profile_enforced_from IS DISTINCT FROM NEW.profile_enforced_from THEN RAISE EXCEPTION 'Profile entry rollout cutoff is immutable'; END IF;
 IF TG_OP='UPDATE' AND OLD.enforced_from IS NOT NULL AND NEW.enforced_from IS DISTINCT FROM OLD.enforced_from THEN RAISE EXCEPTION 'Entry assessment cohort cutoff is immutable'; END IF;
 IF NEW.assessment_version_id IS NOT NULL AND (NEW.enabled OR TG_OP='INSERT' OR NEW.assessment_version_id IS DISTINCT FROM OLD.assessment_version_id) THEN
  PERFORM id FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id AND status='PUBLISHED' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Published same-clinic entry assessment required'; END IF;
 END IF;
 RETURN NEW;
END $$;
