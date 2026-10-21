BEGIN;
-- Keep joint clinical proof limited to immutable completion/provenance metadata.
CREATE OR REPLACE FUNCTION couple_joint_result_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE context couple_assessment_sessions; purchase assessment_purchases; joint couple_result_protocol_versions; source assessment_versions;
 first_source record; second_source record; first_band jsonb; second_band jsonb; pair jsonb; refs jsonb; expected jsonb;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Joint educational result is immutable retained evidence'; END IF;
 SELECT * INTO context FROM couple_assessment_sessions WHERE id=NEW.session_id AND clinic_id=NEW.clinic_id FOR UPDATE;
 IF context.id IS NULL OR context.context_hash<>NEW.context_hash OR context.joint_protocol_id<>NEW.joint_protocol_id THEN RAISE EXCEPTION 'Exact mutually owned joint context required'; END IF;
 PERFORM id FROM couple_sessions WHERE id=context.couple_session_id FOR SHARE;
 PERFORM c.id FROM patient_consent_records c JOIN couple_assessment_participants p ON p.processing_consent_record_id=c.id WHERE p.session_id=context.id ORDER BY c.id FOR SHARE OF c;
 IF NOT couple_assessment_paid_sharing_allowed(context.id) THEN RAISE EXCEPTION 'Paid current mutual joint disclosure required'; END IF;
 SELECT * INTO purchase FROM assessment_purchases WHERE id=NEW.purchase_id AND couple_assessment_session_id=context.id AND clinic_id=NEW.clinic_id;
 IF purchase.id IS NULL THEN RAISE EXCEPTION 'Exact joint purchase required'; END IF;
 PERFORM assessment_purchase_final_payment_check(purchase.id);
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN patient_profiles p ON p.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN clinics c ON c.id=p.clinic_id
  WHERE s.id=NEW.generated_session_id AND p.id=NEW.generated_by_patient_id AND p.clinic_id=NEW.clinic_id AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT'
   AND EXISTS(SELECT 1 FROM couple_assessment_participants WHERE session_id=context.id AND patient_id=p.id) FOR SHARE OF s,u,p,ur,r,c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Independent owned active joint-result session required'; END IF;
 SELECT * INTO joint FROM couple_result_protocol_versions WHERE id=NEW.joint_protocol_id;
 SELECT * INTO source FROM assessment_versions WHERE id=context.assessment_version_id;
 IF joint.content_hash<>NEW.protocol_hash OR NEW.algorithm_id<>joint.algorithm_id OR NEW.algorithm_version<>joint.algorithm_version THEN RAISE EXCEPTION 'Exact original joint algorithm required'; END IF;
 SELECT s.id,s.state,s.completed_at,s.invalidated_at,s.completion_payload_hash,jsonb_build_object('algorithmId',s.result_snapshot->'algorithmId','algorithmVersion',s.result_snapshot->'algorithmVersion','questionnaireContentHash',s.result_snapshot->'questionnaireContentHash','answerPayloadHash',s.result_snapshot->'answerPayloadHash','resultBand',s.result_snapshot->'resultBand') AS result_snapshot INTO first_source FROM patient_assessment_submissions s JOIN assessment_access_grants g ON g.id=s.access_grant_id JOIN couple_assessment_participants cp ON cp.id=g.couple_assessment_participant_id
  WHERE s.id=NEW.initiator_submission_id AND g.purchase_id=purchase.id AND cp.session_id=context.id AND cp.slot='INITIATOR' AND s.patient_id=cp.patient_id AND s.assessment_version_id=source.id;
 SELECT s.id,s.state,s.completed_at,s.invalidated_at,s.completion_payload_hash,jsonb_build_object('algorithmId',s.result_snapshot->'algorithmId','algorithmVersion',s.result_snapshot->'algorithmVersion','questionnaireContentHash',s.result_snapshot->'questionnaireContentHash','answerPayloadHash',s.result_snapshot->'answerPayloadHash','resultBand',s.result_snapshot->'resultBand') AS result_snapshot INTO second_source FROM patient_assessment_submissions s JOIN assessment_access_grants g ON g.id=s.access_grant_id JOIN couple_assessment_participants cp ON cp.id=g.couple_assessment_participant_id
  WHERE s.id=NEW.partner_submission_id AND g.purchase_id=purchase.id AND cp.session_id=context.id AND cp.slot='PARTNER' AND s.patient_id=cp.patient_id AND s.assessment_version_id=source.id;
 IF first_source.id IS NULL OR second_source.id IS NULL OR first_source.state<>'COMPLETE' OR second_source.state<>'COMPLETE' OR first_source.completed_at IS NULL OR second_source.completed_at IS NULL OR first_source.invalidated_at IS NOT NULL OR second_source.invalidated_at IS NOT NULL
  OR first_source.completion_payload_hash IS DISTINCT FROM NEW.initiator_completion_hash OR second_source.completion_payload_hash IS DISTINCT FROM NEW.partner_completion_hash
  OR NEW.created_at<GREATEST(first_source.completed_at,second_source.completed_at,purchase.created_at) THEN RAISE EXCEPTION 'Exact two completed private sources required'; END IF;
 IF first_source.result_snapshot->>'algorithmId' IS DISTINCT FROM 'WEIGHTED_SUM' OR second_source.result_snapshot->>'algorithmId' IS DISTINCT FROM 'WEIGHTED_SUM'
  OR first_source.result_snapshot->'algorithmVersion' IS DISTINCT FROM '1'::jsonb OR second_source.result_snapshot->'algorithmVersion' IS DISTINCT FROM '1'::jsonb
  OR first_source.result_snapshot->>'questionnaireContentHash' IS DISTINCT FROM source.content_hash OR second_source.result_snapshot->>'questionnaireContentHash' IS DISTINCT FROM source.content_hash
  OR first_source.result_snapshot->>'answerPayloadHash' IS DISTINCT FROM NEW.initiator_completion_hash OR second_source.result_snapshot->>'answerPayloadHash' IS DISTINCT FROM NEW.partner_completion_hash THEN RAISE EXCEPTION 'Supported recorded individual provenance required'; END IF;
 SELECT value INTO first_band FROM jsonb_array_elements(source.structure->'resultBands') WHERE value->>'id'=first_source.result_snapshot->'resultBand'->>'id';
 SELECT value INTO second_band FROM jsonb_array_elements(source.structure->'resultBands') WHERE value->>'id'=second_source.result_snapshot->'resultBand'->>'id';
 IF first_band IS NULL OR second_band IS NULL OR COALESCE(first_band->'requiresReview','false'::jsonb)='true'::jsonb OR COALESCE(second_band->'requiresReview','false'::jsonb)='true'::jsonb
  OR first_source.result_snapshot->'resultBand' IS DISTINCT FROM jsonb_build_object('id',first_band->'id','title',first_band->'title','riskLevel',COALESCE(first_band->'riskLevel','"NONE"'::jsonb),'requiresReview',COALESCE(first_band->'requiresReview','false'::jsonb))
  OR second_source.result_snapshot->'resultBand' IS DISTINCT FROM jsonb_build_object('id',second_band->'id','title',second_band->'title','riskLevel',COALESCE(second_band->'riskLevel','"NONE"'::jsonb),'requiresReview',COALESCE(second_band->'requiresReview','false'::jsonb)) THEN RAISE EXCEPTION 'Exact supported individual band metadata required'; END IF;
 SELECT value INTO pair FROM jsonb_array_elements(joint.pairs) WHERE (value->>'firstBandId'=first_band->>'id' AND value->>'secondBandId'=second_band->>'id') OR (value->>'firstBandId'=second_band->>'id' AND value->>'secondBandId'=first_band->>'id');
 IF pair IS NULL THEN RAISE EXCEPTION 'Explicit approved joint pair required'; END IF;
 SELECT jsonb_agg(r.value ORDER BY ids.ordinality) INTO refs FROM jsonb_array_elements_text(pair->'guidanceContentIds') WITH ORDINALITY ids JOIN jsonb_array_elements(joint.content_references) r ON r.value->>'id'=ids.value;
 expected:=jsonb_build_object('snapshotVersion',1,'algorithmId','APPROVED_PAIR_LOOKUP','algorithmVersion',1,'contextHash',context.context_hash,'jointProtocolHash',joint.content_hash,'contentReferences',refs,'recommendConsultation',pair->'recommendConsultation');
 IF NEW.result_snapshot IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Only minimized exact approved joint education may be retained'; END IF;
 RETURN NEW;
END $$;
COMMIT;
