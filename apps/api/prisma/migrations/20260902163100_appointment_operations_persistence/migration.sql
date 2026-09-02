CREATE TYPE "appointment_status" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
CREATE TYPE "appointment_status_history_action" AS ENUM ('CREATED', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'CHECKED_IN', 'QUEUED', 'STARTED', 'COMPLETED', 'NO_SHOW');

CREATE TABLE "appointments" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "doctor_service_id" UUID NOT NULL,
  "doctor_id" UUID NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "appointment_status" NOT NULL DEFAULT 'PENDING',
  "price_amount" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
  "price_captured_at" TIMESTAMPTZ(3) NOT NULL,
  "idempotency_actor_user_id" UUID,
  "idempotency_key" VARCHAR(255),
  "idempotency_request_hash" CHAR(64),
  "confirmed_at" TIMESTAMPTZ(3), "checked_in_at" TIMESTAMPTZ(3), "queued_at" TIMESTAMPTZ(3),
  "started_at" TIMESTAMPTZ(3), "completed_at" TIMESTAMPTZ(3), "cancelled_at" TIMESTAMPTZ(3), "no_show_at" TIMESTAMPTZ(3),
  "cancel_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointments_interval_check" CHECK (isfinite("starts_at") AND isfinite("ends_at") AND "starts_at" < "ends_at"),
  CONSTRAINT "appointments_price_check" CHECK ("price_amount" BETWEEN 0 AND 2147483647 AND "currency" = 'IRR'),
  CONSTRAINT "appointments_idempotency_check" CHECK (("idempotency_key" IS NULL) = ("idempotency_actor_user_id" IS NULL) AND ("idempotency_key" IS NULL) = ("idempotency_request_hash" IS NULL)),
  CONSTRAINT "appointments_cancel_reason_check" CHECK ("cancel_reason" IS NULL OR (btrim("cancel_reason") <> '' AND "cancel_reason" = btrim("cancel_reason")))
);

CREATE TABLE "appointment_holds" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "doctor_service_id" UUID NOT NULL, "doctor_id" UUID NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL, "ends_at" TIMESTAMPTZ(3) NOT NULL, "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "released_at" TIMESTAMPTZ(3), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_holds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointment_holds_interval_check" CHECK (isfinite("starts_at") AND isfinite("ends_at") AND "starts_at" < "ends_at" AND "expires_at" > "created_at")
);

CREATE TABLE "appointment_status_history" (
  "id" UUID NOT NULL, "appointment_id" UUID NOT NULL, "from_status" "appointment_status", "to_status" "appointment_status" NOT NULL,
  "action" "appointment_status_history_action" NOT NULL, "actor_user_id" UUID, "reason" VARCHAR(500), "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointment_status_history_reason_check" CHECK ("reason" IS NULL OR (btrim("reason") <> '' AND "reason" = btrim("reason")))
);

CREATE TABLE "queue_entries" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "appointment_id" UUID NOT NULL, "doctor_id" UUID NOT NULL,
  "queued_at" TIMESTAMPTZ(3) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_activities" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "appointment_id" UUID, "patient_id" UUID,
  "type" VARCHAR(100) NOT NULL, "metadata" JSONB NOT NULL DEFAULT '{}', "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "operational_activities_type_check" CHECK (btrim("type") <> '' AND "type" = btrim("type"))
);

CREATE UNIQUE INDEX "patient_profiles_id_clinic_key" ON "patient_profiles"("id", "clinic_id");
CREATE UNIQUE INDEX "doctor_services_id_clinic_key" ON "doctor_services"("id", "clinic_id");
CREATE UNIQUE INDEX "appointments_id_clinic_key" ON "appointments"("id", "clinic_id");
CREATE UNIQUE INDEX "appointments_idempotency_key" ON "appointments"("idempotency_actor_user_id", "idempotency_key");
CREATE UNIQUE INDEX "queue_entries_appointment_id_key" ON "queue_entries"("appointment_id");
CREATE INDEX "appointments_patient_list_idx" ON "appointments"("clinic_id", "patient_id", "starts_at", "id");
CREATE INDEX "appointments_doctor_schedule_idx" ON "appointments"("clinic_id", "doctor_id", "starts_at", "id");
CREATE INDEX "appointments_operations_idx" ON "appointments"("clinic_id", "status", "starts_at", "id");
CREATE INDEX "appointment_holds_capacity_idx" ON "appointment_holds"("clinic_id", "doctor_id", "starts_at", "ends_at");
CREATE INDEX "appointment_status_history_timeline_idx" ON "appointment_status_history"("appointment_id", "created_at", "id");
CREATE INDEX "queue_entries_next_idx" ON "queue_entries"("clinic_id", "doctor_id", "queued_at", "id");
CREATE INDEX "operational_activities_feed_idx" ON "operational_activities"("clinic_id", "created_at", "id");

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_clinic_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_service_clinic_fkey" FOREIGN KEY ("doctor_service_id", "clinic_id") REFERENCES "doctor_services"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_clinic_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointment_holds" ADD CONSTRAINT "appointment_holds_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointment_holds" ADD CONSTRAINT "appointment_holds_doctor_service_clinic_fkey" FOREIGN KEY ("doctor_service_id", "clinic_id") REFERENCES "doctor_services"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointment_holds" ADD CONSTRAINT "appointment_holds_doctor_clinic_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_doctor_clinic_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_activities" ADD CONSTRAINT "operational_activities_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_activities" ADD CONSTRAINT "operational_activities_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_activities" ADD CONSTRAINT "operational_activities_patient_clinic_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_active_doctor_overlap"
  EXCLUDE USING gist ("clinic_id" WITH =, "doctor_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS'));
