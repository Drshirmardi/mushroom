-- AlterTable
ALTER TABLE "billing_intents" ADD COLUMN     "assessment_purchase_id" UUID;

-- AlterTable
ALTER TABLE "patient_assessment_submissions" ADD COLUMN     "access_grant_id" UUID;

-- CreateTable
CREATE TABLE "assessment_purchases" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "publication_hash" CHAR(64) NOT NULL,
    "processing_consent_record_id" UUID NOT NULL,
    "terms_consent_record_id" UUID NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_access_grants" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "processing_consent_record_id" UUID NOT NULL,
    "slot" VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    "method" VARCHAR(16) NOT NULL,
    "wallet_journal_id" UUID,
    "gateway_attempt_id" UUID,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_purchases_patient_created_idx" ON "assessment_purchases"("clinic_id", "patient_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_purchases_id_clinic_key" ON "assessment_purchases"("id", "clinic_id");

-- CreateIndex
CREATE INDEX "assessment_grants_patient_source_idx" ON "assessment_access_grants"("clinic_id", "patient_id", "assessment_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_grants_purchase_patient_key" ON "assessment_access_grants"("purchase_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_grants_purchase_slot_key" ON "assessment_access_grants"("purchase_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "billing_intents_assessment_purchase_id_key" ON "billing_intents"("assessment_purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_submissions_access_grant_key" ON "patient_assessment_submissions"("access_grant_id");

-- AddForeignKey
ALTER TABLE "billing_intents" ADD CONSTRAINT "billing_intents_assessment_purchase_id_fkey" FOREIGN KEY ("assessment_purchase_id") REFERENCES "assessment_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_assessment_submissions" ADD CONSTRAINT "patient_assessment_submissions_access_grant_id_fkey" FOREIGN KEY ("access_grant_id") REFERENCES "assessment_access_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_purchases" ADD CONSTRAINT "assessment_purchases_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_purchases" ADD CONSTRAINT "assessment_purchases_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_purchases" ADD CONSTRAINT "assessment_purchases_publication_id_clinic_id_fkey" FOREIGN KEY ("publication_id", "clinic_id") REFERENCES "assessment_offering_publications"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_purchases" ADD CONSTRAINT "assessment_purchases_processing_consent_record_id_fkey" FOREIGN KEY ("processing_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_purchases" ADD CONSTRAINT "assessment_purchases_terms_consent_record_id_fkey" FOREIGN KEY ("terms_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_purchase_id_clinic_id_fkey" FOREIGN KEY ("purchase_id", "clinic_id") REFERENCES "assessment_purchases"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_assessment_version_id_clinic_id_fkey" FOREIGN KEY ("assessment_version_id", "clinic_id") REFERENCES "assessment_versions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_processing_consent_record_id_fkey" FOREIGN KEY ("processing_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_wallet_journal_id_fkey" FOREIGN KEY ("wallet_journal_id") REFERENCES "wallet_journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_gateway_attempt_id_fkey" FOREIGN KEY ("gateway_attempt_id") REFERENCES "billing_gateway_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE billing_intents DROP CONSTRAINT billing_intent_purpose;
ALTER TABLE billing_intents ADD CONSTRAINT billing_intent_purpose CHECK (
 (purpose='TOPUP' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL AND amount_rial>0) OR
 (purpose='ORDER' AND order_id IS NOT NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NULL) OR
 (purpose='APPOINTMENT' AND order_id IS NULL AND hold_id IS NOT NULL AND assessment_purchase_id IS NULL) OR
 (purpose='ASSESSMENT' AND order_id IS NULL AND hold_id IS NULL AND appointment_id IS NULL AND assessment_purchase_id IS NOT NULL AND amount_rial>0 AND expires_at IS NOT NULL AND method IS DISTINCT FROM 'FREE')
);
ALTER TABLE assessment_purchases ADD CONSTRAINT assessment_purchase_shape CHECK (COALESCE((
 amount_rial>0 AND amount_rial<=9000000000000000000 AND currency='IRR' AND publication_hash ~ '^[a-f0-9]{64}$'
 AND jsonb_typeof(snapshot)='object' AND octet_length(snapshot::text)<=8192
 AND snapshot->'schemaVersion'='1'::jsonb AND snapshot->>'purchaseId'=id::text AND snapshot->>'publicationId'=publication_id::text
 AND snapshot->>'publicationHash'=publication_hash AND snapshot->>'amountRial'=amount_rial::text AND snapshot->>'currency'='IRR'
 AND snapshot->>'processingConsentRecordId'=processing_consent_record_id::text AND snapshot->>'termsConsentRecordId'=terms_consent_record_id::text
),false));
ALTER TABLE assessment_access_grants ADD CONSTRAINT assessment_grant_shape CHECK (
 slot='INDIVIDUAL' AND ((method='WALLET' AND wallet_journal_id IS NOT NULL AND gateway_attempt_id IS NULL)
 OR (method='GATEWAY' AND gateway_attempt_id IS NOT NULL AND wallet_journal_id IS NULL))
);

CREATE FUNCTION assessment_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases p ON p.id=g.purchase_id AND p.clinic_id=g.clinic_id AND p.patient_id=g.patient_id
  JOIN billing_intents i ON i.assessment_purchase_id=p.id AND i.patient_id=p.patient_id AND i.clinic_id=p.clinic_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id AND c.patient_id=g.patient_id
  JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics clinic ON clinic.id=g.clinic_id
  WHERE g.id=grant_id AND g.patient_id=target_patient AND c.withdrawn_at IS NULL AND i.purpose='ASSESSMENT' AND i.status='PAID' AND u.status='ACTIVE' AND clinic.status='ACTIVE'
  AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT'));
$$;
CREATE FUNCTION assessment_submission_access_allowed(submission_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM patient_assessment_submissions s WHERE s.id=submission_id AND s.patient_id=target_patient AND (s.access_grant_id IS NULL OR assessment_grant_readable(s.access_grant_id,target_patient)));
$$;
CREATE FUNCTION assessment_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases p ON p.id=g.purchase_id JOIN assessment_offering_publications pub ON pub.id=p.publication_id
  JOIN assessment_protocol_reviews review ON review.id=pub.protocol_review_id JOIN assessment_versions v ON v.id=g.assessment_version_id AND v.clinic_id=g.clinic_id
  JOIN consent_policy_versions policy ON policy.id=review.consent_policy_version_id JOIN patient_consent_records c ON c.id=g.processing_consent_record_id
  WHERE g.id=grant_id AND assessment_grant_readable(g.id,g.patient_id) AND v.status='PUBLISHED' AND v.content_hash=review.questionnaire_content_hash
  AND review.id=(SELECT r.id FROM assessment_protocol_reviews r WHERE r.assessment_version_id=v.id ORDER BY r.review_number DESC LIMIT 1) AND review.decision='APPROVED'
  AND policy.status='ACTIVE' AND policy.content_hash=review.consent_content_hash AND c.policy_version_id=policy.id AND c.content_hash=policy.content_hash
  AND guidance_doctor_id(review.actor_user_id,g.clinic_id)=review.doctor_profile_id);
$$;

CREATE FUNCTION assessment_purchase_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pub assessment_offering_publications; offer assessment_offering_versions; review assessment_protocol_reviews; processing patient_consent_records; terms patient_consent_records;
BEGIN
 SELECT * INTO pub FROM assessment_offering_publications WHERE id=NEW.publication_id AND clinic_id=NEW.clinic_id;
 IF NOT FOUND OR pub.status<>'ACTIVE' OR pub.publication_hash<>NEW.publication_hash THEN RAISE EXCEPTION 'Current exact commercial publication required'; END IF;
 SELECT * INTO offer FROM assessment_offering_versions WHERE id=pub.offering_version_id FOR SHARE;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-purchase:'||NEW.patient_id::text||':'||offer.assessment_version_id::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-publication:'||NEW.clinic_id::text||':'||pub.offering_key,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||offer.assessment_version_id::text,0));
 SELECT * INTO pub FROM assessment_offering_publications WHERE id=NEW.publication_id FOR SHARE;
 IF pub.status<>'ACTIVE' OR pub.publication_hash<>NEW.publication_hash THEN RAISE EXCEPTION 'Current exact commercial publication required'; END IF;
 IF offer.kind<>'INDIVIDUAL' OR offer.status<>'DRAFT' OR offer.amount_rial<>NEW.amount_rial OR offer.currency<>NEW.currency
  OR NEW.snapshot->>'assessmentVersionId' IS DISTINCT FROM offer.assessment_version_id::text OR NEW.snapshot->>'title' IS DISTINCT FROM offer.title THEN RAISE EXCEPTION 'Exact individual tariff snapshot required'; END IF;
 SELECT * INTO review FROM assessment_protocol_reviews WHERE id=pub.protocol_review_id;
 IF review.id IS NULL OR review.decision<>'APPROVED' OR review.id IS DISTINCT FROM (SELECT id FROM assessment_protocol_reviews WHERE assessment_version_id=offer.assessment_version_id ORDER BY review_number DESC LIMIT 1)
  OR guidance_lock_doctor(review.actor_user_id,NEW.clinic_id) IS DISTINCT FROM review.doctor_profile_id THEN RAISE EXCEPTION 'Current qualified physician protocol required'; END IF;
 PERFORM id FROM patient_consent_records WHERE id IN(NEW.processing_consent_record_id,NEW.terms_consent_record_id) ORDER BY id FOR SHARE;
 SELECT * INTO processing FROM patient_consent_records WHERE id=NEW.processing_consent_record_id AND patient_id=NEW.patient_id;
 SELECT * INTO terms FROM patient_consent_records WHERE id=NEW.terms_consent_record_id AND patient_id=NEW.patient_id;
 IF processing.id IS NULL OR terms.id IS NULL OR processing.withdrawn_at IS NOT NULL OR terms.withdrawn_at IS NOT NULL
  OR processing.policy_version_id<>review.consent_policy_version_id OR processing.content_hash<>review.consent_content_hash
  OR terms.policy_version_id<>pub.terms_policy_version_id OR terms.content_hash<>pub.terms_content_hash THEN RAISE EXCEPTION 'Exact independent patient processing and terms acceptance required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id IN(processing.policy_version_id,terms.policy_version_id) ORDER BY id FOR SHARE;
 IF EXISTS(SELECT 1 FROM consent_policy_versions WHERE id IN(processing.policy_version_id,terms.policy_version_id) AND (status<>'ACTIVE' OR clinic_id<>NEW.clinic_id)) THEN RAISE EXCEPTION 'Active same-clinic purchase policies required'; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
  WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 IF NOT FOUND OR NOT couple_patient_is_adult(NEW.patient_id) THEN RAISE EXCEPTION 'Active adult independent patient required'; END IF;
 IF EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE patient_id=NEW.patient_id AND assessment_version_id=offer.assessment_version_id AND state='IN_PROGRESS')
  OR EXISTS(SELECT 1 FROM assessment_access_grants g JOIN patient_consent_records c ON c.id=g.processing_consent_record_id WHERE g.patient_id=NEW.patient_id AND g.assessment_version_id=offer.assessment_version_id AND c.withdrawn_at IS NULL AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE access_grant_id=g.id))
  OR EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id WHERE p.patient_id=NEW.patient_id AND p.snapshot->>'assessmentVersionId'=offer.assessment_version_id::text AND i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP) THEN RAISE EXCEPTION 'An assessment attempt, unused grant or pending purchase already exists'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_purchase_insert_guard BEFORE INSERT ON assessment_purchases FOR EACH ROW EXECUTE FUNCTION assessment_purchase_insert_guard();
