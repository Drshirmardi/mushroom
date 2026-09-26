-- F10-T02: additive, appointment-bound durable text-chat persistence.
-- No attachment, video, transport, retention-disposition, or policy-engine infrastructure is created here.

CREATE TYPE "chat_participant_kind" AS ENUM ('PATIENT', 'DOCTOR', 'CLINIC_OPERATOR');
CREATE TYPE "chat_message_visibility" AS ENUM ('VISIBLE', 'RESTRICTED');
CREATE TYPE "chat_moderation_reason_category" AS ENUM (
  'ABUSE_OR_HARASSMENT',
  'THREAT_OR_SAFETY',
  'SENSITIVE_DATA_EXPOSURE',
  'SPAM_OR_SCAM',
  'MALICIOUS_CONTENT',
  'OTHER'
);
CREATE TYPE "chat_message_moderation_action" AS ENUM (
  'RESTRICT_MESSAGE',
  'RESTORE_MESSAGE'
);
CREATE TYPE "chat_report_resolution_action" AS ENUM (
  'NO_ADDITIONAL_ACTION',
  'RESTRICT_MESSAGE',
  'RECORD_WARNING',
  'CONFIRM_PATIENT_DOCTOR_BLOCK',
  'CONFIRM_PATIENT_CLINIC_OPERATOR_BLOCK',
  'LIFT_TEMPORARY_BLOCK'
);
CREATE TYPE "chat_report_resolution" AS ENUM (
  'DISMISSED_NO_VIOLATION',
  'UPHELD_POLICY_VIOLATION',
  'INSUFFICIENT_EVIDENCE',
  'ESCALATED_SAFETY_OR_LEGAL'
);
CREATE TYPE "chat_block_scope" AS ENUM ('PATIENT_DOCTOR', 'PATIENT_CLINIC_OPERATOR');
CREATE TYPE "chat_block_status" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'LIFTED');
CREATE TYPE "chat_audit_action" AS ENUM (
  'MESSAGE_CREATED',
  'MESSAGE_RESTRICTED',
  'MESSAGE_RESTORED',
  'RESTRICTED_CONTENT_REVIEWED',
  'REPORT_CREATED',
  'REPORT_RESOLVED',
  'BLOCK_REQUESTED',
  'BLOCK_CONFIRMED',
  'BLOCK_LIFTED',
  'LEGAL_HOLD_APPLIED',
  'LEGAL_HOLD_RELEASED',
  'RETENTION_DISPOSITION_ATTEMPTED'
);

CREATE TABLE "chat_conversations" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "appointment_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "doctor_id" UUID NOT NULL,
  "closed_at" TIMESTAMPTZ(3),
  "retention_base_at" TIMESTAMPTZ(3),
  "retention_expires_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_conversations_appointment_id_key" UNIQUE ("appointment_id"),
  CONSTRAINT "chat_conversations_id_clinic_key" UNIQUE ("id", "clinic_id"),
  CONSTRAINT "chat_conversations_appointment_clinic_key" UNIQUE ("appointment_id", "clinic_id"),
  CONSTRAINT "chat_conversations_retention_window_check" CHECK (
    "retention_expires_at" IS NULL OR (
      "retention_base_at" IS NOT NULL
      AND "retention_expires_at" >= "retention_base_at" + INTERVAL '10 years'
    )
  ),
  CONSTRAINT "chat_conversations_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_conversations_appointment_id_clinic_id_fkey"
    FOREIGN KEY ("appointment_id", "clinic_id") REFERENCES "appointments"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_conversations_patient_id_clinic_id_fkey"
    FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_conversations_doctor_id_clinic_id_fkey"
    FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_conversations_clinic_patient_created_idx" ON "chat_conversations"("clinic_id", "patient_id", "created_at", "id");
CREATE INDEX "chat_conversations_clinic_doctor_created_idx" ON "chat_conversations"("clinic_id", "doctor_id", "created_at", "id");

CREATE TABLE "chat_conversation_participants" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "kind" "chat_participant_kind" NOT NULL,
  "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_conversation_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_conversation_participants_identity_key" UNIQUE ("conversation_id", "user_id", "kind"),
  CONSTRAINT "chat_conversation_participants_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_conversation_participants_conversation_id_clinic_id_fkey"
    FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_conversation_participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_conversation_participants_clinic_user_idx" ON "chat_conversation_participants"("clinic_id", "user_id", "conversation_id");

