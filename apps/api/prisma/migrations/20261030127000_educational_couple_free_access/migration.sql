BEGIN;
ALTER TABLE assessment_access_grants DROP CONSTRAINT educational_couple_grant_activation;
ALTER TABLE assessment_access_grants DROP CONSTRAINT assessment_grant_shape;
ALTER TABLE assessment_access_grants ADD CONSTRAINT assessment_grant_shape CHECK (
 (purchase_id IS NOT NULL AND free_admin_publication_id IS NULL AND educational_couple_participant_id IS NULL
  AND ((slot='INDIVIDUAL' AND couple_assessment_participant_id IS NULL) OR (slot IN('INITIATOR','PARTNER') AND couple_assessment_participant_id IS NOT NULL))
  AND ((method='WALLET' AND wallet_journal_id IS NOT NULL AND gateway_attempt_id IS NULL) OR (method='GATEWAY' AND gateway_attempt_id IS NOT NULL AND wallet_journal_id IS NULL)))
 OR (purchase_id IS NULL AND free_admin_publication_id IS NOT NULL AND method='FREE' AND couple_assessment_participant_id IS NULL AND wallet_journal_id IS NULL AND gateway_attempt_id IS NULL
  AND ((slot='INDIVIDUAL' AND educational_couple_participant_id IS NULL) OR (slot IN('INITIATOR','PARTNER') AND educational_couple_participant_id IS NOT NULL))));
DROP TRIGGER assessment_free_grant_insert_guard ON assessment_access_grants;
CREATE TRIGGER assessment_free_grant_insert_guard BEFORE INSERT ON assessment_access_grants FOR EACH ROW WHEN (NEW.purchase_id IS NULL AND NEW.educational_couple_participant_id IS NULL) EXECUTE FUNCTION assessment_free_grant_insert_guard();

CREATE FUNCTION educational_couple_free_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g
  JOIN educational_couple_participants cp ON cp.id=g.educational_couple_participant_id AND cp.patient_id=g.patient_id AND cp.slot=g.slot AND cp.processing_consent_record_id=g.processing_consent_record_id
  JOIN educational_couple_sessions s ON s.id=cp.session_id AND s.clinic_id=g.clinic_id AND s.publication_id=g.free_admin_publication_id
  JOIN assessment_admin_publications pub ON pub.id=s.publication_id JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=g.clinic_id AND o.assessment_version_id=g.assessment_version_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id AND c.patient_id=g.patient_id
  JOIN consent_policy_versions p ON p.id=c.policy_version_id AND p.assessment_offering_version_id=o.id AND p.policy_key='ASSESSMENT_PROCESSING'
  JOIN patient_profiles patient ON patient.id=g.patient_id AND patient.clinic_id=g.clinic_id JOIN users u ON u.id=patient.user_id JOIN clinics clinic ON clinic.id=g.clinic_id
  WHERE g.id=grant_id AND g.patient_id=target_patient AND g.method='FREE' AND g.purchase_id IS NULL AND o.kind='COUPLES' AND o.price_mode='FREE'
   AND cp.accepted_at IS NOT NULL AND c.withdrawn_at IS NULL AND c.content_hash=p.content_hash AND pub.document_hashes->>'ASSESSMENT_PROCESSING'=p.content_hash
   AND u.status='ACTIVE' AND clinic.status='ACTIVE' AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT'));
$$;
ALTER FUNCTION assessment_free_grant_readable(uuid,uuid) RENAME TO assessment_individual_free_grant_readable;
CREATE FUNCTION assessment_free_grant_readable(grant_id uuid,target_patient uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT assessment_individual_free_grant_readable(grant_id,target_patient) OR educational_couple_free_grant_readable(grant_id,target_patient);
$$;
CREATE FUNCTION educational_couple_free_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_admin_publications pub ON pub.id=g.free_admin_publication_id
  JOIN assessment_offering_versions o ON o.id=pub.offering_version_id JOIN assessment_versions v ON v.id=g.assessment_version_id AND v.clinic_id=g.clinic_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id JOIN consent_policy_versions p ON p.id=c.policy_version_id
  WHERE g.id=grant_id AND educational_couple_free_grant_readable(g.id,g.patient_id) AND couple_patient_is_adult(g.patient_id)
   AND pub.status='ACTIVE' AND o.status='DRAFT' AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash AND p.status='ACTIVE'
   AND encode(sha256(convert_to(p.body,'UTF8')),'hex')=p.content_hash);
