BEGIN;
-- Preserve both legacy receipt shapes and bind modern couple receipts explicitly.
-- AlterTable
ALTER TABLE "assessment_purchases" ADD COLUMN     "educational_couple_session_id" UUID;

-- AddForeignKey
ALTER TABLE "assessment_purchases" ADD CONSTRAINT "assessment_purchases_educational_couple_session_id_fkey" FOREIGN KEY ("educational_couple_session_id") REFERENCES "educational_couple_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE assessment_purchases DROP CONSTRAINT assessment_purchase_shape;
ALTER TABLE assessment_purchases ADD CONSTRAINT assessment_purchase_shape CHECK (COALESCE(
 ((publication_id IS NOT NULL AND admin_publication_id IS NULL AND educational_couple_session_id IS NULL)
  OR (publication_id IS NULL AND admin_publication_id IS NOT NULL AND couple_assessment_session_id IS NULL AND snapshot->>'publicationAuthority'='ADMIN_PUBLISHED'))
 AND amount_rial>0 AND amount_rial<=9000000000000000000 AND currency='IRR' AND publication_hash ~ '^[a-f0-9]{64}$'
 AND jsonb_typeof(snapshot)='object' AND octet_length(snapshot::text)<=8192
 AND snapshot->>'purchaseId'=id::text AND snapshot->>'publicationId'=COALESCE(publication_id,admin_publication_id)::text AND snapshot->>'publicationHash'=publication_hash AND snapshot->>'amountRial'=amount_rial::text AND snapshot->>'currency'='IRR'
 AND snapshot->>'processingConsentRecordId'=processing_consent_record_id::text AND snapshot->>'termsConsentRecordId'=terms_consent_record_id::text
 AND ((couple_assessment_session_id IS NULL AND educational_couple_session_id IS NULL AND snapshot->'schemaVersion'='1'::jsonb)
  OR (couple_assessment_session_id IS NOT NULL AND snapshot->'schemaVersion'='2'::jsonb AND snapshot->>'kind'='COUPLES' AND snapshot->>'coupleAssessmentSessionId'=couple_assessment_session_id::text AND jsonb_typeof(snapshot->'beneficiaries')='array' AND jsonb_array_length(snapshot->'beneficiaries')=2)
  OR (educational_couple_session_id IS NOT NULL AND snapshot->'schemaVersion'='3'::jsonb AND snapshot->>'educationalCoupleSessionId'=educational_couple_session_id::text AND snapshot->>'contextHash' ~ '^[a-f0-9]{64}$' AND jsonb_typeof(snapshot->'beneficiaries')='array' AND jsonb_array_length(snapshot->'beneficiaries')=2)),false));
ALTER TABLE assessment_access_grants DROP CONSTRAINT assessment_grant_shape;
ALTER TABLE assessment_access_grants ADD CONSTRAINT assessment_grant_shape CHECK (
 (purchase_id IS NOT NULL AND free_admin_publication_id IS NULL
  AND ((slot='INDIVIDUAL' AND couple_assessment_participant_id IS NULL AND educational_couple_participant_id IS NULL)
   OR (slot IN('INITIATOR','PARTNER') AND ((couple_assessment_participant_id IS NOT NULL AND educational_couple_participant_id IS NULL) OR (educational_couple_participant_id IS NOT NULL AND couple_assessment_participant_id IS NULL))))
  AND ((method='WALLET' AND wallet_journal_id IS NOT NULL AND gateway_attempt_id IS NULL) OR (method='GATEWAY' AND gateway_attempt_id IS NOT NULL AND wallet_journal_id IS NULL)))
 OR (purchase_id IS NULL AND free_admin_publication_id IS NOT NULL AND method='FREE' AND couple_assessment_participant_id IS NULL AND wallet_journal_id IS NULL AND gateway_attempt_id IS NULL
  AND ((slot='INDIVIDUAL' AND educational_couple_participant_id IS NULL) OR (slot IN('INITIATOR','PARTNER') AND educational_couple_participant_id IS NOT NULL))));

