-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'FINANCIAL';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "billing_attempt_id" UUID,
ADD COLUMN     "method" VARCHAR(16) NOT NULL DEFAULT 'GATEWAY',
ADD COLUMN     "wallet_journal_id" UUID,
ALTER COLUMN "payment_attempt_id" DROP NOT NULL,
ALTER COLUMN "provider_amount" DROP NOT NULL,
ALTER COLUMN "provider_unit" DROP NOT NULL;

-- CreateTable
CREATE TABLE "wallet_accounts" (
    "id" UUID NOT NULL,
    "owner_key" VARCHAR(100) NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID,
    "balance_rial" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_journals" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "counter_account_id" UUID NOT NULL,
    "delta_rial" BIGINT NOT NULL,
    "before_rial" BIGINT NOT NULL,
    "after_rial" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "reference" VARCHAR(240) NOT NULL,
    "actor_user_id" UUID,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_entries" (
    "id" UUID NOT NULL,
    "journal_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "delta_rial" BIGINT NOT NULL,

    CONSTRAINT "wallet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_commands" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(240) NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_intents" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "purpose" VARCHAR(20) NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "method" VARCHAR(16),
    "actor_user_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(240) NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "order_id" UUID,
    "hold_id" UUID,
    "appointment_id" UUID,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "billing_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_gateway_attempts" (
    "compensated" BOOLEAN NOT NULL DEFAULT false,
    "id" UUID NOT NULL,
    "intent_id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "provider_order_id" BIGINT NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    "idempotency_key" VARCHAR(240) NOT NULL,
    "provider_token" VARCHAR(512),
    "result_code" VARCHAR(32),
    "reference" VARCHAR(128),
    "trace_number" VARCHAR(128),
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "billing_gateway_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_refunds" (
    "id" UUID NOT NULL,
    "intent_id" UUID NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "idempotency_key" VARCHAR(240) NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "journal_id" UUID,
    "reason" VARCHAR(500) NOT NULL,
    "evidence_reference" VARCHAR(512),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "billing_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accounts_owner_key_key" ON "wallet_accounts"("owner_key");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accounts_patient_id_key" ON "wallet_accounts"("patient_id");

-- CreateIndex
CREATE INDEX "wallet_accounts_clinic_id_patient_id_idx" ON "wallet_accounts"("clinic_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_journals_reference_key" ON "wallet_journals"("reference");

-- CreateIndex
CREATE INDEX "wallet_journals_account_id_created_at_id_idx" ON "wallet_journals"("account_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_journals_account_id_version_key" ON "wallet_journals"("account_id", "version");

-- CreateIndex
CREATE INDEX "wallet_entries_account_id_idx" ON "wallet_entries"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_entries_journal_id_account_id_key" ON "wallet_entries"("journal_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_commands_actor_user_id_idempotency_key_key" ON "wallet_commands"("actor_user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "billing_intents_order_id_key" ON "billing_intents"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_intents_hold_id_key" ON "billing_intents"("hold_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_intents_appointment_id_key" ON "billing_intents"("appointment_id");

-- CreateIndex
CREATE INDEX "billing_intents_clinic_id_status_created_at_id_idx" ON "billing_intents"("clinic_id", "status", "created_at", "id");

-- CreateIndex
CREATE INDEX "billing_intents_patient_id_created_at_id_idx" ON "billing_intents"("patient_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "billing_intents_status_expires_at_idx" ON "billing_intents"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_intents_actor_user_id_idempotency_key_key" ON "billing_intents"("actor_user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "billing_gateway_attempts_provider_order_id_key" ON "billing_gateway_attempts"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_gateway_attempts_provider_token_key" ON "billing_gateway_attempts"("provider_token");

-- CreateIndex
CREATE UNIQUE INDEX "billing_gateway_attempts_reference_key" ON "billing_gateway_attempts"("reference");

-- CreateIndex
CREATE INDEX "billing_gateway_attempts_status_updated_at_idx" ON "billing_gateway_attempts"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_gateway_attempts_intent_id_idempotency_key_key" ON "billing_gateway_attempts"("intent_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "billing_refunds_status_created_at_idx" ON "billing_refunds"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_refunds_intent_id_idempotency_key_key" ON "billing_refunds"("intent_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_billing_attempt_id_key" ON "payments"("billing_attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_wallet_journal_id_key" ON "payments"("wallet_journal_id");

-- AddForeignKey
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_journals" ADD CONSTRAINT "wallet_journals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_journals" ADD CONSTRAINT "wallet_journals_counter_account_id_fkey" FOREIGN KEY ("counter_account_id") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "wallet_journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_intents" ADD CONSTRAINT "billing_intents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_intents" ADD CONSTRAINT "billing_intents_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_intents" ADD CONSTRAINT "billing_intents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_intents" ADD CONSTRAINT "billing_intents_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "appointment_holds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_intents" ADD CONSTRAINT "billing_intents_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_gateway_attempts" ADD CONSTRAINT "billing_gateway_attempts_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "billing_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_gateway_attempts" ADD CONSTRAINT "billing_gateway_attempts_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "payment_provider_config_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_refunds" ADD CONSTRAINT "billing_refunds_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "billing_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_refunds" ADD CONSTRAINT "billing_refunds_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "wallet_journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billing_attempt_id_fkey" FOREIGN KEY ("billing_attempt_id") REFERENCES "billing_gateway_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_wallet_journal_id_fkey" FOREIGN KEY ("wallet_journal_id") REFERENCES "wallet_journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Financial invariants remain authoritative even if a caller bypasses an application check.
ALTER TABLE wallet_accounts ADD CONSTRAINT wallet_customer_nonnegative CHECK (patient_id IS NULL OR balance_rial >= 0);
ALTER TABLE wallet_accounts ADD CONSTRAINT wallet_version_nonnegative CHECK (version >= 0);
ALTER TABLE wallet_journals ADD CONSTRAINT wallet_journal_delta CHECK (delta_rial <> 0 AND after_rial = before_rial + delta_rial AND before_rial >= 0 AND after_rial >= 0 AND account_id <> counter_account_id);
ALTER TABLE wallet_entries ADD CONSTRAINT wallet_entry_nonzero CHECK (delta_rial <> 0);
ALTER TABLE billing_intents ADD CONSTRAINT billing_intent_amount CHECK (amount_rial >= 0 AND amount_rial <= 9000000000000000000);
ALTER TABLE billing_intents ADD CONSTRAINT billing_intent_purpose CHECK (
  (purpose = 'TOPUP' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND amount_rial > 0) OR
  (purpose = 'ORDER' AND order_id IS NOT NULL AND hold_id IS NULL AND appointment_id IS NULL) OR
  (purpose = 'APPOINTMENT' AND order_id IS NULL AND hold_id IS NOT NULL)
);
ALTER TABLE billing_intents ADD CONSTRAINT billing_intent_status CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'COMPENSATED'));
ALTER TABLE billing_intents ADD CONSTRAINT billing_intent_method CHECK (method IS NULL OR method IN ('WALLET', 'GATEWAY', 'FREE'));
ALTER TABLE billing_gateway_attempts ADD CONSTRAINT billing_attempt_amount CHECK (amount_rial > 0 AND provider_order_id > 0);
ALTER TABLE billing_gateway_attempts ADD CONSTRAINT billing_attempt_status CHECK (status IN ('CREATED', 'REDIRECT_READY', 'VERIFYING', 'VERIFIED', 'FAILED', 'REQUIRES_RECONCILIATION'));
CREATE UNIQUE INDEX billing_one_unresolved_attempt ON billing_gateway_attempts(intent_id) WHERE status IN ('CREATED', 'REDIRECT_READY', 'VERIFYING', 'REQUIRES_RECONCILIATION');
ALTER TABLE billing_refunds ADD CONSTRAINT billing_refund_amount CHECK (amount_rial > 0);
ALTER TABLE billing_refunds ADD CONSTRAINT billing_refund_status CHECK (status IN ('MANUAL_REQUIRED', 'COMPLETED'));
ALTER TABLE payments ADD CONSTRAINT payment_method_proof CHECK (
  (method = 'GATEWAY' AND num_nonnulls(payment_attempt_id, billing_attempt_id) = 1 AND wallet_journal_id IS NULL AND provider_amount IS NOT NULL AND provider_unit IS NOT NULL) OR
  (method = 'WALLET' AND wallet_journal_id IS NOT NULL AND num_nonnulls(payment_attempt_id, billing_attempt_id, provider_amount, provider_unit, provider_reference_id, provider_trace_number) = 0) OR
  (method = 'FREE' AND commerce_amount_toman = 0 AND num_nonnulls(payment_attempt_id, billing_attempt_id, wallet_journal_id, provider_amount, provider_unit, provider_reference_id, provider_trace_number) = 0)
);

CREATE FUNCTION wallet_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Financial history is append-only' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER wallet_journal_immutable BEFORE UPDATE OR DELETE ON wallet_journals FOR EACH ROW EXECUTE FUNCTION wallet_history_immutable();
CREATE TRIGGER wallet_entry_immutable BEFORE UPDATE OR DELETE ON wallet_entries FOR EACH ROW EXECUTE FUNCTION wallet_history_immutable();
CREATE TRIGGER wallet_command_immutable BEFORE UPDATE OR DELETE ON wallet_commands FOR EACH ROW EXECUTE FUNCTION wallet_history_immutable();

CREATE FUNCTION wallet_check_journal() RETURNS trigger LANGUAGE plpgsql AS $$
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
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER wallet_journal_balanced AFTER INSERT ON wallet_journals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION wallet_check_journal();
CREATE CONSTRAINT TRIGGER wallet_entry_balanced AFTER INSERT ON wallet_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION wallet_check_journal();

CREATE FUNCTION wallet_check_projection() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual numeric; stored bigint;
BEGIN
  SELECT balance_rial INTO stored FROM wallet_accounts WHERE id = NEW.id;
  SELECT COALESCE(sum(delta_rial), 0) INTO actual FROM wallet_entries WHERE account_id = NEW.id;
  IF stored <> actual THEN RAISE EXCEPTION 'Wallet balance does not match its ledger' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER wallet_projection_matches AFTER INSERT OR UPDATE ON wallet_accounts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION wallet_check_projection();

CREATE FUNCTION billing_snapshot_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.patient_id, OLD.clinic_id, OLD.purpose, OLD.amount_rial, OLD.order_id, OLD.hold_id, OLD.snapshot, OLD.actor_user_id, OLD.idempotency_key, OLD.fingerprint, OLD.expires_at)
    IS DISTINCT FROM (NEW.patient_id, NEW.clinic_id, NEW.purpose, NEW.amount_rial, NEW.order_id, NEW.hold_id, NEW.snapshot, NEW.actor_user_id, NEW.idempotency_key, NEW.fingerprint, NEW.expires_at)
    THEN RAISE EXCEPTION 'Billing snapshot is immutable' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_snapshot_immutable BEFORE UPDATE ON billing_intents FOR EACH ROW EXECUTE FUNCTION billing_snapshot_immutable();

CREATE FUNCTION billing_attempt_snapshot_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.intent_id, OLD.revision_id, OLD.provider_order_id, OLD.amount_rial, OLD.idempotency_key)
    IS DISTINCT FROM (NEW.intent_id, NEW.revision_id, NEW.provider_order_id, NEW.amount_rial, NEW.idempotency_key)
    OR (OLD.provider_token IS NOT NULL AND OLD.provider_token IS DISTINCT FROM NEW.provider_token)
    THEN RAISE EXCEPTION 'Billing attempt snapshot is immutable' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_attempt_snapshot_immutable BEFORE UPDATE ON billing_gateway_attempts FOR EACH ROW EXECUTE FUNCTION billing_attempt_snapshot_immutable();

-- Old and new orchestration share the same sequence and collision protection.
CREATE FUNCTION billing_order_id_unique() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('provider-order:' || NEW.provider_order_id::text, 0));
  IF TG_TABLE_NAME = 'payment_attempts' THEN
    IF EXISTS (SELECT 1 FROM billing_gateway_attempts WHERE provider_order_id = NEW.provider_order_id) THEN RAISE EXCEPTION 'Provider order id collision' USING ERRCODE = '23505'; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM payment_attempts WHERE provider_order_id = NEW.provider_order_id) THEN RAISE EXCEPTION 'Provider order id collision' USING ERRCODE = '23505'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_legacy_order_id_unique BEFORE INSERT ON payment_attempts FOR EACH ROW EXECUTE FUNCTION billing_order_id_unique();
CREATE TRIGGER billing_shared_order_id_unique BEFORE INSERT ON billing_gateway_attempts FOR EACH ROW EXECUTE FUNCTION billing_order_id_unique();

-- Serialize and check capacity across both tables, including legacy/free booking paths.
CREATE FUNCTION billing_capacity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('billing-doctor:' || NEW.doctor_id::text, 0));
  IF TG_TABLE_NAME = 'appointment_holds' AND (NEW.released_at IS NOT NULL OR NEW.expires_at <= now()) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'appointments' AND NEW.status NOT IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM appointment_holds h WHERE h.doctor_id = NEW.doctor_id AND h.clinic_id = NEW.clinic_id AND h.id <> NEW.id AND h.released_at IS NULL AND h.expires_at > now() AND h.starts_at < NEW.ends_at AND h.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'Appointment capacity is temporarily held' USING ERRCODE = '23P01';
  END IF;
  IF TG_TABLE_NAME = 'appointment_holds' AND EXISTS (SELECT 1 FROM appointments a WHERE a.doctor_id = NEW.doctor_id AND a.clinic_id = NEW.clinic_id AND a.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS') AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'Appointment capacity is allocated' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_hold_capacity BEFORE INSERT OR UPDATE ON appointment_holds FOR EACH ROW EXECUTE FUNCTION billing_capacity_guard();
CREATE TRIGGER billing_appointment_capacity BEFORE INSERT OR UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION billing_capacity_guard();
