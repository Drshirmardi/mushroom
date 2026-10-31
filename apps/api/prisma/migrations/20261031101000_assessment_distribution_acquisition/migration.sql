BEGIN;
CREATE FUNCTION assessment_distribution_acquisition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_id uuid;
BEGIN
 IF TG_TABLE_NAME='assessment_purchases' THEN source_id:=(NEW.snapshot->>'assessmentVersionId')::uuid; ELSE source_id:=NEW.assessment_version_id; END IF;
 PERFORM id FROM assessment_versions WHERE id=source_id FOR SHARE;
 IF NOT assessment_publicly_available(source_id) THEN RAISE EXCEPTION 'Hidden assessment is restricted to initial entry'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER b_assessment_purchase_distribution BEFORE INSERT ON assessment_purchases FOR EACH ROW EXECUTE FUNCTION assessment_distribution_acquisition_guard();
CREATE TRIGGER b_assessment_free_distribution BEFORE INSERT ON assessment_access_grants FOR EACH ROW WHEN (NEW.method='FREE') EXECUTE FUNCTION assessment_distribution_acquisition_guard();
COMMIT;
