-- READY_EDUCATION can be approved by its scoped administrator, without a physician.
-- Keep retained definitions/hashes/purchases unchanged and preserve custom professional dependencies.
BEGIN;
ALTER TABLE program_definition_versions DROP CONSTRAINT program_definition_shape_check;
ALTER TABLE program_definition_versions ADD CONSTRAINT program_definition_shape_check CHECK (COALESCE(
 version_number>0 AND program_key ~ '^[A-Z][A-Z0-9_]{2,99}$' AND locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$'
 AND length(btrim(title))>0 AND length(btrim(summary))>0 AND length(btrim(category))>0 AND length(btrim(body)) BETWEEN 1 AND 100000 AND length(btrim(eligibility_description))>0
 AND content_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND idempotency_key ~ '^[!-~]{8,200}$'
 AND program_definition_shape(safety,content_references)
 AND ((kind='READY_EDUCATION' AND doctor_service_id IS NULL AND service_snapshot IS NULL)
   OR (kind='CUSTOM_PROFESSIONAL_PLAN' AND doctor_service_id IS NOT NULL AND jsonb_typeof(service_snapshot)='object'))
 AND ((status='DRAFT' AND approved_at IS NULL AND revoked_at IS NULL) OR (status='APPROVED' AND approved_at IS NOT NULL AND revoked_at IS NULL) OR (status='REVOKED' AND revoked_at IS NOT NULL))
 AND ((approved_at IS NULL AND approved_by_user_id IS NULL AND approved_doctor_id IS NULL AND approved_session_id IS NULL)
   OR (approved_at>=created_at AND approved_by_user_id IS NOT NULL AND (approved_doctor_id IS NOT NULL OR kind='READY_EDUCATION') AND approved_session_id IS NOT NULL))
 AND ((revoked_at IS NULL AND revoked_by_user_id IS NULL AND revoked_session_id IS NULL)
   OR (revoked_at>=COALESCE(approved_at,created_at) AND revoked_by_user_id IS NOT NULL AND revoked_session_id IS NOT NULL)),false));


CREATE FUNCTION program_definition_approval_valid(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_definition_versions p WHERE p.id=target AND p.status='APPROVED' AND
 CASE WHEN p.kind='READY_EDUCATION' AND p.approved_doctor_id IS NULL THEN
 EXISTS(SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN clinical_clinic_accesses a ON a.user_id=u.id AND a.clinic_id=p.clinic_id WHERE u.id=p.approved_by_user_id AND u.status='ACTIVE' AND r.code='ADMIN')
 ELSE guidance_doctor_id(p.approved_by_user_id,p.clinic_id)=p.approved_doctor_id END)
