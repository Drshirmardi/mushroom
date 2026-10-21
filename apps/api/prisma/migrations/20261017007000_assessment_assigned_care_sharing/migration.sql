BEGIN;
-- CreateTable
CREATE TABLE "assessment_care_shares" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "protocol_review_id" UUID NOT NULL,
    "protocol_hash" CHAR(64) NOT NULL,
    "source_hash" CHAR(64) NOT NULL,
    "processing_consent_record_id" UUID NOT NULL,
    "care_policy_version_id" UUID NOT NULL,
    "care_policy_content_hash" CHAR(64) NOT NULL,
    "context_hash" CHAR(64) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "accepted_by_user_id" UUID NOT NULL,
    "accepted_session_id" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "withdrawn_at" TIMESTAMPTZ(3),
    "withdrawn_by_user_id" UUID,
    "withdrawn_session_id" UUID,
    "withdrawal_idempotency_key" VARCHAR(200),

    CONSTRAINT "assessment_care_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_care_appointment_history_idx" ON "assessment_care_shares"("appointment_id", "accepted_at", "id");

-- CreateIndex
CREATE INDEX "assessment_care_patient_history_idx" ON "assessment_care_shares"("patient_id", "accepted_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_care_acceptance_command_key" ON "assessment_care_shares"("patient_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_care_withdrawal_command_key" ON "assessment_care_shares"("patient_id", "withdrawal_idempotency_key");

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_appointment_id_clinic_id_fkey" FOREIGN KEY ("appointment_id", "clinic_id") REFERENCES "appointments"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_doctor_id_clinic_id_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "patient_assessment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_protocol_review_id_fkey" FOREIGN KEY ("protocol_review_id") REFERENCES "assessment_protocol_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_processing_consent_record_id_fkey" FOREIGN KEY ("processing_consent_record_id") REFERENCES "patient_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_care_policy_version_id_fkey" FOREIGN KEY ("care_policy_version_id") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_accepted_session_id_fkey" FOREIGN KEY ("accepted_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_withdrawn_by_user_id_fkey" FOREIGN KEY ("withdrawn_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_care_shares" ADD CONSTRAINT "assessment_care_shares_withdrawn_session_id_fkey" FOREIGN KEY ("withdrawn_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX assessment_care_active_source_key ON assessment_care_shares(appointment_id,submission_id) WHERE withdrawn_at IS NULL;
ALTER TABLE assessment_care_shares ADD CONSTRAINT assessment_care_share_shape CHECK (
 protocol_hash ~ '^[a-f0-9]{64}$' AND source_hash ~ '^[a-f0-9]{64}$' AND context_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$' AND care_policy_content_hash ~ '^[a-f0-9]{64}$'
 AND idempotency_key ~ '^[!-~]{8,200}$' AND ((withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL AND withdrawn_session_id IS NULL AND withdrawal_idempotency_key IS NULL)
  OR (withdrawn_at>=accepted_at AND withdrawn_by_user_id IS NOT NULL AND withdrawn_session_id IS NOT NULL AND withdrawal_idempotency_key ~ '^[!-~]{8,200}$')));

CREATE FUNCTION assessment_care_doctor_current(target_doctor uuid,target_clinic uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM doctor_profiles d WHERE d.id=target_doctor AND d.clinic_id=target_clinic AND guidance_doctor_id(d.user_id,d.clinic_id)=d.id
  AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles role ON role.id=ur.role_id JOIN clinical_role_permissions permission ON permission.role_id=role.id WHERE ur.user_id=d.user_id AND role.code='DOCTOR' AND permission.permission='CLINICAL_RECORD_VIEW'));
$$;
CREATE FUNCTION assessment_care_appointment_current(target uuid,within_window boolean) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM appointments a JOIN clinics c ON c.id=a.clinic_id JOIN patient_profiles p ON p.id=a.patient_id AND p.clinic_id=a.clinic_id JOIN users u ON u.id=p.user_id
  WHERE a.id=target AND c.status='ACTIVE' AND u.status='ACTIVE' AND a.status IN('CONFIRMED','CHECKED_IN','QUEUED','IN_PROGRESS') AND assessment_care_doctor_current(a.doctor_id,a.clinic_id)
   AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles role ON role.id=ur.role_id WHERE ur.user_id=u.id AND role.code='PATIENT')
   AND CURRENT_TIMESTAMP<=a.ends_at+CASE WHEN a.status IN('CHECKED_IN','QUEUED','IN_PROGRESS') THEN INTERVAL '4 hours' ELSE INTERVAL '60 minutes' END
   AND (NOT within_window OR CURRENT_TIMESTAMP>=a.starts_at-INTERVAL '15 minutes'));
$$;
CREATE FUNCTION assessment_care_source_current(target_submission uuid,target_review uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM patient_assessment_submissions s JOIN assessment_versions v ON v.id=s.assessment_version_id JOIN assessment_protocol_reviews r ON r.assessment_version_id=v.id
  JOIN consent_policy_versions policy ON policy.id=r.consent_policy_version_id
  WHERE s.id=target_submission AND r.id=target_review AND s.state='COMPLETE' AND s.invalidated_at IS NULL AND s.completed_at IS NOT NULL AND v.status='PUBLISHED'
   AND assessment_submission_access_allowed(s.id,s.patient_id) AND r.decision='APPROVED' AND r.review_number=(SELECT max(review_number) FROM assessment_protocol_reviews WHERE assessment_version_id=v.id)
   AND v.content_hash=r.questionnaire_content_hash AND r.algorithm_id='WEIGHTED_SUM' AND r.algorithm_version=1 AND guidance_doctor_id(r.actor_user_id,v.clinic_id)=r.doctor_profile_id
   AND policy.status='ACTIVE' AND policy.policy_key='ASSESSMENT_PROCESSING' AND policy.content_hash=r.consent_content_hash
   AND s.completion_payload_hash ~ '^[a-f0-9]{64}$' AND s.result_snapshot->>'answerPayloadHash'=s.completion_payload_hash AND s.result_snapshot->>'questionnaireContentHash'=v.content_hash
   AND s.result_snapshot->>'algorithmId'='WEIGHTED_SUM' AND s.result_snapshot->'algorithmVersion'='1'::jsonb
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(v.structure->'resultBands') band WHERE band->>'id'=s.result_snapshot->'resultBand'->>'id' AND COALESCE(band->'requiresReview','false'::jsonb)='false'::jsonb
    AND s.result_snapshot->'resultBand'=jsonb_build_object('id',band->'id','title',band->'title','riskLevel',COALESCE(band->'riskLevel','"NONE"'::jsonb),'requiresReview',COALESCE(band->'requiresReview','false'::jsonb))));
$$;
CREATE FUNCTION assessment_care_share_current(target uuid,within_window boolean) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_care_shares g JOIN appointments a ON a.id=g.appointment_id AND a.clinic_id=g.clinic_id AND a.patient_id=g.patient_id AND a.doctor_id=g.doctor_id
  JOIN patient_assessment_submissions s ON s.id=g.submission_id AND s.patient_id=g.patient_id JOIN assessment_versions v ON v.id=s.assessment_version_id AND v.clinic_id=g.clinic_id
  JOIN assessment_protocol_reviews r ON r.id=g.protocol_review_id AND r.assessment_version_id=v.id JOIN consent_policy_versions policy ON policy.id=g.care_policy_version_id
  JOIN patient_consent_records medical ON medical.id=g.processing_consent_record_id AND medical.patient_id=g.patient_id
  WHERE g.id=target AND g.withdrawn_at IS NULL AND assessment_care_appointment_current(a.id,within_window) AND assessment_care_source_current(s.id,r.id)
   AND s.completion_payload_hash=g.source_hash AND r.protocol_hash=g.protocol_hash AND medical.withdrawn_at IS NULL AND medical.policy_version_id=r.consent_policy_version_id AND medical.content_hash=r.consent_content_hash
   AND (s.access_grant_id IS NULL OR EXISTS(SELECT 1 FROM assessment_access_grants own WHERE own.id=s.access_grant_id AND own.processing_consent_record_id=medical.id AND own.patient_id=g.patient_id))
   AND policy.clinic_id=g.clinic_id AND policy.locale=v.locale AND policy.policy_key='ASSESSMENT_CARE_SHARING' AND policy.status='ACTIVE' AND policy.activated_at IS NOT NULL AND policy.content_hash=g.care_policy_content_hash
   AND encode(sha256(convert_to(policy.body,'UTF8')),'hex')=g.care_policy_content_hash);
