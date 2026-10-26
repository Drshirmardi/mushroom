-- Separate trigger branches: hold rows and appointment rows have different columns.
CREATE OR REPLACE FUNCTION billing_capacity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('billing-doctor:' || NEW.doctor_id::text, 0));
  IF TG_TABLE_NAME = 'appointment_holds' THEN
    IF NEW.released_at IS NOT NULL OR NEW.expires_at <= now() THEN RETURN NEW; END IF;
  ELSE
    IF NEW.status NOT IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS') THEN RETURN NEW; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM appointment_holds h WHERE h.doctor_id = NEW.doctor_id AND h.clinic_id = NEW.clinic_id AND h.id <> NEW.id AND h.released_at IS NULL AND h.expires_at > now() AND h.starts_at < NEW.ends_at AND h.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'Appointment capacity is temporarily held' USING ERRCODE = '23P01';
  END IF;
  IF TG_TABLE_NAME = 'appointment_holds' THEN
    IF EXISTS (SELECT 1 FROM appointments a WHERE a.doctor_id = NEW.doctor_id AND a.clinic_id = NEW.clinic_id AND a.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS') AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at) THEN
      RAISE EXCEPTION 'Appointment capacity is allocated' USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
