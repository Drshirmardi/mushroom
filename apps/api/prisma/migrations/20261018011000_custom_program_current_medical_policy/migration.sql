-- Match native onboarding completion: the pinned medical-processing acceptance must
-- belong to the current active policy, not merely an unwithdrawn historical policy.
-- Previously issued patient records are deliberately independent of fresh preparation.
CREATE OR REPLACE FUNCTION custom_program_intake_current(target uuid,source_revision uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM custom_program_requests request JOIN patient_medical_intakes intake ON intake.patient_id=request.patient_id AND intake.clinic_id=request.clinic_id
 JOIN patient_medical_intake_revisions revision ON revision.intake_id=intake.id AND revision.reported_patient_id=request.patient_id JOIN patient_consent_records consent ON consent.id=revision.completed_consent_record_id AND consent.patient_id=request.patient_id
 JOIN consent_policy_versions policy ON policy.id=consent.policy_version_id AND policy.clinic_id=request.clinic_id
 WHERE request.id=target AND revision.id=source_revision AND intake.submission_state='COMPLETE' AND intake.current_revision_number=intake.completed_revision_number AND revision.revision_number=intake.completed_revision_number AND revision.revision_state='COMPLETE'
 AND revision.completed_at IS NOT NULL AND consent.withdrawn_at IS NULL AND policy.policy_key='MEDICAL_INTAKE_PROCESSING'
 AND policy.status='ACTIVE' AND policy.activated_at IS NOT NULL AND consent.content_hash=policy.content_hash);
$$;
