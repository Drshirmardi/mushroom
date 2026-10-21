BEGIN;
-- Distinguish the local request binding from the HTTP request_id audit column.
CREATE OR REPLACE FUNCTION custom_program_plan_deferred_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version_id uuid; proof_request_id uuid; row_version custom_program_plan_versions; actor uuid; actor_session uuid;
BEGIN
 IF TG_TABLE_NAME='custom_program_plan_versions' THEN
  version_id:=NEW.id; proof_request_id:=NEW.request_id;
  IF TG_OP='INSERT' THEN actor:=NEW.created_by_user_id; actor_session:=NEW.created_session_id;
  ELSIF NEW.status='ISSUED' THEN actor:=NEW.issued_by_user_id; actor_session:=NEW.issued_session_id;
  ELSE actor:=NEW.revoked_by_user_id; actor_session:=NEW.revoked_session_id; END IF;
  IF NOT EXISTS(SELECT 1 FROM patient_access_audits a WHERE a.resource_id=version_id AND a.patient_id=NEW.patient_id AND a.clinic_id=NEW.clinic_id AND a.actor_user_id=actor AND a.actor_session_id=actor_session AND a.resource_type IN('CUSTOM_PROGRAM_PLAN_CREATE','CUSTOM_PROGRAM_PLAN_ISSUE','CUSTOM_PROGRAM_PLAN_REVOKE') AND a.xmin::text::bigint=mod(txid_current(),4294967296)) THEN RAISE EXCEPTION 'Atomic exact custom clinical actor audit required'; END IF;
 ELSE
  SELECT v.id,v.request_id INTO version_id,proof_request_id FROM custom_program_plan_versions v WHERE v.treatment_plan_id=NEW.id;
  IF version_id IS NOT NULL AND OLD.state='ACTIVE' AND NEW.state='COMPLETED' AND NOT EXISTS(SELECT 1 FROM patient_access_audits a WHERE a.resource_id=NEW.id AND a.resource_type='TREATMENT_PLAN' AND a.action='UPDATE' AND a.xmin::text::bigint=mod(txid_current(),4294967296) AND custom_program_clinician_current(proof_request_id,a.actor_user_id,a.actor_session_id)) THEN RAISE EXCEPTION 'Atomic assigned physician custom plan completion audit required'; END IF;
 END IF;
 IF version_id IS NOT NULL THEN
  FOR row_version IN SELECT v.* FROM custom_program_plan_versions v WHERE v.request_id=proof_request_id LOOP PERFORM custom_program_plan_final_proof(row_version.id); END LOOP;
 END IF;
 RETURN NULL;
END $$;
COMMIT;