$$;
CREATE FUNCTION assessment_care_share_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_user uuid; target_session uuid; appointment appointments; source_meta record; review assessment_protocol_reviews; medical patient_consent_records; policy consent_policy_versions;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Assessment care consent is retained evidence'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['withdrawn_at','withdrawn_by_user_id','withdrawn_session_id','withdrawal_idempotency_key']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['withdrawn_at','withdrawn_by_user_id','withdrawn_session_id','withdrawal_idempotency_key']) THEN RAISE EXCEPTION 'Assessment care scope and consent are immutable'; END IF;
  IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  IF OLD.withdrawn_at IS NOT NULL OR NEW.withdrawn_at IS NULL OR NEW.withdrawn_at<OLD.accepted_at THEN RAISE EXCEPTION 'Assessment care withdrawal is final'; END IF;
  target_user:=NEW.withdrawn_by_user_id; target_session:=NEW.withdrawn_session_id;
 ELSE
  IF NEW.withdrawn_at IS NOT NULL THEN RAISE EXCEPTION 'New care consent must be an explicit independent acceptance'; END IF;
  target_user:=NEW.accepted_by_user_id; target_session:=NEW.accepted_session_id;
 END IF;
 PERFORM p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN sessions session ON session.user_id=u.id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles role ON role.id=ur.role_id
  WHERE p.id=NEW.patient_id AND p.clinic_id=NEW.clinic_id AND u.id=target_user AND session.id=target_session AND session.revoked_at IS NULL AND session.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' AND c.status='ACTIVE' AND role.code='PATIENT' FOR SHARE OF p,u,session,c,ur,role;
 IF NOT FOUND THEN RAISE EXCEPTION 'Independent live patient care consent session required'; END IF;
 IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
 SELECT * INTO appointment FROM appointments WHERE id=NEW.appointment_id AND patient_id=NEW.patient_id AND clinic_id=NEW.clinic_id AND doctor_id=NEW.doctor_id FOR UPDATE;
 IF appointment.id IS NULL OR NOT assessment_care_appointment_current(appointment.id,false) THEN RAISE EXCEPTION 'Exact eligible assigned appointment required'; END IF;
 SELECT s.id,s.assessment_version_id,s.completed_at,s.completion_payload_hash,s.access_grant_id INTO source_meta FROM patient_assessment_submissions s JOIN assessment_versions v ON v.id=s.assessment_version_id WHERE s.id=NEW.submission_id AND s.patient_id=NEW.patient_id AND v.clinic_id=NEW.clinic_id;
 IF source_meta.id IS NULL OR source_meta.completion_payload_hash IS DISTINCT FROM NEW.source_hash OR NEW.accepted_at<source_meta.completed_at THEN RAISE EXCEPTION 'Exact owned completed care source required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||source_meta.assessment_version_id::text,0));
 SELECT * INTO review FROM assessment_protocol_reviews WHERE id=NEW.protocol_review_id AND assessment_version_id=source_meta.assessment_version_id FOR SHARE;
 IF review.id IS NULL OR review.protocol_hash<>NEW.protocol_hash OR NOT assessment_care_source_current(NEW.submission_id,review.id) THEN RAISE EXCEPTION 'Exact currently approved care source required'; END IF;
 IF guidance_lock_doctor(review.actor_user_id,NEW.clinic_id) IS DISTINCT FROM review.doctor_profile_id
  OR guidance_lock_doctor((SELECT user_id FROM doctor_profiles WHERE id=NEW.doctor_id),NEW.clinic_id) IS DISTINCT FROM NEW.doctor_id THEN RAISE EXCEPTION 'Current qualified source reviewer and assigned physician required'; END IF;
 PERFORM permission.role_id FROM clinical_role_permissions permission JOIN roles role ON role.id=permission.role_id WHERE role.code='DOCTOR' AND permission.permission='CLINICAL_RECORD_VIEW' FOR SHARE OF permission,role;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current explicit physician clinical view capability required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id IN(NEW.care_policy_version_id,review.consent_policy_version_id) ORDER BY id FOR SHARE;
 SELECT * INTO policy FROM consent_policy_versions WHERE id=NEW.care_policy_version_id AND clinic_id=NEW.clinic_id AND locale=(SELECT locale FROM assessment_versions WHERE id=source_meta.assessment_version_id) AND policy_key='ASSESSMENT_CARE_SHARING' AND status='ACTIVE';
 IF policy.id IS NULL OR policy.activated_at IS NULL OR policy.content_hash<>NEW.care_policy_content_hash OR encode(sha256(convert_to(policy.body,'UTF8')),'hex')<>NEW.care_policy_content_hash THEN RAISE EXCEPTION 'Exact current purpose-specific care policy required'; END IF;
 SELECT * INTO medical FROM patient_consent_records WHERE id=NEW.processing_consent_record_id AND patient_id=NEW.patient_id AND withdrawn_at IS NULL FOR SHARE;
 IF medical.id IS NULL OR medical.policy_version_id<>review.consent_policy_version_id OR medical.content_hash<>review.consent_content_hash
  OR (source_meta.access_grant_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM assessment_access_grants WHERE id=source_meta.access_grant_id AND patient_id=NEW.patient_id AND processing_consent_record_id=medical.id)) THEN RAISE EXCEPTION 'Exact independently owned current processing consent required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_care_share_guard BEFORE INSERT OR UPDATE OR DELETE ON assessment_care_shares FOR EACH ROW EXECUTE FUNCTION assessment_care_share_guard();
COMMIT;
