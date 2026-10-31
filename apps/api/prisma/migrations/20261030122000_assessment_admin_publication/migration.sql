BEGIN;
CREATE TABLE assessment_admin_publications (
 id UUID PRIMARY KEY,
 offering_version_id UUID NOT NULL UNIQUE,
 questionnaire_content_hash CHAR(64) NOT NULL CHECK (questionnaire_content_hash ~ '^[0-9a-f]{64}$'),
 document_hashes JSONB NOT NULL CHECK (jsonb_typeof(document_hashes)='object'),
 published_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 published_session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RETIRED')),
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT assessment_admin_publication_offering_fk FOREIGN KEY(offering_version_id) REFERENCES assessment_offering_versions(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE FUNCTION assessment_admin_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE offer assessment_offering_versions; source assessment_versions; doc consent_policy_versions; expected integer;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ADMIN publication history is retained'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') OR OLD.status<>'ACTIVE' OR NEW.status<>'RETIRED' THEN RAISE EXCEPTION 'ADMIN publication evidence is immutable'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO offer FROM assessment_offering_versions WHERE id=NEW.offering_version_id FOR SHARE;
 IF NOT FOUND OR offer.status<>'DRAFT' OR offer.authoring_texts IS NULL THEN RAISE EXCEPTION 'Exact inline offering required'; END IF;
 SELECT * INTO source FROM assessment_versions WHERE id=offer.assessment_version_id AND clinic_id=offer.clinic_id FOR SHARE;
 IF NOT FOUND OR source.status<>'PUBLISHED' OR source.content_hash<>NEW.questionnaire_content_hash THEN RAISE EXCEPTION 'Exact published questionnaire required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE s.id=NEW.published_session_id AND s.user_id=NEW.published_by_user_id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' AND r.code='ADMIN') THEN RAISE EXCEPTION 'Active ADMIN publisher required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM clinical_clinic_accesses WHERE user_id=NEW.published_by_user_id AND clinic_id=offer.clinic_id) THEN RAISE EXCEPTION 'Publisher clinic membership required'; END IF;
 expected:=1+CASE WHEN offer.price_mode='PAID' THEN 1 ELSE 0 END+CASE WHEN offer.kind='COUPLES' THEN 1 ELSE 0 END;
 IF (SELECT count(*) FROM jsonb_object_keys(NEW.document_hashes))<>expected THEN RAISE EXCEPTION 'Exact scoped document set required'; END IF;
 FOR doc IN SELECT * FROM consent_policy_versions WHERE assessment_offering_version_id=offer.id FOR SHARE LOOP
  IF doc.status<>'ACTIVE' OR doc.clinic_id<>offer.clinic_id OR doc.locale<>offer.locale OR NEW.document_hashes->>doc.policy_key IS DISTINCT FROM doc.content_hash::text OR encode(sha256(convert_to(doc.body,'UTF8')),'hex')<>doc.content_hash THEN RAISE EXCEPTION 'Exact active scoped documents required'; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM consent_policy_versions WHERE assessment_offering_version_id=offer.id AND policy_key='ASSESSMENT_PROCESSING') OR (offer.price_mode='PAID' AND NOT EXISTS(SELECT 1 FROM consent_policy_versions WHERE assessment_offering_version_id=offer.id AND policy_key='ASSESSMENT_PURCHASE_TERMS')) OR (offer.kind='COUPLES' AND NOT EXISTS(SELECT 1 FROM consent_policy_versions WHERE assessment_offering_version_id=offer.id AND policy_key='COUPLES_RESULT_SHARING')) THEN RAISE EXCEPTION 'Purpose-specific documents required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_admin_publication_guard BEFORE INSERT OR UPDATE OR DELETE ON assessment_admin_publications FOR EACH ROW EXECUTE FUNCTION assessment_admin_publication_guard();
COMMIT;
