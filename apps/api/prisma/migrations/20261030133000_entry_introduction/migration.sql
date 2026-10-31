BEGIN;
ALTER TABLE patient_entry_policies ADD COLUMN introduction text;
ALTER TABLE patient_entry_policies ADD CONSTRAINT entry_introduction_length CHECK (introduction IS NULL OR char_length(introduction)<=20000);
CREATE OR REPLACE FUNCTION guard_patient_entry_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.enforced_from IS NOT NULL AND NEW.enforced_from IS DISTINCT FROM OLD.enforced_from THEN RAISE EXCEPTION 'Entry assessment cohort cutoff is immutable'; END IF;
 IF NEW.assessment_version_id IS NOT NULL AND (NEW.enabled OR TG_OP='INSERT' OR NEW.assessment_version_id IS DISTINCT FROM OLD.assessment_version_id) THEN
  PERFORM id FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id AND status='PUBLISHED' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Published same-clinic entry assessment required'; END IF;
 END IF;
 IF NEW.enabled AND EXISTS(SELECT 1 FROM assessment_offering_versions o WHERE o.assessment_version_id=NEW.assessment_version_id AND (EXISTS(SELECT 1 FROM assessment_admin_publications a WHERE a.offering_version_id=o.id) OR EXISTS(SELECT 1 FROM assessment_offering_publications a WHERE a.offering_version_id=o.id))) THEN RAISE EXCEPTION 'Standalone entry assessment without offering authority required'; END IF;
 RETURN NEW;
END $$;
COMMIT;
