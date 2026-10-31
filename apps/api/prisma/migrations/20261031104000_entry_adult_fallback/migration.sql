BEGIN;
CREATE OR REPLACE FUNCTION couple_patient_is_adult(target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=target_patient AND r.birth_date IS NOT NULL)
 THEN EXISTS(SELECT 1 FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=target_patient AND r.birth_date<=((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-INTERVAL '18 years')::date)
 ELSE EXISTS(SELECT 1 FROM patient_entries e WHERE e.patient_id=target_patient AND e.birth_date<=((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-INTERVAL '18 years')::date) END
$$;
COMMIT;
