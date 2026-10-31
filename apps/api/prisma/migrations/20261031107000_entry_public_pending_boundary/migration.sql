BEGIN;
CREATE OR REPLACE FUNCTION assessment_has_pending_purchase(target_patient uuid,source_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id
  WHERE i.purpose='ASSESSMENT' AND i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP AND p.snapshot->>'assessmentVersionId'=source_id::text
   AND (p.patient_id=target_patient OR EXISTS(SELECT 1 FROM couple_assessment_participants cp WHERE cp.session_id=p.couple_assessment_session_id AND cp.patient_id=target_patient) OR EXISTS(SELECT 1 FROM educational_couple_participants cp WHERE cp.session_id=p.educational_couple_session_id AND cp.patient_id=target_patient))) OR EXISTS(SELECT 1 FROM billing_intents i WHERE i.purpose='ENTRY_ASSESSMENT' AND i.patient_id=target_patient AND i.snapshot->>'assessmentVersionId'=source_id::text AND i.status='PENDING' AND (i.expires_at>CURRENT_TIMESTAMP OR EXISTS(SELECT 1 FROM billing_gateway_attempts a WHERE a.intent_id=i.id AND a.status IN('CREATED','REDIRECT_READY','VERIFYING','REQUIRES_RECONCILIATION'))));
$$;
COMMIT;
