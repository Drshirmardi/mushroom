-- CreateTable
CREATE TABLE "couple_assessment_sessions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "couple_session_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "joint_protocol_id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "context_snapshot" JSONB NOT NULL,
    "context_hash" CHAR(64) NOT NULL,
    "created_by_patient_id" UUID NOT NULL,
    "created_session_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_assessment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_assessment_participants" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "couple_participant_id" UUID NOT NULL,
    "slot" VARCHAR(16) NOT NULL,
    "processing_consent_record_id" UUID,
    "accepted_context_hash" CHAR(64),
    "accepted_session_id" UUID,
    "accepted_at" TIMESTAMPTZ(3),
    "acceptance_idempotency_key" VARCHAR(200),
    "withdrawn_at" TIMESTAMPTZ(3),
    "withdrawn_session_id" UUID,
    "withdrawal_idempotency_key" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_assessment_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "couple_assessment_session_link_publication_idx" ON "couple_assessment_sessions"("couple_session_id", "publication_id");

-- CreateIndex
CREATE INDEX "couple_assessment_session_clinic_created_idx" ON "couple_assessment_sessions"("clinic_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_assessment_session_id_clinic_key" ON "couple_assessment_sessions"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_assessment_session_command_key" ON "couple_assessment_sessions"("created_by_patient_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "couple_assessment_participant_history_idx" ON "couple_assessment_participants"("patient_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_assessment_participant_patient_key" ON "couple_assessment_participants"("session_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_assessment_participant_slot_key" ON "couple_assessment_participants"("session_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "couple_assessment_participant_acceptance_key" ON "couple_assessment_participants"("patient_id", "acceptance_idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "couple_assessment_participant_withdrawal_key" ON "couple_assessment_participants"("patient_id", "withdrawal_idempotency_key");

-- AddForeignKey
ALTER TABLE "couple_assessment_sessions" ADD CONSTRAINT "couple_assessment_sessions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_sessions" ADD CONSTRAINT "couple_assessment_sessions_couple_session_id_clinic_id_fkey" FOREIGN KEY ("couple_session_id", "clinic_id") REFERENCES "couple_sessions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_sessions" ADD CONSTRAINT "couple_assessment_sessions_publication_id_clinic_id_fkey" FOREIGN KEY ("publication_id", "clinic_id") REFERENCES "assessment_offering_publications"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_sessions" ADD CONSTRAINT "couple_assessment_sessions_joint_protocol_id_fkey" FOREIGN KEY ("joint_protocol_id") REFERENCES "couple_result_protocol_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_sessions" ADD CONSTRAINT "couple_assessment_sessions_assessment_version_id_clinic_id_fkey" FOREIGN KEY ("assessment_version_id", "clinic_id") REFERENCES "assessment_versions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_sessions" ADD CONSTRAINT "couple_assessment_sessions_created_by_patient_id_clinic_id_fkey" FOREIGN KEY ("created_by_patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_sessions" ADD CONSTRAINT "couple_assessment_sessions_created_session_id_fkey" FOREIGN KEY ("created_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_participants" ADD CONSTRAINT "couple_assessment_participants_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_participants" ADD CONSTRAINT "couple_assessment_participants_session_id_clinic_id_fkey" FOREIGN KEY ("session_id", "clinic_id") REFERENCES "couple_assessment_sessions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_participants" ADD CONSTRAINT "couple_assessment_participants_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_participants" ADD CONSTRAINT "couple_assessment_participants_couple_participant_id_fkey" FOREIGN KEY ("couple_participant_id") REFERENCES "couple_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_participants" ADD CONSTRAINT "couple_assessment_participants_processing_consent_record_i_fkey" FOREIGN KEY ("processing_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_participants" ADD CONSTRAINT "couple_assessment_participants_accepted_session_id_fkey" FOREIGN KEY ("accepted_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_assessment_participants" ADD CONSTRAINT "couple_assessment_participants_withdrawn_session_id_fkey" FOREIGN KEY ("withdrawn_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE couple_assessment_sessions ADD CONSTRAINT couple_assessment_context_shape CHECK (COALESCE(
 context_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{8,200}$'
 AND jsonb_typeof(context_snapshot)='object' AND octet_length(context_snapshot::text)<=4096 AND context_snapshot->'schemaVersion'='1'::jsonb
 AND context_snapshot->>'sessionId'=id::text AND context_snapshot->>'coupleSessionId'=couple_session_id::text AND context_snapshot->>'publicationId'=publication_id::text
 AND context_snapshot->>'jointProtocolId'=joint_protocol_id::text AND context_snapshot->>'assessmentVersionId'=assessment_version_id::text
 AND jsonb_typeof(context_snapshot->'participants')='array' AND jsonb_array_length(context_snapshot->'participants')=2,false));
ALTER TABLE couple_assessment_participants ADD CONSTRAINT couple_assessment_participant_shape CHECK (COALESCE(
 slot IN('INITIATOR','PARTNER') AND ((accepted_at IS NULL AND processing_consent_record_id IS NULL AND accepted_context_hash IS NULL AND accepted_session_id IS NULL AND acceptance_idempotency_key IS NULL)
  OR (accepted_at>=created_at AND processing_consent_record_id IS NOT NULL AND accepted_context_hash ~ '^[a-f0-9]{64}$' AND accepted_session_id IS NOT NULL AND acceptance_idempotency_key ~ '^[!-~]{8,200}$'))
 AND ((withdrawn_at IS NULL AND withdrawn_session_id IS NULL AND withdrawal_idempotency_key IS NULL)
  OR (withdrawn_at>=COALESCE(accepted_at,created_at) AND withdrawn_session_id IS NOT NULL AND withdrawal_idempotency_key ~ '^[!-~]{8,200}$')),false));

CREATE FUNCTION couple_assessment_patient_live(target uuid,target_clinic uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id WHERE p.id=target AND p.clinic_id=target_clinic AND u.status='ACTIVE' AND c.status='ACTIVE'
  AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT') AND couple_patient_is_adult(p.id));
$$;
CREATE FUNCTION couple_assessment_mutual_consent(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM couple_assessment_sessions s JOIN couple_sessions link ON link.id=s.couple_session_id
  JOIN assessment_offering_publications pub ON pub.id=s.publication_id JOIN assessment_offering_versions offer ON offer.id=pub.offering_version_id
  JOIN consent_policy_versions terms ON terms.id=pub.terms_policy_version_id AND terms.status='ACTIVE' AND terms.content_hash=pub.terms_content_hash
  JOIN couple_result_protocol_versions joint ON joint.id=s.joint_protocol_id WHERE s.id=target AND link.state='LINKED' AND pub.status='ACTIVE' AND offer.kind='COUPLES' AND offer.status='DRAFT'
   AND pub.protocol_review_id=joint.protocol_review_id AND couple_result_protocol_usable(joint.id)
   AND (SELECT count(*) FROM couple_assessment_participants WHERE session_id=s.id)=2
   AND NOT EXISTS(SELECT 1 FROM couple_assessment_participants p JOIN couple_participants lp ON lp.id=p.couple_participant_id LEFT JOIN patient_consent_records c ON c.id=p.processing_consent_record_id
    WHERE p.session_id=s.id AND (p.accepted_at IS NULL OR p.withdrawn_at IS NOT NULL OR lp.revoked_at IS NOT NULL OR c.id IS NULL OR c.withdrawn_at IS NOT NULL OR c.patient_id<>p.patient_id
     OR p.accepted_context_hash<>s.context_hash OR c.policy_version_id::text IS DISTINCT FROM s.context_snapshot->>'processingPolicyId' OR c.content_hash IS DISTINCT FROM s.context_snapshot->>'processingContentHash' OR NOT couple_assessment_patient_live(p.patient_id,s.clinic_id))));
$$;

CREATE FUNCTION couple_assessment_session_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE link couple_sessions; pub assessment_offering_publications; offer assessment_offering_versions; joint couple_result_protocol_versions; review assessment_protocol_reviews; actor uuid; reference jsonb;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Couple assessment context history is immutable retained evidence'; END IF;
 SELECT user_id INTO actor FROM patient_profiles WHERE id=NEW.created_by_patient_id AND clinic_id=NEW.clinic_id;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN patient_profiles p ON p.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN clinics c ON c.id=p.clinic_id
  WHERE s.id=NEW.created_session_id AND s.user_id=actor AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' AND p.id=NEW.created_by_patient_id AND p.clinic_id=NEW.clinic_id FOR SHARE OF s,u,p,ur,r,c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Independent active context creator session required'; END IF;
 SELECT * INTO link FROM couple_sessions WHERE id=NEW.couple_session_id AND clinic_id=NEW.clinic_id FOR SHARE;
 IF link.id IS NULL OR link.state<>'LINKED' OR NOT EXISTS(SELECT 1 FROM couple_participants WHERE session_id=link.id AND patient_id=NEW.created_by_patient_id AND revoked_at IS NULL)
  OR (SELECT count(*) FROM couple_participants WHERE session_id=link.id AND revoked_at IS NULL)<>2 THEN RAISE EXCEPTION 'Exact independently linked pair required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('couple-assessment-link:'||link.id::text||':'||NEW.publication_id::text,0));
 SELECT * INTO pub FROM assessment_offering_publications WHERE id=NEW.publication_id AND clinic_id=NEW.clinic_id;
 IF pub.id IS NULL THEN RAISE EXCEPTION 'Exact current couple publication required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-publication:'||NEW.clinic_id::text||':'||pub.offering_key,0));
 SELECT * INTO pub FROM assessment_offering_publications WHERE id=NEW.publication_id FOR SHARE;
 SELECT * INTO offer FROM assessment_offering_versions WHERE id=pub.offering_version_id FOR SHARE;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||NEW.assessment_version_id::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('couple-protocol:'||NEW.assessment_version_id::text,0));
 SELECT * INTO joint FROM couple_result_protocol_versions WHERE id=NEW.joint_protocol_id AND clinic_id=NEW.clinic_id FOR SHARE;
 SELECT * INTO review FROM assessment_protocol_reviews WHERE id=joint.protocol_review_id;
 IF pub.status<>'ACTIVE' OR offer.kind<>'COUPLES' OR offer.status<>'DRAFT' OR offer.assessment_version_id<>NEW.assessment_version_id OR joint.id IS NULL OR joint.assessment_version_id<>NEW.assessment_version_id OR pub.protocol_review_id<>joint.protocol_review_id
  OR NOT couple_result_protocol_usable(joint.id) THEN RAISE EXCEPTION 'Current exact approved couple configuration required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id IN(review.consent_policy_version_id,joint.disclosure_policy_version_id,pub.terms_policy_version_id) ORDER BY id FOR SHARE;
 IF NOT EXISTS(SELECT 1 FROM consent_policy_versions WHERE id=pub.terms_policy_version_id AND status='ACTIVE' AND content_hash=pub.terms_content_hash) THEN RAISE EXCEPTION 'Current couple commercial terms required'; END IF;
 IF NEW.context_snapshot->>'publicationHash' IS DISTINCT FROM pub.publication_hash OR NEW.context_snapshot->>'jointProtocolHash' IS DISTINCT FROM joint.content_hash OR NEW.context_snapshot->>'questionnaireContentHash' IS DISTINCT FROM joint.questionnaire_content_hash
  OR NEW.context_snapshot->>'processingPolicyId' IS DISTINCT FROM review.consent_policy_version_id::text OR NEW.context_snapshot->>'processingContentHash' IS DISTINCT FROM review.consent_content_hash
  OR NEW.context_snapshot->>'disclosurePolicyId' IS DISTINCT FROM joint.disclosure_policy_version_id::text OR NEW.context_snapshot->>'disclosureContentHash' IS DISTINCT FROM joint.disclosure_content_hash THEN RAISE EXCEPTION 'Exact immutable couple source and consent snapshot required'; END IF;
 IF jsonb_typeof(NEW.context_snapshot->'participants') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.context_snapshot->'participants')<>2 THEN RAISE EXCEPTION 'Exact two context participants required'; END IF;
 FOR reference IN SELECT value FROM jsonb_array_elements(NEW.context_snapshot->'participants') LOOP
  IF NOT EXISTS(SELECT 1 FROM couple_participants p WHERE p.id::text=reference->>'coupleParticipantId' AND p.patient_id::text=reference->>'patientId' AND p.slot=reference->>'slot' AND p.session_id=link.id AND p.revoked_at IS NULL AND couple_assessment_patient_live(p.patient_id,NEW.clinic_id)) THEN RAISE EXCEPTION 'Independent live adult context participants required'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT value->>'patientId') FROM jsonb_array_elements(NEW.context_snapshot->'participants'))<>2 THEN RAISE EXCEPTION 'Distinct couple identities required'; END IF;
 IF EXISTS(SELECT 1 FROM couple_assessment_sessions s WHERE s.couple_session_id=link.id AND s.publication_id=NEW.publication_id AND NOT EXISTS(SELECT 1 FROM couple_assessment_participants p WHERE p.session_id=s.id AND p.withdrawn_at IS NOT NULL)) THEN RAISE EXCEPTION 'An unresolved exact couple context already exists'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER couple_assessment_session_guard BEFORE INSERT OR UPDATE OR DELETE ON couple_assessment_sessions FOR EACH ROW EXECUTE FUNCTION couple_assessment_session_guard();

