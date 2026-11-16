BEGIN;
ALTER TABLE patient_entry_policies ADD COLUMN amount_rial bigint NOT NULL DEFAULT 0 CHECK(amount_rial BETWEEN 0 AND 9000000000000000000), ADD COLUMN allow_deferral boolean NOT NULL DEFAULT false;
ALTER TABLE patient_entries ADD COLUMN amount_rial bigint CHECK(amount_rial BETWEEN 0 AND 9000000000000000000), ADD COLUMN deferred_at timestamptz(3), ADD COLUMN paid_intent_id uuid UNIQUE REFERENCES billing_intents(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE billing_intents DROP CONSTRAINT billing_intent_purpose;
ALTER TABLE billing_intents ADD CONSTRAINT billing_intent_purpose CHECK (
 (purpose='TOPUP' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL AND amount_rial>0) OR
 (purpose='ORDER' AND order_id IS NOT NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL) OR
 (purpose='APPOINTMENT' AND order_id IS NULL AND hold_id IS NOT NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL) OR
 (purpose='ASSESSMENT' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NOT NULL AND program_purchase_id IS NULL AND amount_rial>0 AND expires_at IS NOT NULL AND method IS DISTINCT FROM 'FREE') OR
 (purpose='ENTRY_ASSESSMENT' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL AND amount_rial>0 AND expires_at IS NOT NULL AND method IS DISTINCT FROM 'FREE') OR
 (purpose='PROGRAM' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NOT NULL AND expires_at IS NOT NULL AND amount_rial>=0 AND (method IS DISTINCT FROM 'FREE' OR amount_rial=0))
);

CREATE FUNCTION entry_payment_binding_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.amount_rial IS NOT NULL AND NEW.amount_rial IS DISTINCT FROM OLD.amount_rial THEN RAISE EXCEPTION 'Entry quote is pinned'; END IF;
 IF TG_OP='UPDATE' AND OLD.paid_intent_id IS NOT NULL AND NEW.paid_intent_id IS DISTINCT FROM OLD.paid_intent_id THEN RAISE EXCEPTION 'Entry payment is immutable'; END IF;
 IF NEW.paid_intent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM billing_intents i WHERE i.id=NEW.paid_intent_id AND i.patient_id=NEW.patient_id AND i.clinic_id=NEW.clinic_id AND i.purpose='ENTRY_ASSESSMENT' AND i.status='PAID' AND i.amount_rial=NEW.amount_rial AND i.snapshot->>'assessmentVersionId'=NEW.assessment_version_id::text) THEN RAISE EXCEPTION 'Verified exact entry payment required'; END IF;
 IF NEW.submission_id IS NOT NULL AND COALESCE(NEW.amount_rial,0)>0 AND NEW.paid_intent_id IS NULL THEN RAISE EXCEPTION 'Entry payment required before start'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER entry_payment_binding_guard AFTER INSERT OR UPDATE ON patient_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION entry_payment_binding_guard();
CREATE FUNCTION entry_billing_final_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE i billing_intents;
BEGIN
 SELECT * INTO i FROM billing_intents WHERE id=NEW.id;
 IF i.purpose<>'ENTRY_ASSESSMENT' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.status='PAID' AND i.status<>'PAID' THEN RAISE EXCEPTION 'Paid entry history is retained'; END IF;
 IF i.status='PAID' THEN
  IF i.paid_at IS NULL OR NOT EXISTS(SELECT 1 FROM patient_entries e WHERE e.paid_intent_id=i.id AND e.patient_id=i.patient_id AND e.clinic_id=i.clinic_id AND e.amount_rial=i.amount_rial AND e.assessment_version_id::text=i.snapshot->>'assessmentVersionId') THEN RAISE EXCEPTION 'Exact owned entry settlement required'; END IF;
  IF i.method='WALLET' THEN
   IF NOT EXISTS(SELECT 1 FROM wallet_journals j JOIN wallet_accounts a ON a.id=j.account_id WHERE j.kind='PAYMENT' AND j.delta_rial=-i.amount_rial AND j.reference='intent:'||i.id::text||':debit' AND a.patient_id=i.patient_id AND a.clinic_id=i.clinic_id) THEN RAISE EXCEPTION 'Actual entry wallet debit required'; END IF;
  ELSIF i.method='GATEWAY' THEN
   IF NOT EXISTS(SELECT 1 FROM billing_gateway_attempts a WHERE a.intent_id=i.id AND a.status='VERIFIED' AND a.verified_at IS NOT NULL AND NOT a.compensated AND a.result_code IN('0','100') AND a.amount_rial=i.amount_rial) THEN RAISE EXCEPTION 'Actual bank verification required'; END IF;
  ELSE RAISE EXCEPTION 'Paid entry method required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER entry_billing_final_guard AFTER INSERT OR UPDATE ON billing_intents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION entry_billing_final_guard();
COMMIT;
