ALTER TABLE wallet_journals ADD CONSTRAINT wallet_journal_actor_fkey FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE wallet_commands ADD CONSTRAINT wallet_command_actor_fkey FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION wallet_check_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE jid uuid; j wallet_journals; n bigint; total numeric; customer_delta numeric; counter_delta numeric;
BEGIN
  IF TG_TABLE_NAME = 'wallet_journals' THEN jid := NEW.id; ELSE jid := NEW.journal_id; END IF;
  SELECT * INTO j FROM wallet_journals WHERE id = jid;
  SELECT count(*), COALESCE(sum(delta_rial), 0), COALESCE(sum(delta_rial) FILTER (WHERE account_id = j.account_id), 0), COALESCE(sum(delta_rial) FILTER (WHERE account_id = j.counter_account_id), 0)
    INTO n, total, customer_delta, counter_delta FROM wallet_entries WHERE journal_id = jid;
  IF n <> 2 OR total <> 0 OR customer_delta <> j.delta_rial OR counter_delta <> -j.delta_rial OR NOT EXISTS (
    SELECT 1 FROM wallet_accounts a JOIN wallet_accounts c ON c.id = j.counter_account_id
    JOIN patient_profiles p ON p.id = a.patient_id AND p.clinic_id = a.clinic_id
    WHERE a.id = j.account_id AND c.patient_id IS NULL AND c.clinic_id = a.clinic_id
  ) THEN RAISE EXCEPTION 'Unbalanced or out-of-scope wallet journal' USING ERRCODE = '23514'; END IF;
  -- Entry insertion must not evade the projection check by omitting an account update.
  IF EXISTS (SELECT 1 FROM wallet_accounts a WHERE a.id IN (j.account_id, j.counter_account_id)
    AND a.balance_rial <> COALESCE((SELECT sum(e.delta_rial) FROM wallet_entries e WHERE e.account_id = a.id), 0))
    THEN RAISE EXCEPTION 'Wallet entries do not match account balances' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION billing_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patient_profiles p WHERE p.id = NEW.patient_id AND p.clinic_id = NEW.clinic_id) THEN
    RAISE EXCEPTION 'Billing patient scope mismatch' USING ERRCODE = '23514';
  END IF;
  IF NEW.order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM commerce_orders o WHERE o.id = NEW.order_id AND o.patient_id = NEW.patient_id AND o.clinic_id = NEW.clinic_id AND o.total_amount_toman * 10 = NEW.amount_rial) THEN
    RAISE EXCEPTION 'Billing order scope mismatch' USING ERRCODE = '23514';
  END IF;
  IF NEW.hold_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM appointment_holds h WHERE h.id = NEW.hold_id AND h.clinic_id = NEW.clinic_id
    AND h.doctor_id::text = NEW.snapshot->>'doctorId' AND h.doctor_service_id::text = NEW.snapshot->>'doctorServiceId'
    AND h.starts_at = (NEW.snapshot->>'startsAt')::timestamptz AND h.ends_at = (NEW.snapshot->>'endsAt')::timestamptz
    AND NEW.amount_rial = (NEW.snapshot->>'priceAmount')::bigint AND NEW.snapshot->>'currency' = 'IRR') THEN
    RAISE EXCEPTION 'Billing appointment scope mismatch' USING ERRCODE = '23514';
  END IF;
  IF NEW.appointment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.id = NEW.appointment_id AND a.patient_id = NEW.patient_id AND a.clinic_id = NEW.clinic_id) THEN
    RAISE EXCEPTION 'Billing appointment result scope mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_intent_scope BEFORE INSERT OR UPDATE ON billing_intents FOR EACH ROW EXECUTE FUNCTION billing_scope_guard();

CREATE FUNCTION billing_attempt_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM billing_intents i JOIN payment_provider_config_revisions r ON r.id = NEW.revision_id
    JOIN payment_provider_configs c ON c.id = r.config_id WHERE i.id = NEW.intent_id AND i.clinic_id = c.clinic_id AND i.amount_rial = NEW.amount_rial AND r.provider_unit = 'RIAL') THEN
    RAISE EXCEPTION 'Billing attempt scope mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_attempt_scope BEFORE INSERT ON billing_gateway_attempts FOR EACH ROW EXECUTE FUNCTION billing_attempt_scope_guard();

CREATE FUNCTION billing_payment_proof_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.method = 'WALLET' AND NOT EXISTS (
    SELECT 1 FROM wallet_journals j JOIN wallet_accounts a ON a.id = j.account_id JOIN commerce_orders o ON o.id = NEW.order_id
    WHERE j.id = NEW.wallet_journal_id AND j.kind = 'PAYMENT' AND j.delta_rial = -NEW.commerce_amount_toman * 10 AND a.patient_id = o.patient_id AND a.clinic_id = o.clinic_id
  ) THEN RAISE EXCEPTION 'Wallet payment proof mismatch' USING ERRCODE = '23514'; END IF;
  IF NEW.billing_attempt_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM billing_gateway_attempts b JOIN billing_intents i ON i.id = b.intent_id WHERE b.id = NEW.billing_attempt_id
    AND i.order_id = NEW.order_id AND b.amount_rial = NEW.provider_amount AND b.amount_rial = NEW.commerce_amount_toman * 10 AND b.status IN ('VERIFYING', 'VERIFIED')
  ) THEN RAISE EXCEPTION 'Gateway payment proof mismatch' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_payment_proof BEFORE INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION billing_payment_proof_guard();

CREATE FUNCTION billing_refund_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.intent_id, OLD.amount_rial, OLD.idempotency_key, OLD.fingerprint, OLD.reason)
    IS DISTINCT FROM (NEW.intent_id, NEW.amount_rial, NEW.idempotency_key, NEW.fingerprint, NEW.reason)
    OR (OLD.status = 'COMPLETED' AND OLD IS DISTINCT FROM NEW) THEN
    RAISE EXCEPTION 'Refund financial history is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_refund_immutable BEFORE UPDATE ON billing_refunds FOR EACH ROW EXECUTE FUNCTION billing_refund_immutable();
