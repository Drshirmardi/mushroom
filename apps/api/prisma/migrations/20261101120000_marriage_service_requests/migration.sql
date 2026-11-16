BEGIN;
ALTER TABLE sessions ADD COLUMN verified_phone varchar(13);
CREATE TABLE marriage_service_requests (
 id uuid PRIMARY KEY, clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 publication_id uuid NOT NULL REFERENCES assessment_admin_publications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 initiator_patient_id uuid NOT NULL REFERENCES patient_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE, recipient_patient_id uuid REFERENCES patient_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 initiator_role varchar(16) NOT NULL CHECK(initiator_role IN ('FIRST','SECOND')), recipient_hash char(64) NOT NULL,
 encrypted_payload bytea NOT NULL, encryption_nonce bytea NOT NULL, authentication_tag bytea NOT NULL, encryption_key_version varchar(40) NOT NULL,
 link_id uuid NOT NULL UNIQUE REFERENCES couple_sessions(id) ON DELETE RESTRICT ON UPDATE CASCADE, educational_id uuid UNIQUE REFERENCES educational_couple_sessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 status varchar(24) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','CANCELLED','REPLACED')),
 recipient_ineligible boolean NOT NULL DEFAULT false,
 idempotency_key varchar(200) NOT NULL, payload_hash char(64) NOT NULL,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz(3) NOT NULL,
 UNIQUE(initiator_patient_id,idempotency_key), CHECK(recipient_patient_id IS NULL OR recipient_patient_id<>initiator_patient_id),
 CHECK(status<>'ACCEPTED' OR (recipient_patient_id IS NOT NULL AND educational_id IS NOT NULL))
);
CREATE INDEX marriage_service_requests_recipient_hash_created_at_id_idx ON marriage_service_requests(recipient_hash,created_at,id);
CREATE INDEX marriage_requests_initiator_created_idx ON marriage_service_requests(initiator_patient_id,created_at,id);
CREATE TABLE marriage_invitation_deliveries (
 id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES marriage_service_requests(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 idempotency_key varchar(200) NOT NULL, status varchar(16) NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','SENDING','ACCEPTED','FAILED','UNKNOWN')),
 provider_reference varchar(256), created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, resolved_at timestamptz(3),
 UNIQUE(request_id,idempotency_key)
);
CREATE INDEX marriage_invitation_deliveries_status_created_at_idx ON marriage_invitation_deliveries(status,created_at);
CREATE FUNCTION marriage_patient_role_eligible(target uuid, rule jsonb) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN user_profiles profile ON profile.user_id=u.id
 WHERE p.id=target AND u.status='ACTIVE' AND rule->'genders' ? profile.gender
 AND coalesce((SELECT r.birth_date FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=p.id), (SELECT e.birth_date FROM patient_entries e WHERE e.patient_id=p.id))
 <= ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-make_interval(years=>greatest(18,(rule->>'minimumAgeYears')::int)))::date);
$$;
CREATE FUNCTION marriage_link_eligible(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM marriage_service_requests WHERE link_id=target)
 OR EXISTS(SELECT 1 FROM marriage_service_requests r JOIN assessment_admin_publications pub ON pub.id=r.publication_id JOIN assessment_offering_versions o ON o.id=pub.offering_version_id
 WHERE r.link_id=target AND r.status='ACCEPTED'
 AND marriage_patient_role_eligible(r.initiator_patient_id,(SELECT role FROM jsonb_array_elements(o.authoring_texts->'marriage'->'roles') role WHERE role->>'id'=r.initiator_role))
 AND marriage_patient_role_eligible(r.recipient_patient_id,(SELECT role FROM jsonb_array_elements(o.authoring_texts->'marriage'->'roles') role WHERE role->>'id'<>r.initiator_role)));
$$;
ALTER FUNCTION educational_couple_mutual(uuid) RENAME TO educational_couple_mutual_before_marriage;
CREATE FUNCTION educational_couple_mutual(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT educational_couple_mutual_before_marriage(target) AND marriage_link_eligible((SELECT couple_session_id FROM educational_couple_sessions WHERE id=target));
$$;
CREATE FUNCTION marriage_request_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
 IF ROW(NEW.clinic_id,NEW.publication_id,NEW.initiator_patient_id,NEW.initiator_role,NEW.recipient_hash,NEW.encrypted_payload,NEW.encryption_nonce,NEW.authentication_tag,NEW.encryption_key_version,NEW.link_id,NEW.idempotency_key,NEW.payload_hash,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.clinic_id,OLD.publication_id,OLD.initiator_patient_id,OLD.initiator_role,OLD.recipient_hash,OLD.encrypted_payload,OLD.encryption_nonce,OLD.authentication_tag,OLD.encryption_key_version,OLD.link_id,OLD.idempotency_key,OLD.payload_hash,OLD.created_at)
 OR (OLD.recipient_patient_id IS NOT NULL AND NEW.recipient_patient_id IS DISTINCT FROM OLD.recipient_patient_id)
 OR (OLD.educational_id IS NOT NULL AND NEW.educational_id IS DISTINCT FROM OLD.educational_id)
 OR (OLD.status IN ('CANCELLED','REPLACED') AND NEW.status<>OLD.status)
 OR (OLD.status='ACCEPTED' AND NEW.status NOT IN ('ACCEPTED','CANCELLED')) THEN RAISE EXCEPTION 'Marriage request identity and terminal state are immutable'; END IF;
 RETURN NEW; END;
$$;
CREATE TRIGGER marriage_request_immutable BEFORE UPDATE ON marriage_service_requests FOR EACH ROW EXECUTE FUNCTION marriage_request_immutable();
COMMIT;