CREATE FUNCTION couple_assessment_participant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE context couple_assessment_sessions; linked couple_participants; medical patient_consent_records; actor_session uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Couple assessment participation history is retained'; END IF;
 SELECT * INTO context FROM couple_assessment_sessions WHERE id=NEW.session_id AND clinic_id=NEW.clinic_id;
 SELECT * INTO linked FROM couple_participants WHERE id=NEW.couple_participant_id AND patient_id=NEW.patient_id AND clinic_id=NEW.clinic_id AND session_id=context.couple_session_id AND slot=NEW.slot;
 IF context.id IS NULL OR linked.id IS NULL THEN RAISE EXCEPTION 'Exact context participant identity required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.accepted_at IS NOT NULL OR NEW.withdrawn_at IS NOT NULL THEN RAISE EXCEPTION 'Independent couple acceptance is a separate command'; END IF; RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['processing_consent_record_id','accepted_context_hash','accepted_session_id','accepted_at','acceptance_idempotency_key','withdrawn_at','withdrawn_session_id','withdrawal_idempotency_key']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['processing_consent_record_id','accepted_context_hash','accepted_session_id','accepted_at','acceptance_idempotency_key','withdrawn_at','withdrawn_session_id','withdrawal_idempotency_key']) THEN RAISE EXCEPTION 'Couple participant identity is immutable'; END IF;
 IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
 IF OLD.withdrawn_at IS NOT NULL THEN RAISE EXCEPTION 'Couple participation withdrawal is final'; END IF;
 IF NEW.withdrawn_at IS NOT NULL THEN
  IF (to_jsonb(NEW)-ARRAY['withdrawn_at','withdrawn_session_id','withdrawal_idempotency_key']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['withdrawn_at','withdrawn_session_id','withdrawal_idempotency_key']) THEN RAISE EXCEPTION 'Couple acceptance evidence cannot change on withdrawal'; END IF;
  actor_session:=NEW.withdrawn_session_id;
 ELSE
  IF OLD.accepted_at IS NOT NULL OR NEW.accepted_at IS NULL OR NEW.accepted_context_hash<>context.context_hash THEN RAISE EXCEPTION 'Exact independent couple acceptance is immutable'; END IF;
  actor_session:=NEW.accepted_session_id;
 END IF;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN patient_profiles p ON p.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN clinics c ON c.id=p.clinic_id
  WHERE s.id=actor_session AND p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF s,u,p,ur,r,c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Independent owned participation session required'; END IF;
 IF NEW.withdrawn_at IS NOT NULL THEN RETURN NEW; END IF;
 PERFORM id FROM couple_sessions WHERE id=context.couple_session_id AND state='LINKED' FOR SHARE;
 IF NOT FOUND OR linked.revoked_at IS NOT NULL OR EXISTS(SELECT 1 FROM couple_assessment_participants WHERE session_id=context.id AND withdrawn_at IS NOT NULL)
  OR NOT couple_result_protocol_usable(context.joint_protocol_id) OR NOT EXISTS(SELECT 1 FROM assessment_offering_publications WHERE id=context.publication_id AND status='ACTIVE')
  OR EXISTS(SELECT 1 FROM couple_participants p WHERE p.session_id=context.couple_session_id AND (p.revoked_at IS NOT NULL OR NOT couple_assessment_patient_live(p.patient_id,NEW.clinic_id))) THEN RAISE EXCEPTION 'Current mutual context prerequisites required'; END IF;
 SELECT * INTO medical FROM patient_consent_records WHERE id=NEW.processing_consent_record_id AND patient_id=NEW.patient_id FOR SHARE;
 IF medical.id IS NULL OR medical.withdrawn_at IS NOT NULL OR medical.policy_version_id::text IS DISTINCT FROM context.context_snapshot->>'processingPolicyId' OR medical.content_hash IS DISTINCT FROM context.context_snapshot->>'processingContentHash' THEN RAISE EXCEPTION 'Exact own unwithdrawn medical processing acceptance required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER couple_assessment_participant_guard BEFORE INSERT OR UPDATE OR DELETE ON couple_assessment_participants FOR EACH ROW EXECUTE FUNCTION couple_assessment_participant_guard();

CREATE FUNCTION couple_assessment_commit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; context couple_assessment_sessions;
BEGIN
 IF TG_TABLE_NAME='couple_assessment_sessions' THEN target:=NEW.id; ELSE target:=NEW.session_id; END IF;
 SELECT * INTO context FROM couple_assessment_sessions WHERE id=target;
 IF context.id IS NULL OR (SELECT count(*) FROM couple_assessment_participants WHERE session_id=target)<>2
  OR EXISTS(SELECT 1 FROM couple_assessment_participants p WHERE p.session_id=target AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(context.context_snapshot->'participants') ref WHERE ref->>'coupleParticipantId'=p.couple_participant_id::text AND ref->>'patientId'=p.patient_id::text AND ref->>'slot'=p.slot)) THEN RAISE EXCEPTION 'Couple context requires its exact two independent participant identities'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER couple_assessment_session_commit AFTER INSERT ON couple_assessment_sessions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION couple_assessment_commit_guard();
CREATE CONSTRAINT TRIGGER couple_assessment_participant_commit AFTER INSERT OR UPDATE ON couple_assessment_participants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION couple_assessment_commit_guard();
