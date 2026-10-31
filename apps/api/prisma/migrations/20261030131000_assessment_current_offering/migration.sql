BEGIN;
CREATE INDEX assessment_offering_current_family_idx ON assessment_offering_versions(assessment_version_id,kind,price_mode,version_number DESC);
CREATE FUNCTION assessment_admin_offering_current(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_offering_versions o JOIN assessment_admin_publications pub ON pub.offering_version_id=o.id
  JOIN assessment_versions source ON source.id=o.assessment_version_id AND source.clinic_id=o.clinic_id
  WHERE o.id=target AND o.status='DRAFT' AND pub.status='ACTIVE' AND source.status='PUBLISHED' AND source.content_hash=pub.questionnaire_content_hash
   AND NOT EXISTS(SELECT 1 FROM assessment_offering_versions newer JOIN assessment_admin_publications newer_pub ON newer_pub.offering_version_id=newer.id
    WHERE newer.assessment_version_id=o.assessment_version_id AND newer.kind=o.kind AND newer.price_mode=o.price_mode AND newer.version_number>o.version_number));
$$;
CREATE FUNCTION assessment_admin_acquisition_clinic_lock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM clinics WHERE id=NEW.clinic_id FOR SHARE;
 RETURN NEW;
END $$;
CREATE TRIGGER a_assessment_admin_purchase_clinic BEFORE INSERT ON assessment_purchases FOR EACH ROW WHEN (NEW.admin_publication_id IS NOT NULL) EXECUTE FUNCTION assessment_admin_acquisition_clinic_lock();
CREATE TRIGGER a_assessment_free_grant_clinic BEFORE INSERT ON assessment_access_grants FOR EACH ROW WHEN (NEW.method='FREE') EXECUTE FUNCTION assessment_admin_acquisition_clinic_lock();
CREATE FUNCTION assessment_admin_acquisition_current_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE publication uuid; offering uuid;
BEGIN
 IF TG_TABLE_NAME='assessment_purchases' THEN publication:=NEW.admin_publication_id; ELSE publication:=NEW.free_admin_publication_id; END IF;
 SELECT offering_version_id INTO offering FROM assessment_admin_publications WHERE id=publication;
 IF offering IS NULL OR NOT assessment_admin_offering_current(offering) THEN RAISE EXCEPTION 'The latest exact educational offering is required for new access'; END IF;
 RETURN NEW;
END $$;
-- Existing quoted receipts and retained grants keep their exact price and documents.
CREATE TRIGGER z_assessment_admin_purchase_current BEFORE INSERT ON assessment_purchases FOR EACH ROW WHEN (NEW.admin_publication_id IS NOT NULL) EXECUTE FUNCTION assessment_admin_acquisition_current_guard();
CREATE TRIGGER z_assessment_free_grant_current BEFORE INSERT ON assessment_access_grants FOR EACH ROW WHEN (NEW.method='FREE') EXECUTE FUNCTION assessment_admin_acquisition_current_guard();
COMMIT;
