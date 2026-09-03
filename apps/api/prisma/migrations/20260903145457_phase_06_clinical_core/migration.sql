-- CreateEnum
CREATE TYPE "encounter_state" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "clinical_record_state" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'SUPERSEDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "clinical_note_revision_state" AS ENUM ('DRAFT', 'SIGNED', 'VOIDED');

-- CreateEnum
CREATE TYPE "patient_access_action" AS ENUM ('READ', 'CREATE', 'UPDATE', 'SIGN', 'AMEND', 'PUBLISH', 'EXPORT');

-- CreateTable
CREATE TABLE "encounters" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "state" "encounter_state" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_by_user_id" UUID,
    "completed_at" TIMESTAMPTZ(3),
    "completed_by_user_id" UUID,
    "voided_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "current_revision_number" INTEGER NOT NULL DEFAULT 0,
    "current_effective_revision_number" INTEGER,
    "latest_signed_revision_number" INTEGER,
    "current_published_revision_number" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_note_revisions" (
    "id" UUID NOT NULL,
    "clinical_note_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "previous_revision_id" UUID,
    "state" "clinical_note_revision_state" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "patient_summary" TEXT,
    "amendment_reason_category" VARCHAR(100),
    "integrity_hash" CHAR(64),
    "authored_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authored_by_user_id" UUID,
    "signed_at" TIMESTAMPTZ(3),
    "signed_by_user_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "published_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_note_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "source_intake_id" UUID,
    "source_intake_revision_id" UUID,
    "source_intake_revision_number" INTEGER,
    "state" "clinical_record_state" NOT NULL DEFAULT 'DRAFT',
    "current_revision_number" INTEGER NOT NULL DEFAULT 0,
    "latest_signed_revision_number" INTEGER,
    "current_published_revision_number" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergy_records" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "source_intake_id" UUID,
    "source_intake_revision_id" UUID,
    "source_intake_revision_number" INTEGER,
    "state" "clinical_record_state" NOT NULL DEFAULT 'DRAFT',
    "current_revision_number" INTEGER NOT NULL DEFAULT 0,
    "latest_signed_revision_number" INTEGER,
    "current_published_revision_number" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "allergy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condition_records" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "source_intake_id" UUID,
    "source_intake_revision_id" UUID,
    "source_intake_revision_number" INTEGER,
    "state" "clinical_record_state" NOT NULL DEFAULT 'DRAFT',
    "current_revision_number" INTEGER NOT NULL DEFAULT 0,
    "latest_signed_revision_number" INTEGER,
    "current_published_revision_number" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "condition_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_statements" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "source_intake_id" UUID,
    "source_intake_revision_id" UUID,
    "source_intake_revision_number" INTEGER,
    "state" "clinical_record_state" NOT NULL DEFAULT 'DRAFT',
    "current_revision_number" INTEGER NOT NULL DEFAULT 0,
    "latest_signed_revision_number" INTEGER,
    "current_published_revision_number" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medication_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_access_audits" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_session_id" UUID,
    "action" "patient_access_action" NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" UUID,
    "resource_revision_id" UUID,
    "request_id" VARCHAR(128),
    "correlation_id" VARCHAR(128),
    "ip_address" INET,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_access_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "encounters_appointment_id_key" ON "encounters"("appointment_id");

-- CreateIndex
CREATE INDEX "encounters_patient_timeline_idx" ON "encounters"("clinic_id", "patient_id", "started_at", "id");

