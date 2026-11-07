BEGIN;

CREATE OR REPLACE FUNCTION program_service_capture_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE service program_services; previous program_mezaj_presentations; configured_pairs text[];
BEGIN
 SELECT * INTO service FROM program_services WHERE clinic_id=NEW.clinic_id AND program_key=NEW.program_key AND locale=NEW.locale FOR UPDATE;
 IF NOT FOUND THEN RETURN NEW; END IF;
 SELECT * INTO previous FROM program_mezaj_presentations WHERE program_definition_id=service.published_definition_id;
 IF service.draft ? 'pairs' AND jsonb_typeof(service.draft->'pairs')='array' THEN
   SELECT COALESCE(array_agg(value),'{}'::text[]) INTO configured_pairs FROM jsonb_array_elements_text(service.draft->'pairs');
   INSERT INTO program_mezaj_presentations(program_definition_id,clinic_id,icon,pairs,enabled,revision)
   VALUES(NEW.program_definition_id,NEW.clinic_id,COALESCE(previous.icon,'book'),configured_pairs,cardinality(configured_pairs)>0,1)
   ON CONFLICT(program_definition_id) DO UPDATE SET pairs=EXCLUDED.pairs,enabled=EXCLUDED.enabled,revision=program_mezaj_presentations.revision+1
   WHERE (program_mezaj_presentations.pairs,program_mezaj_presentations.enabled) IS DISTINCT FROM (EXCLUDED.pairs,EXCLUDED.enabled);
 ELSIF previous.program_definition_id IS NOT NULL THEN
   INSERT INTO program_mezaj_presentations(program_definition_id,clinic_id,icon,pairs,enabled,revision)
   VALUES(NEW.program_definition_id,NEW.clinic_id,previous.icon,previous.pairs,previous.enabled,1)
   ON CONFLICT(program_definition_id) DO NOTHING;
 END IF;
 UPDATE program_services SET published_definition_id=NEW.program_definition_id,selling_enabled=(archived_at IS NULL),base_amount_rial=NEW.amount_rial,revision=revision+1 WHERE id=service.id;
 RETURN NEW;
END $$;

CREATE FUNCTION program_lock_service_purchase(patient uuid,definition uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE d program_definition_versions;
BEGIN
 SELECT * INTO d FROM program_definition_versions WHERE id=definition;
 IF d.kind='READY_EDUCATION' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('program-service-purchase:'||patient::text||':'||d.clinic_id::text||':'||d.program_key||':'||d.locale,0));
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended('program-purchase:'||patient::text||':'||definition::text,0));
 END IF;
END $$;

CREATE FUNCTION program_service_has_grant(patient uuid,definition uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_access_grants g JOIN program_purchases p ON p.id=g.purchase_id
 JOIN program_definition_versions historical ON historical.id=p.program_definition_id
 JOIN program_definition_versions target ON target.id=definition AND historical.clinic_id=target.clinic_id
 AND historical.program_key=target.program_key AND historical.locale=target.locale
 WHERE p.custom_request_id IS NULL AND g.patient_id=patient AND (g.ends_at IS NULL OR g.ends_at>CURRENT_TIMESTAMP))
$$;

CREATE OR REPLACE FUNCTION program_has_live_purchase(target_patient uuid,definition_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_purchases p JOIN billing_intents i ON i.program_purchase_id=p.id
 JOIN program_definition_versions historical ON historical.id=p.program_definition_id
 JOIN program_definition_versions target ON target.id=definition_id AND historical.clinic_id=target.clinic_id
 AND historical.program_key=target.program_key AND historical.locale=target.locale
 LEFT JOIN program_access_grants g ON g.purchase_id=p.id
 WHERE p.custom_request_id IS NULL AND p.patient_id=target_patient AND (
 (i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP) OR (i.status='PAID' AND g.id IS NOT NULL AND (g.ends_at IS NULL OR g.ends_at>CURRENT_TIMESTAMP))))
$$;

