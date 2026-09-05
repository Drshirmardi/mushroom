CREATE TYPE "HealthObservationMetric" AS ENUM ('PAIN', 'MOOD', 'SLEEP_HOURS', 'STRESS', 'ENERGY', 'WEIGHT');
CREATE TYPE "HealthObservationUnit" AS ENUM ('SCORE_10', 'SCORE_5', 'HOURS', 'KILOGRAMS');

CREATE TABLE "health_observations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "metric" "HealthObservationMetric" NOT NULL,
    "unit" "HealthObservationUnit" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "health_observations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "health_observations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "health_observations_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "health_observations_patient_metric_time_idx" ON "health_observations"("patient_id", "metric", "observed_at", "id");
CREATE INDEX "health_observations_clinic_patient_time_idx" ON "health_observations"("clinic_id", "patient_id", "observed_at", "id");