-- CreateIndex
CREATE INDEX "encounters_doctor_state_idx" ON "encounters"("clinic_id", "doctor_id", "state", "started_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_id_clinic_key" ON "encounters"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_appointment_clinic_key" ON "encounters"("appointment_id", "clinic_id");

-- CreateIndex
CREATE INDEX "clinical_notes_patient_updated_idx" ON "clinical_notes"("clinic_id", "patient_id", "updated_at", "id");

-- CreateIndex
CREATE INDEX "clinical_notes_encounter_created_idx" ON "clinical_notes"("encounter_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_notes_id_clinic_key" ON "clinical_notes"("id", "clinic_id");

-- CreateIndex
CREATE INDEX "clinical_note_revisions_note_created_idx" ON "clinical_note_revisions"("clinical_note_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_note_revisions_note_revision_key" ON "clinical_note_revisions"("clinical_note_id", "revision_number");

-- CreateIndex
CREATE INDEX "diagnoses_patient_state_updated_idx" ON "diagnoses"("clinic_id", "patient_id", "state", "updated_at", "id");

-- CreateIndex
CREATE INDEX "diagnoses_intake_source_idx" ON "diagnoses"("source_intake_id", "source_intake_revision_id");

-- CreateIndex
CREATE INDEX "allergy_records_patient_state_updated_idx" ON "allergy_records"("clinic_id", "patient_id", "state", "updated_at", "id");

-- CreateIndex
CREATE INDEX "allergy_records_intake_source_idx" ON "allergy_records"("source_intake_id", "source_intake_revision_id");

-- CreateIndex
CREATE INDEX "condition_records_patient_state_updated_idx" ON "condition_records"("clinic_id", "patient_id", "state", "updated_at", "id");

-- CreateIndex
CREATE INDEX "condition_records_intake_source_idx" ON "condition_records"("source_intake_id", "source_intake_revision_id");

-- CreateIndex
CREATE INDEX "medication_statements_patient_state_updated_idx" ON "medication_statements"("clinic_id", "patient_id", "state", "updated_at", "id");

-- CreateIndex
CREATE INDEX "medication_statements_intake_source_idx" ON "medication_statements"("source_intake_id", "source_intake_revision_id");

-- CreateIndex
CREATE INDEX "patient_access_audits_patient_created_idx" ON "patient_access_audits"("clinic_id", "patient_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "patient_access_audits_actor_created_idx" ON "patient_access_audits"("actor_user_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "patient_access_audits_resource_created_idx" ON "patient_access_audits"("resource_type", "resource_id", "created_at", "id");

-- RenameForeignKey
ALTER TABLE "appointment_holds" RENAME CONSTRAINT "appointment_holds_doctor_clinic_fkey" TO "appointment_holds_doctor_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "appointment_holds" RENAME CONSTRAINT "appointment_holds_doctor_service_clinic_fkey" TO "appointment_holds_doctor_service_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "appointments" RENAME CONSTRAINT "appointments_doctor_clinic_fkey" TO "appointments_doctor_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "appointments" RENAME CONSTRAINT "appointments_doctor_service_clinic_fkey" TO "appointments_doctor_service_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "appointments" RENAME CONSTRAINT "appointments_patient_clinic_fkey" TO "appointments_patient_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "availability_rules" RENAME CONSTRAINT "availability_rules_doctor_clinic_fkey" TO "availability_rules_doctor_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "booking_eligibility_policies" RENAME CONSTRAINT "booking_eligibility_policies_required_version_fkey" TO "booking_eligibility_policies_required_assessment_version_i_fkey";

-- RenameForeignKey
ALTER TABLE "doctor_availability_exceptions" RENAME CONSTRAINT "doctor_availability_exceptions_doctor_clinic_fkey" TO "doctor_availability_exceptions_doctor_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "doctor_services" RENAME CONSTRAINT "doctor_services_doctor_clinic_fkey" TO "doctor_services_doctor_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "doctor_services" RENAME CONSTRAINT "doctor_services_service_clinic_fkey" TO "doctor_services_service_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "doctor_specialties" RENAME CONSTRAINT "doctor_specialties_doctor_clinic_fkey" TO "doctor_specialties_doctor_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "doctor_specialties" RENAME CONSTRAINT "doctor_specialties_specialty_clinic_fkey" TO "doctor_specialties_specialty_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "operational_activities" RENAME CONSTRAINT "operational_activities_patient_clinic_fkey" TO "operational_activities_patient_id_clinic_id_fkey";

-- RenameForeignKey
ALTER TABLE "queue_entries" RENAME CONSTRAINT "queue_entries_doctor_clinic_fkey" TO "queue_entries_doctor_id_clinic_id_fkey";

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointment_id_clinic_id_fkey" FOREIGN KEY ("appointment_id", "clinic_id") REFERENCES "appointments"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_doctor_id_clinic_id_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_started_by_user_id_fkey" FOREIGN KEY ("started_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounter_id_clinic_id_fkey" FOREIGN KEY ("encounter_id", "clinic_id") REFERENCES "encounters"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_clinical_note_id_fkey" FOREIGN KEY ("clinical_note_id") REFERENCES "clinical_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_previous_revision_id_fkey" FOREIGN KEY ("previous_revision_id") REFERENCES "clinical_note_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_authored_by_user_id_fkey" FOREIGN KEY ("authored_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_signed_by_user_id_fkey" FOREIGN KEY ("signed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_encounter_id_clinic_id_fkey" FOREIGN KEY ("encounter_id", "clinic_id") REFERENCES "encounters"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_source_intake_id_fkey" FOREIGN KEY ("source_intake_id") REFERENCES "patient_medical_intakes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergy_records" ADD CONSTRAINT "allergy_records_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergy_records" ADD CONSTRAINT "allergy_records_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergy_records" ADD CONSTRAINT "allergy_records_encounter_id_clinic_id_fkey" FOREIGN KEY ("encounter_id", "clinic_id") REFERENCES "encounters"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergy_records" ADD CONSTRAINT "allergy_records_source_intake_id_fkey" FOREIGN KEY ("source_intake_id") REFERENCES "patient_medical_intakes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_records" ADD CONSTRAINT "condition_records_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_records" ADD CONSTRAINT "condition_records_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_records" ADD CONSTRAINT "condition_records_encounter_id_clinic_id_fkey" FOREIGN KEY ("encounter_id", "clinic_id") REFERENCES "encounters"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_records" ADD CONSTRAINT "condition_records_source_intake_id_fkey" FOREIGN KEY ("source_intake_id") REFERENCES "patient_medical_intakes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_statements" ADD CONSTRAINT "medication_statements_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_statements" ADD CONSTRAINT "medication_statements_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_statements" ADD CONSTRAINT "medication_statements_encounter_id_clinic_id_fkey" FOREIGN KEY ("encounter_id", "clinic_id") REFERENCES "encounters"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_statements" ADD CONSTRAINT "medication_statements_source_intake_id_fkey" FOREIGN KEY ("source_intake_id") REFERENCES "patient_medical_intakes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_access_audits" ADD CONSTRAINT "patient_access_audits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_access_audits" ADD CONSTRAINT "patient_access_audits_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_access_audits" ADD CONSTRAINT "patient_access_audits_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_access_audits" ADD CONSTRAINT "patient_access_audits_actor_session_id_fkey" FOREIGN KEY ("actor_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
