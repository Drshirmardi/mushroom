BEGIN;
ALTER TABLE assessment_purchases ALTER COLUMN publication_id DROP NOT NULL;
ALTER TABLE assessment_purchases ADD COLUMN admin_publication_id UUID;
ALTER TABLE assessment_purchases ADD CONSTRAINT assessment_admin_purchase_publication_fk FOREIGN KEY(admin_publication_id) REFERENCES assessment_admin_publications(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE assessment_purchases DROP CONSTRAINT assessment_purchase_shape;
ALTER TABLE assessment_purchases ADD CONSTRAINT assessment_purchase_shape CHECK (COALESCE(
 ((publication_id IS NOT NULL AND admin_publication_id IS NULL) OR (publication_id IS NULL AND admin_publication_id IS NOT NULL AND couple_assessment_session_id IS NULL AND snapshot->>'publicationAuthority'='ADMIN_PUBLISHED')) AND
 amount_rial>0 AND amount_rial<=9000000000000000000 AND currency='IRR' AND publication_hash ~ '^[a-f0-9]{64}$'
 AND jsonb_typeof(snapshot)='object' AND octet_length(snapshot::text)<=8192
 AND snapshot->>'purchaseId'=id::text AND snapshot->>'publicationId'=COALESCE(publication_id,admin_publication_id)::text AND snapshot->>'publicationHash'=publication_hash AND snapshot->>'amountRial'=amount_rial::text AND snapshot->>'currency'='IRR'
 AND snapshot->>'processingConsentRecordId'=processing_consent_record_id::text AND snapshot->>'termsConsentRecordId'=terms_consent_record_id::text
 AND ((couple_assessment_session_id IS NULL AND snapshot->'schemaVersion'='1'::jsonb)
  OR (couple_assessment_session_id IS NOT NULL AND snapshot->'schemaVersion'='2'::jsonb AND snapshot->>'kind'='COUPLES' AND snapshot->>'coupleAssessmentSessionId'=couple_assessment_session_id::text AND jsonb_typeof(snapshot->'beneficiaries')='array' AND jsonb_array_length(snapshot->'beneficiaries')=2)),false));

CREATE FUNCTION assessment_admin_publication_hash(target uuid) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT encode(sha256(convert_to(id::text||':'||questionnaire_content_hash::text,'UTF8')),'hex') FROM assessment_admin_publications WHERE id=target;
$$;
CREATE FUNCTION assessment_admin_purchase_source_current(purchase assessment_purchases) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_admin_publications pub
  JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=purchase.clinic_id
  JOIN assessment_versions v ON v.id=o.assessment_version_id AND v.clinic_id=o.clinic_id
  JOIN consent_policy_versions processing ON processing.assessment_offering_version_id=o.id AND processing.policy_key='ASSESSMENT_PROCESSING'
  JOIN consent_policy_versions terms ON terms.assessment_offering_version_id=o.id AND terms.policy_key='ASSESSMENT_PURCHASE_TERMS'
  JOIN patient_consent_records pc ON pc.id=purchase.processing_consent_record_id AND pc.patient_id=purchase.patient_id AND pc.policy_version_id=processing.id
  JOIN patient_consent_records tc ON tc.id=purchase.terms_consent_record_id AND tc.patient_id=purchase.patient_id AND tc.policy_version_id=terms.id
  WHERE pub.id=purchase.admin_publication_id AND pub.status='ACTIVE' AND o.status='DRAFT' AND o.kind='INDIVIDUAL' AND o.price_mode='PAID' AND o.payment_point='PRE_START'
   AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash AND purchase.publication_hash=assessment_admin_publication_hash(pub.id)
   AND purchase.amount_rial=o.amount_rial AND purchase.currency=o.currency AND purchase.snapshot->>'assessmentVersionId'=v.id::text AND purchase.snapshot->>'title'=o.title
   AND processing.status='ACTIVE' AND terms.status='ACTIVE' AND pc.withdrawn_at IS NULL AND tc.withdrawn_at IS NULL
   AND pc.content_hash=processing.content_hash AND tc.content_hash=terms.content_hash
   AND pub.document_hashes->>'ASSESSMENT_PROCESSING'=processing.content_hash AND pub.document_hashes->>'ASSESSMENT_PURCHASE_TERMS'=terms.content_hash
   AND encode(sha256(convert_to(processing.body,'UTF8')),'hex')=processing.content_hash AND encode(sha256(convert_to(terms.body,'UTF8')),'hex')=terms.content_hash
   AND couple_assessment_patient_live(purchase.patient_id,purchase.clinic_id));