CREATE FUNCTION program_service_lock_current(definition uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE current_id uuid;
BEGIN
 SELECT s.published_definition_id INTO current_id FROM program_services s JOIN program_definition_versions historical
 ON historical.clinic_id=s.clinic_id AND historical.program_key=s.program_key AND historical.locale=s.locale
 WHERE historical.id=definition AND historical.kind='READY_EDUCATION' FOR SHARE OF s;
 IF current_id IS NULL THEN RETURN false; END IF;
 RETURN program_publication_lock_definition(current_id);
END $$;

ALTER FUNCTION program_publication_quoted(uuid) RENAME TO program_publication_quote_before_service;
CREATE FUNCTION program_publication_quoted(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT program_publication_quote_before_service(target) AND EXISTS (
 SELECT 1 FROM program_offering_publications p JOIN program_definition_versions d ON d.id=p.program_definition_id
 WHERE p.id=target AND (d.kind<>'READY_EDUCATION' OR EXISTS (
 SELECT 1 FROM program_services s WHERE s.clinic_id=d.clinic_id AND s.program_key=d.program_key AND s.locale=d.locale
 AND program_definition_usable(s.published_definition_id))))
$$;


CREATE OR REPLACE FUNCTION program_purchase_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pub program_offering_publications; definition program_definition_versions;
BEGIN

 IF NEW.custom_request_id IS NOT NULL THEN
  PERFORM program_lock_service_purchase(NEW.patient_id,NEW.program_definition_id);
  IF NOT custom_program_purchase_lock(NEW.custom_request_id,NEW.care_authorization_id,NEW.publication_id,NEW.patient_id,NEW.clinic_id,false) OR custom_program_request_live_purchase(NEW.custom_request_id) THEN RAISE EXCEPTION 'Current exact custom request/care and unused commercial right required'; END IF;
  SELECT * INTO pub FROM program_offering_publications WHERE id=NEW.publication_id;
  SELECT * INTO definition FROM program_definition_versions WHERE id=pub.program_definition_id;
  IF definition.id<>NEW.program_definition_id OR definition.content_hash IS DISTINCT FROM NEW.snapshot->>'definitionContentHash' OR definition.title IS DISTINCT FROM NEW.snapshot->>'title' OR pub.publication_hash<>NEW.publication_hash OR pub.amount_rial<>NEW.amount_rial OR pub.currency<>NEW.currency OR pub.access_mode<>'ONE_DELIVERY' OR NEW.snapshot->>'accessMode'<>'ONE_DELIVERY' OR NEW.snapshot->'accessDurationDays' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Exact immutable custom purchase snapshot required'; END IF;
  PERFORM id FROM patient_consent_records WHERE id=NEW.terms_consent_record_id AND patient_id=NEW.patient_id AND policy_version_id=pub.terms_policy_version_id AND content_hash=pub.terms_content_hash AND withdrawn_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exact owned custom commercial terms required'; END IF;
  RETURN NEW;
 END IF;
 PERFORM program_lock_service_purchase(NEW.patient_id,NEW.program_definition_id);
 SELECT * INTO pub FROM program_offering_publications WHERE id=NEW.publication_id AND clinic_id=NEW.clinic_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Same-clinic program tariff required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||NEW.clinic_id::text||':'||pub.program_key||':'||pub.locale,0));
 IF NOT program_publication_lock_definition(NEW.program_definition_id) THEN RAISE EXCEPTION 'Current approved program source required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id=pub.terms_policy_version_id FOR SHARE;
 IF NOT program_service_lock_current(NEW.program_definition_id) OR NOT program_publication_current(pub.id) OR NOT program_publication_quoted(pub.id) THEN RAISE EXCEPTION 'Current ready educational publication required'; END IF;
 SELECT * INTO definition FROM program_definition_versions WHERE id=NEW.program_definition_id AND clinic_id=NEW.clinic_id;
 IF definition.id IS NULL OR definition.id<>pub.program_definition_id OR pub.publication_hash<>NEW.publication_hash OR pub.amount_rial<>NEW.amount_rial OR pub.currency<>NEW.currency
 OR NEW.snapshot->>'definitionContentHash' IS DISTINCT FROM definition.content_hash OR NEW.snapshot->>'title' IS DISTINCT FROM definition.title OR NEW.snapshot->>'accessMode' IS DISTINCT FROM pub.access_mode
 OR NEW.snapshot->'accessDurationDays' IS DISTINCT FROM COALESCE(to_jsonb(pub.access_duration_days),'null'::jsonb) THEN RAISE EXCEPTION 'Exact immutable program purchase snapshot required'; END IF;
 PERFORM id FROM patient_consent_records WHERE id=NEW.terms_consent_record_id AND patient_id=NEW.patient_id AND policy_version_id=pub.terms_policy_version_id AND content_hash=pub.terms_content_hash AND withdrawn_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exact owned program terms acceptance required'; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active independent patient required'; END IF;
 IF program_has_live_purchase(NEW.patient_id,NEW.program_definition_id) THEN RAISE EXCEPTION 'Existing pending purchase or owned unexpired program access'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION program_grant_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase program_purchases; pub program_offering_publications;
