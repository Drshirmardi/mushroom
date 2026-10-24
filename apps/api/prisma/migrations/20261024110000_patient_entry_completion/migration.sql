-- Basic profile completeness applies to existing incomplete accounts as well.
-- Keep the assessment enrollment cutoff independent and immutable.
CREATE OR REPLACE FUNCTION guard_patient_entry_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.enforced_from IS NOT NULL AND NEW.enforced_from IS DISTINCT FROM OLD.enforced_from THEN RAISE EXCEPTION 'Entry assessment cohort cutoff is immutable'; END IF;
 IF NEW.assessment_version_id IS NOT NULL AND (NEW.enabled OR TG_OP='INSERT' OR NEW.assessment_version_id IS DISTINCT FROM OLD.assessment_version_id) THEN
  PERFORM id FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id AND status='PUBLISHED' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Published same-clinic entry assessment required'; END IF;
 END IF;
 RETURN NEW;
END $$;
ALTER TABLE patient_entry_policies DROP COLUMN profile_enforced_from;

ALTER TABLE patient_entries DROP CONSTRAINT entry_binding_shape;
ALTER TABLE patient_entries ADD CONSTRAINT entry_binding_shape CHECK (
 (submission_id IS NULL OR assessment_version_id IS NOT NULL)
 AND (completed_at IS NULL OR submission_id IS NOT NULL OR assessment_version_id IS NULL)
);

CREATE OR REPLACE FUNCTION guard_patient_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM patient_profiles p WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Entry patient must belong to clinic'; END IF;
 IF NEW.assessment_version_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM assessment_versions v WHERE v.id=NEW.assessment_version_id AND v.clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Entry source must belong to clinic'; END IF;
 IF NEW.submission_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM patient_assessment_submissions s WHERE s.id=NEW.submission_id AND s.patient_id=NEW.patient_id AND s.assessment_version_id=NEW.assessment_version_id AND s.access_grant_id IS NULL) THEN RAISE EXCEPTION 'Owned free exact-source submission required'; END IF;
 IF TG_OP='UPDATE' AND OLD.assessment_version_id IS NOT NULL AND ROW(NEW.assessment_version_id,NEW.submission_id) IS DISTINCT FROM ROW(OLD.assessment_version_id,OLD.submission_id) AND (NEW.assessment_version_id IS DISTINCT FROM OLD.assessment_version_id OR OLD.submission_id IS NOT NULL) THEN RAISE EXCEPTION 'Started entry source is pinned'; END IF;
 -- Demographic correction is allowed; completion and assessment ownership remain immutable.
 IF TG_OP='UPDATE' AND OLD.completed_at IS NOT NULL AND ROW(NEW.patient_id,NEW.clinic_id,NEW.assessment_version_id,NEW.submission_id,NEW.completed_at,NEW.created_at) IS DISTINCT FROM ROW(OLD.patient_id,OLD.clinic_id,OLD.assessment_version_id,OLD.submission_id,OLD.completed_at,OLD.created_at) THEN RAISE EXCEPTION 'Completed entry binding is immutable'; END IF;
 IF NEW.completed_at IS NOT NULL AND (TG_OP='INSERT' OR OLD.completed_at IS NULL) THEN
  IF NOT EXISTS (SELECT 1 FROM patient_profiles p JOIN user_profiles u ON u.user_id=p.user_id WHERE p.id=NEW.patient_id AND length(btrim(u.first_name))>0 AND length(btrim(u.last_name))>0 AND u.gender IN ('FEMALE','MALE')) THEN RAISE EXCEPTION 'Complete basic profile required'; END IF;
  IF NEW.submission_id IS NOT NULL THEN
   IF NOT EXISTS (SELECT 1 FROM patient_assessment_submissions s WHERE s.id=NEW.submission_id AND s.state='COMPLETE' AND s.invalidated_at IS NULL) THEN RAISE EXCEPTION 'Completed valid submission required'; END IF;
  ELSE
   PERFORM clinic_id FROM patient_entry_policies WHERE clinic_id=NEW.clinic_id FOR SHARE;
   IF EXISTS (SELECT 1 FROM patient_entry_policies ep JOIN patient_profiles p ON p.clinic_id=ep.clinic_id JOIN users u ON u.id=p.user_id WHERE p.id=NEW.patient_id AND ep.enabled AND (TG_OP='UPDATE' OR u.created_at>=ep.enforced_from)) THEN RAISE EXCEPTION 'Required entry assessment must be completed'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
