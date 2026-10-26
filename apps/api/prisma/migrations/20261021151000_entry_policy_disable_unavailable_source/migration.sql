-- Disabling an existing policy remains possible after its selected source is retired/deleted.
CREATE OR REPLACE FUNCTION guard_patient_entry_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.enforced_from IS NOT NULL AND NEW.enforced_from IS DISTINCT FROM OLD.enforced_from THEN RAISE EXCEPTION 'Entry cohort cutoff is immutable'; END IF;
 IF NEW.assessment_version_id IS NOT NULL AND (NEW.enabled OR TG_OP='INSERT' OR NEW.assessment_version_id IS DISTINCT FROM OLD.assessment_version_id) THEN
  PERFORM id FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id AND status='PUBLISHED' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Published same-clinic entry assessment required'; END IF;
 END IF;
 RETURN NEW;
END $$;
