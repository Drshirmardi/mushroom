-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ChatCallStatus" AS ENUM ('RINGING', 'ACTIVE', 'DECLINED', 'MISSED', 'ENDED');

-- CreateEnum
CREATE TYPE "chat_participant_kind" AS ENUM ('PATIENT', 'DOCTOR', 'CLINIC_OPERATOR');

-- CreateEnum
CREATE TYPE "chat_message_visibility" AS ENUM ('VISIBLE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "chat_moderation_reason_category" AS ENUM ('ABUSE_OR_HARASSMENT', 'THREAT_OR_SAFETY', 'SENSITIVE_DATA_EXPOSURE', 'SPAM_OR_SCAM', 'MALICIOUS_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "chat_message_moderation_action" AS ENUM ('RESTRICT_MESSAGE', 'RESTORE_MESSAGE');

-- CreateEnum
CREATE TYPE "chat_report_resolution_action" AS ENUM ('NO_ADDITIONAL_ACTION', 'RESTRICT_MESSAGE', 'RECORD_WARNING', 'CONFIRM_PATIENT_DOCTOR_BLOCK', 'CONFIRM_PATIENT_CLINIC_OPERATOR_BLOCK', 'LIFT_TEMPORARY_BLOCK');

-- CreateEnum
CREATE TYPE "chat_report_resolution" AS ENUM ('DISMISSED_NO_VIOLATION', 'UPHELD_POLICY_VIOLATION', 'INSUFFICIENT_EVIDENCE', 'ESCALATED_SAFETY_OR_LEGAL');

-- CreateEnum
CREATE TYPE "chat_block_scope" AS ENUM ('PATIENT_DOCTOR', 'PATIENT_CLINIC_OPERATOR');

-- CreateEnum
CREATE TYPE "chat_block_status" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'LIFTED');

-- CreateEnum
CREATE TYPE "chat_audit_action" AS ENUM ('MESSAGE_CREATED', 'MESSAGE_RESTRICTED', 'MESSAGE_RESTORED', 'RESTRICTED_CONTENT_REVIEWED', 'REPORT_CREATED', 'REPORT_RESOLVED', 'BLOCK_REQUESTED', 'BLOCK_CONFIRMED', 'BLOCK_LIFTED', 'LEGAL_HOLD_APPLIED', 'LEGAL_HOLD_RELEASED', 'RETENTION_DISPOSITION_ATTEMPTED');

