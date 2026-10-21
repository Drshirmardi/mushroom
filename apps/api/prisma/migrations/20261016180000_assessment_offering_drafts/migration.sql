BEGIN;
CREATE TABLE assessment_offering_versions (
  id UUID NOT NULL PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  offering_key VARCHAR(80) NOT NULL,
  version_number INTEGER NOT NULL,
  kind VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  locale VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  assessment_version_id UUID NOT NULL,
  price_mode VARCHAR(8) NOT NULL,
  payment_point VARCHAR(24),
  amount_rial BIGINT,
  currency CHAR(3) NOT NULL,
  algorithm_id VARCHAR(80),
  algorithm_version INTEGER,
  policy_draft JSONB NOT NULL DEFAULT '{}',
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  idempotency_key VARCHAR(200) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at TIMESTAMPTZ(3),
  CONSTRAINT assessment_offerings_questionnaire_clinic_fkey FOREIGN KEY (assessment_version_id, clinic_id)
    REFERENCES assessment_versions(id, clinic_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT assessment_offerings_identity_check CHECK (
    offering_key ~ '^[A-Z][A-Z0-9_]{0,79}$' AND version_number > 0 AND kind IN ('INDIVIDUAL', 'COUPLES')
    AND length(btrim(title)) > 0 AND length(btrim(locale)) > 0 AND length(idempotency_key) > 0 AND payload_hash ~ '^[a-f0-9]{64}$'),
  -- Deliberately no PUBLISHED state until owner/clinical approval and unified access contracts exist.
  CONSTRAINT assessment_offerings_status_check CHECK ((status = 'DRAFT' AND retired_at IS NULL) OR (status = 'RETIRED' AND retired_at IS NOT NULL)),
  CONSTRAINT assessment_offerings_price_check CHECK (currency = 'IRR' AND (
    (price_mode = 'FREE' AND amount_rial IS NOT NULL AND amount_rial = 0 AND payment_point IS NULL)
    OR (price_mode = 'PAID' AND (amount_rial IS NULL OR amount_rial BETWEEN 1 AND 9000000000000000000)
      AND (payment_point IS NULL OR payment_point IN ('PRE_START', 'PRE_RESULT_UNLOCK'))))),
  CONSTRAINT assessment_offerings_algorithm_check CHECK (
    (algorithm_id IS NULL AND algorithm_version IS NULL) OR
    (algorithm_id IS NOT NULL AND length(btrim(algorithm_id)) > 0 AND algorithm_version IS NOT NULL AND algorithm_version > 0)),
  CONSTRAINT assessment_offerings_policy_check CHECK (jsonb_typeof(policy_draft) = 'object' AND octet_length(policy_draft::text) <= 4096)
);
CREATE UNIQUE INDEX assessment_offerings_version_key ON assessment_offering_versions(clinic_id, offering_key, version_number);
CREATE UNIQUE INDEX assessment_offerings_command_key ON assessment_offering_versions(created_by_user_id, idempotency_key);
CREATE INDEX assessment_offerings_clinic_created_idx ON assessment_offering_versions(clinic_id, created_at, id);

CREATE FUNCTION assessment_offering_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous assessment_offering_versions; source_key TEXT; previous_source_key TEXT; source_locale TEXT; source_status TEXT;
BEGIN
  IF NEW.status <> 'DRAFT' THEN RAISE EXCEPTION 'Offering versions begin as drafts' USING ERRCODE = '23514'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('offering-version:' || NEW.clinic_id::text || ':' || NEW.offering_key, 0));
  SELECT * INTO previous FROM assessment_offering_versions WHERE clinic_id = NEW.clinic_id AND offering_key = NEW.offering_key ORDER BY version_number DESC LIMIT 1;
  IF NEW.version_number <> COALESCE(previous.version_number, 0) + 1 THEN
    RAISE EXCEPTION 'Offering version must be consecutive' USING ERRCODE = '23514';
  END IF;
  SELECT assessment_key, locale, status::text INTO source_key, source_locale, source_status
    FROM assessment_versions WHERE id = NEW.assessment_version_id AND clinic_id = NEW.clinic_id FOR SHARE;
  IF source_key IS NULL OR source_locale <> NEW.locale OR source_status NOT IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'Offering questionnaire is not an immutable same-clinic version' USING ERRCODE = '23514';
  END IF;
  IF previous.id IS NOT NULL THEN
    SELECT assessment_key INTO previous_source_key FROM assessment_versions WHERE id = previous.assessment_version_id;
    IF NEW.kind <> previous.kind OR NEW.locale <> previous.locale OR source_key <> previous_source_key THEN
      RAISE EXCEPTION 'Offering kind, locale and questionnaire family are stable' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER assessment_offering_insert_guard BEFORE INSERT ON assessment_offering_versions FOR EACH ROW EXECUTE FUNCTION assessment_offering_insert_guard();

CREATE FUNCTION assessment_offering_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Offering versions are retained' USING ERRCODE = '23514'; END IF;
  IF (to_jsonb(NEW) - 'status' - 'retired_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'retired_at')
    OR NOT ((NEW.status = OLD.status AND NEW.retired_at IS NOT DISTINCT FROM OLD.retired_at)
      OR (OLD.status = 'DRAFT' AND NEW.status = 'RETIRED' AND NEW.retired_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'Offering content is immutable; create a new version' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER assessment_offering_immutable BEFORE UPDATE OR DELETE ON assessment_offering_versions FOR EACH ROW EXECUTE FUNCTION assessment_offering_immutable();
COMMIT;