CREATE FUNCTION assessment_purchase_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Assessment purchase and grant history is immutable retained evidence'; END $$;
CREATE TRIGGER assessment_purchase_history_immutable BEFORE UPDATE OR DELETE ON assessment_purchases FOR EACH ROW EXECUTE FUNCTION assessment_purchase_history_immutable();
CREATE TRIGGER assessment_grant_history_immutable BEFORE UPDATE OR DELETE ON assessment_access_grants FOR EACH ROW EXECUTE FUNCTION assessment_purchase_history_immutable();

CREATE FUNCTION assessment_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase assessment_purchases; review assessment_protocol_reviews;
BEGIN
 SELECT * INTO purchase FROM assessment_purchases WHERE id=NEW.purchase_id;
 IF purchase.id IS NULL OR purchase.patient_id<>NEW.patient_id OR purchase.clinic_id<>NEW.clinic_id OR purchase.processing_consent_record_id<>NEW.processing_consent_record_id OR NEW.assessment_version_id::text IS DISTINCT FROM purchase.snapshot->>'assessmentVersionId' THEN RAISE EXCEPTION 'Exact independently owned grant scope required'; END IF;
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
CREATE TRIGGER assessment_grant_insert_guard BEFORE INSERT ON assessment_access_grants FOR EACH ROW EXECUTE FUNCTION assessment_grant_insert_guard();

