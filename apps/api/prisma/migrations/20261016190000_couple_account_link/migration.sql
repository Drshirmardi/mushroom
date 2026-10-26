BEGIN;
-- Relational scaffold generated with Prisma; scoped invariants follow below.
-- CreateTable
CREATE TABLE "couple_sessions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "initiator_patient_id" UUID NOT NULL,
    "state" VARCHAR(24) NOT NULL DEFAULT 'AWAITING_PARTNER',
    "minimum_age_years" INTEGER NOT NULL DEFAULT 18,
    "consent_policy_version_id" UUID NOT NULL,
    "consent_content_hash" CHAR(64) NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "couple_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_participants" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "slot" VARCHAR(16) NOT NULL,
    "consent_policy_version_id" UUID NOT NULL,
    "consent_content_hash" CHAR(64) NOT NULL,
    "accepted_by_user_id" UUID NOT NULL,
    "accepted_session_id" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "couple_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_invitations" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "issuer_patient_id" UUID NOT NULL,
    "recipient_patient_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "couple_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "couple_sessions_clinic_created_idx" ON "couple_sessions"("clinic_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_sessions_id_clinic_key" ON "couple_sessions"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_sessions_command_key" ON "couple_sessions"("initiator_patient_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "couple_participants_patient_session_idx" ON "couple_participants"("patient_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_participants_slot_key" ON "couple_participants"("session_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "couple_participants_patient_key" ON "couple_participants"("session_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_invitations_token_key" ON "couple_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "couple_invitations_session_status_idx" ON "couple_invitations"("session_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "couple_invitations_command_key" ON "couple_invitations"("issuer_patient_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "couple_sessions" ADD CONSTRAINT "couple_sessions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_sessions" ADD CONSTRAINT "couple_sessions_initiator_clinic_fkey" FOREIGN KEY ("initiator_patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_sessions" ADD CONSTRAINT "couple_sessions_consent_policy_version_id_fkey" FOREIGN KEY ("consent_policy_version_id") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_participants" ADD CONSTRAINT "couple_participants_session_clinic_fkey" FOREIGN KEY ("session_id", "clinic_id") REFERENCES "couple_sessions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_participants" ADD CONSTRAINT "couple_participants_patient_clinic_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_participants" ADD CONSTRAINT "couple_participants_consent_policy_version_id_fkey" FOREIGN KEY ("consent_policy_version_id") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_participants" ADD CONSTRAINT "couple_participants_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_invitations" ADD CONSTRAINT "couple_invitations_session_clinic_fkey" FOREIGN KEY ("session_id", "clinic_id") REFERENCES "couple_sessions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_invitations" ADD CONSTRAINT "couple_invitations_issuer_clinic_fkey" FOREIGN KEY ("issuer_patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_invitations" ADD CONSTRAINT "couple_invitations_recipient_clinic_fkey" FOREIGN KEY ("recipient_patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE couple_sessions ADD CONSTRAINT couple_sessions_state_check CHECK (
  state IN ('AWAITING_PARTNER', 'LINKED', 'CONSENT_REVOKED') AND minimum_age_years = 18
  AND consent_content_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND length(idempotency_key) > 0);
ALTER TABLE couple_participants ADD CONSTRAINT couple_participants_slot_check CHECK (
  slot IN ('INITIATOR', 'PARTNER') AND consent_content_hash ~ '^[a-f0-9]{64}$' AND (revoked_at IS NULL OR revoked_at >= accepted_at));
ALTER TABLE couple_invitations ADD CONSTRAINT couple_invitations_state_check CHECK (
  issuer_patient_id <> recipient_patient_id AND token_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$'
  AND length(idempotency_key) > 0 AND (
    (status = 'PENDING' AND accepted_at IS NULL AND revoked_at IS NULL)
    OR (status = 'ACCEPTED' AND accepted_at IS NOT NULL AND revoked_at IS NULL)
    OR (status = 'REVOKED' AND accepted_at IS NULL AND revoked_at IS NOT NULL)));
CREATE UNIQUE INDEX couple_invitations_one_pending_idx ON couple_invitations(session_id) WHERE status = 'PENDING';

-- Only a boolean age decision crosses the domain boundary; DOB stays in existing intake storage.
CREATE FUNCTION couple_patient_is_adult(target_patient UUID) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r
      ON r.intake_id = i.id AND r.revision_number = i.current_revision_number
    WHERE i.patient_id = target_patient AND r.birth_date IS NOT NULL
      AND r.birth_date <= (((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date) - INTERVAL '18 years')::date
  );
$$;

CREATE FUNCTION couple_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked couple_sessions; policy consent_policy_versions;
BEGIN
  IF TG_TABLE_NAME = 'couple_sessions' THEN
    SELECT * INTO policy FROM consent_policy_versions WHERE id = NEW.consent_policy_version_id FOR SHARE;
    IF NEW.state <> 'AWAITING_PARTNER' OR policy.id IS NULL OR policy.clinic_id <> NEW.clinic_id
      OR policy.policy_key <> 'COUPLES_ACCOUNT_LINKING' OR policy.locale <> 'fa-IR'
      OR policy.status <> 'ACTIVE' OR policy.content_hash <> NEW.consent_content_hash THEN
      RAISE EXCEPTION 'Couple link requires the active same-clinic policy' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO linked FROM couple_sessions WHERE id = NEW.session_id AND clinic_id = NEW.clinic_id FOR UPDATE;
  IF linked.id IS NULL OR linked.state <> 'AWAITING_PARTNER' THEN
    RAISE EXCEPTION 'Couple session does not accept participants or invitations' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'couple_invitations' THEN
    IF NEW.status <> 'PENDING' OR NEW.issuer_patient_id <> linked.initiator_patient_id THEN
      RAISE EXCEPTION 'Only the initiator issues pending invitations' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO policy FROM consent_policy_versions WHERE id = NEW.consent_policy_version_id FOR SHARE;
  IF NEW.revoked_at IS NOT NULL OR NEW.consent_policy_version_id <> linked.consent_policy_version_id
    OR NEW.consent_content_hash <> linked.consent_content_hash OR policy.id IS NULL OR policy.status <> 'ACTIVE'
    OR policy.clinic_id <> linked.clinic_id OR policy.policy_key <> 'COUPLES_ACCOUNT_LINKING'
    OR (NEW.slot = 'INITIATOR' AND NEW.patient_id <> linked.initiator_patient_id)
    OR (NEW.slot = 'PARTNER' AND NEW.patient_id = linked.initiator_patient_id)
    OR NOT EXISTS (SELECT 1 FROM patient_profiles p JOIN sessions s ON s.user_id = p.user_id
      WHERE p.id = NEW.patient_id AND p.user_id = NEW.accepted_by_user_id AND s.id = NEW.accepted_session_id
        AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP)
    OR NOT couple_patient_is_adult(NEW.patient_id) THEN
    RAISE EXCEPTION 'Independent adult identity and exact current consent are required' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER couple_sessions_insert_guard BEFORE INSERT ON couple_sessions FOR EACH ROW EXECUTE FUNCTION couple_insert_guard();
CREATE TRIGGER couple_participants_insert_guard BEFORE INSERT ON couple_participants FOR EACH ROW EXECUTE FUNCTION couple_insert_guard();
CREATE TRIGGER couple_invitations_insert_guard BEFORE INSERT ON couple_invitations FOR EACH ROW EXECUTE FUNCTION couple_insert_guard();

CREATE FUNCTION couple_immutable_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Couple identity and consent history is retained pending approved retention policy' USING ERRCODE = '23514'; END IF;
  IF TG_TABLE_NAME = 'couple_sessions' THEN
    IF (to_jsonb(NEW) - 'state' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'state' - 'updated_at')
      OR NOT (NEW.state = OLD.state OR OLD.state = 'AWAITING_PARTNER' AND NEW.state IN ('LINKED', 'CONSENT_REVOKED')
        OR OLD.state = 'LINKED' AND NEW.state = 'CONSENT_REVOKED') THEN
      RAISE EXCEPTION 'Couple session identity and policy are immutable' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'couple_participants' THEN
    IF (to_jsonb(NEW) - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at')
      OR NOT (NEW.revoked_at IS NOT DISTINCT FROM OLD.revoked_at OR OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Couple consent evidence is immutable and revocation is final' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF (to_jsonb(NEW) - 'status' - 'accepted_at' - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'accepted_at' - 'revoked_at')
      OR NOT (NEW IS NOT DISTINCT FROM OLD OR OLD.status = 'PENDING' AND NEW.status IN ('ACCEPTED', 'REVOKED')) THEN
      RAISE EXCEPTION 'Couple invitation identity and terminal status are immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER couple_sessions_immutable BEFORE UPDATE OR DELETE ON couple_sessions FOR EACH ROW EXECUTE FUNCTION couple_immutable_guard();
CREATE TRIGGER couple_participants_immutable BEFORE UPDATE OR DELETE ON couple_participants FOR EACH ROW EXECUTE FUNCTION couple_immutable_guard();
CREATE TRIGGER couple_invitations_immutable BEFORE UPDATE OR DELETE ON couple_invitations FOR EACH ROW EXECUTE FUNCTION couple_immutable_guard();

CREATE FUNCTION couple_commit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id UUID; linked couple_sessions; total INTEGER; initiators INTEGER; revoked INTEGER; partner UUID;
BEGIN
  IF TG_TABLE_NAME = 'couple_sessions' THEN target_id := NEW.id; ELSE target_id := NEW.session_id; END IF;
  SELECT * INTO linked FROM couple_sessions WHERE id = target_id;
  SELECT count(*), count(*) FILTER (WHERE slot = 'INITIATOR' AND patient_id = linked.initiator_patient_id),
    count(*) FILTER (WHERE revoked_at IS NOT NULL) INTO total, initiators, revoked FROM couple_participants WHERE session_id = target_id;
  IF linked.id IS NULL OR initiators <> 1 OR total NOT BETWEEN 1 AND 2
    OR linked.state = 'AWAITING_PARTNER' AND (total <> 1 OR revoked <> 0)
    OR linked.state = 'LINKED' AND (total <> 2 OR revoked <> 0)
    OR linked.state = 'CONSENT_REVOKED' AND revoked = 0 THEN
    RAISE EXCEPTION 'Couple state must match independent participant consents' USING ERRCODE = '23514';
  END IF;
  SELECT patient_id INTO partner FROM couple_participants WHERE session_id = target_id AND slot = 'PARTNER';
  IF partner IS NOT NULL AND NOT EXISTS (SELECT 1 FROM couple_invitations WHERE session_id = target_id AND status = 'ACCEPTED' AND recipient_patient_id = partner)
    OR linked.state <> 'AWAITING_PARTNER' AND EXISTS (SELECT 1 FROM couple_invitations WHERE session_id = target_id AND status = 'PENDING') THEN
    RAISE EXCEPTION 'Partner consent must match the accepted invitation' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER couple_sessions_commit AFTER INSERT OR UPDATE ON couple_sessions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION couple_commit_guard();
CREATE CONSTRAINT TRIGGER couple_participants_commit AFTER INSERT OR UPDATE ON couple_participants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION couple_commit_guard();
CREATE CONSTRAINT TRIGGER couple_invitations_commit AFTER INSERT OR UPDATE ON couple_invitations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION couple_commit_guard();
COMMIT;