CREATE OR REPLACE FUNCTION assessment_admin_purchase_lock(purchase assessment_purchases) RETURNS void LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 IF purchase.educational_couple_session_id IS NOT NULL THEN
  PERFORM s.id FROM educational_couple_sessions s JOIN couple_sessions link ON link.id=s.couple_session_id WHERE s.id=purchase.educational_couple_session_id FOR UPDATE OF s;
  PERFORM link.id FROM educational_couple_sessions s JOIN couple_sessions link ON link.id=s.couple_session_id WHERE s.id=purchase.educational_couple_session_id FOR SHARE OF link;
 END IF;
 FOR target IN SELECT DISTINCT patient_id FROM (SELECT purchase.patient_id AS patient_id UNION ALL SELECT cp.patient_id FROM educational_couple_participants cp WHERE cp.session_id=purchase.educational_couple_session_id) beneficiaries ORDER BY patient_id LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('assessment-purchase:'||target::text||':'||(purchase.snapshot->>'assessmentVersionId'),0));
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||(purchase.snapshot->>'assessmentVersionId'),0));
 PERFORM pub.id FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id JOIN assessment_versions v ON v.id=o.assessment_version_id WHERE pub.id=purchase.admin_publication_id FOR SHARE OF pub,o,v;
 PERFORM c.id FROM patient_consent_records c JOIN consent_policy_versions p ON p.id=c.policy_version_id WHERE c.id IN(purchase.processing_consent_record_id,purchase.terms_consent_record_id) OR c.id IN(SELECT cp.processing_consent_record_id FROM educational_couple_participants cp WHERE cp.session_id=purchase.educational_couple_session_id) ORDER BY c.id FOR SHARE OF c,p;
 FOR target IN SELECT DISTINCT patient_id FROM (SELECT purchase.patient_id AS patient_id UNION ALL SELECT cp.patient_id FROM educational_couple_participants cp WHERE cp.session_id=purchase.educational_couple_session_id) beneficiaries ORDER BY patient_id LOOP
  PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=target AND p.clinic_id=purchase.clinic_id AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
  PERFORM i.id FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=target FOR SHARE OF i,r;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION assessment_admin_purchase_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; source uuid;
BEGIN
 PERFORM assessment_admin_purchase_lock(NEW); source:=(NEW.snapshot->>'assessmentVersionId')::uuid;
 IF NOT assessment_admin_purchase_source_current(NEW) THEN RAISE EXCEPTION 'Exact current ADMIN tariff, beneficiaries and scoped acceptances required'; END IF;
 IF NEW.educational_couple_session_id IS NOT NULL AND EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id WHERE p.educational_couple_session_id=NEW.educational_couple_session_id AND i.status='PAID') THEN RAISE EXCEPTION 'Educational couple context already has a paid purchase'; END IF;
 FOR target IN SELECT DISTINCT patient_id FROM (SELECT NEW.patient_id AS patient_id UNION ALL SELECT cp.patient_id FROM educational_couple_participants cp WHERE cp.session_id=NEW.educational_couple_session_id) beneficiaries ORDER BY patient_id LOOP
  IF EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE patient_id=target AND assessment_version_id=source AND state='IN_PROGRESS')
   OR assessment_has_pending_purchase(target,source)
   OR EXISTS(SELECT 1 FROM assessment_access_grants g WHERE g.patient_id=target AND g.assessment_version_id=source AND assessment_grant_readable(g.id,g.patient_id) AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions s WHERE s.access_grant_id=g.id)) THEN RAISE EXCEPTION 'An assessment attempt, unused access or purchase already exists'; END IF;
 END LOOP;
 RETURN NEW;
END $$;

