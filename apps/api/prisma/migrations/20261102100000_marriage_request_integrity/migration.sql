BEGIN;
ALTER TABLE marriage_service_requests ADD COLUMN replaces_id uuid UNIQUE REFERENCES marriage_service_requests(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE FUNCTION marriage_request_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Marriage request history is retained'; END IF;
 IF NOT EXISTS(SELECT 1 FROM couple_sessions s JOIN patient_profiles p ON p.id=NEW.initiator_patient_id JOIN assessment_admin_publications pub ON pub.id=NEW.publication_id JOIN assessment_offering_versions o ON o.id=pub.offering_version_id
 WHERE s.id=NEW.link_id AND s.initiator_patient_id=NEW.initiator_patient_id AND s.clinic_id=NEW.clinic_id AND p.clinic_id=NEW.clinic_id AND o.clinic_id=NEW.clinic_id AND o.kind='COUPLES' AND o.authoring_texts->'marriage'->>'purpose'='MARRIAGE') THEN RAISE EXCEPTION 'Marriage request source and participants must share clinic and identity'; END IF;
 IF NEW.recipient_patient_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM patient_profiles WHERE id=NEW.recipient_patient_id AND clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Marriage recipient clinic mismatch'; END IF;
 IF NEW.educational_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM educational_couple_sessions WHERE id=NEW.educational_id AND couple_session_id=NEW.link_id AND publication_id=NEW.publication_id AND clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Marriage assessment binding mismatch'; END IF;
 IF NEW.replaces_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM marriage_service_requests WHERE id=NEW.replaces_id AND id<>NEW.id AND initiator_patient_id=NEW.initiator_patient_id AND publication_id=NEW.publication_id) THEN RAISE EXCEPTION 'Marriage replacement identity mismatch'; END IF;
 IF TG_OP='UPDATE' AND OLD.replaces_id IS NOT NULL AND NEW.replaces_id IS DISTINCT FROM OLD.replaces_id THEN RAISE EXCEPTION 'Marriage replacement binding is immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER marriage_request_scope_guard BEFORE INSERT OR UPDATE OR DELETE ON marriage_service_requests FOR EACH ROW EXECUTE FUNCTION marriage_request_scope_guard();
COMMIT;
