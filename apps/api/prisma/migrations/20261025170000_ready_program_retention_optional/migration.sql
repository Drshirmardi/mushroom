-- Owner-approved: no retention-reference input for ready Mezaj text services.
-- Historical references remain unchanged; no replacement reference or policy is invented.
BEGIN;
ALTER TABLE program_offering_publications ALTER COLUMN retention_policy_ref DROP NOT NULL;
ALTER TABLE program_offering_publications DROP CONSTRAINT program_publication_shape_check;
ALTER TABLE program_offering_publications ADD CONSTRAINT program_publication_shape_check CHECK(COALESCE(
 publication_number>0 AND program_key ~ '^[A-Z][A-Z0-9_]{2,99}$' AND locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$'
 AND amount_rial BETWEEN 0 AND 9000000000000000000 AND currency='IRR' AND quote_ttl_seconds BETWEEN 60 AND 86400
 AND ((access_mode='DAYS' AND access_duration_days BETWEEN 1 AND 3650) OR (access_mode IN('PERPETUAL','ONE_DELIVERY') AND access_duration_days IS NULL))
 AND (retention_policy_ref IS NULL OR retention_policy_ref ~ '^[A-Za-z0-9._:-]{1,80}$') AND definition_content_hash ~ '^[a-f0-9]{64}$' AND terms_content_hash ~ '^[a-f0-9]{64}$' AND publication_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$'
 AND idempotency_key ~ '^[!-~]{8,200}$' AND policy_snapshot='{"schemaVersion":1,"ordinaryRefunds":false,"paymentPoint":"PRE_ACCESS_OR_REQUEST"}'::jsonb
 AND ((status='ACTIVE' AND retired_at IS NULL AND retired_by_user_id IS NULL AND retired_session_id IS NULL AND retirement_reason IS NULL)
  OR (status='RETIRED' AND retired_at>=created_at AND retired_by_user_id IS NOT NULL AND retired_session_id IS NOT NULL AND retirement_reason IN('REPLACED','MANUAL'))),false));

CREATE OR REPLACE FUNCTION program_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; actor_session uuid; definition program_definition_versions; terms consent_policy_versions; previous program_offering_publications;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Program commercial history is retained'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['status','retired_at','retired_by_user_id','retired_session_id','retirement_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','retired_at','retired_by_user_id','retired_session_id','retirement_reason']) THEN RAISE EXCEPTION 'Program commercial snapshot is immutable'; END IF;
  IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  IF OLD.status<>'ACTIVE' OR NEW.status<>'RETIRED' THEN RAISE EXCEPTION 'Program commercial retirement is final'; END IF;
  actor:=NEW.retired_by_user_id;actor_session:=NEW.retired_session_id;
 ELSE
  IF NEW.status<>'ACTIVE' OR NEW.retired_at IS NOT NULL THEN RAISE EXCEPTION 'Program commercial publication begins active'; END IF;
  actor:=NEW.published_by_user_id;actor_session:=NEW.published_session_id;
 END IF;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=actor_session AND s.user_id=actor AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active owned program publication session required'; END IF;
 PERFORM c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.id=NEW.clinic_id AND c.status='ACTIVE' AND a.user_id=actor FOR SHARE OF c,a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active program publication clinic membership required'; END IF;
 PERFORM ur.role_id FROM user_roles ur JOIN roles role ON role.id=ur.role_id WHERE ur.user_id=actor AND role.code='ADMIN' FOR SHARE OF ur,role;
 IF NOT FOUND THEN RAISE EXCEPTION 'Actual program publication administrator required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||NEW.clinic_id::text||':'||NEW.program_key||':'||NEW.locale,0));
 IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
 IF NOT program_publication_lock_definition(NEW.program_definition_id) THEN RAISE EXCEPTION 'Current exact reviewed program definition required'; END IF;
 SELECT * INTO definition FROM program_definition_versions WHERE id=NEW.program_definition_id AND clinic_id=NEW.clinic_id;
 IF definition.id IS NULL OR definition.program_key<>NEW.program_key OR definition.locale<>NEW.locale OR definition.content_hash<>NEW.definition_content_hash THEN RAISE EXCEPTION 'Exact scoped program identity required'; END IF;
 IF NOT ((definition.kind='READY_EDUCATION' AND NEW.access_mode IN('DAYS','PERPETUAL')) OR (definition.kind='CUSTOM_PROFESSIONAL_PLAN' AND NEW.access_mode='ONE_DELIVERY')) THEN RAISE EXCEPTION 'Supported program access period required'; END IF;
 IF definition.kind='CUSTOM_PROFESSIONAL_PLAN' AND NEW.retention_policy_ref IS NULL THEN RAISE EXCEPTION 'Professional service retention reference required'; END IF;
 IF definition.kind='CUSTOM_PROFESSIONAL_PLAN' AND NOT EXISTS(SELECT 1 FROM doctor_services WHERE id=definition.doctor_service_id AND clinic_id=NEW.clinic_id AND currency='IRR' AND price_amount=NEW.amount_rial) THEN RAISE EXCEPTION 'Exact current professional service price required'; END IF;
 SELECT * INTO terms FROM consent_policy_versions WHERE id=NEW.terms_policy_version_id AND clinic_id=NEW.clinic_id FOR SHARE;
 IF terms.id IS NULL OR terms.policy_key<>'PROGRAM_PURCHASE_TERMS' OR terms.locale<>NEW.locale OR terms.status<>'ACTIVE' OR terms.activated_at IS NULL OR terms.content_hash<>NEW.terms_content_hash THEN RAISE EXCEPTION 'Exact active program purchase terms required'; END IF;
 SELECT * INTO previous FROM program_offering_publications WHERE clinic_id=NEW.clinic_id AND program_key=NEW.program_key AND locale=NEW.locale ORDER BY publication_number DESC LIMIT 1;
 IF NEW.publication_number<>COALESCE(previous.publication_number,0)+1 OR previous.id IS NOT NULL AND (previous.status<>'RETIRED' OR NEW.created_at<previous.retired_at) THEN RAISE EXCEPTION 'Consecutive immutable program commercial revision required'; END IF;
 RETURN NEW;
END $$;
COMMIT;