$$;
CREATE FUNCTION assessment_admin_purchase_lock(purchase assessment_purchases) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-purchase:'||purchase.patient_id::text||':'||(purchase.snapshot->>'assessmentVersionId'),0));
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||(purchase.snapshot->>'assessmentVersionId'),0));
 PERFORM pub.id FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id JOIN assessment_versions v ON v.id=o.assessment_version_id WHERE pub.id=purchase.admin_publication_id FOR SHARE OF pub,o,v;
 PERFORM c.id FROM patient_consent_records c JOIN consent_policy_versions p ON p.id=c.policy_version_id WHERE c.id IN(purchase.processing_consent_record_id,purchase.terms_consent_record_id) ORDER BY c.id FOR SHARE OF c,p;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=purchase.patient_id AND p.clinic_id=purchase.clinic_id AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 PERFORM i.id FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=purchase.patient_id FOR SHARE OF i,r;
END $$;
DROP TRIGGER assessment_purchase_insert_guard ON assessment_purchases;
CREATE TRIGGER assessment_purchase_insert_guard BEFORE INSERT ON assessment_purchases FOR EACH ROW WHEN (NEW.publication_id IS NOT NULL) EXECUTE FUNCTION assessment_purchase_insert_guard();
CREATE FUNCTION assessment_admin_purchase_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM assessment_admin_purchase_lock(NEW);
 IF NOT assessment_admin_purchase_source_current(NEW) THEN RAISE EXCEPTION 'Exact current ADMIN tariff, adult beneficiary and scoped acceptances required'; END IF;
 IF EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE patient_id=NEW.patient_id AND assessment_version_id=(NEW.snapshot->>'assessmentVersionId')::uuid AND state='IN_PROGRESS')
  OR assessment_has_pending_purchase(NEW.patient_id,(NEW.snapshot->>'assessmentVersionId')::uuid)
  OR EXISTS(SELECT 1 FROM assessment_access_grants g WHERE g.patient_id=NEW.patient_id AND g.assessment_version_id=(NEW.snapshot->>'assessmentVersionId')::uuid AND assessment_grant_readable(g.id,g.patient_id) AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions s WHERE s.access_grant_id=g.id))
 THEN RAISE EXCEPTION 'An assessment attempt, unused access or purchase already exists'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_admin_purchase_insert_guard BEFORE INSERT ON assessment_purchases FOR EACH ROW WHEN (NEW.admin_publication_id IS NOT NULL) EXECUTE FUNCTION assessment_admin_purchase_insert_guard();
CREATE FUNCTION assessment_admin_paid_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases p ON p.id=g.purchase_id
  WHERE g.id=grant_id AND p.admin_publication_id IS NOT NULL AND assessment_paid_grant_readable(g.id,g.patient_id)
   AND assessment_admin_purchase_source_current(p) AND g.patient_id=p.patient_id AND g.assessment_version_id::text=p.snapshot->>'assessmentVersionId' AND g.processing_consent_record_id=p.processing_consent_record_id);
$$;
CREATE OR REPLACE FUNCTION assessment_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT assessment_paid_grant_processable(grant_id) OR assessment_free_grant_processable(grant_id) OR assessment_admin_paid_grant_processable(grant_id);
$$;