-- CreateTable
CREATE TABLE "chat_calls" (
    "id" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "callerUserId" UUID NOT NULL,
    "callerSessionId" UUID NOT NULL,
    "callerName" TEXT NOT NULL,
    "callerKind" "chat_participant_kind" NOT NULL,
    "patientUserId" UUID NOT NULL,
    "patientSessionId" UUID,
    "status" "ChatCallStatus" NOT NULL,
    "ringsUntil" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversation_participants" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "chat_participant_kind" NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sequence" BIGINT NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "sender_kind" "chat_participant_kind" NOT NULL,
    "client_message_id" VARCHAR(128) NOT NULL,
    "request_payload_hash" CHAR(64) NOT NULL,
    "attachment" JSONB,
    "body" TEXT NOT NULL,
    "visibility" "chat_message_visibility" NOT NULL DEFAULT 'VISIBLE',
    "restricted_reason_category" "chat_moderation_reason_category",
    "restricted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_receipts" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_delivered_sequence" BIGINT NOT NULL DEFAULT 0,
    "last_read_sequence" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chat_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_moderation_reports" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "reason_category" "chat_moderation_reason_category" NOT NULL,
    "reporter_note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_moderation_report_decisions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "resolution" "chat_report_resolution" NOT NULL,
    "action" "chat_report_resolution_action" NOT NULL,
    "safe_note" VARCHAR(500),
    "decided_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_moderation_report_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "chat_conversation_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "chat_message_moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_legal_holds" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "applied_by_user_id" UUID NOT NULL,
    "applied_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_by_user_id" UUID,
    "released_at" TIMESTAMPTZ(3),
    "safe_reason" VARCHAR(500) NOT NULL,

    CONSTRAINT "chat_legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "chat_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_calls_patientUserId_status_ringsUntil_idx" ON "chat_calls"("patientUserId", "status", "ringsUntil");

-- CreateIndex
CREATE INDEX "chat_calls_appointmentId_status_idx" ON "chat_calls"("appointmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_appointment_id_key" ON "chat_conversations"("appointment_id");

-- CreateIndex
CREATE INDEX "chat_conversations_clinic_patient_created_idx" ON "chat_conversations"("clinic_id", "patient_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "chat_conversations_clinic_doctor_created_idx" ON "chat_conversations"("clinic_id", "doctor_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_id_clinic_key" ON "chat_conversations"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_appointment_clinic_key" ON "chat_conversations"("appointment_id", "clinic_id");

-- CreateIndex
CREATE INDEX "chat_conversation_participants_clinic_user_idx" ON "chat_conversation_participants"("clinic_id", "user_id", "conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversation_participants_identity_key" ON "chat_conversation_participants"("conversation_id", "user_id", "kind");

-- CreateIndex
CREATE INDEX "chat_messages_clinic_history_idx" ON "chat_messages"("clinic_id", "conversation_id", "sequence");

-- CreateIndex
CREATE INDEX "chat_messages_sender_created_at_idx" ON "chat_messages"("sender_user_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_id_conversation_clinic_key" ON "chat_messages"("id", "conversation_id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_conversation_sequence_key" ON "chat_messages"("conversation_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_idempotency_key" ON "chat_messages"("conversation_id", "sender_user_id", "client_message_id");

-- CreateIndex
CREATE INDEX "chat_receipts_clinic_user_idx" ON "chat_receipts"("clinic_id", "user_id", "conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_receipts_conversation_user_key" ON "chat_receipts"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_moderation_reports_conversation_created_idx" ON "chat_moderation_reports"("clinic_id", "conversation_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "chat_moderation_reports_message_created_idx" ON "chat_moderation_reports"("clinic_id", "message_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_moderation_reports_message_reporter_key" ON "chat_moderation_reports"("message_id", "reporter_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_moderation_report_decisions_report_id_key" ON "chat_moderation_report_decisions"("report_id");

-- CreateIndex
CREATE INDEX "chat_report_decisions_clinic_resolution_idx" ON "chat_moderation_report_decisions"("clinic_id", "resolution", "decided_at", "id");

-- CreateIndex
CREATE INDEX "chat_blocks_conversation_scope_status_idx" ON "chat_conversation_blocks"("clinic_id", "conversation_id", "scope", "status");

-- CreateIndex
CREATE INDEX "chat_message_moderation_actions_message_created_idx" ON "chat_message_moderation_actions"("clinic_id", "message_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "chat_legal_holds_conversation_active_idx" ON "chat_legal_holds"("clinic_id", "conversation_id", "released_at");

-- CreateIndex
CREATE INDEX "chat_audit_events_conversation_created_idx" ON "chat_audit_events"("clinic_id", "conversation_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "chat_audit_events_clinic_action_created_idx" ON "chat_audit_events"("clinic_id", "action", "created_at", "id");

-- AddForeignKey
ALTER TABLE "chat_conversation_participants" ADD CONSTRAINT "chat_conversation_participants_conversation_id_clinic_id_fkey" FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_clinic_id_fkey" FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_receipts" ADD CONSTRAINT "chat_receipts_conversation_id_clinic_id_fkey" FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_moderation_reports" ADD CONSTRAINT "chat_moderation_reports_conversation_id_clinic_id_fkey" FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_moderation_reports" ADD CONSTRAINT "chat_moderation_reports_message_id_conversation_id_clinic__fkey" FOREIGN KEY ("message_id", "conversation_id", "clinic_id") REFERENCES "chat_messages"("id", "conversation_id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_moderation_report_decisions" ADD CONSTRAINT "chat_moderation_report_decisions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "chat_moderation_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversation_blocks" ADD CONSTRAINT "chat_conversation_blocks_conversation_id_clinic_id_fkey" FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_moderation_actions" ADD CONSTRAINT "chat_message_moderation_actions_conversation_id_clinic_id_fkey" FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_moderation_actions" ADD CONSTRAINT "chat_message_moderation_actions_message_id_conversation_id_fkey" FOREIGN KEY ("message_id", "conversation_id", "clinic_id") REFERENCES "chat_messages"("id", "conversation_id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_legal_holds" ADD CONSTRAINT "chat_legal_holds_conversation_id_clinic_id_fkey" FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_audit_events" ADD CONSTRAINT "chat_audit_events_conversation_id_clinic_id_fkey" FOREIGN KEY ("conversation_id", "clinic_id") REFERENCES "chat_conversations"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

