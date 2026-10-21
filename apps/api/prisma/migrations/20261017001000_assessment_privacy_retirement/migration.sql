-- Migration50 is already applied in the isolated integration DB; refine through a forward migration.
CREATE OR REPLACE FUNCTION assessment_submission_context_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
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
CREATE FUNCTION assessment_paid_attempt_retention_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF OLD.access_grant_id IS NOT NULL THEN RAISE EXCEPTION 'Paid assessment attempt history and grant consumption are retained'; END IF; RETURN OLD; END $$;
CREATE TRIGGER assessment_paid_attempt_retention_guard BEFORE DELETE ON patient_assessment_submissions FOR EACH ROW EXECUTE FUNCTION assessment_paid_attempt_retention_guard();
