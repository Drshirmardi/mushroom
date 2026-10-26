BEGIN;
-- Preserve applied54; disambiguate the local UUID from PatientConsentRecord.source.
CREATE OR REPLACE FUNCTION assessment_purchase_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pub assessment_offering_publications; offer assessment_offering_versions; review assessment_protocol_reviews; processing patient_consent_records; terms patient_consent_records;
 context couple_assessment_sessions; beneficiary jsonb; target_patient uuid; assessment_source_id uuid;
BEGIN
 SELECT * INTO pub FROM assessment_offering_publications WHERE id=NEW.publication_id AND clinic_id=NEW.clinic_id;
 IF NOT FOUND OR pub.status<>'ACTIVE' OR pub.publication_hash<>NEW.publication_hash THEN RAISE EXCEPTION 'Current exact commercial publication required'; END IF;
 SELECT * INTO offer FROM assessment_offering_versions WHERE id=pub.offering_version_id FOR SHARE; assessment_source_id:=offer.assessment_version_id;
 IF NEW.couple_assessment_session_id IS NOT NULL THEN
  SELECT * INTO context FROM couple_assessment_sessions WHERE id=NEW.couple_assessment_session_id AND clinic_id=NEW.clinic_id FOR UPDATE;
  IF context.id IS NULL OR context.publication_id<>pub.id OR context.assessment_version_id<>assessment_source_id OR NEW.snapshot->>'contextHash' IS DISTINCT FROM context.context_hash OR NOT couple_assessment_beneficiaries_ready(context.id,'CURRENT') THEN RAISE EXCEPTION 'Exact current mutually consented purchase context required'; END IF;
  IF jsonb_typeof(NEW.snapshot->'beneficiaries') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.snapshot->'beneficiaries')<>2 OR NEW.snapshot->>'jointProtocolId' IS DISTINCT FROM context.joint_protocol_id::text
   OR NEW.snapshot->>'jointProtocolHash' IS DISTINCT FROM context.context_snapshot->>'jointProtocolHash' THEN RAISE EXCEPTION 'Exact two coupled beneficiary snapshots required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM couple_assessment_participants WHERE session_id=context.id AND patient_id=NEW.patient_id AND processing_consent_record_id=NEW.processing_consent_record_id) THEN RAISE EXCEPTION 'Payer must be an independently consented beneficiary'; END IF;
  IF (SELECT count(DISTINCT value->>'patientId') FROM jsonb_array_elements(NEW.snapshot->'beneficiaries'))<>2 THEN RAISE EXCEPTION 'Distinct coupled beneficiaries required'; END IF;
  FOR beneficiary IN SELECT value FROM jsonb_array_elements(NEW.snapshot->'beneficiaries') LOOP
   IF NOT EXISTS(SELECT 1 FROM couple_assessment_participants cp WHERE cp.id::text=beneficiary->>'participantId' AND cp.patient_id::text=beneficiary->>'patientId' AND cp.slot=beneficiary->>'slot' AND cp.processing_consent_record_id::text=beneficiary->>'processingConsentRecordId' AND cp.session_id=context.id) THEN RAISE EXCEPTION 'Exact independently owned coupled beneficiary required'; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id WHERE p.couple_assessment_session_id=context.id AND i.status='PAID') THEN RAISE EXCEPTION 'Couple context already has a paid purchase'; END IF;
 END IF;
 FOR target_patient IN SELECT value FROM (SELECT NEW.patient_id AS value WHERE NEW.couple_assessment_session_id IS NULL UNION ALL SELECT patient_id FROM couple_assessment_participants WHERE session_id=NEW.couple_assessment_session_id) patients ORDER BY value LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('assessment-purchase:'||target_patient::text||':'||assessment_source_id::text,0));
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-publication:'||NEW.clinic_id::text||':'||pub.offering_key,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||assessment_source_id::text,0));
 SELECT * INTO pub FROM assessment_offering_publications WHERE id=NEW.publication_id FOR SHARE;
 IF pub.status<>'ACTIVE' OR pub.publication_hash<>NEW.publication_hash THEN RAISE EXCEPTION 'Current exact commercial publication required'; END IF;
 IF offer.kind<>(CASE WHEN NEW.couple_assessment_session_id IS NULL THEN 'INDIVIDUAL' ELSE 'COUPLES' END) OR offer.status<>'DRAFT' OR offer.amount_rial<>NEW.amount_rial OR offer.currency<>NEW.currency
  OR NEW.snapshot->>'assessmentVersionId' IS DISTINCT FROM assessment_source_id::text OR NEW.snapshot->>'title' IS DISTINCT FROM offer.title THEN RAISE EXCEPTION 'Exact assessment tariff snapshot required'; END IF;
 SELECT * INTO review FROM assessment_protocol_reviews WHERE id=pub.protocol_review_id;
 IF review.id IS NULL OR review.decision<>'APPROVED' OR review.id IS DISTINCT FROM (SELECT id FROM assessment_protocol_reviews WHERE assessment_version_id=assessment_source_id ORDER BY review_number DESC LIMIT 1)
  OR guidance_lock_doctor(review.actor_user_id,NEW.clinic_id) IS DISTINCT FROM review.doctor_profile_id THEN RAISE EXCEPTION 'Current qualified physician protocol required'; END IF;
 PERFORM id FROM patient_consent_records WHERE id IN(NEW.processing_consent_record_id,NEW.terms_consent_record_id) ORDER BY id FOR SHARE;
 SELECT * INTO processing FROM patient_consent_records WHERE id=NEW.processing_consent_record_id AND patient_id=NEW.patient_id;
 SELECT * INTO terms FROM patient_consent_records WHERE id=NEW.terms_consent_record_id AND patient_id=NEW.patient_id;
 IF processing.id IS NULL OR terms.id IS NULL OR processing.withdrawn_at IS NOT NULL OR terms.withdrawn_at IS NOT NULL OR processing.policy_version_id<>review.consent_policy_version_id OR processing.content_hash<>review.consent_content_hash
  OR terms.policy_version_id<>pub.terms_policy_version_id OR terms.content_hash<>pub.terms_content_hash THEN RAISE EXCEPTION 'Exact independent payer processing and terms required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id IN(processing.policy_version_id,terms.policy_version_id) ORDER BY id FOR SHARE;
 IF EXISTS(SELECT 1 FROM consent_policy_versions WHERE id IN(processing.policy_version_id,terms.policy_version_id) AND (status<>'ACTIVE' OR clinic_id<>NEW.clinic_id)) THEN RAISE EXCEPTION 'Active same-clinic purchase policies required'; END IF;
 FOR target_patient IN SELECT value FROM (SELECT NEW.patient_id AS value WHERE NEW.couple_assessment_session_id IS NULL UNION ALL SELECT patient_id FROM couple_assessment_participants WHERE session_id=NEW.couple_assessment_session_id) patients ORDER BY value LOOP
  PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
   WHERE p.id=target_patient AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
  IF NOT FOUND OR NOT couple_patient_is_adult(target_patient) THEN RAISE EXCEPTION 'Active adult independent beneficiary required'; END IF;
  IF EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE patient_id=target_patient AND assessment_version_id=assessment_source_id AND state='IN_PROGRESS')
   OR EXISTS(SELECT 1 FROM assessment_access_grants g JOIN patient_consent_records c ON c.id=g.processing_consent_record_id WHERE g.patient_id=target_patient AND g.assessment_version_id=assessment_source_id AND c.withdrawn_at IS NULL AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE access_grant_id=g.id))
   OR assessment_has_pending_purchase(target_patient,assessment_source_id) THEN RAISE EXCEPTION 'An assessment attempt, unused grant or pending beneficiary purchase already exists'; END IF;
 END LOOP; RETURN NEW;
END $$;
COMMIT;
