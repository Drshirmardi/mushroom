BEGIN;
CREATE OR REPLACE FUNCTION educational_couple_commit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; context educational_couple_sessions;
BEGIN
 IF TG_TABLE_NAME='educational_couple_sessions' THEN target:=NEW.id; ELSE target:=NEW.session_id; END IF;
 SELECT * INTO context FROM educational_couple_sessions WHERE id=target;
 IF (SELECT count(*) FROM educational_couple_participants WHERE session_id=target)<>2 OR EXISTS(SELECT 1 FROM educational_couple_participants p WHERE p.session_id=target AND NOT EXISTS(SELECT 1 FROM couple_participants cp WHERE cp.session_id=context.couple_session_id AND cp.patient_id=p.patient_id AND cp.slot=p.slot AND cp.clinic_id=p.clinic_id)) THEN RAISE EXCEPTION 'Exactly two independently linked educational beneficiaries required'; END IF;
 RETURN NULL;
END $$;
COMMIT;
