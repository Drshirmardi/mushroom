BEGIN;
ALTER TABLE marriage_service_requests ADD COLUMN paid_intent_id uuid REFERENCES billing_intents(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE billing_intents DROP CONSTRAINT billing_intent_purpose;
ALTER TABLE billing_intents ADD CONSTRAINT billing_intent_purpose CHECK (
 (purpose='TOPUP' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL AND amount_rial>0) OR
 (purpose='ORDER' AND order_id IS NOT NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL) OR
 (purpose='APPOINTMENT' AND order_id IS NULL AND hold_id IS NOT NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL) OR
 (purpose='ASSESSMENT' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NOT NULL AND program_purchase_id IS NULL AND amount_rial>0 AND expires_at IS NOT NULL AND method IS DISTINCT FROM 'FREE') OR
 (purpose='ENTRY_ASSESSMENT' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL AND amount_rial>0 AND expires_at IS NOT NULL AND method IS DISTINCT FROM 'FREE') OR
 (purpose='PROGRAM' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NOT NULL AND expires_at IS NOT NULL AND amount_rial>=0 AND (method IS DISTINCT FROM 'FREE' OR amount_rial=0)) OR
 (purpose='MARRIAGE_REQUEST' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND program_purchase_id IS NULL AND amount_rial>0 AND expires_at IS NOT NULL AND method IS DISTINCT FROM 'FREE')
);

CREATE OR REPLACE FUNCTION assessment_purchase_final_payment_check(purchase_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE purchase assessment_purchases; intent billing_intents; grant_record assessment_access_grants; target_patient patient_profiles; expected int;
BEGIN
 SELECT * INTO purchase FROM assessment_purchases WHERE id=purchase_id; IF NOT FOUND THEN RETURN; END IF;
 SELECT * INTO intent FROM billing_intents WHERE assessment_purchase_id=purchase.id;
 SELECT * INTO target_patient FROM patient_profiles WHERE id=purchase.patient_id;
 IF intent.id IS NULL OR intent.purpose NOT IN ('ASSESSMENT','MARRIAGE_REQUEST') OR intent.patient_id<>purchase.patient_id OR intent.clinic_id<>purchase.clinic_id OR intent.amount_rial<>purchase.amount_rial
  OR intent.currency<>purchase.currency OR intent.actor_user_id<>target_patient.user_id OR intent.expires_at IS NULL THEN RAISE EXCEPTION 'Exact owned assessment billing intent required'; END IF;
 IF intent.purpose='ASSESSMENT' AND intent.snapshot IS DISTINCT FROM purchase.snapshot THEN RAISE EXCEPTION 'Exact owned assessment billing intent snapshot required'; END IF;
 IF intent.purpose='MARRIAGE_REQUEST' AND intent.snapshot->>'publicationId' IS DISTINCT FROM purchase.admin_publication_id::text THEN RAISE EXCEPTION 'Exact owned marriage billing intent publication required'; END IF;
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

CREATE OR REPLACE FUNCTION marriage_refund_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM billing_intents i WHERE i.id=NEW.intent_id AND i.purpose='MARRIAGE_REQUEST' AND i.assessment_purchase_id IS NOT NULL) THEN
  RAISE EXCEPTION 'Accepted marriage assessment cannot be refunded';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS marriage_refund_guard ON billing_refunds;
CREATE TRIGGER marriage_refund_guard BEFORE INSERT ON billing_refunds FOR EACH ROW EXECUTE FUNCTION marriage_refund_guard();

CREATE OR REPLACE FUNCTION marriage_request_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Marriage request history is retained'; END IF;
 IF NOT EXISTS(SELECT 1 FROM couple_sessions s JOIN patient_profiles p ON p.id=NEW.initiator_patient_id JOIN assessment_admin_publications pub ON pub.id=NEW.publication_id JOIN assessment_offering_versions o ON o.id=pub.offering_version_id
 WHERE s.id=NEW.link_id AND s.initiator_patient_id=NEW.initiator_patient_id AND s.clinic_id=NEW.clinic_id AND p.clinic_id=NEW.clinic_id AND o.clinic_id=NEW.clinic_id AND o.kind='COUPLES' AND o.authoring_texts->'marriage'->>'purpose'='MARRIAGE') THEN RAISE EXCEPTION 'Marriage request source and participants must share clinic and identity'; END IF;
 IF NEW.recipient_patient_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM patient_profiles WHERE id=NEW.recipient_patient_id AND clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Marriage recipient clinic mismatch'; END IF;
 IF NEW.educational_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM educational_couple_sessions WHERE id=NEW.educational_id AND couple_session_id=NEW.link_id AND publication_id=NEW.publication_id AND clinic_id=NEW.clinic_id) THEN RAISE EXCEPTION 'Marriage assessment binding mismatch'; END IF;
 IF NEW.replaces_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM marriage_service_requests WHERE id=NEW.replaces_id AND id<>NEW.id AND initiator_patient_id=NEW.initiator_patient_id AND publication_id=NEW.publication_id) THEN RAISE EXCEPTION 'Marriage replacement identity mismatch'; END IF;
 IF TG_OP='UPDATE' AND OLD.replaces_id IS NOT NULL AND NEW.replaces_id IS DISTINCT FROM OLD.replaces_id THEN RAISE EXCEPTION 'Marriage replacement binding is immutable'; END IF;
 IF NEW.paid_intent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM billing_intents WHERE id=NEW.paid_intent_id AND patient_id=NEW.initiator_patient_id AND clinic_id=NEW.clinic_id AND purpose='MARRIAGE_REQUEST' AND status='PAID') THEN RAISE EXCEPTION 'Marriage paid intent mismatch'; END IF;
 IF TG_OP='UPDATE' AND OLD.paid_intent_id IS NOT NULL AND NEW.paid_intent_id IS DISTINCT FROM OLD.paid_intent_id THEN RAISE EXCEPTION 'Marriage paid intent is immutable'; END IF;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION educational_couple_paid_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases purchase ON purchase.id=g.purchase_id AND purchase.clinic_id=g.clinic_id
  JOIN billing_intents i ON i.assessment_purchase_id=purchase.id AND i.patient_id=purchase.patient_id AND i.clinic_id=purchase.clinic_id
  JOIN educational_couple_participants cp ON cp.id=g.educational_couple_participant_id AND cp.session_id=purchase.educational_couple_session_id AND cp.patient_id=g.patient_id AND cp.slot=g.slot AND cp.processing_consent_record_id=g.processing_consent_record_id
  JOIN educational_couple_sessions context ON context.id=cp.session_id AND context.clinic_id=g.clinic_id AND context.publication_id=purchase.admin_publication_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id AND c.patient_id=g.patient_id
  JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics clinic ON clinic.id=g.clinic_id
  WHERE g.id=grant_id AND g.patient_id=target_patient AND i.purpose IN ('ASSESSMENT','MARRIAGE_REQUEST') AND i.status='PAID' AND c.withdrawn_at IS NULL AND u.status='ACTIVE' AND clinic.status='ACTIVE'
   AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT')
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b WHERE b->>'participantId'=cp.id::text AND b->>'patientId'=g.patient_id::text AND b->>'slot'=g.slot AND b->>'processingConsentRecordId'=g.processing_consent_record_id::text));
$$;

COMMIT;
