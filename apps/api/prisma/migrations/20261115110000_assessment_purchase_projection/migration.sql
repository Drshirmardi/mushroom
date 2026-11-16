BEGIN;

-- Stored projections backfill during ALTER TABLE without updating immutable receipts.
ALTER TABLE assessment_purchases
  ADD COLUMN assessment_version_id uuid GENERATED ALWAYS AS ((snapshot->>'assessmentVersionId')::uuid) STORED NOT NULL,
  ADD COLUMN title text GENERATED ALWAYS AS (snapshot->>'title') STORED NOT NULL,
  ADD COLUMN source_kind text GENERATED ALWAYS AS (
    CASE
      WHEN educational_couple_session_id IS NOT NULL THEN 'EDUCATIONAL_COUPLE'
      WHEN couple_assessment_session_id IS NOT NULL THEN 'COUPLE'
      WHEN admin_publication_id IS NOT NULL THEN 'ADMIN'
      WHEN publication_id IS NOT NULL THEN 'PUBLIC'
    END
  ) STORED NOT NULL,
  ADD CONSTRAINT assessment_purchases_version_clinic_fk
    FOREIGN KEY (assessment_version_id, clinic_id) REFERENCES assessment_versions (id, clinic_id) ON DELETE RESTRICT,
  ADD CONSTRAINT assessment_purchases_projection_shape CHECK (
    jsonb_typeof(snapshot->'assessmentVersionId') IS NOT DISTINCT FROM 'string'
    AND jsonb_typeof(snapshot->'title') IS NOT DISTINCT FROM 'string'
    AND btrim(title) <> ''
  );

CREATE OR REPLACE FUNCTION assessment_has_pending_purchase(target_patient uuid,source_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id
  WHERE i.purpose='ASSESSMENT' AND i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP AND p.assessment_version_id=source_id
   AND (p.patient_id=target_patient OR EXISTS(SELECT 1 FROM couple_assessment_participants cp WHERE cp.session_id=p.couple_assessment_session_id AND cp.patient_id=target_patient) OR EXISTS(SELECT 1 FROM educational_couple_participants cp WHERE cp.session_id=p.educational_couple_session_id AND cp.patient_id=target_patient))) OR EXISTS(SELECT 1 FROM billing_intents i WHERE i.purpose='ENTRY_ASSESSMENT' AND i.patient_id=target_patient AND i.snapshot->>'assessmentVersionId'=source_id::text AND i.status='PENDING' AND (i.expires_at>CURRENT_TIMESTAMP OR EXISTS(SELECT 1 FROM billing_gateway_attempts a WHERE a.intent_id=i.id AND a.status IN('CREATED','REDIRECT_READY','VERIFYING','REQUIRES_RECONCILIATION')))) OR EXISTS(SELECT 1 FROM patient_entries e WHERE e.patient_id=target_patient AND e.assessment_version_id=source_id AND e.paid_intent_id IS NOT NULL AND e.submission_id IS NULL AND e.completed_at IS NULL);
$$;

COMMIT;
