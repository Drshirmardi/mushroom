-- Fixed owner-approved terms for ready services; historical/custom contracts remain intact.
BEGIN;

CREATE OR REPLACE FUNCTION program_publication_current(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_offering_publications p JOIN program_definition_versions d ON d.id=p.program_definition_id AND d.clinic_id=p.clinic_id
  JOIN consent_policy_versions terms ON terms.id=p.terms_policy_version_id AND terms.clinic_id=p.clinic_id
  WHERE p.id=target AND p.status='ACTIVE' AND p.program_key=d.program_key AND p.locale=d.locale AND p.definition_content_hash=d.content_hash AND program_definition_usable(d.id)
  AND p.publication_number=(SELECT max(publication_number) FROM program_offering_publications WHERE clinic_id=p.clinic_id AND program_key=p.program_key AND locale=p.locale)
  AND (terms.policy_key='PROGRAM_PURCHASE_TERMS' OR (terms.policy_key='READY_PROGRAM_PURCHASE_TERMS' AND d.kind='READY_EDUCATION' AND p.access_mode='PERPETUAL')) AND terms.locale=p.locale AND terms.content_hash=p.terms_content_hash AND terms.status='ACTIVE' AND terms.activated_at IS NOT NULL
  AND ((d.kind='READY_EDUCATION' AND p.access_mode IN('DAYS','PERPETUAL')) OR (d.kind='CUSTOM_PROFESSIONAL_PLAN' AND p.access_mode='ONE_DELIVERY' AND EXISTS(SELECT 1 FROM doctor_services ds WHERE ds.id=d.doctor_service_id AND ds.clinic_id=p.clinic_id AND ds.currency='IRR' AND ds.price_amount=p.amount_rial))))
$$;

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
 IF terms.id IS NULL OR NOT (terms.policy_key='PROGRAM_PURCHASE_TERMS' OR (terms.policy_key='READY_PROGRAM_PURCHASE_TERMS' AND definition.kind='READY_EDUCATION' AND NEW.access_mode='PERPETUAL')) OR terms.locale<>NEW.locale OR terms.status<>'ACTIVE' OR terms.activated_at IS NULL OR terms.content_hash<>NEW.terms_content_hash THEN RAISE EXCEPTION 'Exact active program purchase terms required'; END IF;
 SELECT * INTO previous FROM program_offering_publications WHERE clinic_id=NEW.clinic_id AND program_key=NEW.program_key AND locale=NEW.locale ORDER BY publication_number DESC LIMIT 1;
 IF NEW.publication_number<>COALESCE(previous.publication_number,0)+1 OR previous.id IS NOT NULL AND (previous.status<>'RETIRED' OR NEW.created_at<previous.retired_at) THEN RAISE EXCEPTION 'Consecutive immutable program commercial revision required'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION program_publication_quoted(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_offering_publications pub JOIN program_definition_versions d ON d.id=pub.program_definition_id AND d.clinic_id=pub.clinic_id
 JOIN consent_policy_versions t ON t.id=pub.terms_policy_version_id AND t.clinic_id=pub.clinic_id
 WHERE pub.id=target AND (pub.status='ACTIVE' OR (pub.status='RETIRED' AND pub.retirement_reason='REPLACED'))
 AND (d.kind='READY_EDUCATION' OR (d.kind='CUSTOM_PROFESSIONAL_PLAN' AND pub.access_mode='ONE_DELIVERY')) AND d.content_hash=pub.definition_content_hash AND program_definition_usable(d.id)
 AND ((d.kind='READY_EDUCATION' AND pub.access_mode IN('DAYS','PERPETUAL')) OR (d.kind='CUSTOM_PROFESSIONAL_PLAN' AND pub.access_mode='ONE_DELIVERY')) AND (t.policy_key='PROGRAM_PURCHASE_TERMS' OR (t.policy_key='READY_PROGRAM_PURCHASE_TERMS' AND d.kind='READY_EDUCATION' AND pub.access_mode='PERPETUAL')) AND t.locale=pub.locale AND t.status='ACTIVE' AND t.activated_at IS NOT NULL AND t.content_hash=pub.terms_content_hash);
$$;

CREATE OR REPLACE FUNCTION program_commercial_consent_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy consent_policy_versions; old_key text;
BEGIN
 IF TG_OP='DELETE' THEN SELECT * INTO policy FROM consent_policy_versions WHERE id=OLD.policy_version_id;
 ELSE SELECT * INTO policy FROM consent_policy_versions WHERE id=NEW.policy_version_id FOR SHARE; END IF;
 IF TG_OP='UPDATE' THEN SELECT policy_key INTO old_key FROM consent_policy_versions WHERE id=OLD.policy_version_id; END IF;
 IF COALESCE(policy.policy_key,'') NOT IN ('PROGRAM_PURCHASE_TERMS','READY_PROGRAM_PURCHASE_TERMS') AND COALESCE(old_key,'') NOT IN ('PROGRAM_PURCHASE_TERMS','READY_PROGRAM_PURCHASE_TERMS') THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' OR TG_OP='UPDATE' THEN RAISE EXCEPTION 'Program commercial acceptance is retained immutable evidence'; END IF;
 IF policy.status<>'ACTIVE' OR policy.activated_at IS NULL OR policy.content_hash<>NEW.content_hash OR NEW.source<>'PATIENT_APP' OR NEW.withdrawn_at IS NOT NULL OR COALESCE(NEW.acceptance_idempotency_key,'') !~ '^[!-~]{1,200}$' THEN RAISE EXCEPTION 'Explicit exact active program terms required'; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN sessions s ON s.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
 WHERE p.id=NEW.patient_id AND p.clinic_id=policy.clinic_id AND u.id=NEW.accepted_by_user_id AND s.id=NEW.accepted_by_session_id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,s,ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current independent program terms identity/session required'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION ready_program_terms_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' AND OLD.policy_key='READY_PROGRAM_PURCHASE_TERMS' THEN RAISE EXCEPTION 'Fixed ready service terms are immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.policy_key='READY_PROGRAM_PURCHASE_TERMS' THEN
  IF TG_OP<>'INSERT' OR NEW.version_number<>1 OR NEW.locale<>'fa-IR' OR NEW.status<>'ACTIVE' OR NEW.activated_at IS NULL OR NEW.retired_at IS NOT NULL
   OR NEW.title<>'شرایط خرید خدمات اختصاصی مزاج' OR NEW.body<>'با خرید این خدمت، محتوای معرفی‌شده در عنوان و توضیحات آن به حساب شما اضافه می‌شود و بدون محدودیت زمانی برای مطالعهٔ دوباره به آن دسترسی خواهید داشت.' OR NEW.content_hash<>'819c411c336cdd24a7b5e31f9f81a1a963a6ef05ea7d12f4275eb37533ed1a07' THEN RAISE EXCEPTION 'Exact fixed ready service terms required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ready_program_terms_guard BEFORE INSERT OR UPDATE OR DELETE ON consent_policy_versions FOR EACH ROW EXECUTE FUNCTION ready_program_terms_guard();
COMMIT;