CREATE TABLE "chat_messages" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "sequence" BIGINT NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "sender_kind" "chat_participant_kind" NOT NULL,
  "client_message_id" VARCHAR(128) NOT NULL,
  "request_payload_hash" CHAR(64) NOT NULL,
  "body" TEXT NOT NULL,
  "visibility" "chat_message_visibility" NOT NULL DEFAULT 'VISIBLE',
  "restricted_reason_category" "chat_moderation_reason_category",
  "restricted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_messages_id_conversation_clinic_key" UNIQUE ("id", "conversation_id", "clinic_id"),
  CONSTRAINT "chat_messages_conversation_sequence_key" UNIQUE ("conversation_id", "sequence"),
  CONSTRAINT "chat_messages_idempotency_key" UNIQUE ("conversation_id", "sender_user_id", "client_message_id"),
  CONSTRAINT "chat_messages_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "chat_messages_body_check" CHECK (char_length("body") BETWEEN 1 AND 4000),
  CONSTRAINT "chat_messages_visibility_check" CHECK (
    ("visibility" = 'VISIBLE' AND "restricted_reason_category" IS NULL AND "restricted_at" IS NULL)
    OR ("visibility" = 'RESTRICTED' AND "restricted_reason_category" IS NOT NULL AND "restricted_at" IS NOT NULL)
  ),
  CONSTRAINT "chat_messages_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_messages_conversation_id_clinic_id_fkey"
    FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_messages_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_messages_clinic_history_idx" ON "chat_messages"("clinic_id", "conversation_id", "sequence");

CREATE TABLE "chat_receipts" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "last_delivered_sequence" BIGINT NOT NULL DEFAULT 0,
  "last_read_sequence" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "chat_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_receipts_conversation_user_key" UNIQUE ("conversation_id", "user_id"),
  CONSTRAINT "chat_receipts_sequence_check" CHECK (
    "last_delivered_sequence" >= 0
    AND "last_read_sequence" >= 0
    AND "last_read_sequence" <= "last_delivered_sequence"
  ),
  CONSTRAINT "chat_receipts_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_receipts_conversation_id_clinic_id_fkey"
    FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_receipts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_receipts_clinic_user_idx" ON "chat_receipts"("clinic_id", "user_id", "conversation_id");

