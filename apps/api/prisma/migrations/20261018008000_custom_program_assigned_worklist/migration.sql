BEGIN;
-- PG05 introduces the assigned physician worklist; PG04 intentionally had no clinician-list index.
CREATE INDEX custom_program_requests_doctor_created_idx ON custom_program_requests(clinic_id,doctor_id,created_at,id);
COMMIT;
