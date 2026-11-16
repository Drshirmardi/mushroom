BEGIN;
CREATE TABLE assessment_free_access_commands (
 patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 idempotency_key VARCHAR(200) NOT NULL CHECK (idempotency_key ~ '^[!-~]{8,200}$'),
 payload_hash CHAR(64) NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
 grant_id UUID NOT NULL REFERENCES assessment_access_grants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(patient_id,idempotency_key)
);
CREATE FUNCTION assessment_free_access_command_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Free access commands are immutable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM assessment_access_grants WHERE id=NEW.grant_id AND patient_id=NEW.patient_id AND method='FREE' AND free_admin_publication_id IS NOT NULL AND purchase_id IS NULL)
 THEN RAISE EXCEPTION 'Exact owned free grant required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_free_access_command_guard BEFORE INSERT OR UPDATE OR DELETE ON assessment_free_access_commands FOR EACH ROW EXECUTE FUNCTION assessment_free_access_command_guard();
CREATE TRIGGER z_assessment_admin_commercial_start_boundary BEFORE INSERT ON assessment_admin_publications FOR EACH ROW EXECUTE FUNCTION assessment_commercial_start_boundary();
COMMIT;
