ALTER TABLE "encounters" ADD CONSTRAINT "encounters_state_timestamps_check" CHECK (
  ("state" = 'IN_PROGRESS' AND "completed_at" IS NULL AND "voided_at" IS NULL)
  OR ("state" = 'COMPLETED' AND "completed_at" IS NOT NULL AND "voided_at" IS NULL AND "completed_at" >= "started_at")
  OR ("state" = 'VOIDED' AND "voided_at" IS NOT NULL)
);

ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_signed_integrity_check" CHECK (
  ("state" = 'SIGNED' AND "signed_at" IS NOT NULL AND "signed_by_user_id" IS NOT NULL AND "integrity_hash" IS NOT NULL)
  OR ("state" <> 'SIGNED' AND "signed_at" IS NULL AND "signed_by_user_id" IS NULL AND "integrity_hash" IS NULL)
);
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_patient_publication_check" CHECK (
  "published_at" IS NULL OR ("published_by_user_id" IS NOT NULL AND "patient_summary" IS NOT NULL AND btrim("patient_summary") <> '')
);
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_content_check" CHECK (btrim("content") <> '');

ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_source_reference_check" CHECK (
  ("source_intake_id" IS NULL AND "source_intake_revision_id" IS NULL AND "source_intake_revision_number" IS NULL)
  OR ("source_intake_id" IS NOT NULL AND "source_intake_revision_id" IS NOT NULL AND "source_intake_revision_number" IS NOT NULL AND "source_intake_revision_number" > 0)
);
ALTER TABLE "allergy_records" ADD CONSTRAINT "allergy_records_source_reference_check" CHECK (
  ("source_intake_id" IS NULL AND "source_intake_revision_id" IS NULL AND "source_intake_revision_number" IS NULL)
  OR ("source_intake_id" IS NOT NULL AND "source_intake_revision_id" IS NOT NULL AND "source_intake_revision_number" IS NOT NULL AND "source_intake_revision_number" > 0)
);
ALTER TABLE "condition_records" ADD CONSTRAINT "condition_records_source_reference_check" CHECK (
  ("source_intake_id" IS NULL AND "source_intake_revision_id" IS NULL AND "source_intake_revision_number" IS NULL)
  OR ("source_intake_id" IS NOT NULL AND "source_intake_revision_id" IS NOT NULL AND "source_intake_revision_number" IS NOT NULL AND "source_intake_revision_number" > 0)
);
ALTER TABLE "medication_statements" ADD CONSTRAINT "medication_statements_source_reference_check" CHECK (
  ("source_intake_id" IS NULL AND "source_intake_revision_id" IS NULL AND "source_intake_revision_number" IS NULL)
  OR ("source_intake_id" IS NOT NULL AND "source_intake_revision_id" IS NOT NULL AND "source_intake_revision_number" IS NOT NULL AND "source_intake_revision_number" > 0)
);

ALTER TABLE "patient_access_audits" ADD CONSTRAINT "patient_access_audits_safe_shape_check" CHECK (
  btrim("resource_type") <> '' AND jsonb_typeof("metadata") = 'object'
);
