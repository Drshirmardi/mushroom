BEGIN;
ALTER TABLE marriage_invitation_deliveries ADD COLUMN started_at timestamptz(3), ADD COLUMN provider_revision_id uuid REFERENCES sms_provider_config_revisions(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE FUNCTION marriage_sms_state_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Invitation delivery history is retained'; END IF;
 IF TG_OP='INSERT' AND (NEW.status<>'QUEUED' OR NEW.started_at IS NOT NULL OR NEW.resolved_at IS NOT NULL OR NEW.provider_revision_id IS NULL) THEN RAISE EXCEPTION 'Invitation SMS must start queued with a pinned provider revision'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.request_id,NEW.idempotency_key,NEW.created_at,NEW.provider_revision_id) IS DISTINCT FROM ROW(OLD.id,OLD.request_id,OLD.idempotency_key,OLD.created_at,OLD.provider_revision_id)
   OR (OLD.status IN ('ACCEPTED','FAILED','UNKNOWN') AND NEW IS DISTINCT FROM OLD)
   OR (OLD.status='QUEUED' AND NEW.status NOT IN ('QUEUED','SENDING','FAILED'))
   OR (OLD.status='SENDING' AND NEW.status NOT IN ('SENDING','ACCEPTED','FAILED','UNKNOWN'))
   OR (OLD.started_at IS NOT NULL AND NEW.started_at IS DISTINCT FROM OLD.started_at)
  THEN RAISE EXCEPTION 'Invitation SMS identity and terminal state are immutable'; END IF;
 END IF;
 IF NEW.status='SENDING' AND NEW.started_at IS NULL THEN RAISE EXCEPTION 'SMS dispatch requires a claim timestamp'; END IF;
 IF NEW.status IN ('ACCEPTED','FAILED','UNKNOWN') AND NEW.resolved_at IS NULL THEN RAISE EXCEPTION 'SMS terminal state requires resolution evidence'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER marriage_sms_state_guard BEFORE INSERT OR UPDATE OR DELETE ON marriage_invitation_deliveries FOR EACH ROW EXECUTE FUNCTION marriage_sms_state_guard();
COMMIT;