CREATE FUNCTION educational_couple_paid_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases purchase ON purchase.id=g.purchase_id AND purchase.clinic_id=g.clinic_id
  JOIN billing_intents i ON i.assessment_purchase_id=purchase.id AND i.patient_id=purchase.patient_id AND i.clinic_id=purchase.clinic_id
  JOIN educational_couple_participants cp ON cp.id=g.educational_couple_participant_id AND cp.session_id=purchase.educational_couple_session_id AND cp.patient_id=g.patient_id AND cp.slot=g.slot AND cp.processing_consent_record_id=g.processing_consent_record_id
  JOIN educational_couple_sessions context ON context.id=cp.session_id AND context.clinic_id=g.clinic_id AND context.publication_id=purchase.admin_publication_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id AND c.patient_id=g.patient_id
  JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics clinic ON clinic.id=g.clinic_id
  WHERE g.id=grant_id AND g.patient_id=target_patient AND i.purpose='ASSESSMENT' AND i.status='PAID' AND c.withdrawn_at IS NULL AND u.status='ACTIVE' AND clinic.status='ACTIVE'
   AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT')
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b WHERE b->>'participantId'=cp.id::text AND b->>'patientId'=g.patient_id::text AND b->>'slot'=g.slot AND b->>'processingConsentRecordId'=g.processing_consent_record_id::text));
$$;
CREATE OR REPLACE FUNCTION assessment_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT assessment_paid_grant_readable(grant_id,target_patient) OR assessment_free_grant_readable(grant_id,target_patient) OR educational_couple_paid_grant_readable(grant_id,target_patient);
$$;
CREATE FUNCTION educational_couple_paid_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases purchase ON purchase.id=g.purchase_id
  JOIN assessment_admin_publications pub ON pub.id=purchase.admin_publication_id JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=g.clinic_id
  JOIN assessment_versions v ON v.id=o.assessment_version_id AND v.id=g.assessment_version_id AND v.clinic_id=g.clinic_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id JOIN consent_policy_versions p ON p.id=c.policy_version_id AND p.assessment_offering_version_id=o.id AND p.policy_key='ASSESSMENT_PROCESSING'
  WHERE g.id=grant_id AND educational_couple_paid_grant_readable(g.id,g.patient_id) AND couple_patient_is_adult(g.patient_id)
   AND pub.status='ACTIVE' AND o.status='DRAFT' AND o.kind='COUPLES' AND o.price_mode='PAID' AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash
   AND p.status='ACTIVE' AND c.content_hash=p.content_hash AND pub.document_hashes->>'ASSESSMENT_PROCESSING'=p.content_hash AND encode(sha256(convert_to(p.body,'UTF8')),'hex')=p.content_hash);
$$;
CREATE OR REPLACE FUNCTION assessment_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT assessment_paid_grant_processable(grant_id) OR assessment_free_grant_processable(grant_id) OR assessment_admin_paid_grant_processable(grant_id) OR educational_couple_paid_grant_processable(grant_id);
$$;

CREATE OR REPLACE FUNCTION assessment_admin_purchase_source_current(purchase assessment_purchases) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_admin_publications pub
  JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=purchase.clinic_id
  JOIN assessment_versions v ON v.id=o.assessment_version_id AND v.clinic_id=o.clinic_id
  JOIN consent_policy_versions processing ON processing.assessment_offering_version_id=o.id AND processing.policy_key='ASSESSMENT_PROCESSING'
  JOIN consent_policy_versions terms ON terms.assessment_offering_version_id=o.id AND terms.policy_key='ASSESSMENT_PURCHASE_TERMS'
  JOIN patient_consent_records pc ON pc.id=purchase.processing_consent_record_id AND pc.patient_id=purchase.patient_id AND pc.policy_version_id=processing.id
  JOIN patient_consent_records tc ON tc.id=purchase.terms_consent_record_id AND tc.patient_id=purchase.patient_id AND tc.policy_version_id=terms.id
  WHERE pub.id=purchase.admin_publication_id AND pub.status='ACTIVE' AND o.status='DRAFT' AND o.kind=CASE WHEN purchase.educational_couple_session_id IS NULL THEN 'INDIVIDUAL' ELSE 'COUPLES' END AND o.price_mode='PAID' AND o.payment_point='PRE_START'
   AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash AND purchase.publication_hash=assessment_admin_publication_hash(pub.id)
   AND purchase.amount_rial=o.amount_rial AND purchase.currency=o.currency AND purchase.snapshot->>'assessmentVersionId'=v.id::text AND purchase.snapshot->>'title'=o.title
   AND processing.status='ACTIVE' AND terms.status='ACTIVE' AND pc.withdrawn_at IS NULL AND tc.withdrawn_at IS NULL
   AND pc.content_hash=processing.content_hash AND tc.content_hash=terms.content_hash
   AND pub.document_hashes->>'ASSESSMENT_PROCESSING'=processing.content_hash AND pub.document_hashes->>'ASSESSMENT_PURCHASE_TERMS'=terms.content_hash
   AND encode(sha256(convert_to(processing.body,'UTF8')),'hex')=processing.content_hash AND encode(sha256(convert_to(terms.body,'UTF8')),'hex')=terms.content_hash

   AND (purchase.educational_couple_session_id IS NULL OR EXISTS(
    SELECT 1 FROM educational_couple_sessions s WHERE s.id=purchase.educational_couple_session_id AND s.clinic_id=purchase.clinic_id AND s.publication_id=pub.id
     AND purchase.snapshot->>'contextHash'=s.context_hash AND educational_couple_mutual(s.id)
     AND EXISTS(SELECT 1 FROM educational_couple_participants cp WHERE cp.session_id=s.id AND cp.patient_id=purchase.patient_id AND cp.processing_consent_record_id=purchase.processing_consent_record_id)
     AND (SELECT count(*)=2 AND count(DISTINCT cp.patient_id)=2 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b JOIN educational_couple_participants cp ON cp.id::text=b->>'participantId' AND cp.session_id=s.id AND cp.patient_id::text=b->>'patientId' AND cp.slot=b->>'slot' AND cp.processing_consent_record_id::text=b->>'processingConsentRecordId')))
   AND couple_assessment_patient_live(purchase.patient_id,purchase.clinic_id));
