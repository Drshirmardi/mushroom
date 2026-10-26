BEGIN;
-- Match existing native medical writes: active policy before intake/consent rows. No new eligibility rule.
CREATE OR REPLACE FUNCTION custom_program_plan_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request custom_program_requests; native treatment_plans; actor uuid; actor_session uuid; current_version integer;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Custom native clinical version is retained evidence'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||NEW.request_id::text,0));
 SELECT * INTO request FROM custom_program_requests WHERE id=NEW.request_id;
 SELECT * INTO native FROM treatment_plans WHERE id=NEW.treatment_plan_id FOR UPDATE;
 IF request.id IS NULL OR request.patient_id<>NEW.patient_id OR request.clinic_id<>NEW.clinic_id OR native.id IS NULL OR native.patient_id<>NEW.patient_id OR native.clinic_id<>NEW.clinic_id OR NEW.content_hash IS DISTINCT FROM custom_program_native_hash(native.id) THEN RAISE EXCEPTION 'Exact owned native clinical content required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'DRAFT' OR native.state<>'DRAFT' OR NOT EXISTS(SELECT 1 FROM treatment_plans p WHERE p.id=native.id AND p.xmin::text::bigint=mod(txid_current(),4294967296)) OR EXISTS(SELECT 1 FROM treatment_tasks WHERE treatment_plan_id=native.id) THEN RAISE EXCEPTION 'New native draft in the exact custom preparation transaction required'; END IF;
  SELECT COALESCE(max(version_number),0) INTO current_version FROM custom_program_plan_versions WHERE request_id=NEW.request_id;
  IF NEW.version_number<>current_version+1 OR abs(extract(epoch FROM (NEW.created_at-GREATEST(CURRENT_TIMESTAMP,request.created_at))))>1 THEN RAISE EXCEPTION 'Consecutive custom clinical version and database time required'; END IF;
  actor:=NEW.created_by_user_id; actor_session:=NEW.created_session_id;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['status','issued_at','issued_by_user_id','issued_session_id','revoked_at','revoked_by_user_id','revoked_session_id','revocation_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','issued_at','issued_by_user_id','issued_session_id','revoked_at','revoked_by_user_id','revoked_session_id','revocation_reason']) THEN RAISE EXCEPTION 'Custom clinical source/author/content binding is immutable'; END IF;
  IF OLD.status='DRAFT' AND NEW.status='ISSUED' THEN
   IF NEW.version_number<>(SELECT max(version_number) FROM custom_program_plan_versions WHERE request_id=NEW.request_id) OR native.state<>'DRAFT' OR abs(extract(epoch FROM (NEW.issued_at-GREATEST(CURRENT_TIMESTAMP,NEW.created_at))))>1 THEN RAISE EXCEPTION 'Only exact latest reviewed custom draft may issue'; END IF;
   actor:=NEW.issued_by_user_id; actor_session:=NEW.issued_session_id;
  ELSIF OLD.status IN('DRAFT','ISSUED') AND NEW.status='REVOKED' THEN
   IF ROW(NEW.issued_at,NEW.issued_by_user_id,NEW.issued_session_id) IS DISTINCT FROM ROW(OLD.issued_at,OLD.issued_by_user_id,OLD.issued_session_id) OR abs(extract(epoch FROM (NEW.revoked_at-GREATEST(CURRENT_TIMESTAMP,NEW.created_at,NEW.issued_at))))>1 THEN RAISE EXCEPTION 'Final exact custom clinical revocation required'; END IF;
   actor:=NEW.revoked_by_user_id; actor_session:=NEW.revoked_session_id;
  ELSE RAISE EXCEPTION 'Custom clinical version cannot be edited, reset or reissued'; END IF;
 END IF;
 IF NOT custom_program_lock_clinician(NEW.request_id,actor,actor_session) THEN RAISE EXCEPTION 'Current assigned qualified paid care physician required'; END IF;
 IF NEW.status<>'REVOKED' THEN
  PERFORM a.id FROM custom_program_care_authorizations a WHERE a.id=NEW.care_authorization_id AND a.request_id=NEW.request_id AND custom_program_care_current(a.id) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exact current pinned custom care authorization required'; END IF;
  PERFORM p.id FROM consent_policy_versions p WHERE p.clinic_id=request.clinic_id AND p.policy_key='MEDICAL_INTAKE_PROCESSING' AND p.status='ACTIVE' ORDER BY p.id FOR SHARE;
  PERFORM revision.id FROM patient_medical_intake_revisions revision JOIN patient_medical_intakes intake ON intake.id=revision.intake_id JOIN patient_consent_records consent ON consent.id=revision.completed_consent_record_id WHERE revision.id=NEW.source_intake_revision_id FOR SHARE OF revision,intake,consent;
  IF NOT custom_program_intake_current(NEW.request_id,NEW.source_intake_revision_id) THEN RAISE EXCEPTION 'Exact current completed self-reported intake and processing consent required'; END IF;
 END IF;
 RETURN NEW;
END $$;
COMMIT;
