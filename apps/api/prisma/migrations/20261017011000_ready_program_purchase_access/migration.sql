BEGIN;

-- AlterTable
ALTER TABLE "billing_intents" ADD COLUMN     "program_purchase_id" UUID;

-- CreateTable
CREATE TABLE "program_purchases" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "publication_hash" CHAR(64) NOT NULL,
    "program_definition_id" UUID NOT NULL,
    "terms_consent_record_id" UUID NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_access_grants" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "method" VARCHAR(16) NOT NULL,
    "wallet_journal_id" UUID,
    "gateway_attempt_id" UUID,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(3),

    CONSTRAINT "program_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_purchases_patient_created_idx" ON "program_purchases"("clinic_id", "patient_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "program_purchases_patient_definition_idx" ON "program_purchases"("patient_id", "program_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_purchases_id_clinic_key" ON "program_purchases"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_access_grants_purchase_key" ON "program_access_grants"("purchase_id");

-- CreateIndex
CREATE INDEX "program_access_grants_patient_granted_idx" ON "program_access_grants"("clinic_id", "patient_id", "granted_at", "id");

-- CreateIndex
CREATE INDEX "program_access_grants_patient_period_idx" ON "program_access_grants"("patient_id", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "program_access_grants_purchase_clinic_key" ON "program_access_grants"("purchase_id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_intents_program_purchase_key" ON "billing_intents"("program_purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_publications_id_clinic_key" ON "program_offering_publications"("id", "clinic_id");

-- AddForeignKey
ALTER TABLE "billing_intents" ADD CONSTRAINT "billing_intents_program_purchase_id_fkey" FOREIGN KEY ("program_purchase_id") REFERENCES "program_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_publication_id_clinic_id_fkey" FOREIGN KEY ("publication_id", "clinic_id") REFERENCES "program_offering_publications"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_program_definition_id_fkey" FOREIGN KEY ("program_definition_id") REFERENCES "program_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_purchases" ADD CONSTRAINT "program_purchases_terms_consent_record_id_fkey" FOREIGN KEY ("terms_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_access_grants" ADD CONSTRAINT "program_access_grants_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_access_grants" ADD CONSTRAINT "program_access_grants_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_access_grants" ADD CONSTRAINT "program_access_grants_purchase_id_clinic_id_fkey" FOREIGN KEY ("purchase_id", "clinic_id") REFERENCES "program_purchases"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_access_grants" ADD CONSTRAINT "program_access_grants_wallet_journal_id_fkey" FOREIGN KEY ("wallet_journal_id") REFERENCES "wallet_journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_access_grants" ADD CONSTRAINT "program_access_grants_gateway_attempt_id_fkey" FOREIGN KEY ("gateway_attempt_id") REFERENCES "billing_gateway_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE billing_intents DROP CONSTRAINT billing_intent_purpose;
ALTER TABLE billing_intents ADD CONSTRAINT billing_intent_purpose CHECK (
 (purpose='TOPUP' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL AND amount_rial>0) OR
 (purpose='ORDER' AND order_id IS NOT NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL) OR
 (purpose='APPOINTMENT' AND order_id IS NULL AND hold_id IS NOT NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NULL) OR
 (purpose='ASSESSMENT' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NOT NULL AND program_purchase_id IS NULL AND amount_rial>0 AND expires_at IS NOT NULL AND method IS DISTINCT FROM 'FREE') OR
 (purpose='PROGRAM' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND program_purchase_id IS NOT NULL AND expires_at IS NOT NULL AND amount_rial>=0 AND (method IS DISTINCT FROM 'FREE' OR amount_rial=0))
);
ALTER TABLE program_purchases ADD CONSTRAINT program_purchase_shape CHECK(COALESCE(
 amount_rial BETWEEN 0 AND 9000000000000000000 AND currency='IRR' AND publication_hash ~ '^[a-f0-9]{64}$'
 AND jsonb_typeof(snapshot)='object' AND octet_length(snapshot::text)<=8192 AND snapshot->'schemaVersion'='1'::jsonb
 AND snapshot->>'purchaseId'=id::text AND snapshot->>'publicationId'=publication_id::text AND snapshot->>'publicationHash'=publication_hash
 AND snapshot->>'programDefinitionId'=program_definition_id::text AND snapshot->>'termsConsentRecordId'=terms_consent_record_id::text
 AND snapshot->>'amountRial'=amount_rial::text AND snapshot->>'currency'=currency,false));
ALTER TABLE program_access_grants ADD CONSTRAINT program_grant_shape CHECK(
 (ends_at IS NULL OR ends_at>granted_at) AND (
 (method='FREE' AND wallet_journal_id IS NULL AND gateway_attempt_id IS NULL) OR
 (method='WALLET' AND wallet_journal_id IS NOT NULL AND gateway_attempt_id IS NULL) OR
 (method='GATEWAY' AND wallet_journal_id IS NULL AND gateway_attempt_id IS NOT NULL)));

CREATE FUNCTION program_publication_quoted(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_offering_publications pub JOIN program_definition_versions d ON d.id=pub.program_definition_id AND d.clinic_id=pub.clinic_id
 JOIN consent_policy_versions t ON t.id=pub.terms_policy_version_id AND t.clinic_id=pub.clinic_id
 WHERE pub.id=target AND (pub.status='ACTIVE' OR (pub.status='RETIRED' AND pub.retirement_reason='REPLACED'))
 AND d.kind='READY_EDUCATION' AND d.content_hash=pub.definition_content_hash AND program_definition_usable(d.id)
 AND pub.access_mode IN('DAYS','PERPETUAL') AND t.policy_key='PROGRAM_PURCHASE_TERMS' AND t.locale=pub.locale AND t.status='ACTIVE' AND t.activated_at IS NOT NULL AND t.content_hash=pub.terms_content_hash);
$$;
CREATE FUNCTION program_has_live_purchase(target_patient uuid,definition_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_purchases p JOIN billing_intents i ON i.program_purchase_id=p.id
 LEFT JOIN program_access_grants g ON g.purchase_id=p.id
 WHERE p.patient_id=target_patient AND p.program_definition_id=definition_id AND (
 (i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP) OR (i.status='PAID' AND g.id IS NOT NULL AND (g.ends_at IS NULL OR g.ends_at>CURRENT_TIMESTAMP))));
$$;
CREATE FUNCTION program_grant_readable(grant_id uuid,target_patient uuid,as_of timestamptz DEFAULT CURRENT_TIMESTAMP) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_access_grants g JOIN program_purchases p ON p.id=g.purchase_id AND p.patient_id=g.patient_id AND p.clinic_id=g.clinic_id
 JOIN billing_intents i ON i.program_purchase_id=p.id AND i.patient_id=p.patient_id AND i.clinic_id=p.clinic_id
 JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics c ON c.id=g.clinic_id
 WHERE g.id=grant_id AND g.patient_id=target_patient AND i.purpose='PROGRAM' AND i.status='PAID' AND (g.ends_at IS NULL OR g.ends_at>as_of)
 AND u.status='ACTIVE' AND c.status='ACTIVE' AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT')
 AND program_definition_usable(p.program_definition_id));
$$;

CREATE FUNCTION program_commercial_consent_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy consent_policy_versions; old_key text;
BEGIN
 IF TG_OP='DELETE' THEN SELECT * INTO policy FROM consent_policy_versions WHERE id=OLD.policy_version_id;
 ELSE SELECT * INTO policy FROM consent_policy_versions WHERE id=NEW.policy_version_id FOR SHARE; END IF;
 IF TG_OP='UPDATE' THEN SELECT policy_key INTO old_key FROM consent_policy_versions WHERE id=OLD.policy_version_id; END IF;
 IF policy.policy_key IS DISTINCT FROM 'PROGRAM_PURCHASE_TERMS' AND old_key IS DISTINCT FROM 'PROGRAM_PURCHASE_TERMS' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' OR TG_OP='UPDATE' THEN RAISE EXCEPTION 'Program commercial acceptance is retained immutable evidence'; END IF;
 IF policy.status<>'ACTIVE' OR policy.activated_at IS NULL OR policy.content_hash<>NEW.content_hash OR NEW.source<>'PATIENT_APP' OR NEW.withdrawn_at IS NOT NULL OR COALESCE(NEW.acceptance_idempotency_key,'') !~ '^[!-~]{1,200}$' THEN RAISE EXCEPTION 'Explicit exact active program terms required'; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN sessions s ON s.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
 WHERE p.id=NEW.patient_id AND p.clinic_id=policy.clinic_id AND u.id=NEW.accepted_by_user_id AND s.id=NEW.accepted_by_session_id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,s,ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current independent program terms identity/session required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_commercial_consent_guard BEFORE INSERT OR UPDATE OR DELETE ON patient_consent_records FOR EACH ROW EXECUTE FUNCTION program_commercial_consent_guard();

CREATE FUNCTION program_purchase_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pub program_offering_publications; definition program_definition_versions;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('program-purchase:'||NEW.patient_id::text||':'||NEW.program_definition_id::text,0));
 SELECT * INTO pub FROM program_offering_publications WHERE id=NEW.publication_id AND clinic_id=NEW.clinic_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Same-clinic program tariff required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||NEW.clinic_id::text||':'||pub.program_key||':'||pub.locale,0));
 IF NOT program_publication_lock_definition(NEW.program_definition_id) THEN RAISE EXCEPTION 'Current approved program source required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id=pub.terms_policy_version_id FOR SHARE;
 IF NOT program_publication_current(pub.id) OR NOT program_publication_quoted(pub.id) THEN RAISE EXCEPTION 'Current ready educational publication required'; END IF;
 SELECT * INTO definition FROM program_definition_versions WHERE id=NEW.program_definition_id AND clinic_id=NEW.clinic_id;
 IF definition.id IS NULL OR definition.id<>pub.program_definition_id OR pub.publication_hash<>NEW.publication_hash OR pub.amount_rial<>NEW.amount_rial OR pub.currency<>NEW.currency
 OR NEW.snapshot->>'definitionContentHash' IS DISTINCT FROM definition.content_hash OR NEW.snapshot->>'title' IS DISTINCT FROM definition.title OR NEW.snapshot->>'accessMode' IS DISTINCT FROM pub.access_mode
 OR NEW.snapshot->'accessDurationDays' IS DISTINCT FROM COALESCE(to_jsonb(pub.access_duration_days),'null'::jsonb) THEN RAISE EXCEPTION 'Exact immutable program purchase snapshot required'; END IF;
 PERFORM id FROM patient_consent_records WHERE id=NEW.terms_consent_record_id AND patient_id=NEW.patient_id AND policy_version_id=pub.terms_policy_version_id AND content_hash=pub.terms_content_hash AND withdrawn_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exact owned program terms acceptance required'; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active independent patient required'; END IF;
 IF program_has_live_purchase(NEW.patient_id,NEW.program_definition_id) THEN RAISE EXCEPTION 'Existing pending purchase or owned unexpired program access'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_purchase_insert_guard BEFORE INSERT ON program_purchases FOR EACH ROW EXECUTE FUNCTION program_purchase_insert_guard();