$$;
CREATE OR REPLACE FUNCTION assessment_has_pending_purchase(target_patient uuid,source_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id
  WHERE i.purpose='ASSESSMENT' AND i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP AND p.snapshot->>'assessmentVersionId'=source_id::text
   AND (p.patient_id=target_patient OR EXISTS(SELECT 1 FROM couple_assessment_participants cp WHERE cp.session_id=p.couple_assessment_session_id AND cp.patient_id=target_patient) OR EXISTS(SELECT 1 FROM educational_couple_participants cp WHERE cp.session_id=p.educational_couple_session_id AND cp.patient_id=target_patient)));
$$;
CREATE OR REPLACE FUNCTION assessment_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase assessment_purchases; review assessment_protocol_reviews; context couple_assessment_sessions; intent billing_intents; cp couple_assessment_participants;
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
CREATE OR REPLACE FUNCTION assessment_purchase_final_payment_check(purchase_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE purchase assessment_purchases; intent billing_intents; grant_record assessment_access_grants; target_patient patient_profiles; expected int;
BEGIN
 SELECT * INTO purchase FROM assessment_purchases WHERE id=purchase_id; IF NOT FOUND THEN RETURN; END IF;
 SELECT * INTO intent FROM billing_intents WHERE assessment_purchase_id=purchase.id;
 SELECT * INTO target_patient FROM patient_profiles WHERE id=purchase.patient_id;
 IF intent.id IS NULL OR intent.purpose<>'ASSESSMENT' OR intent.patient_id<>purchase.patient_id OR intent.clinic_id<>purchase.clinic_id OR intent.amount_rial<>purchase.amount_rial
  OR intent.currency<>purchase.currency OR intent.actor_user_id<>target_patient.user_id OR intent.snapshot IS DISTINCT FROM purchase.snapshot OR intent.expires_at IS NULL THEN RAISE EXCEPTION 'Exact owned assessment billing intent required'; END IF;
 IF intent.status<>'PAID' THEN
  IF EXISTS(SELECT 1 FROM assessment_access_grants WHERE assessment_access_grants.purchase_id=purchase.id) THEN RAISE EXCEPTION 'Unpaid assessment cannot issue access'; END IF; RETURN;
 END IF;
 expected:=CASE WHEN purchase.couple_assessment_session_id IS NULL AND purchase.educational_couple_session_id IS NULL THEN 1 ELSE 2 END;
 IF intent.paid_at IS NULL OR (SELECT count(*) FROM assessment_access_grants WHERE assessment_access_grants.purchase_id=purchase.id)<>expected THEN
  IF expected=1 THEN RAISE EXCEPTION 'Paid assessment requires exactly one evidenced grant'; ELSE RAISE EXCEPTION 'Paid couple assessment requires exactly two evidenced grants'; END IF;
 END IF;
 IF expected=2 AND EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id WHERE (p.couple_assessment_session_id=purchase.couple_assessment_session_id OR p.educational_couple_session_id=purchase.educational_couple_session_id) AND p.id<>purchase.id AND i.status='PAID') THEN RAISE EXCEPTION 'Couple context has exactly one paid purchase'; END IF;
 FOR grant_record IN SELECT * FROM assessment_access_grants WHERE assessment_access_grants.purchase_id=purchase.id LOOP
  IF grant_record.clinic_id<>purchase.clinic_id OR grant_record.assessment_version_id::text IS DISTINCT FROM purchase.snapshot->>'assessmentVersionId' OR grant_record.method<>intent.method THEN RAISE EXCEPTION 'Assessment grant scope or proof method mismatch'; END IF;
  IF expected=1 THEN
   IF grant_record.patient_id<>purchase.patient_id OR grant_record.processing_consent_record_id<>purchase.processing_consent_record_id OR grant_record.couple_assessment_participant_id IS NOT NULL OR grant_record.slot<>'INDIVIDUAL' THEN RAISE EXCEPTION 'Exact individual grant proof required'; END IF;
  ELSIF purchase.educational_couple_session_id IS NOT NULL THEN
   IF grant_record.couple_assessment_participant_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM educational_couple_participants cp WHERE cp.id=grant_record.educational_couple_participant_id AND cp.session_id=purchase.educational_couple_session_id AND cp.patient_id=grant_record.patient_id AND cp.slot=grant_record.slot AND cp.processing_consent_record_id=grant_record.processing_consent_record_id) OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b WHERE b->>'participantId'=grant_record.educational_couple_participant_id::text AND b->>'patientId'=grant_record.patient_id::text AND b->>'slot'=grant_record.slot AND b->>'processingConsentRecordId'=grant_record.processing_consent_record_id::text) THEN RAISE EXCEPTION 'Exact independently owned ADMIN couple grant proof required'; END IF;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM couple_assessment_participants cp WHERE cp.id=grant_record.couple_assessment_participant_id AND cp.session_id=purchase.couple_assessment_session_id AND cp.patient_id=grant_record.patient_id AND cp.slot=grant_record.slot AND cp.processing_consent_record_id=grant_record.processing_consent_record_id)
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b WHERE b->>'participantId'=grant_record.couple_assessment_participant_id::text AND b->>'patientId'=grant_record.patient_id::text AND b->>'slot'=grant_record.slot AND b->>'processingConsentRecordId'=grant_record.processing_consent_record_id::text) THEN RAISE EXCEPTION 'Exact independently owned coupled grant proof required'; END IF;
  END IF;
  IF intent.method='WALLET' THEN
   IF NOT EXISTS(SELECT 1 FROM wallet_journals j JOIN wallet_accounts a ON a.id=j.account_id WHERE j.id=grant_record.wallet_journal_id AND j.kind='PAYMENT' AND j.delta_rial=-intent.amount_rial AND j.reference='intent:'||intent.id::text||':debit' AND a.patient_id=purchase.patient_id AND a.clinic_id=purchase.clinic_id) THEN RAISE EXCEPTION 'Exact immutable wallet debit proof required'; END IF;
  ELSIF intent.method='GATEWAY' THEN
   IF NOT EXISTS(SELECT 1 FROM billing_gateway_attempts b WHERE b.id=grant_record.gateway_attempt_id AND b.intent_id=intent.id AND b.status='VERIFIED' AND b.verified_at IS NOT NULL AND NOT b.compensated AND b.result_code IN('0','100') AND b.amount_rial=intent.amount_rial) THEN RAISE EXCEPTION 'Exact server verified noncompensated bank proof required'; END IF;
  ELSE RAISE EXCEPTION 'Assessment requires an actual paid financial method'; END IF;
 END LOOP;
END $$;
COMMIT;
