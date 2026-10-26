BEGIN;
-- New PROGRAM-only write boundaries; previous targets and applied migrations stay intact.
CREATE FUNCTION program_creation_boundary() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase program_purchases; pub program_offering_publications;
BEGIN
 IF TG_TABLE_NAME='program_purchases' THEN
  IF abs(extract(epoch FROM (NEW.created_at-CURRENT_TIMESTAMP)))>1 THEN RAISE EXCEPTION 'Database program purchase clock required'; END IF;
  RETURN NEW;
 ELSIF TG_TABLE_NAME='billing_intents' THEN
  IF NEW.purpose<>'PROGRAM' THEN RETURN NEW; END IF;
  SELECT * INTO purchase FROM program_purchases WHERE id=NEW.program_purchase_id;
  SELECT * INTO pub FROM program_offering_publications WHERE id=purchase.publication_id;
  IF purchase.id IS NULL OR pub.id IS NULL OR NEW.expires_at IS NULL OR NEW.expires_at<=purchase.created_at OR NEW.expires_at>purchase.created_at+pub.quote_ttl_seconds*INTERVAL '1 second' THEN RAISE EXCEPTION 'Exact configured program quote period required'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO purchase FROM program_purchases WHERE id=NEW.purchase_id;
 SELECT * INTO pub FROM program_offering_publications WHERE id=purchase.publication_id;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
 WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current active program beneficiary required'; END IF;
 PERFORM id FROM patient_consent_records WHERE id=purchase.terms_consent_record_id AND patient_id=NEW.patient_id AND policy_version_id=pub.terms_policy_version_id AND content_hash=pub.terms_content_hash AND withdrawn_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exact owned program terms evidence required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_purchase_clock_guard BEFORE INSERT ON program_purchases FOR EACH ROW EXECUTE FUNCTION program_creation_boundary();
CREATE TRIGGER program_billing_quote_guard BEFORE INSERT ON billing_intents FOR EACH ROW EXECUTE FUNCTION program_creation_boundary();
CREATE TRIGGER z_program_grant_beneficiary_guard BEFORE INSERT ON program_access_grants FOR EACH ROW EXECUTE FUNCTION program_creation_boundary();
COMMIT;
