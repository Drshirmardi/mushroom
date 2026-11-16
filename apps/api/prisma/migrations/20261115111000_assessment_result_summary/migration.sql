BEGIN;

CREATE FUNCTION assessment_result_summary(snapshot jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE WHEN jsonb_typeof(snapshot) = 'object' THEN jsonb_build_object(
    'algorithmId', CASE WHEN jsonb_typeof(snapshot->'algorithmId') = 'string' THEN snapshot->'algorithmId' END,
    'primary', CASE WHEN jsonb_typeof(snapshot->'primary') = 'string' THEN snapshot->'primary' END,
    'secondary', CASE WHEN jsonb_typeof(snapshot->'secondary') = 'string' THEN snapshot->'secondary' END,
    'scores', CASE WHEN jsonb_typeof(snapshot->'scores') = 'object' THEN (
      SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
      FROM jsonb_each(snapshot->'scores') WHERE jsonb_typeof(value) = 'number'
    ) END,
    'dimensionTitles', CASE WHEN jsonb_typeof(snapshot->'dimensionTitles') = 'array' THEN (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', item->'id', 'title', item->'title') ORDER BY position), '[]'::jsonb)
      FROM jsonb_array_elements(snapshot->'dimensionTitles') WITH ORDINALITY AS dimensions(item, position)
      WHERE jsonb_typeof(item->'id') = 'string' AND jsonb_typeof(item->'title') = 'string'
    ) END
  ) END;
$$;
ALTER TABLE patient_assessment_submissions
  ADD COLUMN result_summary jsonb GENERATED ALWAYS AS (assessment_result_summary(result_snapshot)) STORED;

-- A generated column is populated after BEFORE triggers and cannot be written by callers.
-- It is not part of the caller-controlled changes allowed during invalidation.
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
   AND (to_jsonb(NEW)-ARRAY['state','invalidated_at','updated_at','revision','result_summary']) IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','invalidated_at','updated_at','revision','result_summary'])
   AND EXISTS(SELECT 1 FROM assessment_access_grants g JOIN patient_consent_records c ON c.id=g.processing_consent_record_id WHERE g.id=NEW.access_grant_id AND c.withdrawn_at IS NOT NULL AND NEW.invalidated_at>=c.withdrawn_at) THEN RETURN NEW; END IF;
  IF NOT assessment_grant_processable(NEW.access_grant_id) THEN RAISE EXCEPTION 'Exact current paid private assessment access required'; END IF;
 END IF; RETURN NEW;
END $$;

COMMIT;
