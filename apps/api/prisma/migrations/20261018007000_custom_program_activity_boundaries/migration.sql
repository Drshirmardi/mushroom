BEGIN;
-- Current native state and operational provenance stay distinct from immutable clinical advice.
CREATE OR REPLACE FUNCTION custom_program_activity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; old_target uuid; version custom_program_plan_versions;
BEGIN
 IF TG_TABLE_NAME='medication_adherence_logs' THEN
  IF TG_OP='DELETE' THEN SELECT treatment_plan_id INTO target FROM treatment_medications WHERE id=OLD.treatment_medication_id;
  ELSE SELECT treatment_plan_id INTO target FROM treatment_medications WHERE id=NEW.treatment_medication_id; END IF;
  IF TG_OP='UPDATE' THEN SELECT treatment_plan_id INTO old_target FROM treatment_medications WHERE id=OLD.treatment_medication_id; END IF;
 ELSE
  IF TG_OP='DELETE' THEN target:=OLD.treatment_plan_id; ELSE target:=NEW.treatment_plan_id; END IF;
  IF TG_OP='UPDATE' THEN old_target:=OLD.treatment_plan_id; END IF;
 END IF;
 SELECT * INTO version FROM custom_program_plan_versions WHERE treatment_plan_id=target OR treatment_plan_id=old_target LIMIT 1;
 IF version.id IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('custom-program-request:'||version.request_id::text,0));
 IF TG_OP='DELETE' OR TG_TABLE_NAME<>'treatment_tasks' AND TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Bound custom activity history is retained immutable evidence'; END IF;
 IF TG_TABLE_NAME='treatment_tasks' THEN
  IF TG_OP='INSERT' THEN
   IF NOT custom_program_native_effective(target) OR NOT EXISTS(SELECT 1 FROM treatment_plans p WHERE p.id=target AND p.state='ACTIVE') OR NEW.state<>'SCHEDULED' OR NEW.completed_at IS NOT NULL OR NEW.scheduled_for<=CURRENT_TIMESTAMP THEN RAISE EXCEPTION 'Current issued custom plan/future scheduled task required'; END IF;
  ELSE
   IF OLD.state<>'SCHEDULED' OR NEW.state NOT IN('SCHEDULED','COMPLETED','CANCELLED') OR (to_jsonb(NEW)-ARRAY['state','scheduled_for','completed_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','scheduled_for','completed_at','updated_at']) THEN RAISE EXCEPTION 'Final exact custom task transition required'; END IF;
   IF NEW.state='COMPLETED' AND (NEW.completed_at IS NULL OR NEW.scheduled_for<>OLD.scheduled_for OR abs(extract(epoch FROM (NEW.completed_at-CURRENT_TIMESTAMP)))>1) OR NEW.state<>'COMPLETED' AND NEW.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Exact database custom task completion evidence required'; END IF;
   IF NOT custom_program_native_effective(target) AND NOT (NEW.state='CANCELLED' AND ((version.status='REVOKED') OR EXISTS(SELECT 1 FROM custom_program_plan_versions n WHERE n.request_id=version.request_id AND n.version_number>version.version_number AND n.status='ISSUED'))) THEN RAISE EXCEPTION 'Only effective or finally superseded/revoked custom task operation allowed'; END IF;
  END IF;
 ELSE
  IF NOT custom_program_native_effective(target) THEN RAISE EXCEPTION 'Current issued own custom activity required'; END IF;
  IF TG_TABLE_NAME='medication_adherence_logs' THEN
   IF abs(extract(epoch FROM (NEW.recorded_at-CURRENT_TIMESTAMP)))>1 OR (NEW.treatment_task_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM treatment_tasks t WHERE t.id=NEW.treatment_task_id AND t.treatment_plan_id=target AND t.kind='MEDICATION' AND t.state<>'CANCELLED')) THEN RAISE EXCEPTION 'Exact own custom medication/task and database adherence clock required'; END IF;
  ELSIF TG_TABLE_NAME='treatment_progress_events' THEN
   IF NEW.event_type='TASK_COMPLETED' THEN
    IF NEW.metadata IS DISTINCT FROM '{"source":"TREATMENT_TASK"}'::jsonb OR NOT EXISTS(SELECT 1 FROM treatment_tasks t WHERE t.id=NEW.treatment_task_id AND t.treatment_plan_id=target AND t.state='COMPLETED' AND NEW.occurred_at=t.completed_at AND t.xmin::text::bigint=mod(txid_current(),4294967296)) THEN RAISE EXCEPTION 'Exact current transaction custom task progress required'; END IF;
   ELSIF NEW.event_type='MEDICATION_ADHERENCE_RECORDED' THEN
    IF NEW.metadata IS DISTINCT FROM '{"source":"MEDICATION_ADHERENCE"}'::jsonb OR NOT EXISTS(SELECT 1 FROM medication_adherence_logs l JOIN treatment_medications m ON m.id=l.treatment_medication_id WHERE m.treatment_plan_id=target AND l.treatment_task_id IS NOT DISTINCT FROM NEW.treatment_task_id AND NEW.occurred_at=l.recorded_at AND l.xmin::text::bigint=mod(txid_current(),4294967296)) THEN RAISE EXCEPTION 'Exact current transaction custom adherence progress required'; END IF;
   ELSE RAISE EXCEPTION 'Supported exact custom progress provenance required'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
COMMIT;
