CREATE TYPE "clinical_record_revision_state" AS ENUM ('DRAFT', 'SIGNED', 'VOIDED');

CREATE TABLE "clinical_record_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "diagnosis_id" UUID,
  "allergy_record_id" UUID,
  "condition_record_id" UUID,
  "medication_statement_id" UUID,
  "revision_number" INTEGER NOT NULL,
  "previous_revision_id" UUID,
  "state" "clinical_record_revision_state" NOT NULL DEFAULT 'DRAFT',
  "content" JSONB NOT NULL,
  "is_private" BOOLEAN NOT NULL DEFAULT true,
  "amendment_reason_category" VARCHAR(100),
  "integrity_hash" CHAR(64),
  "authored_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authored_by_user_id" UUID,
  "signed_at" TIMESTAMPTZ(3),
  "signed_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "clinical_record_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinical_record_revisions_parent_check" CHECK (num_nonnulls("diagnosis_id", "allergy_record_id", "condition_record_id", "medication_statement_id") = 1),
  CONSTRAINT "clinical_record_revisions_content_shape_check" CHECK (jsonb_typeof("content") = 'object'),
  CONSTRAINT "clinical_record_revisions_signed_integrity_check" CHECK (
    ("state" = 'SIGNED' AND "signed_at" IS NOT NULL AND "signed_by_user_id" IS NOT NULL AND "integrity_hash" IS NOT NULL)
    OR ("state" <> 'SIGNED' AND "signed_at" IS NULL AND "signed_by_user_id" IS NULL AND "integrity_hash" IS NULL)
  ),
  CONSTRAINT "clinical_record_revisions_diagnosis_id_fkey" FOREIGN KEY ("diagnosis_id") REFERENCES "diagnoses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_record_revisions_allergy_record_id_fkey" FOREIGN KEY ("allergy_record_id") REFERENCES "allergy_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_record_revisions_condition_record_id_fkey" FOREIGN KEY ("condition_record_id") REFERENCES "condition_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_record_revisions_medication_statement_id_fkey" FOREIGN KEY ("medication_statement_id") REFERENCES "medication_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_record_revisions_previous_revision_id_fkey" FOREIGN KEY ("previous_revision_id") REFERENCES "clinical_record_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_record_revisions_authored_by_user_id_fkey" FOREIGN KEY ("authored_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "clinical_record_revisions_signed_by_user_id_fkey" FOREIGN KEY ("signed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "clinical_record_revisions_diagnosis_revision_key" ON "clinical_record_revisions"("diagnosis_id", "revision_number");
CREATE UNIQUE INDEX "clinical_record_revisions_allergy_revision_key" ON "clinical_record_revisions"("allergy_record_id", "revision_number");
CREATE UNIQUE INDEX "clinical_record_revisions_condition_revision_key" ON "clinical_record_revisions"("condition_record_id", "revision_number");
CREATE UNIQUE INDEX "clinical_record_revisions_medication_revision_key" ON "clinical_record_revisions"("medication_statement_id", "revision_number");
CREATE INDEX "clinical_record_revisions_diagnosis_created_idx" ON "clinical_record_revisions"("diagnosis_id", "created_at", "id");
CREATE INDEX "clinical_record_revisions_allergy_created_idx" ON "clinical_record_revisions"("allergy_record_id", "created_at", "id");
CREATE INDEX "clinical_record_revisions_condition_created_idx" ON "clinical_record_revisions"("condition_record_id", "created_at", "id");
CREATE INDEX "clinical_record_revisions_medication_created_idx" ON "clinical_record_revisions"("medication_statement_id", "created_at", "id");