$$;
ALTER FUNCTION assessment_free_grant_processable(uuid) RENAME TO assessment_individual_free_grant_processable;
CREATE FUNCTION assessment_free_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT assessment_individual_free_grant_processable(grant_id) OR educational_couple_free_grant_processable(grant_id);
$$;
CREATE FUNCTION educational_couple_free_grant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE context educational_couple_sessions; participant educational_couple_participants;
BEGIN
 SELECT * INTO participant FROM educational_couple_participants WHERE id=NEW.educational_couple_participant_id;
 SELECT * INTO context FROM educational_couple_sessions WHERE id=participant.session_id FOR UPDATE;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-purchase:'||NEW.patient_id::text||':'||NEW.assessment_version_id::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||NEW.assessment_version_id::text,0));
 PERFORM pub.id FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id JOIN assessment_versions v ON v.id=o.assessment_version_id WHERE pub.id=NEW.free_admin_publication_id FOR SHARE OF pub,o,v;
 PERFORM c.id FROM patient_consent_records c JOIN consent_policy_versions p ON p.id=c.policy_version_id WHERE c.id=NEW.processing_consent_record_id FOR SHARE OF c,p;
 PERFORM id FROM couple_sessions WHERE id=context.couple_session_id FOR SHARE;
 IF context.id IS NULL OR context.clinic_id<>NEW.clinic_id OR context.publication_id<>NEW.free_admin_publication_id OR participant.patient_id<>NEW.patient_id OR participant.slot<>NEW.slot OR participant.processing_consent_record_id IS DISTINCT FROM NEW.processing_consent_record_id
  OR NOT educational_couple_mutual(context.id) OR NOT EXISTS(SELECT 1 FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id WHERE pub.id=context.publication_id AND o.price_mode='FREE' AND o.assessment_version_id=NEW.assessment_version_id)
 THEN RAISE EXCEPTION 'Exact mutually accepted owned FREE couple access required'; END IF;
 IF EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE patient_id=NEW.patient_id AND assessment_version_id=NEW.assessment_version_id AND state='IN_PROGRESS')
  OR assessment_has_pending_purchase(NEW.patient_id,NEW.assessment_version_id)
  OR EXISTS(SELECT 1 FROM assessment_access_grants g WHERE g.patient_id=NEW.patient_id AND g.assessment_version_id=NEW.assessment_version_id AND assessment_grant_readable(g.id,g.patient_id) AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions s WHERE s.access_grant_id=g.id)) THEN RAISE EXCEPTION 'An assessment attempt, unused access or purchase already exists'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER educational_couple_free_grant_guard BEFORE INSERT ON assessment_access_grants FOR EACH ROW WHEN (NEW.purchase_id IS NULL AND NEW.educational_couple_participant_id IS NOT NULL) EXECUTE FUNCTION educational_couple_free_grant_guard();

