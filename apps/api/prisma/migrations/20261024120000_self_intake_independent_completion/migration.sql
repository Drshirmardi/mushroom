-- Patient-authored intake is independent of a separate processing-consent workflow.
-- Keep existing records and the stronger rule for operator-authored corrections.
ALTER TABLE patient_medical_intake_revisions
 DROP CONSTRAINT patient_medical_intake_revisions_completion_check,
 ADD CONSTRAINT patient_medical_intake_revisions_completion_check CHECK (
   (revision_state = 'COMPLETE') = (completed_at IS NOT NULL)
   AND (revision_state <> 'COMPLETE' OR recording_mode = 'PATIENT_ENTRY'
        OR completed_consent_record_id IS NOT NULL)
 );