CREATE FUNCTION program_retained_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Program purchase and grant history is immutable retained evidence'; END $$;
CREATE TRIGGER program_purchase_history_guard BEFORE UPDATE OR DELETE ON program_purchases FOR EACH ROW EXECUTE FUNCTION program_retained_immutable();
CREATE TRIGGER program_grant_history_guard BEFORE UPDATE OR DELETE ON program_access_grants FOR EACH ROW EXECUTE FUNCTION program_retained_immutable();

CREATE FUNCTION program_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase program_purchases; pub program_offering_publications;
BEGIN
 SELECT * INTO purchase FROM program_purchases WHERE id=NEW.purchase_id;
 IF purchase.id IS NULL OR purchase.patient_id<>NEW.patient_id OR purchase.clinic_id<>NEW.clinic_id THEN RAISE EXCEPTION 'Exact owned program beneficiary required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-purchase:'||NEW.patient_id::text||':'||purchase.program_definition_id::text,0));
 SELECT * INTO pub FROM program_offering_publications WHERE id=purchase.publication_id;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||purchase.clinic_id::text||':'||pub.program_key||':'||pub.locale,0));
 IF NOT program_publication_lock_definition(purchase.program_definition_id) THEN RAISE EXCEPTION 'Current exact program clinical source required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id=pub.terms_policy_version_id FOR SHARE;
 IF NOT program_publication_quoted(pub.id) OR NOT EXISTS(SELECT 1 FROM billing_intents WHERE program_purchase_id=purchase.id AND expires_at>CURRENT_TIMESTAMP) THEN RAISE EXCEPTION 'Current exact unexpired program quote required'; END IF;
 IF abs(extract(epoch FROM (NEW.granted_at-CURRENT_TIMESTAMP)))>1 OR NEW.ends_at IS DISTINCT FROM (CASE WHEN pub.access_mode='DAYS' THEN NEW.granted_at+pub.access_duration_days*INTERVAL '24 hours' ELSE NULL END) THEN RAISE EXCEPTION 'Exact database program access period required'; END IF;
 IF EXISTS(SELECT 1 FROM program_access_grants g JOIN program_purchases p ON p.id=g.purchase_id WHERE g.patient_id=NEW.patient_id AND p.program_definition_id=purchase.program_definition_id AND (g.ends_at IS NULL OR g.ends_at>CURRENT_TIMESTAMP)) THEN RAISE EXCEPTION 'Existing unexpired program grant'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_grant_insert_guard BEFORE INSERT ON program_access_grants FOR EACH ROW EXECUTE FUNCTION program_grant_insert_guard();

