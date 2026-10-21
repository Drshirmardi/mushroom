BEGIN;
-- Audit subject_id and billing id are both UUIDs. Keep the already-applied61 intact.
CREATE OR REPLACE FUNCTION program_deferred_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='program_purchases' THEN
  target:=NEW.id;
  PERFORM a.id FROM audit_events a JOIN sessions s ON s.id=a.actor_session_id AND s.user_id=a.actor_user_id JOIN users u ON u.id=s.user_id JOIN billing_intents i ON i.id=a.subject_id AND i.program_purchase_id=target
  WHERE a.action='BILLING_INTENT_CREATED' AND a.actor_user_id=i.actor_user_id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current independent audited program purchase session required'; END IF;
 ELSIF TG_TABLE_NAME='program_access_grants' THEN target:=NEW.purchase_id;
 ELSIF TG_TABLE_NAME='billing_intents' THEN target:=NEW.program_purchase_id;
 ELSE SELECT program_purchase_id INTO target FROM billing_intents WHERE id=NEW.intent_id; END IF;
 IF target IS NOT NULL THEN PERFORM program_purchase_final_proof(target); END IF; RETURN NULL;
END $$;
COMMIT;
