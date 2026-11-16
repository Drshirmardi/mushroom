BEGIN;
ALTER TABLE assessment_access_grants ALTER COLUMN purchase_id DROP NOT NULL;
ALTER TABLE assessment_access_grants ADD COLUMN free_admin_publication_id UUID;
ALTER TABLE assessment_access_grants ADD CONSTRAINT assessment_free_grant_publication_fk FOREIGN KEY(free_admin_publication_id) REFERENCES assessment_admin_publications(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX assessment_free_grants_publication_patient_key ON assessment_access_grants(free_admin_publication_id,patient_id);
ALTER TABLE assessment_access_grants DROP CONSTRAINT assessment_grant_shape;
ALTER TABLE assessment_access_grants ADD CONSTRAINT assessment_grant_shape CHECK (
 (purchase_id IS NOT NULL AND free_admin_publication_id IS NULL
  AND ((slot='INDIVIDUAL' AND couple_assessment_participant_id IS NULL) OR (slot IN('INITIATOR','PARTNER') AND couple_assessment_participant_id IS NOT NULL))
  AND ((method='WALLET' AND wallet_journal_id IS NOT NULL AND gateway_attempt_id IS NULL) OR (method='GATEWAY' AND gateway_attempt_id IS NOT NULL AND wallet_journal_id IS NULL)))
 OR (purchase_id IS NULL AND free_admin_publication_id IS NOT NULL AND method='FREE' AND slot='INDIVIDUAL'
  AND couple_assessment_participant_id IS NULL AND wallet_journal_id IS NULL AND gateway_attempt_id IS NULL));

-- The paid trigger and its deferred financial proofs remain unchanged.
DROP TRIGGER assessment_grant_insert_guard ON assessment_access_grants;
CREATE TRIGGER assessment_grant_insert_guard BEFORE INSERT ON assessment_access_grants FOR EACH ROW WHEN (NEW.purchase_id IS NOT NULL) EXECUTE FUNCTION assessment_grant_insert_guard();

CREATE FUNCTION assessment_free_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g
  JOIN assessment_admin_publications pub ON pub.id=g.free_admin_publication_id
  JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=g.clinic_id AND o.assessment_version_id=g.assessment_version_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id AND c.patient_id=g.patient_id
  JOIN consent_policy_versions policy ON policy.id=c.policy_version_id AND policy.assessment_offering_version_id=o.id AND policy.clinic_id=g.clinic_id
  JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id
  JOIN users u ON u.id=patient.user_id JOIN clinics clinic ON clinic.id=g.clinic_id
  WHERE g.id=grant_id AND g.patient_id=target_patient AND g.purchase_id IS NULL AND g.method='FREE'
   AND o.price_mode='FREE' AND o.kind='INDIVIDUAL' AND c.withdrawn_at IS NULL
   AND policy.policy_key='ASSESSMENT_PROCESSING' AND c.content_hash=policy.content_hash AND pub.document_hashes->>'ASSESSMENT_PROCESSING'=policy.content_hash
   AND u.status='ACTIVE' AND clinic.status='ACTIVE'
   AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT'));
$$;
ALTER FUNCTION assessment_grant_readable(uuid,uuid) RENAME TO assessment_paid_grant_readable;
CREATE FUNCTION assessment_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT assessment_paid_grant_readable(grant_id,target_patient) OR assessment_free_grant_readable(grant_id,target_patient);
$$;
CREATE FUNCTION assessment_free_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_admin_publications pub ON pub.id=g.free_admin_publication_id
  JOIN assessment_offering_versions o ON o.id=pub.offering_version_id
  JOIN assessment_versions v ON v.id=g.assessment_version_id AND v.clinic_id=g.clinic_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id JOIN consent_policy_versions policy ON policy.id=c.policy_version_id
  WHERE g.id=grant_id AND assessment_free_grant_readable(g.id,g.patient_id) AND couple_patient_is_adult(g.patient_id)
   AND pub.status='ACTIVE' AND o.status='DRAFT' AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash
   AND policy.status='ACTIVE' AND encode(sha256(convert_to(policy.body,'UTF8')),'hex')=policy.content_hash);
