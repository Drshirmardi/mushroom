ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_source_intake_revision_id_fkey"
  FOREIGN KEY ("source_intake_revision_id") REFERENCES "patient_medical_intake_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "allergy_records" ADD CONSTRAINT "allergy_records_source_intake_revision_id_fkey"
  FOREIGN KEY ("source_intake_revision_id") REFERENCES "patient_medical_intake_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "condition_records" ADD CONSTRAINT "condition_records_source_intake_revision_id_fkey"
  FOREIGN KEY ("source_intake_revision_id") REFERENCES "patient_medical_intake_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "medication_statements" ADD CONSTRAINT "medication_statements_source_intake_revision_id_fkey"
  FOREIGN KEY ("source_intake_revision_id") REFERENCES "patient_medical_intake_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
