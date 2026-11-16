BEGIN;
-- AlterTable
ALTER TABLE "program_offering_publications" ADD COLUMN     "discount_ends_at" TIMESTAMPTZ(3),
ADD COLUMN     "discount_percent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discount_starts_at" TIMESTAMPTZ(3);

ALTER TABLE program_offering_publications ADD CONSTRAINT program_publication_discount_shape CHECK(discount_percent BETWEEN 0 AND 100 AND (discount_starts_at IS NULL OR discount_ends_at IS NULL OR discount_starts_at<discount_ends_at));
CREATE FUNCTION program_quote_price_valid(snapshot jsonb,publication uuid,created timestamptz) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE pub program_offering_publications; quoted timestamptz; applied int; amount bigint;
BEGIN
 SELECT * INTO pub FROM program_offering_publications WHERE id=publication;
 IF NOT FOUND THEN RETURN false; END IF;
 IF snapshot->>'schemaVersion'='1' THEN RETURN pub.discount_percent=0 AND snapshot->>'amountRial'=pub.amount_rial::text; END IF;
 IF snapshot->>'schemaVersion'<>'3' OR COALESCE(snapshot->>'quotedAt','') !~ '^\d{4}-\d{2}-\d{2}T.*Z$' THEN RETURN false; END IF;
 quoted:=(snapshot->>'quotedAt')::timestamptz;
 IF quoted>created OR quoted+pub.quote_ttl_seconds*INTERVAL '1 second'<=created THEN RETURN false; END IF;
 applied:=CASE WHEN pub.amount_rial>0 AND (pub.discount_starts_at IS NULL OR pub.discount_starts_at<=quoted) AND (pub.discount_ends_at IS NULL OR quoted<pub.discount_ends_at) THEN pub.discount_percent ELSE 0 END;
 amount:=floor(pub.amount_rial::numeric*(100-applied)/100)::bigint;
 RETURN COALESCE(snapshot->>'baseAmountRial'=pub.amount_rial::text AND snapshot->>'discountPercent'=applied::text AND snapshot->>'amountRial'=amount::text,false);
END $$;

ALTER TABLE program_purchases DROP CONSTRAINT program_purchase_shape;
ALTER TABLE program_purchases ADD CONSTRAINT program_purchase_shape CHECK(COALESCE(
 amount_rial BETWEEN 0 AND 9000000000000000000 AND currency='IRR' AND publication_hash ~ '^[a-f0-9]{64}$'
 AND jsonb_typeof(snapshot)='object' AND octet_length(snapshot::text)<=8192
 AND snapshot->>'purchaseId'=id::text AND snapshot->>'publicationId'=publication_id::text AND snapshot->>'publicationHash'=publication_hash
 AND snapshot->>'programDefinitionId'=program_definition_id::text AND snapshot->>'termsConsentRecordId'=terms_consent_record_id::text
 AND snapshot->>'amountRial'=amount_rial::text AND snapshot->>'currency'=currency
 AND ((snapshot->'schemaVersion' IN ('1'::jsonb,'3'::jsonb) AND custom_request_id IS NULL AND care_authorization_id IS NULL)
 OR (snapshot->'schemaVersion'='2'::jsonb AND custom_request_id IS NOT NULL AND care_authorization_id IS NOT NULL AND snapshot->>'customRequestId'=custom_request_id::text AND snapshot->>'careAuthorizationId'=care_authorization_id::text)),false));

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
 IF definition.id IS NULL OR definition.id<>pub.program_definition_id OR pub.publication_hash<>NEW.publication_hash OR NOT program_quote_price_valid(NEW.snapshot,pub.id,NEW.created_at) OR pub.currency<>NEW.currency
 OR NEW.snapshot->>'definitionContentHash' IS DISTINCT FROM definition.content_hash OR NEW.snapshot->>'title' IS DISTINCT FROM definition.title OR NEW.snapshot->>'accessMode' IS DISTINCT FROM pub.access_mode
 OR NEW.snapshot->'accessDurationDays' IS DISTINCT FROM COALESCE(to_jsonb(pub.access_duration_days),'null'::jsonb) THEN RAISE EXCEPTION 'Exact immutable program purchase snapshot required'; END IF;
 PERFORM id FROM patient_consent_records WHERE id=NEW.terms_consent_record_id AND patient_id=NEW.patient_id AND policy_version_id=pub.terms_policy_version_id AND content_hash=pub.terms_content_hash AND withdrawn_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exact owned program terms acceptance required'; END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active independent patient required'; END IF;
 IF program_has_live_purchase(NEW.patient_id,NEW.program_definition_id) THEN RAISE EXCEPTION 'Existing pending purchase or owned unexpired program access'; END IF;
 RETURN NEW;