CREATE FUNCTION program_purchase_final_proof(target uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE purchase program_purchases; intent billing_intents; grant_record program_access_grants;
BEGIN
 SELECT * INTO purchase FROM program_purchases WHERE id=target; IF NOT FOUND THEN RETURN; END IF;
 SELECT * INTO intent FROM billing_intents WHERE program_purchase_id=purchase.id;
 IF intent.id IS NULL OR intent.purpose<>'PROGRAM' OR intent.clinic_id<>purchase.clinic_id OR intent.patient_id<>purchase.patient_id OR intent.amount_rial<>purchase.amount_rial OR intent.currency<>purchase.currency OR intent.snapshot IS DISTINCT FROM purchase.snapshot OR intent.expires_at IS NULL
 OR intent.actor_user_id IS DISTINCT FROM (SELECT user_id FROM patient_profiles WHERE id=purchase.patient_id) THEN RAISE EXCEPTION 'Exact owned program financial intent required'; END IF;
 IF intent.status<>'PAID' THEN IF EXISTS(SELECT 1 FROM program_access_grants WHERE purchase_id=target) THEN RAISE EXCEPTION 'Unpaid program cannot grant access'; END IF; RETURN; END IF;
 IF intent.paid_at IS NULL OR (SELECT count(*) FROM program_access_grants WHERE purchase_id=target)<>1 THEN RAISE EXCEPTION 'Paid program requires exactly one proved grant'; END IF;
 SELECT * INTO grant_record FROM program_access_grants WHERE purchase_id=target;
 IF grant_record.patient_id<>purchase.patient_id OR grant_record.clinic_id<>purchase.clinic_id OR grant_record.method<>intent.method THEN RAISE EXCEPTION 'Program financial grant scope/method mismatch'; END IF;
 IF intent.method='FREE' THEN
  IF intent.amount_rial<>0 OR grant_record.wallet_journal_id IS NOT NULL OR grant_record.gateway_attempt_id IS NOT NULL THEN RAISE EXCEPTION 'Only exact zero tariff grants free access'; END IF;
 ELSIF intent.method='WALLET' THEN
  IF intent.amount_rial<=0 OR NOT EXISTS(SELECT 1 FROM wallet_journals j JOIN wallet_accounts a ON a.id=j.account_id WHERE j.id=grant_record.wallet_journal_id AND j.kind='PAYMENT' AND j.delta_rial=-intent.amount_rial AND j.reference='intent:'||intent.id::text||':debit' AND a.patient_id=purchase.patient_id AND a.clinic_id=purchase.clinic_id) THEN RAISE EXCEPTION 'Actual exact immutable program wallet debit required'; END IF;
 ELSIF intent.method='GATEWAY' THEN
  IF intent.amount_rial<=0 OR NOT EXISTS(SELECT 1 FROM billing_gateway_attempts b WHERE b.id=grant_record.gateway_attempt_id AND b.intent_id=intent.id AND b.status='VERIFIED' AND b.verified_at IS NOT NULL AND NOT b.compensated AND b.result_code IN('0','100') AND b.amount_rial=intent.amount_rial) THEN RAISE EXCEPTION 'Actual exact server verified program bank proof required'; END IF;
 ELSE RAISE EXCEPTION 'Supported proved program funding method required'; END IF;
END $$;
CREATE FUNCTION program_deferred_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='program_purchases' THEN
  target:=NEW.id;
  PERFORM a.id FROM audit_events a JOIN sessions s ON s.id=a.actor_session_id AND s.user_id=a.actor_user_id JOIN users u ON u.id=s.user_id JOIN billing_intents i ON i.id::text=a.subject_id AND i.program_purchase_id=target
  WHERE a.action='BILLING_INTENT_CREATED' AND a.actor_user_id=i.actor_user_id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current independent audited program purchase session required'; END IF;
 ELSIF TG_TABLE_NAME='program_access_grants' THEN target:=NEW.purchase_id;
 ELSIF TG_TABLE_NAME='billing_intents' THEN target:=NEW.program_purchase_id;
 ELSE SELECT program_purchase_id INTO target FROM billing_intents WHERE id=NEW.intent_id; END IF;
 IF target IS NOT NULL THEN PERFORM program_purchase_final_proof(target); END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER program_purchase_deferred_proof AFTER INSERT ON program_purchases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION program_deferred_proof();
CREATE CONSTRAINT TRIGGER program_grant_deferred_proof AFTER INSERT ON program_access_grants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION program_deferred_proof();
CREATE CONSTRAINT TRIGGER program_billing_deferred_proof AFTER INSERT OR UPDATE ON billing_intents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION program_deferred_proof();
CREATE CONSTRAINT TRIGGER program_attempt_deferred_proof AFTER INSERT OR UPDATE ON billing_gateway_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION program_deferred_proof();
CREATE FUNCTION program_billing_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='billing_refunds' THEN
  IF EXISTS(SELECT 1 FROM billing_intents WHERE id=NEW.intent_id AND purpose='PROGRAM') THEN RAISE EXCEPTION 'Successful program purchases have no ordinary refunds'; END IF; RETURN NEW;
 ELSIF TG_TABLE_NAME='billing_gateway_attempts' THEN
  IF EXISTS(SELECT 1 FROM billing_intents WHERE id=OLD.intent_id AND purpose='PROGRAM') THEN
   IF TG_OP='DELETE' OR NEW.intent_id IS DISTINCT FROM OLD.intent_id OR OLD.status='VERIFIED' AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN RAISE EXCEPTION 'Program bank proof is retained and immutable after verification'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF OLD.purpose='PROGRAM' OR (TG_OP<>'DELETE' AND NEW.purpose='PROGRAM') THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Program financial history is retained'; END IF;
  IF (to_jsonb(NEW)-ARRAY['status','method','paid_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','method','paid_at','updated_at']) THEN RAISE EXCEPTION 'Program billing snapshot is immutable'; END IF;
  IF OLD.status IN('PAID','COMPENSATED') AND ROW(NEW.status,NEW.method,NEW.paid_at) IS DISTINCT FROM ROW(OLD.status,OLD.method,OLD.paid_at) THEN RAISE EXCEPTION 'Program captured payment evidence is final'; END IF;
  IF OLD.status IN('EXPIRED','CANCELLED') AND NEW.status NOT IN(OLD.status,'COMPENSATED') THEN RAISE EXCEPTION 'Abandoned program cannot be fulfilled'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER program_billing_history_guard BEFORE UPDATE OR DELETE ON billing_intents FOR EACH ROW EXECUTE FUNCTION program_billing_history_guard();
CREATE TRIGGER program_attempt_history_guard BEFORE UPDATE OR DELETE ON billing_gateway_attempts FOR EACH ROW EXECUTE FUNCTION program_billing_history_guard();
CREATE TRIGGER program_refund_guard BEFORE INSERT OR UPDATE ON billing_refunds FOR EACH ROW EXECUTE FUNCTION program_billing_history_guard();
COMMIT;
