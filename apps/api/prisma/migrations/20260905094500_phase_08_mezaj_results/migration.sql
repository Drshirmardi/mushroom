CREATE TABLE "mezaj_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "assessment_submission_id" UUID NOT NULL,
    "result_band_snapshot" JSONB NOT NULL,
    "assessed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mezaj_results_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mezaj_results_submission_id_key" UNIQUE ("assessment_submission_id"),
    CONSTRAINT "mezaj_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mezaj_results_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mezaj_results_assessment_submission_id_fkey" FOREIGN KEY ("assessment_submission_id") REFERENCES "patient_assessment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "mezaj_results_patient_assessed_idx" ON "mezaj_results"("patient_id", "assessed_at", "id");