CREATE OR REPLACE FUNCTION assessment_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase assessment_purchases; review assessment_protocol_reviews; context couple_assessment_sessions; intent billing_intents; cp couple_assessment_participants;
BEGIN

 SELECT * INTO purchase FROM assessment_purchases WHERE id=NEW.purchase_id;
 IF purchase.admin_publication_id IS NOT NULL THEN
  PERFORM assessment_admin_purchase_lock(purchase);
  IF NOT assessment_admin_purchase_source_current(purchase) OR purchase.clinic_id<>NEW.clinic_id OR purchase.patient_id<>NEW.patient_id
   OR purchase.snapshot->>'assessmentVersionId' IS DISTINCT FROM NEW.assessment_version_id::text OR purchase.processing_consent_record_id<>NEW.processing_consent_record_id
   OR NEW.slot<>'INDIVIDUAL' OR NEW.couple_assessment_participant_id IS NOT NULL
  THEN RAISE EXCEPTION 'Exact owned ADMIN purchase grant required'; END IF;
  IF EXISTS(SELECT 1 FROM assessment_access_grants g WHERE g.patient_id=NEW.patient_id AND g.assessment_version_id=NEW.assessment_version_id AND assessment_grant_readable(g.id,g.patient_id) AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions s WHERE s.access_grant_id=g.id)) THEN RAISE EXCEPTION 'An unused owned grant already exists'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO purchase FROM assessment_purchases WHERE id=NEW.purchase_id;
 IF purchase.id IS NULL OR purchase.clinic_id<>NEW.clinic_id OR NEW.assessment_version_id::text IS DISTINCT FROM purchase.snapshot->>'assessmentVersionId' THEN RAISE EXCEPTION 'Exact independently owned grant scope required'; END IF;
 IF purchase.couple_assessment_session_id IS NULL THEN
  IF purchase.patient_id<>NEW.patient_id OR purchase.processing_consent_record_id<>NEW.processing_consent_record_id OR NEW.couple_assessment_participant_id IS NOT NULL OR NEW.slot<>'INDIVIDUAL' THEN RAISE EXCEPTION 'Exact individual grant scope required'; END IF;
 ELSE
  SELECT * INTO context FROM couple_assessment_sessions WHERE id=purchase.couple_assessment_session_id FOR UPDATE;
  PERFORM id FROM couple_sessions WHERE id=context.couple_session_id FOR SHARE;
  SELECT * INTO cp FROM couple_assessment_participants WHERE id=NEW.couple_assessment_participant_id AND session_id=context.id AND patient_id=NEW.patient_id AND slot=NEW.slot AND processing_consent_record_id=NEW.processing_consent_record_id;
  SELECT * INTO intent FROM billing_intents WHERE assessment_purchase_id=purchase.id;
  IF cp.id IS NULL OR intent.id IS NULL OR intent.status<>'PENDING' OR intent.expires_at<=CURRENT_TIMESTAMP OR NOT couple_assessment_beneficiaries_ready(context.id,'QUOTED')
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b WHERE b->>'participantId'=cp.id::text AND b->>'patientId'=NEW.patient_id::text AND b->>'slot'=NEW.slot AND b->>'processingConsentRecordId'=NEW.processing_consent_record_id::text) THEN RAISE EXCEPTION 'Exact unexpired mutually consented beneficiary required'; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-purchase:'||NEW.patient_id::text||':'||NEW.assessment_version_id::text,0));
 PERFORM id FROM patient_consent_records WHERE id=NEW.processing_consent_record_id AND patient_id=NEW.patient_id AND withdrawn_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unwithdrawn processing consent required for new access'; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
  WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 IF NOT FOUND OR NOT couple_patient_is_adult(NEW.patient_id) THEN RAISE EXCEPTION 'Active adult beneficiary required for new access'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||NEW.assessment_version_id::text,0));
 SELECT r.* INTO review FROM assessment_protocol_reviews r JOIN assessment_offering_publications pub ON pub.protocol_review_id=r.id WHERE pub.id=purchase.publication_id;
 IF review.id IS NULL OR review.decision<>'APPROVED' OR review.id IS DISTINCT FROM(SELECT id FROM assessment_protocol_reviews WHERE assessment_version_id=NEW.assessment_version_id ORDER BY review_number DESC LIMIT 1) THEN RAISE EXCEPTION 'Exact current reviewed processing source required'; END IF;
 PERFORM v.id FROM assessment_versions v JOIN consent_policy_versions p ON p.id=review.consent_policy_version_id WHERE v.id=NEW.assessment_version_id AND v.status='PUBLISHED' AND v.content_hash=review.questionnaire_content_hash AND p.status='ACTIVE' AND p.content_hash=review.consent_content_hash FOR SHARE OF v,p;
 IF NOT FOUND OR guidance_lock_doctor(review.actor_user_id,NEW.clinic_id) IS DISTINCT FROM review.doctor_profile_id THEN RAISE EXCEPTION 'Current qualified processing source required'; END IF;
 IF EXISTS(SELECT 1 FROM assessment_access_grants g WHERE g.patient_id=NEW.patient_id AND g.assessment_version_id=NEW.assessment_version_id AND assessment_grant_readable(g.id,g.patient_id) AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions s WHERE s.access_grant_id=g.id)) THEN RAISE EXCEPTION 'An unused owned grant already exists'; END IF;
 RETURN NEW;
END $$;
COMMIT;
