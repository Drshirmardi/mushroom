BEGIN;
-- DropForeignKey
ALTER TABLE "consent_policy_versions" DROP CONSTRAINT "consent_policy_assessment_offering_fk";

-- AlterTable
ALTER TABLE "assessment_access_grants" ADD COLUMN     "educational_couple_participant_id" UUID;

-- CreateTable
CREATE TABLE "educational_couple_sessions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "couple_session_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "context_hash" CHAR(64) NOT NULL,
    "context_snapshot" JSONB NOT NULL,
    "created_by_patient_id" UUID NOT NULL,
    "created_session_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "educational_couple_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educational_couple_participants" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "slot" VARCHAR(16) NOT NULL,
    "processing_consent_record_id" UUID,
    "disclosure_content_hash" CHAR(64),
    "accepted_session_id" UUID,
    "accepted_at" TIMESTAMPTZ(3),
    "sharing_withdrawn_at" TIMESTAMPTZ(3),
    "withdrawn_session_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "educational_couple_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "educational_couple_clinic_created_idx" ON "educational_couple_sessions"("clinic_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "educational_couple_session_clinic_key" ON "educational_couple_sessions"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "educational_couple_link_publication_key" ON "educational_couple_sessions"("couple_session_id", "publication_id");

-- CreateIndex
CREATE UNIQUE INDEX "educational_couple_command_key" ON "educational_couple_sessions"("created_by_patient_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "educational_couple_participant_history_idx" ON "educational_couple_participants"("patient_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "educational_couple_participant_patient_key" ON "educational_couple_participants"("session_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "educational_couple_participant_slot_key" ON "educational_couple_participants"("session_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "educational_couple_grant_participant_key" ON "assessment_access_grants"("educational_couple_participant_id");

-- AddForeignKey
ALTER TABLE "consent_policy_versions" ADD CONSTRAINT "consent_policy_assessment_offering_fk" FOREIGN KEY ("assessment_offering_version_id") REFERENCES "assessment_offering_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_access_grants" ADD CONSTRAINT "assessment_access_grants_educational_couple_participant_id_fkey" FOREIGN KEY ("educational_couple_participant_id") REFERENCES "educational_couple_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_sessions" ADD CONSTRAINT "educational_couple_sessions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_sessions" ADD CONSTRAINT "educational_couple_sessions_couple_session_id_clinic_id_fkey" FOREIGN KEY ("couple_session_id", "clinic_id") REFERENCES "couple_sessions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_sessions" ADD CONSTRAINT "educational_couple_sessions_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "assessment_admin_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_sessions" ADD CONSTRAINT "educational_couple_sessions_created_by_patient_id_clinic_i_fkey" FOREIGN KEY ("created_by_patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_sessions" ADD CONSTRAINT "educational_couple_sessions_created_session_id_fkey" FOREIGN KEY ("created_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_participants" ADD CONSTRAINT "educational_couple_participants_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_participants" ADD CONSTRAINT "educational_couple_participants_session_id_clinic_id_fkey" FOREIGN KEY ("session_id", "clinic_id") REFERENCES "educational_couple_sessions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_participants" ADD CONSTRAINT "educational_couple_participants_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_participants" ADD CONSTRAINT "educational_couple_participants_processing_consent_record__fkey" FOREIGN KEY ("processing_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_participants" ADD CONSTRAINT "educational_couple_participants_accepted_session_id_fkey" FOREIGN KEY ("accepted_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_couple_participants" ADD CONSTRAINT "educational_couple_participants_withdrawn_session_id_fkey" FOREIGN KEY ("withdrawn_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE educational_couple_sessions ADD CONSTRAINT educational_couple_session_shape CHECK (
 context_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{8,200}$'
 AND jsonb_typeof(context_snapshot)='object' AND octet_length(context_snapshot::text)<=8192);
ALTER TABLE educational_couple_participants ADD CONSTRAINT educational_couple_participant_shape CHECK (COALESCE(
 slot IN('INITIATOR','PARTNER') AND
 ((accepted_at IS NULL AND processing_consent_record_id IS NULL AND disclosure_content_hash IS NULL AND accepted_session_id IS NULL)
  OR (accepted_at>=created_at AND processing_consent_record_id IS NOT NULL AND disclosure_content_hash ~ '^[a-f0-9]{64}$' AND accepted_session_id IS NOT NULL))
 AND ((sharing_withdrawn_at IS NULL AND withdrawn_session_id IS NULL) OR (sharing_withdrawn_at>=accepted_at AND accepted_at IS NOT NULL AND withdrawn_session_id IS NOT NULL)),false));

CREATE FUNCTION educational_couple_current(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM educational_couple_sessions s JOIN couple_sessions link ON link.id=s.couple_session_id AND link.clinic_id=s.clinic_id
  JOIN assessment_admin_publications pub ON pub.id=s.publication_id JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=s.clinic_id
  JOIN assessment_versions v ON v.id=o.assessment_version_id AND v.clinic_id=s.clinic_id
  WHERE s.id=target AND pub.status='ACTIVE' AND o.status='DRAFT' AND o.kind='COUPLES' AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash
   AND link.state='LINKED' AND (SELECT count(*) FROM couple_participants cp WHERE cp.session_id=link.id AND cp.revoked_at IS NULL AND couple_assessment_patient_live(cp.patient_id,s.clinic_id))=2
   AND s.context_snapshot->>'publicationId'=pub.id::text AND s.context_snapshot->>'questionnaireContentHash'=v.content_hash
   AND NOT EXISTS(SELECT 1 FROM consent_policy_versions p WHERE p.assessment_offering_version_id=o.id AND (p.status<>'ACTIVE' OR pub.document_hashes->>p.policy_key IS DISTINCT FROM p.content_hash::text OR encode(sha256(convert_to(p.body,'UTF8')),'hex')<>p.content_hash)));
$$;
CREATE FUNCTION educational_couple_mutual(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT educational_couple_current(target) AND (SELECT count(*) FROM educational_couple_participants cp
  JOIN educational_couple_sessions s ON s.id=cp.session_id JOIN assessment_admin_publications pub ON pub.id=s.publication_id
  JOIN consent_policy_versions policy ON policy.assessment_offering_version_id=pub.offering_version_id AND policy.policy_key='ASSESSMENT_PROCESSING'
  JOIN patient_consent_records c ON c.id=cp.processing_consent_record_id AND c.patient_id=cp.patient_id AND c.policy_version_id=policy.id
  WHERE cp.session_id=target AND cp.accepted_at IS NOT NULL AND cp.sharing_withdrawn_at IS NULL AND c.withdrawn_at IS NULL AND c.content_hash=policy.content_hash
   AND cp.disclosure_content_hash=pub.document_hashes->>'COUPLES_RESULT_SHARING')=2;
$$;
CREATE FUNCTION educational_couple_session_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE offer assessment_offering_versions; source assessment_versions;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Educational couple context history is immutable'; END IF;
 PERFORM id FROM couple_sessions WHERE id=NEW.couple_session_id AND clinic_id=NEW.clinic_id AND state='LINKED' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current independently linked accounts required'; END IF;
 SELECT o.* INTO offer FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id WHERE pub.id=NEW.publication_id AND pub.status='ACTIVE' FOR SHARE OF pub,o;
 IF offer.id IS NULL OR offer.clinic_id<>NEW.clinic_id OR offer.kind<>'COUPLES' OR offer.status<>'DRAFT' THEN RAISE EXCEPTION 'Exact ADMIN couple offering required'; END IF;
 SELECT * INTO source FROM assessment_versions WHERE id=offer.assessment_version_id AND clinic_id=NEW.clinic_id AND status='PUBLISHED' FOR SHARE;
 IF source.id IS NULL OR NEW.context_snapshot->>'publicationId' IS DISTINCT FROM NEW.publication_id::text OR NEW.context_snapshot->>'coupleSessionId' IS DISTINCT FROM NEW.couple_session_id::text OR NEW.context_snapshot->>'questionnaireContentHash' IS DISTINCT FROM source.content_hash::text THEN RAISE EXCEPTION 'Exact couple source snapshot required'; END IF;
 IF (SELECT count(*) FROM couple_participants cp WHERE cp.session_id=NEW.couple_session_id AND cp.revoked_at IS NULL AND couple_assessment_patient_live(cp.patient_id,NEW.clinic_id))<>2 THEN RAISE EXCEPTION 'Two distinct active adult beneficiaries required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM patient_profiles p JOIN sessions s ON s.user_id=p.user_id JOIN couple_participants cp ON cp.patient_id=p.id AND cp.session_id=NEW.couple_session_id WHERE p.id=NEW.created_by_patient_id AND p.clinic_id=NEW.clinic_id AND s.id=NEW.created_session_id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP) THEN RAISE EXCEPTION 'Owned active creating session required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER educational_couple_session_guard BEFORE INSERT OR UPDATE OR DELETE ON educational_couple_sessions FOR EACH ROW EXECUTE FUNCTION educational_couple_session_guard();

CREATE FUNCTION educational_couple_participant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE context educational_couple_sessions; actor_session uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Independent couple acceptance history is retained'; END IF;
 SELECT * INTO context FROM educational_couple_sessions WHERE id=NEW.session_id AND clinic_id=NEW.clinic_id FOR UPDATE;
 IF context.id IS NULL OR NOT EXISTS(SELECT 1 FROM couple_participants WHERE session_id=context.couple_session_id AND patient_id=NEW.patient_id AND slot=NEW.slot AND revoked_at IS NULL) THEN RAISE EXCEPTION 'Exact linked beneficiary required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.accepted_at IS NOT NULL OR NEW.sharing_withdrawn_at IS NOT NULL THEN RAISE EXCEPTION 'Participation begins without fabricated acceptance'; END IF; RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['processing_consent_record_id','disclosure_content_hash','accepted_session_id','accepted_at','sharing_withdrawn_at','withdrawn_session_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['processing_consent_record_id','disclosure_content_hash','accepted_session_id','accepted_at','sharing_withdrawn_at','withdrawn_session_id']) THEN RAISE EXCEPTION 'Couple beneficiary binding is immutable'; END IF;
 IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
 IF OLD.accepted_at IS NULL THEN
  IF NEW.accepted_at IS NULL OR NEW.sharing_withdrawn_at IS NOT NULL OR NOT educational_couple_current(context.id) THEN RAISE EXCEPTION 'Exact active educational context required for acceptance'; END IF;
  IF NOT EXISTS(SELECT 1 FROM assessment_admin_publications pub JOIN consent_policy_versions p ON p.assessment_offering_version_id=pub.offering_version_id AND p.policy_key='ASSESSMENT_PROCESSING' JOIN patient_consent_records c ON c.policy_version_id=p.id AND c.patient_id=NEW.patient_id WHERE pub.id=context.publication_id AND c.id=NEW.processing_consent_record_id AND c.withdrawn_at IS NULL AND c.content_hash=p.content_hash AND NEW.disclosure_content_hash=pub.document_hashes->>'COUPLES_RESULT_SHARING') THEN RAISE EXCEPTION 'Exact owned processing and independent disclosure acceptance required'; END IF;
  actor_session:=NEW.accepted_session_id;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['sharing_withdrawn_at','withdrawn_session_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['sharing_withdrawn_at','withdrawn_session_id']) OR OLD.sharing_withdrawn_at IS NOT NULL OR NEW.sharing_withdrawn_at IS NULL THEN RAISE EXCEPTION 'Acceptance is immutable; disclosure withdrawal is final'; END IF;
  actor_session:=NEW.withdrawn_session_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM patient_profiles p JOIN sessions s ON s.user_id=p.user_id WHERE p.id=NEW.patient_id AND s.id=actor_session AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND couple_assessment_patient_live(p.id,NEW.clinic_id)) THEN RAISE EXCEPTION 'Independent active beneficiary session required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER educational_couple_participant_guard BEFORE INSERT OR UPDATE OR DELETE ON educational_couple_participants FOR EACH ROW EXECUTE FUNCTION educational_couple_participant_guard();

CREATE FUNCTION educational_couple_commit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; context educational_couple_sessions;
BEGIN
 target:=CASE WHEN TG_TABLE_NAME='educational_couple_sessions' THEN NEW.id ELSE NEW.session_id END;
 SELECT * INTO context FROM educational_couple_sessions WHERE id=target;
 IF (SELECT count(*) FROM educational_couple_participants WHERE session_id=target)<>2 OR EXISTS(SELECT 1 FROM educational_couple_participants p WHERE p.session_id=target AND NOT EXISTS(SELECT 1 FROM couple_participants cp WHERE cp.session_id=context.couple_session_id AND cp.patient_id=p.patient_id AND cp.slot=p.slot AND cp.clinic_id=p.clinic_id)) THEN RAISE EXCEPTION 'Exactly two independently linked educational beneficiaries required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER educational_couple_session_commit AFTER INSERT ON educational_couple_sessions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION educational_couple_commit_guard();
CREATE CONSTRAINT TRIGGER educational_couple_participant_commit AFTER INSERT ON educational_couple_participants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION educational_couple_commit_guard();

-- The explicit grant adapter follows in a forward migration; legacy grants cannot bind modern participants.
ALTER TABLE assessment_access_grants ADD CONSTRAINT educational_couple_grant_activation CHECK (educational_couple_participant_id IS NULL);
COMMIT;