END $$;

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
 UPDATE program_services SET published_definition_id=NEW.program_definition_id,selling_enabled=(archived_at IS NULL),base_amount_rial=NEW.amount_rial,discount_percent=NEW.discount_percent,discount_starts_at=NEW.discount_starts_at,discount_ends_at=NEW.discount_ends_at,revision=revision+1 WHERE id=service.id;
 RETURN NEW;
END $$;

ALTER TABLE program_services DROP CONSTRAINT program_service_shape;
ALTER TABLE program_services ADD CONSTRAINT program_service_shape CHECK (
 revision > 0 AND audience IN ('SHARED','FEMALE','MALE','REVIEW_REQUIRED')
 AND jsonb_typeof(draft)='object'
 AND (import_baseline IS NULL OR jsonb_typeof(import_baseline)='object')
 AND jsonb_typeof(source_references)='array'
 AND (base_amount_rial IS NULL OR base_amount_rial BETWEEN 0 AND 9000000000000000000)
 AND discount_percent BETWEEN 0 AND 100
 AND (discount_starts_at IS NULL OR discount_ends_at IS NULL OR discount_starts_at < discount_ends_at)
 AND (archived_at IS NULL OR NOT selling_enabled)
);
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
 IF definition.kind='CUSTOM_PROFESSIONAL_PLAN' AND (NEW.discount_percent<>0 OR NEW.discount_starts_at IS NOT NULL OR NEW.discount_ends_at IS NOT NULL) THEN RAISE EXCEPTION 'Discounts apply only to ready education services'; END IF;
 IF definition.kind='CUSTOM_PROFESSIONAL_PLAN' AND NOT EXISTS(SELECT 1 FROM doctor_services WHERE id=definition.doctor_service_id AND clinic_id=NEW.clinic_id AND currency='IRR' AND price_amount=NEW.amount_rial) THEN RAISE EXCEPTION 'Exact current professional service price required'; END IF;
 SELECT * INTO terms FROM consent_policy_versions WHERE id=NEW.terms_policy_version_id AND clinic_id=NEW.clinic_id FOR SHARE;
 IF terms.id IS NULL OR NOT (terms.policy_key='PROGRAM_PURCHASE_TERMS' OR (terms.policy_key='READY_PROGRAM_PURCHASE_TERMS' AND definition.kind='READY_EDUCATION' AND NEW.access_mode='PERPETUAL')) OR terms.locale<>NEW.locale OR terms.status<>'ACTIVE' OR terms.activated_at IS NULL OR terms.content_hash<>NEW.terms_content_hash THEN RAISE EXCEPTION 'Exact active program purchase terms required'; END IF;
 SELECT * INTO previous FROM program_offering_publications WHERE clinic_id=NEW.clinic_id AND program_key=NEW.program_key AND locale=NEW.locale ORDER BY publication_number DESC LIMIT 1;
 IF NEW.publication_number<>COALESCE(previous.publication_number,0)+1 OR previous.id IS NOT NULL AND (previous.status<>'RETIRED' OR NEW.created_at<previous.retired_at) THEN RAISE EXCEPTION 'Consecutive immutable program commercial revision required'; END IF;
 RETURN NEW;
END $$;
COMMIT;
