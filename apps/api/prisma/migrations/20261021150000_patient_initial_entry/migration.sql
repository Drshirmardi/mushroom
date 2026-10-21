CREATE TABLE patient_entry_policies (
 clinic_id uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE RESTRICT,
 enabled boolean NOT NULL DEFAULT false,
 assessment_version_id uuid REFERENCES assessment_versions(id) ON DELETE RESTRICT,
 enforced_from timestamptz(3), revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz(3) NOT NULL,
 CONSTRAINT entry_policy_shape CHECK (revision>0 AND (NOT enabled OR (assessment_version_id IS NOT NULL AND enforced_from IS NOT NULL)))
);
CREATE TABLE patient_entries (
 patient_id uuid PRIMARY KEY REFERENCES patient_profiles(id) ON DELETE RESTRICT,
 clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
 birth_date date NOT NULL,
 assessment_version_id uuid REFERENCES assessment_versions(id) ON DELETE RESTRICT,
 submission_id uuid UNIQUE REFERENCES patient_assessment_submissions(id) ON DELETE RESTRICT,
 completed_at timestamptz(3), created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at timestamptz(3) NOT NULL,
 CONSTRAINT entry_binding_shape CHECK ((submission_id IS NULL OR assessment_version_id IS NOT NULL) AND (completed_at IS NULL OR submission_id IS NOT NULL))
);
CREATE FUNCTION guard_patient_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM patient_profiles p WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Entry patient must belong to clinic'; END IF;
 IF NEW.assessment_version_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM assessment_versions v WHERE v.id=NEW.assessment_version_id AND v.clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Entry source must belong to clinic'; END IF;
 IF NEW.submission_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM patient_assessment_submissions s WHERE s.id=NEW.submission_id AND s.patient_id=NEW.patient_id AND s.assessment_version_id=NEW.assessment_version_id AND s.access_grant_id IS NULL) THEN RAISE EXCEPTION 'Owned free exact-source submission required'; END IF;
 IF TG_OP='UPDATE' AND OLD.assessment_version_id IS NOT NULL AND ROW(NEW.assessment_version_id,NEW.submission_id) IS DISTINCT FROM ROW(OLD.assessment_version_id,OLD.submission_id) AND (NEW.assessment_version_id IS DISTINCT FROM OLD.assessment_version_id OR OLD.submission_id IS NOT NULL) THEN RAISE EXCEPTION 'Started entry source is pinned'; END IF;
 IF TG_OP='UPDATE' AND OLD.completed_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Completed entry is immutable'; END IF;
 IF NEW.completed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM patient_assessment_submissions s WHERE s.id=NEW.submission_id AND s.state='COMPLETE' AND s.invalidated_at IS NULL) THEN RAISE EXCEPTION 'Completed valid submission required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER patient_entry_guard BEFORE INSERT OR UPDATE ON patient_entries FOR EACH ROW EXECUTE FUNCTION guard_patient_entry();
CREATE FUNCTION guard_patient_entry_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.enforced_from IS NOT NULL AND NEW.enforced_from IS DISTINCT FROM OLD.enforced_from THEN RAISE EXCEPTION 'Entry cohort cutoff is immutable'; END IF;
 IF NEW.assessment_version_id IS NOT NULL THEN
  PERFORM id FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id AND status='PUBLISHED' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Published same-clinic entry assessment required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER patient_entry_policy_guard BEFORE INSERT OR UPDATE ON patient_entry_policies FOR EACH ROW EXECUTE FUNCTION guard_patient_entry_policy();
