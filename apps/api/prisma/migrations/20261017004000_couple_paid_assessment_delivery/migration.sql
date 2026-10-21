BEGIN;
-- AlterTable
ALTER TABLE "assessment_access_grants" ADD COLUMN     "couple_assessment_participant_id" UUID;

-- AlterTable
ALTER TABLE "assessment_purchases" ADD COLUMN     "couple_assessment_session_id" UUID;

-- CreateTable
CREATE TABLE "couple_assessment_joint_results" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "joint_protocol_id" UUID NOT NULL,
    "context_hash" CHAR(64) NOT NULL,
    "protocol_hash" CHAR(64) NOT NULL,
    "algorithm_id" VARCHAR(80) NOT NULL DEFAULT 'APPROVED_PAIR_LOOKUP',
    "algorithm_version" INTEGER NOT NULL DEFAULT 1,
    "initiator_submission_id" UUID NOT NULL,
    "partner_submission_id" UUID NOT NULL,
    "initiator_completion_hash" CHAR(64) NOT NULL,
    "partner_completion_hash" CHAR(64) NOT NULL,
    "result_snapshot" JSONB NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "generated_by_patient_id" UUID NOT NULL,
    "generated_session_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_assessment_joint_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "couple_joint_result_session_key" ON "couple_assessment_joint_results"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_joint_result_purchase_key" ON "couple_assessment_joint_results"("purchase_id");