CREATE OR REPLACE FUNCTION educational_couple_participant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE context educational_couple_sessions; actor_session uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Independent couple acceptance history is retained'; END IF;
 SELECT * INTO context FROM educational_couple_sessions WHERE id=NEW.session_id AND clinic_id=NEW.clinic_id FOR UPDATE;
 IF context.id IS NULL OR NOT EXISTS(SELECT 1 FROM couple_participants WHERE session_id=context.couple_session_id AND patient_id=NEW.patient_id AND slot=NEW.slot) THEN RAISE EXCEPTION 'Exact linked beneficiary required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.accepted_at IS NOT NULL OR NEW.sharing_withdrawn_at IS NOT NULL THEN RAISE EXCEPTION 'Participation begins without fabricated acceptance'; END IF; RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['processing_consent_record_id','disclosure_content_hash','accepted_session_id','accepted_at','sharing_withdrawn_at','withdrawn_session_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['processing_consent_record_id','disclosure_content_hash','accepted_session_id','accepted_at','sharing_withdrawn_at','withdrawn_session_id']) THEN RAISE EXCEPTION 'Couple beneficiary binding is immutable'; END IF;
 IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
 IF OLD.accepted_at IS NULL THEN
  IF NEW.accepted_at IS NULL OR NEW.sharing_withdrawn_at IS NOT NULL OR NOT educational_couple_current(context.id) THEN RAISE EXCEPTION 'Exact active educational context required for acceptance'; END IF;
  IF NOT EXISTS(SELECT 1 FROM assessment_admin_publications pub JOIN consent_policy_versions p ON p.assessment_offering_version_id=pub.offering_version_id AND p.policy_key='ASSESSMENT_PROCESSING' JOIN patient_consent_records c ON c.policy_version_id=p.id AND c.patient_id=NEW.patient_id WHERE pub.id=context.publication_id AND c.id=NEW.processing_consent_record_id AND c.withdrawn_at IS NULL AND c.content_hash=p.content_hash AND NEW.disclosure_content_hash=pub.document_hashes->>'COUPLES_RESULT_SHARING') THEN RAISE EXCEPTION 'Exact owned processing and independent disclosure acceptance required'; END IF;
  actor_session:=NEW.accepted_session_id;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['sharing_withdrawn_at','withdrawn_session_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['sharing_withdrawn_at','withdrawn_session_id']) OR OLD.sharing_withdrawn_at IS NOT NULL OR NEW.sharing_withdrawn_at IS NULL THEN RAISE EXCEPTION 'Acceptance is immutable; disclosure withdrawal is final'; END IF;
  actor_session:=NEW.withdrawn_session_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM patient_profiles p JOIN sessions s ON s.user_id=p.user_id WHERE p.id=NEW.patient_id AND s.id=actor_session AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND couple_assessment_patient_live(p.id,NEW.clinic_id)) THEN RAISE EXCEPTION 'Independent active beneficiary session required'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION educational_couple_current(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM educational_couple_sessions s JOIN couple_sessions link ON link.id=s.couple_session_id AND link.clinic_id=s.clinic_id
  JOIN assessment_admin_publications pub ON pub.id=s.publication_id JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=s.clinic_id
  JOIN assessment_versions v ON v.id=o.assessment_version_id AND v.clinic_id=s.clinic_id
  WHERE s.id=target AND pub.status='ACTIVE' AND o.status='DRAFT' AND o.kind='COUPLES' AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash
   AND EXISTS(SELECT 1 FROM consent_policy_versions p WHERE p.assessment_offering_version_id=o.id AND p.policy_key='ASSESSMENT_PROCESSING') AND EXISTS(SELECT 1 FROM consent_policy_versions p WHERE p.assessment_offering_version_id=o.id AND p.policy_key='COUPLES_RESULT_SHARING') AND link.state='LINKED' AND (SELECT count(*) FROM couple_participants cp WHERE cp.session_id=link.id AND cp.revoked_at IS NULL AND couple_assessment_patient_live(cp.patient_id,s.clinic_id))=2
   AND s.context_snapshot->>'publicationId'=pub.id::text AND s.context_snapshot->>'questionnaireContentHash'=v.content_hash
   AND NOT EXISTS(SELECT 1 FROM consent_policy_versions p WHERE p.assessment_offering_version_id=o.id AND (p.status<>'ACTIVE' OR pub.document_hashes->>p.policy_key IS DISTINCT FROM p.content_hash::text OR encode(sha256(convert_to(p.body,'UTF8')),'hex')<>p.content_hash)));
$$;
COMMIT;