$$;
CREATE OR REPLACE FUNCTION program_definition_usable(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT program_definition_approval_valid(target) AND program_definition_dependencies(target)
$$;

CREATE OR REPLACE FUNCTION program_definition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; actor_session uuid; previous program_definition_versions; ref jsonb; content guidance_content_versions;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Program definition history is retained'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','approved_at','approved_by_user_id','approved_doctor_id','approved_session_id','revoked_at','revoked_by_user_id','revoked_session_id']) THEN RAISE EXCEPTION 'Program definition is immutable'; END IF;
  IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  IF OLD.status='REVOKED' OR NEW.status NOT IN('APPROVED','REVOKED') OR OLD.status=NEW.status THEN RAISE EXCEPTION 'Program lifecycle is final'; END IF;
  IF NEW.status='APPROVED' THEN actor:=NEW.approved_by_user_id; actor_session:=NEW.approved_session_id;
  ELSE actor:=NEW.revoked_by_user_id; actor_session:=NEW.revoked_session_id;
   IF ROW(NEW.approved_at,NEW.approved_by_user_id,NEW.approved_doctor_id,NEW.approved_session_id) IS DISTINCT FROM ROW(OLD.approved_at,OLD.approved_by_user_id,OLD.approved_doctor_id,OLD.approved_session_id) THEN RAISE EXCEPTION 'Program approval evidence is immutable'; END IF;
  END IF;
 ELSE
  IF NEW.status<>'DRAFT' OR NEW.approved_at IS NOT NULL OR NEW.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Program begins as draft'; END IF;
  actor:=NEW.created_by_user_id; actor_session:=NEW.created_session_id;
 END IF;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=actor_session AND s.user_id=actor AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active owned program command session required'; END IF;
 PERFORM c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.id=NEW.clinic_id AND c.status='ACTIVE' AND a.user_id=actor FOR SHARE OF c,a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active program clinic membership required'; END IF;
 IF TG_OP='INSERT' OR (NEW.kind='READY_EDUCATION' AND NEW.approved_doctor_id IS NULL) OR NEW.status='REVOKED' AND OLD.approved_at IS NULL AND guidance_doctor_id(actor,NEW.clinic_id) IS NULL THEN
  PERFORM ur.role_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=actor AND r.code='ADMIN' FOR SHARE OF ur,r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Program administrator required'; END IF;
 ELSE
  IF guidance_lock_doctor(actor,NEW.clinic_id) IS NULL OR NEW.status='APPROVED' AND guidance_doctor_id(actor,NEW.clinic_id) IS DISTINCT FROM NEW.approved_doctor_id THEN RAISE EXCEPTION 'Qualified program physician required'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.status='REVOKED' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('program-version:'||NEW.clinic_id::text||':'||NEW.program_key||':'||NEW.locale,0));
  SELECT * INTO previous FROM program_definition_versions WHERE clinic_id=NEW.clinic_id AND program_key=NEW.program_key AND locale=NEW.locale ORDER BY version_number DESC LIMIT 1;
  IF NEW.version_number<>COALESCE(previous.version_number,0)+1 OR previous.id IS NOT NULL AND previous.kind<>NEW.kind THEN RAISE EXCEPTION 'Consecutive stable program identity required'; END IF;
 END IF;
 IF NOT program_definition_shape(NEW.safety,NEW.content_references) THEN RAISE EXCEPTION 'Program safety and exact source shape required'; END IF;
 -- Legacy ready-service references remain immutable metadata, not approval dependencies.
 IF TG_OP='INSERT' OR NEW.kind='CUSTOM_PROFESSIONAL_PLAN' THEN
 FOR ref IN SELECT value FROM jsonb_array_elements(NEW.content_references) ORDER BY value->>'id' LOOP
  SELECT * INTO content FROM guidance_content_versions WHERE id=(ref->>'id')::uuid AND clinic_id=NEW.clinic_id FOR SHARE;
  IF content.id IS NULL OR content.locale<>NEW.locale OR content.content_hash<>ref->>'contentHash' OR content.status<>'APPROVED' OR guidance_lock_doctor(content.approved_by_user_id,NEW.clinic_id) IS DISTINCT FROM content.approved_doctor_id THEN RAISE EXCEPTION 'Exact approved program educational source required'; END IF;
 END LOOP;
 END IF;
 IF NEW.doctor_service_id IS NOT NULL THEN
  PERFORM ds.id FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id AND d.clinic_id=ds.clinic_id JOIN services s ON s.id=ds.service_id AND s.clinic_id=ds.clinic_id WHERE ds.id=NEW.doctor_service_id AND ds.clinic_id=NEW.clinic_id FOR SHARE OF ds,d,s;
  IF NEW.service_snapshot IS DISTINCT FROM program_definition_service_snapshot(NEW.doctor_service_id,NEW.clinic_id) OR NEW.service_snapshot IS NULL THEN RAISE EXCEPTION 'Exact published program professional service required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION program_publication_lock_definition(target uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE p program_definition_versions; ref jsonb; content guidance_content_versions;
BEGIN
 SELECT * INTO p FROM program_definition_versions WHERE id=target FOR SHARE;
 IF p.id IS NULL OR p.status<>'APPROVED' OR NOT program_definition_approval_valid(p.id) THEN RETURN false; END IF;
 IF p.approved_doctor_id IS NOT NULL AND guidance_lock_doctor(p.approved_by_user_id,p.clinic_id) IS DISTINCT FROM p.approved_doctor_id THEN RETURN false; END IF;
 IF p.kind='CUSTOM_PROFESSIONAL_PLAN' THEN
 FOR ref IN SELECT value FROM jsonb_array_elements(p.content_references) ORDER BY value->>'id' LOOP
  SELECT * INTO content FROM guidance_content_versions WHERE id=(ref->>'id')::uuid AND clinic_id=p.clinic_id FOR SHARE;
  IF content.id IS NULL OR content.status<>'APPROVED' OR content.locale<>p.locale OR content.content_hash<>ref->>'contentHash' OR guidance_lock_doctor(content.approved_by_user_id,p.clinic_id) IS DISTINCT FROM content.approved_doctor_id THEN RETURN false; END IF;
 END LOOP;
 END IF;
 IF p.doctor_service_id IS NOT NULL THEN
  PERFORM ds.id FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id AND d.clinic_id=ds.clinic_id JOIN services service ON service.id=ds.service_id AND service.clinic_id=ds.clinic_id WHERE ds.id=p.doctor_service_id AND ds.clinic_id=p.clinic_id FOR SHARE OF ds,d,service;
 END IF;
 RETURN program_definition_usable(p.id);
END $$;
COMMIT;