-- CreateIndex
CREATE INDEX "couple_joint_result_clinic_created_idx" ON "couple_assessment_joint_results"("clinic_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_joint_result_session_clinic_key" ON "couple_assessment_joint_results"("session_id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_joint_result_purchase_clinic_key" ON "couple_assessment_joint_results"("purchase_id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_joint_result_command_key" ON "couple_assessment_joint_results"("generated_by_patient_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_grants_couple_participant_key" ON "assessment_access_grants"("couple_assessment_participant_id");

-- CreateIndex
CREATE INDEX "assessment_purchases_couple_created_idx" ON "assessment_purchases"("couple_assessment_session_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "assessment_purchases" ADD CONSTRAINT "assessment_purchases_couple_assessment_session_id_fkey" FOREIGN KEY ("couple_assessment_session_id") REFERENCES "couple_assessment_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_couple_assessment_participant_id_fkey" FOREIGN KEY ("couple_assessment_participant_id") REFERENCES "couple_assessment_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_joint_results" ADD CONSTRAINT "couple_assessment_joint_results_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_joint_results" ADD CONSTRAINT "couple_assessment_joint_results_session_id_clinic_id_fkey" FOREIGN KEY ("session_id", "clinic_id") REFERENCES "couple_assessment_sessions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_joint_results" ADD CONSTRAINT "couple_assessment_joint_results_purchase_id_clinic_id_fkey" FOREIGN KEY ("purchase_id", "clinic_id") REFERENCES "assessment_purchases"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_joint_results" ADD CONSTRAINT "couple_assessment_joint_results_joint_protocol_id_fkey" FOREIGN KEY ("joint_protocol_id") REFERENCES "couple_result_protocol_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_joint_results" ADD CONSTRAINT "couple_assessment_joint_results_initiator_submission_id_fkey" FOREIGN KEY ("initiator_submission_id") REFERENCES "patient_assessment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_joint_results" ADD CONSTRAINT "couple_assessment_joint_results_partner_submission_id_fkey" FOREIGN KEY ("partner_submission_id") REFERENCES "patient_assessment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_joint_results" ADD CONSTRAINT "couple_assessment_joint_results_generated_by_patient_id_cl_fkey" FOREIGN KEY ("generated_by_patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_joint_results" ADD CONSTRAINT "couple_assessment_joint_results_generated_session_id_fkey" FOREIGN KEY ("generated_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve version1 individual receipts; version2 explicitly binds two independently consented beneficiaries.
ALTER TABLE assessment_purchases DROP CONSTRAINT assessment_purchase_shape;
ALTER TABLE assessment_purchases ADD CONSTRAINT assessment_purchase_shape CHECK (COALESCE(
 amount_rial>0 AND amount_rial<=9000000000000000000 AND currency='IRR' AND publication_hash ~ '^[a-f0-9]{64}$'
 AND jsonb_typeof(snapshot)='object' AND octet_length(snapshot::text)<=8192
 AND snapshot->>'purchaseId'=id::text AND snapshot->>'publicationId'=publication_id::text AND snapshot->>'publicationHash'=publication_hash AND snapshot->>'amountRial'=amount_rial::text AND snapshot->>'currency'='IRR'
 AND snapshot->>'processingConsentRecordId'=processing_consent_record_id::text AND snapshot->>'termsConsentRecordId'=terms_consent_record_id::text
 AND ((couple_assessment_session_id IS NULL AND snapshot->'schemaVersion'='1'::jsonb)
  OR (couple_assessment_session_id IS NOT NULL AND snapshot->'schemaVersion'='2'::jsonb AND snapshot->>'kind'='COUPLES' AND snapshot->>'coupleAssessmentSessionId'=couple_assessment_session_id::text AND jsonb_typeof(snapshot->'beneficiaries')='array' AND jsonb_array_length(snapshot->'beneficiaries')=2)),false));
ALTER TABLE assessment_access_grants DROP CONSTRAINT assessment_grant_shape;
ALTER TABLE assessment_access_grants ADD CONSTRAINT assessment_grant_shape CHECK (
 ((slot='INDIVIDUAL' AND couple_assessment_participant_id IS NULL) OR (slot IN('INITIATOR','PARTNER') AND couple_assessment_participant_id IS NOT NULL))
 AND ((method='WALLET' AND wallet_journal_id IS NOT NULL AND gateway_attempt_id IS NULL) OR (method='GATEWAY' AND gateway_attempt_id IS NOT NULL AND wallet_journal_id IS NULL)));

CREATE FUNCTION assessment_has_pending_purchase(target_patient uuid,source_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id
  WHERE i.purpose='ASSESSMENT' AND i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP AND p.snapshot->>'assessmentVersionId'=source_id::text
   AND (p.patient_id=target_patient OR EXISTS(SELECT 1 FROM couple_assessment_participants cp WHERE cp.session_id=p.couple_assessment_session_id AND cp.patient_id=target_patient)));
$$;
CREATE FUNCTION couple_assessment_beneficiaries_ready(target uuid,mode text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM couple_assessment_sessions s JOIN couple_sessions link ON link.id=s.couple_session_id
  JOIN assessment_offering_publications pub ON pub.id=s.publication_id JOIN assessment_offering_versions offer ON offer.id=pub.offering_version_id
  JOIN couple_result_protocol_versions joint ON joint.id=s.joint_protocol_id
  WHERE s.id=target AND mode IN('CURRENT','QUOTED','PAID') AND link.state='LINKED' AND offer.kind='COUPLES' AND pub.protocol_review_id=joint.protocol_review_id AND couple_result_protocol_usable(joint.id)
   AND (mode='PAID' OR (offer.status='DRAFT' AND (pub.status='ACTIVE' OR mode='QUOTED' AND pub.status='RETIRED' AND pub.retirement_reason='REPLACED')
    AND EXISTS(SELECT 1 FROM consent_policy_versions terms WHERE terms.id=pub.terms_policy_version_id AND terms.status='ACTIVE' AND terms.content_hash=pub.terms_content_hash)))
   AND (SELECT count(*) FROM couple_assessment_participants WHERE session_id=s.id)=2
   AND NOT EXISTS(SELECT 1 FROM couple_assessment_participants p JOIN couple_participants lp ON lp.id=p.couple_participant_id LEFT JOIN patient_consent_records c ON c.id=p.processing_consent_record_id
    WHERE p.session_id=s.id AND (p.accepted_at IS NULL OR p.withdrawn_at IS NOT NULL OR lp.revoked_at IS NOT NULL OR c.id IS NULL OR c.withdrawn_at IS NOT NULL OR c.patient_id<>p.patient_id
     OR p.accepted_context_hash<>s.context_hash OR c.policy_version_id::text IS DISTINCT FROM s.context_snapshot->>'processingPolicyId' OR c.content_hash IS DISTINCT FROM s.context_snapshot->>'processingContentHash' OR NOT couple_assessment_patient_live(p.patient_id,s.clinic_id))));
$$;
CREATE OR REPLACE FUNCTION couple_assessment_mutual_consent(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT couple_assessment_beneficiaries_ready(target,'CURRENT'); $$;
CREATE FUNCTION couple_assessment_paid_sharing_allowed(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT couple_assessment_beneficiaries_ready(target,'PAID') AND EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id WHERE p.couple_assessment_session_id=target AND i.purpose='ASSESSMENT' AND i.status='PAID' AND (SELECT count(*) FROM assessment_access_grants g WHERE g.purchase_id=p.id)=2);
$$;

CREATE OR REPLACE FUNCTION assessment_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases p ON p.id=g.purchase_id AND p.clinic_id=g.clinic_id
  JOIN billing_intents i ON i.assessment_purchase_id=p.id AND i.patient_id=p.patient_id AND i.clinic_id=p.clinic_id
  JOIN patient_consent_records consent ON consent.id=g.processing_consent_record_id AND consent.patient_id=g.patient_id
  JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics clinic ON clinic.id=g.clinic_id
  WHERE g.id=grant_id AND g.patient_id=target_patient AND consent.withdrawn_at IS NULL AND i.purpose='ASSESSMENT' AND i.status='PAID' AND u.status='ACTIVE' AND clinic.status='ACTIVE'
   AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT')
   AND ((p.couple_assessment_session_id IS NULL AND g.couple_assessment_participant_id IS NULL AND p.patient_id=g.patient_id AND g.slot='INDIVIDUAL')
    OR (p.couple_assessment_session_id IS NOT NULL AND EXISTS(SELECT 1 FROM couple_assessment_participants cp WHERE cp.id=g.couple_assessment_participant_id AND cp.session_id=p.couple_assessment_session_id AND cp.patient_id=g.patient_id AND cp.slot=g.slot AND cp.processing_consent_record_id=g.processing_consent_record_id))));
$$;
CREATE OR REPLACE FUNCTION assessment_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases p ON p.id=g.purchase_id JOIN assessment_offering_publications pub ON pub.id=p.publication_id
  JOIN assessment_protocol_reviews review ON review.id=pub.protocol_review_id JOIN assessment_versions v ON v.id=g.assessment_version_id AND v.clinic_id=g.clinic_id
  JOIN consent_policy_versions policy ON policy.id=review.consent_policy_version_id JOIN patient_consent_records consent ON consent.id=g.processing_consent_record_id
  WHERE g.id=grant_id AND assessment_grant_readable(g.id,g.patient_id) AND couple_patient_is_adult(g.patient_id) AND v.status='PUBLISHED' AND v.content_hash=review.questionnaire_content_hash
   AND review.id=(SELECT r.id FROM assessment_protocol_reviews r WHERE r.assessment_version_id=v.id ORDER BY r.review_number DESC LIMIT 1) AND review.decision='APPROVED'
   AND policy.status='ACTIVE' AND policy.content_hash=review.consent_content_hash AND consent.policy_version_id=policy.id AND consent.content_hash=policy.content_hash
   AND guidance_doctor_id(review.actor_user_id,g.clinic_id)=review.doctor_profile_id);
$$;

CREATE OR REPLACE FUNCTION assessment_purchase_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pub assessment_offering_publications; offer assessment_offering_versions; review assessment_protocol_reviews; processing patient_consent_records; terms patient_consent_records;
 context couple_assessment_sessions; beneficiary jsonb; target_patient uuid; source uuid;
BEGIN
 SELECT * INTO pub FROM assessment_offering_publications WHERE id=NEW.publication_id AND clinic_id=NEW.clinic_id;
 IF NOT FOUND OR pub.status<>'ACTIVE' OR pub.publication_hash<>NEW.publication_hash THEN RAISE EXCEPTION 'Current exact commercial publication required'; END IF;
 SELECT * INTO offer FROM assessment_offering_versions WHERE id=pub.offering_version_id FOR SHARE; source:=offer.assessment_version_id;
 IF NEW.couple_assessment_session_id IS NOT NULL THEN
  SELECT * INTO context FROM couple_assessment_sessions WHERE id=NEW.couple_assessment_session_id AND clinic_id=NEW.clinic_id FOR UPDATE;
  IF context.id IS NULL OR context.publication_id<>pub.id OR context.assessment_version_id<>source OR NEW.snapshot->>'contextHash' IS DISTINCT FROM context.context_hash OR NOT couple_assessment_beneficiaries_ready(context.id,'CURRENT') THEN RAISE EXCEPTION 'Exact current mutually consented purchase context required'; END IF;
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
  PERFORM pg_advisory_xact_lock(hashtextextended('assessment-purchase:'||target_patient::text||':'||source::text,0));
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-publication:'||NEW.clinic_id::text||':'||pub.offering_key,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||source::text,0));
 SELECT * INTO pub FROM assessment_offering_publications WHERE id=NEW.publication_id FOR SHARE;
 IF pub.status<>'ACTIVE' OR pub.publication_hash<>NEW.publication_hash THEN RAISE EXCEPTION 'Current exact commercial publication required'; END IF;
 IF offer.kind<>(CASE WHEN NEW.couple_assessment_session_id IS NULL THEN 'INDIVIDUAL' ELSE 'COUPLES' END) OR offer.status<>'DRAFT' OR offer.amount_rial<>NEW.amount_rial OR offer.currency<>NEW.currency
  OR NEW.snapshot->>'assessmentVersionId' IS DISTINCT FROM source::text OR NEW.snapshot->>'title' IS DISTINCT FROM offer.title THEN RAISE EXCEPTION 'Exact assessment tariff snapshot required'; END IF;
 SELECT * INTO review FROM assessment_protocol_reviews WHERE id=pub.protocol_review_id;
 IF review.id IS NULL OR review.decision<>'APPROVED' OR review.id IS DISTINCT FROM (SELECT id FROM assessment_protocol_reviews WHERE assessment_version_id=source ORDER BY review_number DESC LIMIT 1)
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
  IF EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE patient_id=target_patient AND assessment_version_id=source AND state='IN_PROGRESS')
   OR EXISTS(SELECT 1 FROM assessment_access_grants g JOIN patient_consent_records c ON c.id=g.processing_consent_record_id WHERE g.patient_id=target_patient AND g.assessment_version_id=source AND c.withdrawn_at IS NULL AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE access_grant_id=g.id))
   OR assessment_has_pending_purchase(target_patient,source) THEN RAISE EXCEPTION 'An assessment attempt, unused grant or pending beneficiary purchase already exists'; END IF;
 END LOOP; RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION assessment_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase assessment_purchases; review assessment_protocol_reviews; context couple_assessment_sessions; intent billing_intents; cp couple_assessment_participants;
BEGIN
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
 expected:=CASE WHEN purchase.couple_assessment_session_id IS NULL THEN 1 ELSE 2 END;
 IF intent.paid_at IS NULL OR (SELECT count(*) FROM assessment_access_grants WHERE assessment_access_grants.purchase_id=purchase.id)<>expected THEN
  IF expected=1 THEN RAISE EXCEPTION 'Paid assessment requires exactly one evidenced grant'; ELSE RAISE EXCEPTION 'Paid couple assessment requires exactly two evidenced grants'; END IF;
 END IF;
 IF expected=2 AND EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id WHERE p.couple_assessment_session_id=purchase.couple_assessment_session_id AND p.id<>purchase.id AND i.status='PAID') THEN RAISE EXCEPTION 'Couple context has exactly one paid purchase'; END IF;
 FOR grant_record IN SELECT * FROM assessment_access_grants WHERE assessment_access_grants.purchase_id=purchase.id LOOP
  IF grant_record.clinic_id<>purchase.clinic_id OR grant_record.assessment_version_id::text IS DISTINCT FROM purchase.snapshot->>'assessmentVersionId' OR grant_record.method<>intent.method THEN RAISE EXCEPTION 'Assessment grant scope or proof method mismatch'; END IF;
  IF expected=1 THEN
   IF grant_record.patient_id<>purchase.patient_id OR grant_record.processing_consent_record_id<>purchase.processing_consent_record_id OR grant_record.couple_assessment_participant_id IS NOT NULL OR grant_record.slot<>'INDIVIDUAL' THEN RAISE EXCEPTION 'Exact individual grant proof required'; END IF;
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

ALTER TABLE couple_assessment_joint_results ADD CONSTRAINT couple_joint_result_shape CHECK (COALESCE(
 algorithm_id='APPROVED_PAIR_LOOKUP' AND algorithm_version=1 AND initiator_submission_id<>partner_submission_id
 AND context_hash ~ '^[a-f0-9]{64}$' AND protocol_hash ~ '^[a-f0-9]{64}$' AND content_hash ~ '^[a-f0-9]{64}$'
 AND initiator_completion_hash ~ '^[a-f0-9]{64}$' AND partner_completion_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{8,200}$'
 AND jsonb_typeof(result_snapshot)='object' AND octet_length(result_snapshot::text)<=8192,false));
CREATE FUNCTION couple_joint_result_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE context couple_assessment_sessions; purchase assessment_purchases; joint couple_result_protocol_versions; source assessment_versions;
 first_source patient_assessment_submissions; second_source patient_assessment_submissions; first_band jsonb; second_band jsonb; pair jsonb; refs jsonb; expected jsonb;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Joint educational result is immutable retained evidence'; END IF;
 SELECT * INTO context FROM couple_assessment_sessions WHERE id=NEW.session_id AND clinic_id=NEW.clinic_id FOR UPDATE;
 IF context.id IS NULL OR context.context_hash<>NEW.context_hash OR context.joint_protocol_id<>NEW.joint_protocol_id THEN RAISE EXCEPTION 'Exact mutually owned joint context required'; END IF;
 PERFORM id FROM couple_sessions WHERE id=context.couple_session_id FOR SHARE;
 PERFORM c.id FROM patient_consent_records c JOIN couple_assessment_participants p ON p.processing_consent_record_id=c.id WHERE p.session_id=context.id ORDER BY c.id FOR SHARE OF c;
 IF NOT couple_assessment_paid_sharing_allowed(context.id) THEN RAISE EXCEPTION 'Paid current mutual joint disclosure required'; END IF;
 SELECT * INTO purchase FROM assessment_purchases WHERE id=NEW.purchase_id AND couple_assessment_session_id=context.id AND clinic_id=NEW.clinic_id;
 IF purchase.id IS NULL THEN RAISE EXCEPTION 'Exact joint purchase required'; END IF;
 PERFORM assessment_purchase_final_payment_check(purchase.id);
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN patient_profiles p ON p.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN clinics c ON c.id=p.clinic_id
  WHERE s.id=NEW.generated_session_id AND p.id=NEW.generated_by_patient_id AND p.clinic_id=NEW.clinic_id AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT'
   AND EXISTS(SELECT 1 FROM couple_assessment_participants WHERE session_id=context.id AND patient_id=p.id) FOR SHARE OF s,u,p,ur,r,c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Independent owned active joint-result session required'; END IF;
 SELECT * INTO joint FROM couple_result_protocol_versions WHERE id=NEW.joint_protocol_id;
 SELECT * INTO source FROM assessment_versions WHERE id=context.assessment_version_id;
 IF joint.content_hash<>NEW.protocol_hash OR NEW.algorithm_id<>joint.algorithm_id OR NEW.algorithm_version<>joint.algorithm_version THEN RAISE EXCEPTION 'Exact original joint algorithm required'; END IF;
 SELECT s.* INTO first_source FROM patient_assessment_submissions s JOIN assessment_access_grants g ON g.id=s.access_grant_id JOIN couple_assessment_participants cp ON cp.id=g.couple_assessment_participant_id
  WHERE s.id=NEW.initiator_submission_id AND g.purchase_id=purchase.id AND cp.session_id=context.id AND cp.slot='INITIATOR' AND s.patient_id=cp.patient_id AND s.assessment_version_id=source.id;
 SELECT s.* INTO second_source FROM patient_assessment_submissions s JOIN assessment_access_grants g ON g.id=s.access_grant_id JOIN couple_assessment_participants cp ON cp.id=g.couple_assessment_participant_id
  WHERE s.id=NEW.partner_submission_id AND g.purchase_id=purchase.id AND cp.session_id=context.id AND cp.slot='PARTNER' AND s.patient_id=cp.patient_id AND s.assessment_version_id=source.id;
 IF first_source.id IS NULL OR second_source.id IS NULL OR first_source.state<>'COMPLETE' OR second_source.state<>'COMPLETE' OR first_source.completed_at IS NULL OR second_source.completed_at IS NULL OR first_source.invalidated_at IS NOT NULL OR second_source.invalidated_at IS NOT NULL
  OR first_source.completion_payload_hash IS DISTINCT FROM NEW.initiator_completion_hash OR second_source.completion_payload_hash IS DISTINCT FROM NEW.partner_completion_hash
  OR NEW.created_at<GREATEST(first_source.completed_at,second_source.completed_at,purchase.created_at) THEN RAISE EXCEPTION 'Exact two completed private sources required'; END IF;
 IF first_source.result_snapshot->>'algorithmId' IS DISTINCT FROM 'WEIGHTED_SUM' OR second_source.result_snapshot->>'algorithmId' IS DISTINCT FROM 'WEIGHTED_SUM'
  OR first_source.result_snapshot->'algorithmVersion' IS DISTINCT FROM '1'::jsonb OR second_source.result_snapshot->'algorithmVersion' IS DISTINCT FROM '1'::jsonb
  OR first_source.result_snapshot->>'questionnaireContentHash' IS DISTINCT FROM source.content_hash OR second_source.result_snapshot->>'questionnaireContentHash' IS DISTINCT FROM source.content_hash
  OR first_source.result_snapshot->>'answerPayloadHash' IS DISTINCT FROM NEW.initiator_completion_hash OR second_source.result_snapshot->>'answerPayloadHash' IS DISTINCT FROM NEW.partner_completion_hash THEN RAISE EXCEPTION 'Supported recorded individual provenance required'; END IF;
 SELECT value INTO first_band FROM jsonb_array_elements(source.structure->'resultBands') WHERE value->>'id'=first_source.result_snapshot->'resultBand'->>'id';
 SELECT value INTO second_band FROM jsonb_array_elements(source.structure->'resultBands') WHERE value->>'id'=second_source.result_snapshot->'resultBand'->>'id';
 IF first_band IS NULL OR second_band IS NULL OR COALESCE(first_band->'requiresReview','false'::jsonb)='true'::jsonb OR COALESCE(second_band->'requiresReview','false'::jsonb)='true'::jsonb
  OR first_source.result_snapshot->'resultBand' IS DISTINCT FROM jsonb_build_object('id',first_band->'id','title',first_band->'title','riskLevel',COALESCE(first_band->'riskLevel','"NONE"'::jsonb),'requiresReview',COALESCE(first_band->'requiresReview','false'::jsonb))
  OR second_source.result_snapshot->'resultBand' IS DISTINCT FROM jsonb_build_object('id',second_band->'id','title',second_band->'title','riskLevel',COALESCE(second_band->'riskLevel','"NONE"'::jsonb),'requiresReview',COALESCE(second_band->'requiresReview','false'::jsonb)) THEN RAISE EXCEPTION 'Exact supported individual band metadata required'; END IF;
 SELECT value INTO pair FROM jsonb_array_elements(joint.pairs) WHERE (value->>'firstBandId'=first_band->>'id' AND value->>'secondBandId'=second_band->>'id') OR (value->>'firstBandId'=second_band->>'id' AND value->>'secondBandId'=first_band->>'id');
 IF pair IS NULL THEN RAISE EXCEPTION 'Explicit approved joint pair required'; END IF;
 SELECT jsonb_agg(r.value ORDER BY ids.ordinality) INTO refs FROM jsonb_array_elements_text(pair->'guidanceContentIds') WITH ORDINALITY ids JOIN jsonb_array_elements(joint.content_references) r ON r.value->>'id'=ids.value;
 expected:=jsonb_build_object('snapshotVersion',1,'algorithmId','APPROVED_PAIR_LOOKUP','algorithmVersion',1,'contextHash',context.context_hash,'jointProtocolHash',joint.content_hash,'contentReferences',refs,'recommendConsultation',pair->'recommendConsultation');
 IF NEW.result_snapshot IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Only minimized exact approved joint education may be retained'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER couple_joint_result_guard BEFORE INSERT OR UPDATE OR DELETE ON couple_assessment_joint_results FOR EACH ROW EXECUTE FUNCTION couple_joint_result_guard();
COMMIT;
