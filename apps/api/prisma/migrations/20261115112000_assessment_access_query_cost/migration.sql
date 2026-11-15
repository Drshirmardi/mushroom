BEGIN;

-- Hold the write lock while validating existing scoped policy bodies.
ALTER TABLE consent_policy_versions ADD CONSTRAINT assessment_consent_body_hash_matches
  CHECK (policy_key NOT IN ('ASSESSMENT_PROCESSING', 'ASSESSMENT_PURCHASE_TERMS')
    OR content_hash = encode(sha256(convert_to(body, 'UTF8')), 'hex'));

CREATE OR REPLACE FUNCTION educational_couple_paid_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases purchase ON purchase.id=g.purchase_id
  JOIN assessment_admin_publications pub ON pub.id=purchase.admin_publication_id JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=g.clinic_id
  JOIN assessment_versions v ON v.id=o.assessment_version_id AND v.id=g.assessment_version_id AND v.clinic_id=g.clinic_id
  JOIN patient_consent_records c ON c.id=g.processing_consent_record_id JOIN consent_policy_versions p ON p.id=c.policy_version_id AND p.assessment_offering_version_id=o.id AND p.policy_key='ASSESSMENT_PROCESSING'
  WHERE g.id=grant_id AND educational_couple_paid_grant_readable(g.id,g.patient_id) AND couple_patient_is_adult(g.patient_id)
   AND pub.status='ACTIVE' AND o.status='DRAFT' AND o.kind='COUPLES' AND o.price_mode='PAID' AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash
   AND p.status='ACTIVE' AND c.content_hash=p.content_hash AND pub.document_hashes->>'ASSESSMENT_PROCESSING'=p.content_hash);
$$;

CREATE OR REPLACE FUNCTION assessment_admin_purchase_source_current(purchase assessment_purchases) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_admin_publications pub
  JOIN assessment_offering_versions o ON o.id=pub.offering_version_id AND o.clinic_id=purchase.clinic_id
  JOIN assessment_versions v ON v.id=o.assessment_version_id AND v.clinic_id=o.clinic_id
  JOIN consent_policy_versions processing ON processing.assessment_offering_version_id=o.id AND processing.policy_key='ASSESSMENT_PROCESSING'
  JOIN consent_policy_versions terms ON terms.assessment_offering_version_id=o.id AND terms.policy_key='ASSESSMENT_PURCHASE_TERMS'
  JOIN patient_consent_records pc ON pc.id=purchase.processing_consent_record_id AND pc.patient_id=purchase.patient_id AND pc.policy_version_id=processing.id
  JOIN patient_consent_records tc ON tc.id=purchase.terms_consent_record_id AND tc.patient_id=purchase.patient_id AND tc.policy_version_id=terms.id
  WHERE pub.id=purchase.admin_publication_id AND pub.status='ACTIVE' AND o.status='DRAFT' AND o.kind=CASE WHEN purchase.educational_couple_session_id IS NULL THEN 'INDIVIDUAL' ELSE 'COUPLES' END AND o.price_mode='PAID' AND o.payment_point='PRE_START'
   AND v.status='PUBLISHED' AND v.content_hash=pub.questionnaire_content_hash AND purchase.publication_hash=assessment_admin_publication_hash(pub.id)
   AND purchase.amount_rial=o.amount_rial AND purchase.currency=o.currency AND purchase.snapshot->>'assessmentVersionId'=v.id::text AND purchase.snapshot->>'title'=o.title
   AND processing.status='ACTIVE' AND terms.status='ACTIVE' AND pc.withdrawn_at IS NULL AND tc.withdrawn_at IS NULL
   AND pc.content_hash=processing.content_hash AND tc.content_hash=terms.content_hash
   AND pub.document_hashes->>'ASSESSMENT_PROCESSING'=processing.content_hash AND pub.document_hashes->>'ASSESSMENT_PURCHASE_TERMS'=terms.content_hash

   AND (purchase.educational_couple_session_id IS NULL OR EXISTS(
    SELECT 1 FROM educational_couple_sessions s WHERE s.id=purchase.educational_couple_session_id AND s.clinic_id=purchase.clinic_id AND s.publication_id=pub.id
     AND purchase.snapshot->>'contextHash'=s.context_hash AND educational_couple_mutual(s.id)
     AND EXISTS(SELECT 1 FROM educational_couple_participants cp WHERE cp.session_id=s.id AND cp.patient_id=purchase.patient_id AND cp.processing_consent_record_id=purchase.processing_consent_record_id)
     AND (SELECT count(*)=2 AND count(DISTINCT cp.patient_id)=2 FROM jsonb_array_elements(purchase.snapshot->'beneficiaries') b JOIN educational_couple_participants cp ON cp.id::text=b->>'participantId' AND cp.session_id=s.id AND cp.patient_id::text=b->>'patientId' AND cp.slot=b->>'slot' AND cp.processing_consent_record_id::text=b->>'processingConsentRecordId')))
   AND couple_assessment_patient_live(purchase.patient_id,purchase.clinic_id));
$$;

CREATE OR REPLACE FUNCTION assessment_admin_paid_grant_processable(grant_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_access_grants g JOIN assessment_purchases p ON p.id=g.purchase_id
  WHERE g.id=grant_id AND p.admin_publication_id IS NOT NULL AND assessment_paid_grant_readable(g.id,g.patient_id)
   AND assessment_admin_purchase_source_current(p) AND g.patient_id=p.patient_id AND g.assessment_version_id=p.assessment_version_id AND g.processing_consent_record_id=p.processing_consent_record_id);
$$;

-- Purchase shape and grant shape constraints make these sources disjoint.
-- Educational couple grants cannot pass the ordinary paid reader: they have
-- a beneficiary slot and neither an individual nor a legacy couple context.
CREATE OR REPLACE FUNCTION assessment_grant_processable(grant_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN g.purchase_id IS NULL THEN assessment_free_grant_processable(g.id)
      WHEN p.source_kind IN ('PUBLIC', 'COUPLE') THEN assessment_paid_grant_processable(g.id)
      WHEN p.source_kind = 'ADMIN' THEN assessment_admin_paid_grant_processable(g.id)
      WHEN p.source_kind = 'EDUCATIONAL_COUPLE' THEN educational_couple_paid_grant_processable(g.id)
      ELSE false END
    FROM assessment_access_grants g
    LEFT JOIN assessment_purchases p ON p.id = g.purchase_id AND p.clinic_id = g.clinic_id
    WHERE g.id = grant_id
  ), false);
$$;

COMMIT;
