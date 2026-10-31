BEGIN;
CREATE OR REPLACE FUNCTION assessment_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase assessment_purchases; review assessment_protocol_reviews; context couple_assessment_sessions; intent billing_intents; legacy_cp couple_assessment_participants;
BEGIN

 SELECT * INTO purchase FROM assessment_purchases WHERE id=NEW.purchase_id;
 IF purchase.admin_publication_id IS NOT NULL THEN
  PERFORM assessment_admin_purchase_lock(purchase);
  IF NOT assessment_admin_purchase_source_current(purchase) OR purchase.clinic_id<>NEW.clinic_id OR purchase.snapshot->>'assessmentVersionId' IS DISTINCT FROM NEW.assessment_version_id::text OR NEW.couple_assessment_participant_id IS NOT NULL THEN RAISE EXCEPTION 'Exact ADMIN grant source required'; END IF;
  IF purchase.educational_couple_session_id IS NULL THEN
   IF purchase.patient_id<>NEW.patient_id OR purchase.processing_consent_record_id<>NEW.processing_consent_record_id OR NEW.slot<>'INDIVIDUAL' OR NEW.educational_couple_participant_id IS NOT NULL THEN RAISE EXCEPTION 'Exact individual ADMIN grant required'; END IF;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM educational_couple_participants cp WHERE cp.id=NEW.educational_couple_participant_id AND cp.session_id=purchase.educational_couple_session_id AND cp.patient_id=NEW.patient_id AND cp.slot=NEW.slot AND cp.processing_consent_record_id=NEW.processing_consent_record_id) OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b WHERE b->>'participantId'=NEW.educational_couple_participant_id::text AND b->>'patientId'=NEW.patient_id::text AND b->>'slot'=NEW.slot AND b->>'processingConsentRecordId'=NEW.processing_consent_record_id::text) THEN RAISE EXCEPTION 'Exact independently accepted ADMIN couple beneficiary required'; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM assessment_access_grants g WHERE g.patient_id=NEW.patient_id AND g.assessment_version_id=NEW.assessment_version_id AND assessment_grant_readable(g.id,g.patient_id) AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions s WHERE s.access_grant_id=g.id)) THEN RAISE EXCEPTION 'An unused owned grant already exists'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.educational_couple_participant_id IS NOT NULL THEN RAISE EXCEPTION 'Legacy purchase cannot bind ADMIN couple beneficiary'; END IF;
 SELECT * INTO purchase FROM assessment_purchases WHERE id=NEW.purchase_id;
 IF purchase.id IS NULL OR purchase.clinic_id<>NEW.clinic_id OR NEW.assessment_version_id::text IS DISTINCT FROM purchase.snapshot->>'assessmentVersionId' THEN RAISE EXCEPTION 'Exact independently owned grant scope required'; END IF;
 IF purchase.couple_assessment_session_id IS NULL THEN
  IF purchase.patient_id<>NEW.patient_id OR purchase.processing_consent_record_id<>NEW.processing_consent_record_id OR NEW.couple_assessment_participant_id IS NOT NULL OR NEW.slot<>'INDIVIDUAL' THEN RAISE EXCEPTION 'Exact individual grant scope required'; END IF;
 ELSE
  SELECT * INTO context FROM couple_assessment_sessions WHERE id=purchase.couple_assessment_session_id FOR UPDATE;
  PERFORM id FROM couple_sessions WHERE id=context.couple_session_id FOR SHARE;
  SELECT * INTO legacy_cp FROM couple_assessment_participants WHERE id=NEW.couple_assessment_participant_id AND session_id=context.id AND patient_id=NEW.patient_id AND slot=NEW.slot AND processing_consent_record_id=NEW.processing_consent_record_id;
  SELECT * INTO intent FROM billing_intents WHERE assessment_purchase_id=purchase.id;
  IF legacy_cp.id IS NULL OR intent.id IS NULL OR intent.status<>'PENDING' OR intent.expires_at<=CURRENT_TIMESTAMP OR NOT couple_assessment_beneficiaries_ready(context.id,'QUOTED')
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b WHERE b->>'participantId'=legacy_cp.id::text AND b->>'patientId'=NEW.patient_id::text AND b->>'slot'=NEW.slot AND b->>'processingConsentRecordId'=NEW.processing_consent_record_id::text) THEN RAISE EXCEPTION 'Exact unexpired mutually consented beneficiary required'; END IF;
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
