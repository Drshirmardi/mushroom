BEGIN;
CREATE FUNCTION assessment_new_attempt_origin_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.entry_patient_id IS NULL AND NEW.access_grant_id IS NULL THEN RAISE EXCEPTION 'New attempts require owned initial entry or paid access'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_assessment_new_attempt_origin BEFORE INSERT ON patient_assessment_submissions FOR EACH ROW WHEN (NEW.state='IN_PROGRESS') EXECUTE FUNCTION assessment_new_attempt_origin_guard();
CREATE FUNCTION assessment_no_public_free_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Free attempts are reserved for initial entry'; END $$;
CREATE TRIGGER a_assessment_no_public_free BEFORE INSERT ON assessment_access_grants FOR EACH ROW WHEN (NEW.method='FREE') EXECUTE FUNCTION assessment_no_public_free_guard();
COMMIT;
