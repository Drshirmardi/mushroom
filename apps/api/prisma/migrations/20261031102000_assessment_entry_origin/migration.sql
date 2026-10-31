BEGIN;
ALTER TABLE patient_assessment_submissions ADD COLUMN entry_patient_id uuid UNIQUE REFERENCES patient_entries(patient_id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE OR REPLACE FUNCTION assessment_submission_context_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.entry_patient_id IS DISTINCT FROM OLD.entry_patient_id THEN RAISE EXCEPTION 'Entry origin cannot be rebound'; END IF;
 IF NEW.entry_patient_id IS NOT NULL THEN
  IF NEW.access_grant_id IS NOT NULL OR NEW.entry_patient_id<>NEW.patient_id OR NOT EXISTS(SELECT 1 FROM patient_entries e WHERE e.patient_id=NEW.patient_id AND e.clinic_id=(SELECT clinic_id FROM assessment_versions WHERE id=NEW.assessment_version_id) AND e.assessment_version_id=NEW.assessment_version_id AND (e.submission_id=NEW.id OR (e.submission_id IS NULL AND e.completed_at IS NULL))) THEN RAISE EXCEPTION 'Exact owned entry origin required'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND NEW.access_grant_id IS DISTINCT FROM OLD.access_grant_id THEN RAISE EXCEPTION 'Assessment access context cannot be rebound'; END IF;
 IF TG_OP='INSERT' AND NEW.access_grant_id IS NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('assessment-commercial-start:'||NEW.assessment_version_id::text,0));
  IF EXISTS(SELECT 1 FROM assessment_offering_versions o JOIN assessment_offering_publications pub ON pub.offering_version_id=o.id WHERE o.assessment_version_id=NEW.assessment_version_id) THEN RAISE EXCEPTION 'Commercial assessment requires owned paid access'; END IF;
 ELSIF NEW.access_grant_id IS NOT NULL AND (TG_OP='INSERT' OR OLD.state='IN_PROGRESS') THEN
  IF NOT EXISTS(SELECT 1 FROM assessment_access_grants WHERE id=NEW.access_grant_id AND patient_id=NEW.patient_id AND assessment_version_id=NEW.assessment_version_id) THEN RAISE EXCEPTION 'Exact owned assessment context required'; END IF;
  IF TG_OP='UPDATE' AND OLD.state='IN_PROGRESS' AND NEW.state='INVALIDATED' AND NEW.invalidated_at IS NOT NULL AND NEW.invalidated_at>=OLD.started_at AND NEW.revision=OLD.revision+1
   AND (to_jsonb(NEW)-ARRAY['state','invalidated_at','updated_at','revision']) IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','invalidated_at','updated_at','revision'])
   AND EXISTS(SELECT 1 FROM assessment_access_grants g JOIN patient_consent_records c ON c.id=g.processing_consent_record_id WHERE g.id=NEW.access_grant_id AND c.withdrawn_at IS NOT NULL AND NEW.invalidated_at>=c.withdrawn_at) THEN RETURN NEW; END IF;
  IF NOT assessment_grant_processable(NEW.access_grant_id) THEN RAISE EXCEPTION 'Exact current paid private assessment access required'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION assessment_admin_start_boundary() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.access_grant_id IS NULL AND NEW.entry_patient_id IS NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('assessment-commercial-start:'||NEW.assessment_version_id::text,0));
  IF EXISTS(SELECT 1 FROM assessment_offering_versions o JOIN assessment_admin_publications p ON p.offering_version_id=o.id WHERE o.assessment_version_id=NEW.assessment_version_id)
  THEN RAISE EXCEPTION 'ADMIN offering requires exact owned access'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION guard_patient_entry_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.enforced_from IS NOT NULL AND NEW.enforced_from IS DISTINCT FROM OLD.enforced_from THEN RAISE EXCEPTION 'Entry assessment cohort cutoff is immutable'; END IF;
 IF NEW.assessment_version_id IS NOT NULL AND (NEW.enabled OR TG_OP='INSERT' OR NEW.assessment_version_id IS DISTINCT FROM OLD.assessment_version_id) THEN
  PERFORM id FROM assessment_versions WHERE id=NEW.assessment_version_id AND clinic_id=NEW.clinic_id AND status='PUBLISHED' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Published same-clinic entry assessment required'; END IF;
 END IF;
 RETURN NEW;
END $$;
COMMIT;