CREATE FUNCTION assessment_purchase_final_payment_check(purchase_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE purchase assessment_purchases; intent billing_intents; grant_record assessment_access_grants; target_patient patient_profiles;
BEGIN
 SELECT * INTO purchase FROM assessment_purchases WHERE id=purchase_id; IF NOT FOUND THEN RETURN; END IF;
 SELECT * INTO intent FROM billing_intents WHERE assessment_purchase_id=purchase.id;
 SELECT * INTO target_patient FROM patient_profiles WHERE id=purchase.patient_id;
 IF intent.id IS NULL OR intent.purpose<>'ASSESSMENT' OR intent.patient_id<>purchase.patient_id OR intent.clinic_id<>purchase.clinic_id OR intent.amount_rial<>purchase.amount_rial
  OR intent.currency<>purchase.currency OR intent.actor_user_id<>target_patient.user_id OR intent.snapshot IS DISTINCT FROM purchase.snapshot OR intent.expires_at IS NULL THEN RAISE EXCEPTION 'Exact owned assessment billing intent required'; END IF;
 IF intent.status<>'PAID' THEN
  IF EXISTS(SELECT 1 FROM assessment_access_grants WHERE assessment_access_grants.purchase_id=purchase.id) THEN RAISE EXCEPTION 'Unpaid assessment cannot issue access'; END IF;
  RETURN;
 END IF;
 IF intent.paid_at IS NULL OR (SELECT count(*) FROM assessment_access_grants WHERE assessment_access_grants.purchase_id=purchase.id)<>1 THEN RAISE EXCEPTION 'Paid assessment requires exactly one evidenced grant'; END IF;
 SELECT * INTO grant_record FROM assessment_access_grants WHERE assessment_access_grants.purchase_id=purchase.id;
 IF grant_record.patient_id<>purchase.patient_id OR grant_record.clinic_id<>purchase.clinic_id OR grant_record.assessment_version_id::text IS DISTINCT FROM purchase.snapshot->>'assessmentVersionId'
  OR grant_record.processing_consent_record_id<>purchase.processing_consent_record_id OR grant_record.method<>intent.method THEN RAISE EXCEPTION 'Assessment grant scope or proof method mismatch'; END IF;
 IF intent.method='WALLET' THEN
  IF NOT EXISTS(SELECT 1 FROM wallet_journals j JOIN wallet_accounts a ON a.id=j.account_id WHERE j.id=grant_record.wallet_journal_id AND j.kind='PAYMENT' AND j.delta_rial=-intent.amount_rial
    AND j.reference='intent:'||intent.id::text||':debit' AND a.patient_id=purchase.patient_id AND a.clinic_id=purchase.clinic_id) THEN RAISE EXCEPTION 'Exact immutable wallet debit proof required'; END IF;
 ELSIF intent.method='GATEWAY' THEN
  IF NOT EXISTS(SELECT 1 FROM billing_gateway_attempts b WHERE b.id=grant_record.gateway_attempt_id AND b.intent_id=intent.id AND b.status='VERIFIED' AND b.verified_at IS NOT NULL AND NOT b.compensated AND b.result_code IN('0','100') AND b.amount_rial=intent.amount_rial) THEN RAISE EXCEPTION 'Exact server verified noncompensated bank proof required'; END IF;
 ELSE RAISE EXCEPTION 'Assessment requires an actual paid financial method'; END IF;
END $$;
CREATE FUNCTION assessment_purchase_deferred_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='assessment_purchases' THEN target:=NEW.id;
 ELSIF TG_TABLE_NAME='assessment_access_grants' THEN target:=NEW.purchase_id;
 ELSIF TG_TABLE_NAME='billing_intents' THEN target:=NEW.assessment_purchase_id;
 ELSE SELECT assessment_purchase_id INTO target FROM billing_intents WHERE id=NEW.intent_id; END IF;
 IF target IS NOT NULL THEN PERFORM assessment_purchase_final_payment_check(target); END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER assessment_purchase_deferred_proof AFTER INSERT ON assessment_purchases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assessment_purchase_deferred_proof();
CREATE CONSTRAINT TRIGGER assessment_grant_deferred_proof AFTER INSERT ON assessment_access_grants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assessment_purchase_deferred_proof();
CREATE CONSTRAINT TRIGGER assessment_billing_deferred_proof AFTER INSERT OR UPDATE ON billing_intents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assessment_purchase_deferred_proof();
CREATE CONSTRAINT TRIGGER assessment_attempt_deferred_proof AFTER INSERT OR UPDATE ON billing_gateway_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assessment_purchase_deferred_proof();

CREATE FUNCTION assessment_billing_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='billing_refunds' THEN
  IF EXISTS(SELECT 1 FROM billing_intents WHERE id=NEW.intent_id AND purpose='ASSESSMENT') THEN RAISE EXCEPTION 'Successful assessment purchases have no ordinary refunds'; END IF; RETURN NEW;
 ELSIF TG_TABLE_NAME='billing_gateway_attempts' THEN
  IF OLD.status='VERIFIED' AND EXISTS(SELECT 1 FROM billing_intents WHERE id=OLD.intent_id AND purpose='ASSESSMENT') AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN RAISE EXCEPTION 'Verified assessment bank proof is immutable'; END IF; RETURN NEW;
 END IF;
 IF OLD.purpose='ASSESSMENT' OR NEW.purpose='ASSESSMENT' THEN
  IF (to_jsonb(NEW)-ARRAY['status','method','paid_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','method','paid_at','updated_at']) THEN RAISE EXCEPTION 'Assessment billing snapshot is immutable'; END IF;
  IF OLD.status IN('PAID','COMPENSATED') AND ROW(NEW.status,NEW.method,NEW.paid_at) IS DISTINCT FROM ROW(OLD.status,OLD.method,OLD.paid_at) THEN RAISE EXCEPTION 'Paid assessment financial evidence is final'; END IF;
  IF OLD.status IN('EXPIRED','CANCELLED') AND NEW.status NOT IN(OLD.status,'COMPENSATED') THEN RAISE EXCEPTION 'Abandoned assessment payment cannot grant access'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER assessment_billing_history_guard BEFORE UPDATE ON billing_intents FOR EACH ROW EXECUTE FUNCTION assessment_billing_history_guard();
CREATE TRIGGER assessment_attempt_history_guard BEFORE UPDATE ON billing_gateway_attempts FOR EACH ROW EXECUTE FUNCTION assessment_billing_history_guard();
CREATE TRIGGER assessment_refund_guard BEFORE INSERT OR UPDATE ON billing_refunds FOR EACH ROW EXECUTE FUNCTION assessment_billing_history_guard();

CREATE FUNCTION assessment_consent_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy consent_policy_versions; old_policy_key text; actor uuid; actor_session uuid;
BEGIN
 IF TG_OP='DELETE' THEN SELECT * INTO policy FROM consent_policy_versions WHERE id=OLD.policy_version_id;
 ELSE SELECT * INTO policy FROM consent_policy_versions WHERE id=NEW.policy_version_id FOR SHARE; END IF;
 IF TG_OP='UPDATE' THEN SELECT policy_key INTO old_policy_key FROM consent_policy_versions WHERE id=OLD.policy_version_id; END IF;
 IF policy.policy_key NOT IN('ASSESSMENT_PROCESSING','ASSESSMENT_PURCHASE_TERMS') AND COALESCE(old_policy_key,'') NOT IN('ASSESSMENT_PROCESSING','ASSESSMENT_PURCHASE_TERMS') THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Assessment consent evidence is retained'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['withdrawn_at','withdrawn_by_user_id','withdrawn_by_session_id','withdrawal_idempotency_key','withdrawal_request_id']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['withdrawn_at','withdrawn_by_user_id','withdrawn_by_session_id','withdrawal_idempotency_key','withdrawal_request_id']) THEN RAISE EXCEPTION 'Assessment consent evidence is immutable'; END IF;
  IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  IF OLD.withdrawn_at IS NOT NULL OR NEW.withdrawn_at IS NULL OR NEW.withdrawn_at<NEW.accepted_at OR policy.policy_key<>'ASSESSMENT_PROCESSING' THEN RAISE EXCEPTION 'Processing consent withdrawal is final and distinct from purchase terms'; END IF;
  actor:=NEW.withdrawn_by_user_id; actor_session:=NEW.withdrawn_by_session_id;
 ELSE
  IF policy.status<>'ACTIVE' OR policy.activated_at IS NULL OR policy.content_hash<>NEW.content_hash OR NEW.source<>'PATIENT_APP' OR NEW.withdrawn_at IS NOT NULL OR NEW.acceptance_idempotency_key IS NULL OR NEW.acceptance_idempotency_key !~ '^[!-~]{1,200}$' THEN RAISE EXCEPTION 'Explicit exact active assessment consent required'; END IF;
  actor:=NEW.accepted_by_user_id; actor_session:=NEW.accepted_by_session_id;
 END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN sessions s ON s.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
  WHERE p.id=NEW.patient_id AND p.clinic_id=policy.clinic_id AND u.id=actor AND s.id=actor_session AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,s,ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Independent active patient consent identity and session required'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER assessment_consent_history_guard BEFORE INSERT OR UPDATE OR DELETE ON patient_consent_records FOR EACH ROW EXECUTE FUNCTION assessment_consent_history_guard();

CREATE FUNCTION assessment_submission_context_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.access_grant_id IS DISTINCT FROM OLD.access_grant_id THEN RAISE EXCEPTION 'Assessment access context cannot be rebound'; END IF;
 IF TG_OP='INSERT' AND NEW.access_grant_id IS NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('assessment-commercial-start:'||NEW.assessment_version_id::text,0));
  IF EXISTS(SELECT 1 FROM assessment_offering_versions o JOIN assessment_offering_publications pub ON pub.offering_version_id=o.id WHERE o.assessment_version_id=NEW.assessment_version_id) THEN RAISE EXCEPTION 'Commercial assessment requires owned paid access'; END IF;
 ELSIF NEW.access_grant_id IS NOT NULL AND (TG_OP='INSERT' OR OLD.state='IN_PROGRESS') THEN
  IF NOT EXISTS(SELECT 1 FROM assessment_access_grants WHERE id=NEW.access_grant_id AND patient_id=NEW.patient_id AND assessment_version_id=NEW.assessment_version_id)
   OR NOT assessment_grant_processable(NEW.access_grant_id) THEN RAISE EXCEPTION 'Exact current paid private assessment access required'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER assessment_submission_context_guard BEFORE INSERT OR UPDATE ON patient_assessment_submissions FOR EACH ROW EXECUTE FUNCTION assessment_submission_context_guard();
CREATE FUNCTION assessment_commercial_start_boundary() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source uuid;
BEGIN SELECT assessment_version_id INTO source FROM assessment_offering_versions WHERE id=NEW.offering_version_id;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-commercial-start:'||source::text,0)); RETURN NEW;
END $$;
CREATE TRIGGER z_assessment_commercial_start_boundary BEFORE INSERT ON assessment_offering_publications FOR EACH ROW EXECUTE FUNCTION assessment_commercial_start_boundary();