CREATE TABLE "chat_moderation_reports" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "reporter_user_id" UUID NOT NULL,
  "reason_category" "chat_moderation_reason_category" NOT NULL,
  "reporter_note" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_moderation_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_moderation_reports_message_reporter_key" UNIQUE ("message_id", "reporter_user_id"),
  CONSTRAINT "chat_moderation_reports_other_note_check" CHECK (
    "reason_category" <> 'OTHER' OR char_length(trim(COALESCE("reporter_note", ''))) > 0
  ),
  CONSTRAINT "chat_moderation_reports_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_moderation_reports_conversation_id_clinic_id_fkey"
    FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_moderation_reports_message_id_conversation_id_clinic__fkey"
    FOREIGN KEY ("message_id", "conversation_id", "clinic_id") REFERENCES "chat_messages"("id", "conversation_id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_moderation_reports_reporter_user_id_fkey"
    FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_moderation_reports_conversation_created_idx" ON "chat_moderation_reports"("clinic_id", "conversation_id", "created_at", "id");
CREATE INDEX "chat_moderation_reports_message_created_idx" ON "chat_moderation_reports"("clinic_id", "message_id", "created_at", "id");

CREATE TABLE "chat_moderation_report_decisions" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "resolution" "chat_report_resolution" NOT NULL,
  "action" "chat_report_resolution_action" NOT NULL,
  "safe_note" VARCHAR(500),
  "decided_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_moderation_report_decisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_moderation_report_decisions_report_id_key" UNIQUE ("report_id"),
  CONSTRAINT "chat_moderation_report_decisions_resolution_action_check" CHECK (
    ("resolution" = 'DISMISSED_NO_VIOLATION' AND "action" IN ('NO_ADDITIONAL_ACTION', 'LIFT_TEMPORARY_BLOCK'))
    OR ("resolution" = 'UPHELD_POLICY_VIOLATION' AND "action" IN (
      'NO_ADDITIONAL_ACTION', 'RESTRICT_MESSAGE', 'RECORD_WARNING',
      'CONFIRM_PATIENT_DOCTOR_BLOCK', 'CONFIRM_PATIENT_CLINIC_OPERATOR_BLOCK', 'LIFT_TEMPORARY_BLOCK'
    ))
    OR ("resolution" = 'INSUFFICIENT_EVIDENCE' AND "action" IN ('NO_ADDITIONAL_ACTION', 'LIFT_TEMPORARY_BLOCK'))
    OR ("resolution" = 'ESCALATED_SAFETY_OR_LEGAL' AND "action" IN (
      'NO_ADDITIONAL_ACTION', 'RESTRICT_MESSAGE', 'RECORD_WARNING',
      'CONFIRM_PATIENT_DOCTOR_BLOCK', 'CONFIRM_PATIENT_CLINIC_OPERATOR_BLOCK', 'LIFT_TEMPORARY_BLOCK'
    ))
  ),
  CONSTRAINT "chat_moderation_report_decisions_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_moderation_report_decisions_report_id_fkey"
    FOREIGN KEY ("report_id") REFERENCES "chat_moderation_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_moderation_report_decisions_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_report_decisions_clinic_resolution_idx" ON "chat_moderation_report_decisions"("clinic_id", "resolution", "decided_at", "id");

CREATE TABLE "chat_conversation_blocks" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "scope" "chat_block_scope" NOT NULL,
  "status" "chat_block_status" NOT NULL DEFAULT 'PENDING_REVIEW',
  "requested_by_user_id" UUID NOT NULL,
  "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "safe_reason" VARCHAR(500),
  CONSTRAINT "chat_conversation_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_conversation_blocks_review_state_check" CHECK (
    ("status" = 'PENDING_REVIEW' AND "reviewed_by_user_id" IS NULL AND "reviewed_at" IS NULL)
    OR ("status" IN ('CONFIRMED', 'LIFTED') AND "reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
  ),
  CONSTRAINT "chat_conversation_blocks_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_conversation_blocks_conversation_id_clinic_id_fkey"
    FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_conversation_blocks_requested_by_user_id_fkey"
    FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_conversation_blocks_reviewed_by_user_id_fkey"
    FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_blocks_conversation_scope_status_idx" ON "chat_conversation_blocks"("clinic_id", "conversation_id", "scope", "status");
CREATE UNIQUE INDEX "chat_blocks_one_effective_scope_idx"
  ON "chat_conversation_blocks"("conversation_id", "scope")
  WHERE "status" IN ('PENDING_REVIEW', 'CONFIRMED');

CREATE TABLE "chat_message_moderation_actions" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" "chat_message_moderation_action" NOT NULL,
  "reason_category" "chat_moderation_reason_category",
  "safe_note" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_moderation_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_message_moderation_actions_action_check" CHECK ("action" IN ('RESTRICT_MESSAGE', 'RESTORE_MESSAGE')),
  CONSTRAINT "chat_message_moderation_actions_reason_check" CHECK (
    ("action" = 'RESTRICT_MESSAGE' AND "reason_category" IS NOT NULL)
    OR ("action" = 'RESTORE_MESSAGE' AND "reason_category" IS NULL)
  ),
  CONSTRAINT "chat_message_moderation_actions_other_note_check" CHECK (
    "reason_category" <> 'OTHER' OR char_length(trim(COALESCE("safe_note", ''))) > 0
  ),
  CONSTRAINT "chat_message_moderation_actions_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_message_moderation_actions_conversation_id_clinic_id_fkey"
    FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_message_moderation_actions_message_id_conversation_id_fkey"
    FOREIGN KEY ("message_id", "conversation_id", "clinic_id") REFERENCES "chat_messages"("id", "conversation_id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_message_moderation_actions_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_message_moderation_actions_message_created_idx" ON "chat_message_moderation_actions"("clinic_id", "message_id", "created_at", "id");

CREATE TABLE "chat_legal_holds" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "applied_by_user_id" UUID NOT NULL,
  "applied_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "released_by_user_id" UUID,
  "released_at" TIMESTAMPTZ(3),
  "safe_reason" VARCHAR(500) NOT NULL,
  CONSTRAINT "chat_legal_holds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_legal_holds_release_state_check" CHECK (
    ("released_by_user_id" IS NULL AND "released_at" IS NULL)
    OR ("released_by_user_id" IS NOT NULL AND "released_at" IS NOT NULL)
  ),
  CONSTRAINT "chat_legal_holds_safe_reason_check" CHECK (char_length(trim("safe_reason")) > 0),
  CONSTRAINT "chat_legal_holds_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_legal_holds_conversation_id_clinic_id_fkey"
    FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_legal_holds_applied_by_user_id_fkey"
    FOREIGN KEY ("applied_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_legal_holds_released_by_user_id_fkey"
    FOREIGN KEY ("released_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_legal_holds_conversation_active_idx" ON "chat_legal_holds"("clinic_id", "conversation_id", "released_at");
CREATE UNIQUE INDEX "chat_legal_holds_one_active_per_conversation_idx"
  ON "chat_legal_holds"("conversation_id") WHERE "released_at" IS NULL;

CREATE TABLE "chat_audit_events" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "action" "chat_audit_action" NOT NULL,
  "target_type" VARCHAR(80) NOT NULL,
  "target_id" UUID NOT NULL,
  "safe_category" VARCHAR(80),
  "correlation_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_audit_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_audit_events_target_type_check" CHECK (char_length(trim("target_type")) > 0),
  CONSTRAINT "chat_audit_events_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_audit_events_conversation_id_clinic_id_fkey"
    FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chat_audit_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_audit_events_conversation_created_idx" ON "chat_audit_events"("clinic_id", "conversation_id", "created_at", "id");
CREATE INDEX "chat_audit_events_clinic_action_created_idx" ON "chat_audit_events"("clinic_id", "action", "created_at", "id");

CREATE OR REPLACE FUNCTION "chat_enforce_appointment_binding"() RETURNS TRIGGER AS $$
DECLARE appointment_patient_id UUID;
DECLARE appointment_doctor_id UUID;
DECLARE appointment_visit_mode "visit_mode";
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'chat conversations are retained';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW."clinic_id" IS DISTINCT FROM OLD."clinic_id"
    OR NEW."appointment_id" IS DISTINCT FROM OLD."appointment_id"
    OR NEW."patient_id" IS DISTINCT FROM OLD."patient_id"
    OR NEW."doctor_id" IS DISTINCT FROM OLD."doctor_id"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  ) THEN
    RAISE EXCEPTION 'chat appointment binding is immutable';
  END IF;
  SELECT appointments."patient_id", appointments."doctor_id", doctor_services."visit_mode"
  INTO appointment_patient_id, appointment_doctor_id, appointment_visit_mode
  FROM "appointments" AS appointments
  INNER JOIN "doctor_services" AS doctor_services
    ON doctor_services."id" = appointments."doctor_service_id"
    AND doctor_services."clinic_id" = appointments."clinic_id"
  WHERE appointments."id" = NEW."appointment_id"
    AND appointments."clinic_id" = NEW."clinic_id";
  IF NOT FOUND OR appointment_visit_mode <> 'ONLINE'
    OR appointment_patient_id <> NEW."patient_id"
    OR appointment_doctor_id <> NEW."doctor_id" THEN
    RAISE EXCEPTION 'chat conversation requires matching online appointment';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "chat_conversations_appointment_bound" BEFORE INSERT OR UPDATE OR DELETE ON "chat_conversations"
FOR EACH ROW EXECUTE FUNCTION "chat_enforce_appointment_binding"();

CREATE OR REPLACE FUNCTION "chat_reject_message_mutation"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'chat messages are retained and immutable';
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."clinic_id" IS DISTINCT FROM OLD."clinic_id"
    OR NEW."conversation_id" IS DISTINCT FROM OLD."conversation_id"
    OR NEW."sequence" IS DISTINCT FROM OLD."sequence"
    OR NEW."sender_user_id" IS DISTINCT FROM OLD."sender_user_id"
    OR NEW."sender_kind" IS DISTINCT FROM OLD."sender_kind"
    OR NEW."client_message_id" IS DISTINCT FROM OLD."client_message_id"
    OR NEW."request_payload_hash" IS DISTINCT FROM OLD."request_payload_hash"
    OR NEW."body" IS DISTINCT FROM OLD."body"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION 'chat message identity and body are immutable';
  END IF;
  IF NEW."visibility" = 'RESTRICTED'
    AND (NEW."restricted_reason_category" IS NULL OR NEW."restricted_at" IS NULL) THEN
    RAISE EXCEPTION 'restricted chat message requires category and timestamp';
  END IF;
  IF NEW."visibility" = 'VISIBLE'
    AND (NEW."restricted_reason_category" IS NOT NULL OR NEW."restricted_at" IS NOT NULL) THEN
    RAISE EXCEPTION 'visible chat message cannot retain restriction metadata';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "chat_messages_immutable" BEFORE UPDATE OR DELETE ON "chat_messages"
FOR EACH ROW EXECUTE FUNCTION "chat_reject_message_mutation"();

CREATE OR REPLACE FUNCTION "chat_reject_immutable_history_mutation"() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'chat historical evidence is immutable';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "chat_participants_immutable" BEFORE UPDATE OR DELETE ON "chat_conversation_participants"
FOR EACH ROW EXECUTE FUNCTION "chat_reject_immutable_history_mutation"();
CREATE TRIGGER "chat_reports_immutable" BEFORE UPDATE OR DELETE ON "chat_moderation_reports"
FOR EACH ROW EXECUTE FUNCTION "chat_reject_immutable_history_mutation"();
CREATE TRIGGER "chat_report_decisions_immutable" BEFORE UPDATE OR DELETE ON "chat_moderation_report_decisions"
FOR EACH ROW EXECUTE FUNCTION "chat_reject_immutable_history_mutation"();
CREATE TRIGGER "chat_moderation_actions_immutable" BEFORE UPDATE OR DELETE ON "chat_message_moderation_actions"
FOR EACH ROW EXECUTE FUNCTION "chat_reject_immutable_history_mutation"();
CREATE TRIGGER "chat_audit_events_immutable" BEFORE UPDATE OR DELETE ON "chat_audit_events"
FOR EACH ROW EXECUTE FUNCTION "chat_reject_immutable_history_mutation"();

CREATE OR REPLACE FUNCTION "chat_enforce_monotonic_receipt"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'chat receipts are retained';
  END IF;
  IF NEW."clinic_id" IS DISTINCT FROM OLD."clinic_id"
    OR NEW."conversation_id" IS DISTINCT FROM OLD."conversation_id"
    OR NEW."user_id" IS DISTINCT FROM OLD."user_id"
    OR NEW."last_delivered_sequence" < OLD."last_delivered_sequence"
    OR NEW."last_read_sequence" < OLD."last_read_sequence" THEN
    RAISE EXCEPTION 'chat receipt identity and high-water marks are immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "chat_receipts_monotonic" BEFORE UPDATE OR DELETE ON "chat_receipts"
FOR EACH ROW EXECUTE FUNCTION "chat_enforce_monotonic_receipt"();

CREATE OR REPLACE FUNCTION "chat_enforce_block_lifecycle"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'chat blocks are retained';
  END IF;
  IF NEW."clinic_id" IS DISTINCT FROM OLD."clinic_id"
    OR NEW."conversation_id" IS DISTINCT FROM OLD."conversation_id"
    OR NEW."scope" IS DISTINCT FROM OLD."scope"
    OR NEW."requested_by_user_id" IS DISTINCT FROM OLD."requested_by_user_id"
    OR NEW."requested_at" IS DISTINCT FROM OLD."requested_at" THEN
    RAISE EXCEPTION 'chat block identity is immutable';
  END IF;
  IF (OLD."status" = 'PENDING_REVIEW' AND NEW."status" NOT IN ('PENDING_REVIEW', 'CONFIRMED', 'LIFTED'))
    OR (OLD."status" = 'CONFIRMED' AND NEW."status" NOT IN ('CONFIRMED', 'LIFTED'))
    OR (OLD."status" = 'LIFTED' AND NEW."status" <> 'LIFTED') THEN
    RAISE EXCEPTION 'invalid chat block lifecycle transition';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "chat_blocks_lifecycle" BEFORE UPDATE OR DELETE ON "chat_conversation_blocks"
FOR EACH ROW EXECUTE FUNCTION "chat_enforce_block_lifecycle"();

CREATE OR REPLACE FUNCTION "chat_enforce_legal_hold_lifecycle"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'chat legal holds are retained';
  END IF;
  IF NEW."clinic_id" IS DISTINCT FROM OLD."clinic_id"
    OR NEW."conversation_id" IS DISTINCT FROM OLD."conversation_id"
    OR NEW."applied_by_user_id" IS DISTINCT FROM OLD."applied_by_user_id"
    OR NEW."applied_at" IS DISTINCT FROM OLD."applied_at"
    OR NEW."safe_reason" IS DISTINCT FROM OLD."safe_reason" THEN
    RAISE EXCEPTION 'chat legal hold identity is immutable';
  END IF;
  IF OLD."released_at" IS NOT NULL AND (
    NEW."released_at" IS DISTINCT FROM OLD."released_at"
    OR NEW."released_by_user_id" IS DISTINCT FROM OLD."released_by_user_id"
  ) THEN
    RAISE EXCEPTION 'released chat legal hold is immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "chat_legal_holds_lifecycle" BEFORE UPDATE OR DELETE ON "chat_legal_holds"
FOR EACH ROW EXECUTE FUNCTION "chat_enforce_legal_hold_lifecycle"();