BEGIN

 IF EXISTS(SELECT 1 FROM program_purchases WHERE id=NEW.purchase_id AND custom_request_id IS NOT NULL) THEN
  SELECT * INTO purchase FROM program_purchases WHERE id=NEW.purchase_id;
  IF purchase.patient_id<>NEW.patient_id OR purchase.clinic_id<>NEW.clinic_id OR NOT custom_program_purchase_lock(purchase.custom_request_id,purchase.care_authorization_id,purchase.publication_id,purchase.patient_id,purchase.clinic_id,true) OR EXISTS(SELECT 1 FROM program_purchases p JOIN program_access_grants g ON g.purchase_id=p.id WHERE p.custom_request_id=purchase.custom_request_id) THEN RAISE EXCEPTION 'Current unused owned custom payment right required'; END IF;
  IF NEW.ends_at IS NOT NULL OR abs(extract(epoch FROM (NEW.granted_at-CURRENT_TIMESTAMP)))>1 OR NOT EXISTS(SELECT 1 FROM billing_intents WHERE program_purchase_id=purchase.id AND expires_at>CURRENT_TIMESTAMP) THEN RAISE EXCEPTION 'Exact unexpired custom grant/DB clock required'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO purchase FROM program_purchases WHERE id=NEW.purchase_id;
 IF purchase.id IS NULL OR purchase.patient_id<>NEW.patient_id OR purchase.clinic_id<>NEW.clinic_id THEN RAISE EXCEPTION 'Exact owned program beneficiary required'; END IF;
 PERFORM program_lock_service_purchase(NEW.patient_id,purchase.program_definition_id);
 SELECT * INTO pub FROM program_offering_publications WHERE id=purchase.publication_id;
 PERFORM pg_advisory_xact_lock(hashtextextended('program-publication:'||purchase.clinic_id::text||':'||pub.program_key||':'||pub.locale,0));
 IF NOT program_service_lock_current(purchase.program_definition_id) OR NOT program_publication_lock_definition(purchase.program_definition_id) THEN RAISE EXCEPTION 'Current exact program clinical source required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id=pub.terms_policy_version_id FOR SHARE;
 IF NOT program_publication_quoted(pub.id) OR NOT EXISTS(SELECT 1 FROM billing_intents WHERE program_purchase_id=purchase.id AND expires_at>CURRENT_TIMESTAMP) THEN RAISE EXCEPTION 'Current exact unexpired program quote required'; END IF;
 IF abs(extract(epoch FROM (NEW.granted_at-CURRENT_TIMESTAMP)))>1 OR NEW.ends_at IS DISTINCT FROM (CASE WHEN pub.access_mode='DAYS' THEN NEW.granted_at+pub.access_duration_days*INTERVAL '24 hours' ELSE NULL END) THEN RAISE EXCEPTION 'Exact database program access period required'; END IF;
 IF program_service_has_grant(NEW.patient_id,purchase.program_definition_id) THEN RAISE EXCEPTION 'Existing unexpired program grant'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION program_grant_readable(grant_id uuid,target_patient uuid,as_of timestamptz DEFAULT CURRENT_TIMESTAMP) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM program_access_grants g JOIN program_purchases p ON p.id=g.purchase_id AND p.patient_id=g.patient_id AND p.clinic_id=g.clinic_id
 JOIN billing_intents i ON i.program_purchase_id=p.id AND i.patient_id=p.patient_id AND i.clinic_id=p.clinic_id
 JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics c ON c.id=g.clinic_id
 WHERE p.custom_request_id IS NULL AND g.id=grant_id AND g.patient_id=target_patient AND i.purpose='PROGRAM' AND i.status='PAID' AND (g.ends_at IS NULL OR g.ends_at>as_of)
 AND u.status='ACTIVE' AND c.status='ACTIVE' AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT')
 AND EXISTS (SELECT 1 FROM program_definition_versions historical JOIN program_services s ON s.clinic_id=historical.clinic_id AND s.program_key=historical.program_key AND s.locale=historical.locale WHERE historical.id=p.program_definition_id AND program_definition_usable(s.published_definition_id)));
$$;

COMMIT;
