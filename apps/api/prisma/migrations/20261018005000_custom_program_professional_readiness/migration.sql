BEGIN;
-- A known inability to prepare the selected service must block collecting its fee.
CREATE FUNCTION custom_program_doctor_ready(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM doctor_profiles d WHERE d.id=target AND guidance_doctor_id(d.user_id,d.clinic_id)=d.id
 AND EXISTS(SELECT 1 FROM doctor_specialties ds JOIN specialties specialty ON specialty.id=ds.specialty_id AND specialty.clinic_id=ds.clinic_id WHERE ds.doctor_id=d.id AND ds.clinic_id=d.clinic_id AND specialty.is_active AND specialty.publication_status='PUBLISHED' AND specialty.published_at IS NOT NULL)
 AND (SELECT count(DISTINCT permission.permission) FROM user_roles ur JOIN roles role ON role.id=ur.role_id JOIN clinical_role_permissions permission ON permission.role_id=role.id WHERE ur.user_id=d.user_id AND role.code='DOCTOR' AND permission.permission IN('CLINICAL_RECORD_VIEW','CLINICAL_RECORD_EDIT'))=2);
$$;
CREATE FUNCTION custom_program_lock_professional(target uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE physician doctor_profiles;
BEGIN
 SELECT * INTO physician FROM doctor_profiles WHERE id=target FOR SHARE;
 IF physician.id IS NULL OR guidance_lock_doctor(physician.user_id,physician.clinic_id) IS DISTINCT FROM physician.id THEN RETURN false; END IF;
 PERFORM permission.role_id FROM user_roles ur JOIN roles role ON role.id=ur.role_id JOIN clinical_role_permissions permission ON permission.role_id=role.id WHERE ur.user_id=physician.user_id AND role.code='DOCTOR' AND permission.permission IN('CLINICAL_RECORD_VIEW','CLINICAL_RECORD_EDIT') FOR SHARE OF ur,role,permission;
 PERFORM specialty.id FROM doctor_specialties ds JOIN specialties specialty ON specialty.id=ds.specialty_id AND specialty.clinic_id=ds.clinic_id WHERE ds.doctor_id=target AND ds.clinic_id=physician.clinic_id AND specialty.is_active AND specialty.publication_status='PUBLISHED' AND specialty.published_at IS NOT NULL FOR SHARE OF ds,specialty;
 RETURN custom_program_doctor_ready(target);
END $$;
CREATE OR REPLACE FUNCTION custom_program_purchase_lock(target uuid,care_id uuid,publication_id uuid,patient uuid,scope uuid,quoted boolean) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE request custom_program_requests;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||target::text,0));
 SELECT * INTO request FROM custom_program_requests WHERE id=target AND patient_id=patient AND clinic_id=scope AND custom_program_requests.publication_id=custom_program_purchase_lock.publication_id FOR SHARE;
 IF request.id IS NULL OR NOT custom_program_lock_source(request.publication_id,NOT quoted) OR NOT custom_program_lock_professional(request.doctor_id) THEN RETURN false; END IF;
 PERFORM a.id FROM custom_program_care_authorizations a JOIN patient_consent_records c ON c.id=a.care_consent_record_id JOIN consent_policy_versions p ON p.id=c.policy_version_id WHERE a.id=care_id AND a.request_id=request.id AND a.patient_id=patient AND a.clinic_id=scope FOR SHARE OF a,c,p;
 IF NOT FOUND OR NOT custom_program_care_current(care_id) THEN RETURN false; END IF;
 RETURN CASE WHEN quoted THEN program_publication_quoted(request.publication_id) ELSE program_publication_current(request.publication_id) END;
END $$;
COMMIT;