$$;
ALTER FUNCTION assessment_grant_processable(uuid) RENAME TO assessment_paid_grant_processable;
CREATE FUNCTION assessment_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT assessment_paid_grant_processable(grant_id) OR assessment_free_grant_processable(grant_id);
$$;
CREATE FUNCTION assessment_free_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-purchase:'||NEW.patient_id::text||':'||NEW.assessment_version_id::text,0));
 PERFORM o.id FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id
  WHERE pub.id=NEW.free_admin_publication_id FOR SHARE OF pub,o;
 PERFORM id FROM assessment_versions WHERE id=NEW.assessment_version_id FOR SHARE;
 PERFORM c.id FROM patient_consent_records c JOIN consent_policy_versions p ON p.id=c.policy_version_id WHERE c.id=NEW.processing_consent_record_id FOR SHARE OF c,p;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
  WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 IF NOT FOUND OR NOT couple_patient_is_adult(NEW.patient_id) THEN RAISE EXCEPTION 'Active adult beneficiary required'; END IF;
 -- BEFORE INSERT cannot query the new row; validate the exact immutable publication and acceptance directly.
 IF NOT EXISTS(SELECT 1 FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id
  JOIN assessment_versions v ON v.id=o.assessment_version_id AND v.clinic_id=o.clinic_id
  JOIN consent_policy_versions p ON p.assessment_offering_version_id=o.id AND p.policy_key='ASSESSMENT_PROCESSING'
  JOIN patient_consent_records c ON c.policy_version_id=p.id AND c.patient_id=NEW.patient_id
  WHERE pub.id=NEW.free_admin_publication_id AND pub.status='ACTIVE' AND o.clinic_id=NEW.clinic_id AND o.status='DRAFT' AND o.kind='INDIVIDUAL' AND o.price_mode='FREE'
   AND v.id=NEW.assessment_version_id AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash
   AND c.id=NEW.processing_consent_record_id AND c.withdrawn_at IS NULL AND c.content_hash=p.content_hash
   AND p.status='ACTIVE' AND pub.document_hashes->>'ASSESSMENT_PROCESSING'=p.content_hash AND encode(sha256(convert_to(p.body,'UTF8')),'hex')=p.content_hash)
 THEN RAISE EXCEPTION 'Exact current FREE ADMIN publication and owned acceptance required'; END IF;
 IF EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE patient_id=NEW.patient_id AND assessment_version_id=NEW.assessment_version_id AND state='IN_PROGRESS')
  OR assessment_has_pending_purchase(NEW.patient_id,NEW.assessment_version_id)
  OR EXISTS(SELECT 1 FROM assessment_access_grants g WHERE g.patient_id=NEW.patient_id AND g.assessment_version_id=NEW.assessment_version_id AND assessment_grant_readable(g.id,g.patient_id) AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions s WHERE s.access_grant_id=g.id))
 THEN RAISE EXCEPTION 'An assessment attempt, unused access or purchase already exists'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_free_grant_insert_guard BEFORE INSERT ON assessment_access_grants FOR EACH ROW WHEN (NEW.purchase_id IS NULL) EXECUTE FUNCTION assessment_free_grant_insert_guard();

-- Preserve grandfathered history while preventing new starts around scoped consent/payment.
CREATE FUNCTION assessment_admin_start_boundary() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.access_grant_id IS NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('assessment-commercial-start:'||NEW.assessment_version_id::text,0));
  IF EXISTS(SELECT 1 FROM assessment_offering_versions o JOIN assessment_admin_publications p ON p.offering_version_id=o.id WHERE o.assessment_version_id=NEW.assessment_version_id)
  THEN RAISE EXCEPTION 'ADMIN offering requires exact owned access'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_admin_start_boundary BEFORE INSERT ON patient_assessment_submissions FOR EACH ROW EXECUTE FUNCTION assessment_admin_start_boundary();
COMMIT;
