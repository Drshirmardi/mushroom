-- CreateEnum
CREATE TYPE "prescription_revision_state" AS ENUM ('DRAFT', 'ISSUED', 'VOIDED');

-- CreateEnum
CREATE TYPE "treatment_plan_state" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "treatment_task_state" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "current_revision_number" INTEGER NOT NULL DEFAULT 0,
    "current_issued_revision_number" INTEGER,
    "latest_issued_revision_number" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_revisions" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "previous_revision_id" UUID,
    "state" "prescription_revision_state" NOT NULL DEFAULT 'DRAFT',
    "amendment_reason_category" VARCHAR(100),
    "integrity_hash" CHAR(64),
    "authored_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authored_by_user_id" UUID,
    "issued_at" TIMESTAMPTZ(3),
    "issued_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" UUID NOT NULL,
    "prescription_revision_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "medication_name" VARCHAR(255) NOT NULL,
    "dose_text" VARCHAR(255),
    "frequency_text" VARCHAR(255),
    "duration_text" VARCHAR(255),
    "instructions" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_safety_acknowledgements" (
    "id" UUID NOT NULL,
    "prescription_revision_id" UUID NOT NULL,
    "rule_id" VARCHAR(128) NOT NULL,
    "classification" VARCHAR(64) NOT NULL,
    "integrity_hash" CHAR(64) NOT NULL,
    "acknowledged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_safety_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_plans" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "state" "treatment_plan_state" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_medications" (
    "id" UUID NOT NULL,
    "treatment_plan_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "dosage" VARCHAR(255),
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "instructions" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "treatment_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_plans" (
    "id" UUID NOT NULL,
    "treatment_plan_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "instructions" TEXT,
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exercise_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_plans" (
    "id" UUID NOT NULL,
    "treatment_plan_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "instructions" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nutrition_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_tasks" (
    "id" UUID NOT NULL,
    "treatment_plan_id" UUID NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "scheduled_for" TIMESTAMPTZ(3) NOT NULL,
    "state" "treatment_task_state" NOT NULL DEFAULT 'SCHEDULED',
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "treatment_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_adherence_logs" (
    "id" UUID NOT NULL,
    "treatment_medication_id" UUID NOT NULL,
    "treatment_task_id" UUID,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_adherence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_progress_events" (
    "id" UUID NOT NULL,
    "treatment_plan_id" UUID NOT NULL,
    "treatment_task_id" UUID,
    "event_type" VARCHAR(64) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_progress_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescriptions_patient_updated_idx" ON "prescriptions"("clinic_id", "patient_id", "updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_id_clinic_key" ON "prescriptions"("id", "clinic_id");

-- CreateIndex
CREATE INDEX "prescription_revisions_prescription_created_idx" ON "prescription_revisions"("prescription_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_revisions_prescription_revision_key" ON "prescription_revisions"("prescription_id", "revision_number");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_items_revision_position_key" ON "prescription_items"("prescription_revision_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_safety_acknowledgements_revision_rule_key" ON "prescription_safety_acknowledgements"("prescription_revision_id", "rule_id");

-- CreateIndex
CREATE INDEX "treatment_plans_patient_state_updated_idx" ON "treatment_plans"("clinic_id", "patient_id", "state", "updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_plans_id_clinic_key" ON "treatment_plans"("id", "clinic_id");

-- CreateIndex
CREATE INDEX "treatment_medications_plan_created_idx" ON "treatment_medications"("treatment_plan_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "treatment_tasks_plan_state_schedule_idx" ON "treatment_tasks"("treatment_plan_id", "state", "scheduled_for", "id");

-- CreateIndex
CREATE UNIQUE INDEX "medication_adherence_logs_idempotency_key" ON "medication_adherence_logs"("idempotency_key");

-- CreateIndex
CREATE INDEX "medication_adherence_logs_medication_recorded_idx" ON "medication_adherence_logs"("treatment_medication_id", "recorded_at", "id");

-- CreateIndex
CREATE INDEX "treatment_progress_events_plan_occurred_idx" ON "treatment_progress_events"("treatment_plan_id", "occurred_at", "id");

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_revisions" ADD CONSTRAINT "prescription_revisions_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_revisions" ADD CONSTRAINT "prescription_revisions_previous_revision_id_fkey" FOREIGN KEY ("previous_revision_id") REFERENCES "prescription_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_revision_id_fkey" FOREIGN KEY ("prescription_revision_id") REFERENCES "prescription_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_safety_acknowledgements" ADD CONSTRAINT "prescription_safety_acknowledgements_prescription_revision_fkey" FOREIGN KEY ("prescription_revision_id") REFERENCES "prescription_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_medications" ADD CONSTRAINT "treatment_medications_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_plans" ADD CONSTRAINT "exercise_plans_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_plans" ADD CONSTRAINT "nutrition_plans_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_tasks" ADD CONSTRAINT "treatment_tasks_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_adherence_logs" ADD CONSTRAINT "medication_adherence_logs_treatment_medication_id_fkey" FOREIGN KEY ("treatment_medication_id") REFERENCES "treatment_medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_adherence_logs" ADD CONSTRAINT "medication_adherence_logs_treatment_task_id_fkey" FOREIGN KEY ("treatment_task_id") REFERENCES "treatment_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_progress_events" ADD CONSTRAINT "treatment_progress_events_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_progress_events" ADD CONSTRAINT "treatment_progress_events_treatment_task_id_fkey" FOREIGN KEY ("treatment_task_id") REFERENCES "treatment_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
