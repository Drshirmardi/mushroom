-- CreateTable
CREATE TABLE "assessment_offering_publications" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "offering_version_id" UUID NOT NULL,
    "offering_key" VARCHAR(80) NOT NULL,
    "publication_number" INTEGER NOT NULL,
    "protocol_review_id" UUID NOT NULL,
    "terms_policy_version_id" UUID NOT NULL,
    "terms_content_hash" CHAR(64) NOT NULL,
    "policy_snapshot" JSONB NOT NULL,
    "publication_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "published_by_user_id" UUID NOT NULL,
    "published_session_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMPTZ(3),
    "retired_by_user_id" UUID,
    "retired_session_id" UUID,
    "retirement_reason" VARCHAR(20),
    "idempotency_key" VARCHAR(200) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,

    CONSTRAINT "assessment_offering_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_publications_clinic_created_idx" ON "assessment_offering_publications"("clinic_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_publications_id_clinic_key" ON "assessment_offering_publications"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_publications_key_number_key" ON "assessment_offering_publications"("clinic_id", "offering_key", "publication_number");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_publications_command_key" ON "assessment_offering_publications"("clinic_id", "published_by_user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_offerings_id_clinic_key" ON "assessment_offering_versions"("id", "clinic_id");

-- AddForeignKey
ALTER TABLE "assessment_offering_publications" ADD CONSTRAINT "assessment_offering_publications_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_offering_publications" ADD CONSTRAINT "assessment_offering_publications_offering_version_id_clini_fkey" FOREIGN KEY ("offering_version_id", "clinic_id") REFERENCES "assessment_offering_versions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_offering_publications" ADD CONSTRAINT "assessment_offering_publications_protocol_review_id_fkey" FOREIGN KEY ("protocol_review_id") REFERENCES "assessment_protocol_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_offering_publications" ADD CONSTRAINT "assessment_offering_publications_terms_policy_version_id_fkey" FOREIGN KEY ("terms_policy_version_id") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_offering_publications" ADD CONSTRAINT "assessment_offering_publications_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_offering_publications" ADD CONSTRAINT "assessment_offering_publications_published_session_id_fkey" FOREIGN KEY ("published_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_offering_publications" ADD CONSTRAINT "assessment_offering_publications_retired_by_user_id_fkey" FOREIGN KEY ("retired_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_offering_publications" ADD CONSTRAINT "assessment_offering_publications_retired_session_id_fkey" FOREIGN KEY ("retired_session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX assessment_publications_one_active ON assessment_offering_publications(clinic_id,offering_key) WHERE status='ACTIVE';
ALTER TABLE assessment_offering_publications ADD CONSTRAINT assessment_publications_shape CHECK (
 publication_number>0 AND offering_key ~ '^[A-Z][A-Z0-9_]{0,79}$'
 AND terms_content_hash ~ '^[a-f0-9]{64}$' AND publication_hash ~ '^[a-f0-9]{64}$' AND payload_hash ~ '^[a-f0-9]{64}$'
 AND idempotency_key ~ '^[!-~]{8,200}$'
 AND policy_snapshot='{"schemaVersion":1,"minimumAgeYears":18,"paymentPoint":"PRE_START","ordinaryRefunds":false,"patientCancellation":false,"invitationAutomaticExpiry":false,"entitlementAutomaticExpiry":false}'::jsonb
 AND ((status='ACTIVE' AND retired_at IS NULL AND retired_by_user_id IS NULL AND retired_session_id IS NULL AND retirement_reason IS NULL)
  OR (status='RETIRED' AND retired_at IS NOT NULL AND retired_at>=created_at AND retired_by_user_id IS NOT NULL AND retired_session_id IS NOT NULL AND retirement_reason IS NOT NULL AND retirement_reason IN ('REPLACED','WITHDRAWN')))
);

CREATE FUNCTION assessment_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous assessment_offering_publications; offering assessment_offering_versions; review assessment_protocol_reviews;
 source assessment_versions; terms consent_policy_versions; processing consent_policy_versions; actor uuid; actor_session uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Assessment commercial history is retained'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['status','retired_at','retired_by_user_id','retired_session_id','retirement_reason']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','retired_at','retired_by_user_id','retired_session_id','retirement_reason']) THEN RAISE EXCEPTION 'Assessment publication snapshot is immutable'; END IF;
  IF NEW.status=OLD.status THEN
   IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN RAISE EXCEPTION 'Assessment publication evidence is immutable'; END IF;
   RETURN NEW;
  END IF;
  IF OLD.status<>'ACTIVE' OR NEW.status<>'RETIRED' THEN RAISE EXCEPTION 'Assessment publication retirement is final'; END IF;
  actor:=NEW.retired_by_user_id; actor_session:=NEW.retired_session_id;
 ELSE
  IF NEW.status<>'ACTIVE' THEN RAISE EXCEPTION 'Assessment publication begins active'; END IF;
  actor:=NEW.published_by_user_id; actor_session:=NEW.published_session_id;
 END IF;
 PERFORM s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=actor_session AND s.user_id=actor AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' FOR SHARE OF s,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active owned commercial administrator session required'; END IF;
 PERFORM c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.id=NEW.clinic_id AND c.status='ACTIVE' AND a.user_id=actor FOR SHARE OF c,a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active same-clinic commercial membership required'; END IF;
 PERFORM ur.role_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=actor AND r.code='ADMIN' FOR SHARE OF ur,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Commercial administrator role required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-publication:'||NEW.clinic_id::text||':'||NEW.offering_key,0));
 IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
 SELECT * INTO previous FROM assessment_offering_publications WHERE clinic_id=NEW.clinic_id AND offering_key=NEW.offering_key ORDER BY publication_number DESC LIMIT 1;
 IF NEW.publication_number<>COALESCE(previous.publication_number,0)+1 OR (previous.id IS NOT NULL AND (previous.status<>'RETIRED' OR NEW.created_at<GREATEST(previous.created_at,previous.retired_at))) THEN RAISE EXCEPTION 'Commercial publication must follow consecutive retained history'; END IF;
 SELECT * INTO offering FROM assessment_offering_versions WHERE id=NEW.offering_version_id AND clinic_id=NEW.clinic_id FOR SHARE;
 IF NOT FOUND OR offering.offering_key<>NEW.offering_key OR offering.status<>'DRAFT'
  OR offering.price_mode<>'PAID' OR offering.payment_point IS DISTINCT FROM 'PRE_START' OR offering.currency<>'IRR' OR offering.amount_rial IS NULL OR offering.amount_rial<=0
  OR offering.algorithm_id IS DISTINCT FROM 'WEIGHTED_SUM' OR offering.algorithm_version IS DISTINCT FROM 1
  OR (offering.policy_draft->'minimumAgeYears') IS DISTINCT FROM '18'::jsonb
  OR offering.policy_draft ? 'invitationTtlHours' OR offering.policy_draft ? 'entitlementValidityDays'
  OR (offering.policy_draft ? 'refundPolicyRef' AND offering.policy_draft->>'refundPolicyRef' IS DISTINCT FROM 'NO_REFUNDS')
  OR COALESCE(jsonb_typeof(offering.policy_draft->'retentionPolicyRef'),'')<>'string' OR COALESCE(length(btrim(offering.policy_draft->>'retentionPolicyRef')),0)=0
  OR COALESCE(jsonb_typeof(offering.policy_draft->'resultVisibilityPolicyRef'),'')<>'string' OR COALESCE(length(btrim(offering.policy_draft->>'resultVisibilityPolicyRef')),0)=0 THEN RAISE EXCEPTION 'Supported exact paid adult nonrefundable tariff required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assessment-protocol:'||offering.assessment_version_id::text,0));
 SELECT * INTO source FROM assessment_versions WHERE id=offering.assessment_version_id AND clinic_id=NEW.clinic_id FOR SHARE;
 SELECT * INTO review FROM assessment_protocol_reviews WHERE assessment_version_id=source.id ORDER BY review_number DESC LIMIT 1;
 IF review.id IS NULL OR review.id<>NEW.protocol_review_id OR review.decision<>'APPROVED' OR review.clinic_id<>NEW.clinic_id
  OR source.status<>'PUBLISHED' OR source.published_at IS NULL OR source.content_hash<>review.questionnaire_content_hash
  OR lower(offering.policy_draft->>'consentPolicyVersionId') IS DISTINCT FROM review.consent_policy_version_id::text THEN RAISE EXCEPTION 'Current exact physician protocol required'; END IF;
 PERFORM id FROM consent_policy_versions WHERE id IN (NEW.terms_policy_version_id,review.consent_policy_version_id) ORDER BY id FOR SHARE;
 SELECT * INTO processing FROM consent_policy_versions WHERE id=review.consent_policy_version_id;
 SELECT * INTO terms FROM consent_policy_versions WHERE id=NEW.terms_policy_version_id;
 IF terms.id IS NULL OR terms.clinic_id<>NEW.clinic_id OR terms.locale<>offering.locale OR terms.policy_key<>'ASSESSMENT_PURCHASE_TERMS' OR terms.status<>'ACTIVE' OR terms.activated_at IS NULL OR terms.content_hash<>NEW.terms_content_hash
  OR processing.status<>'ACTIVE' OR processing.activated_at IS NULL OR processing.content_hash<>review.consent_content_hash THEN RAISE EXCEPTION 'Active exact processing and commercial terms required'; END IF;
 IF guidance_lock_doctor(review.actor_user_id,NEW.clinic_id) IS DISTINCT FROM review.doctor_profile_id THEN RAISE EXCEPTION 'Current qualified protocol reviewer required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_publication_guard BEFORE INSERT OR UPDATE OR DELETE ON assessment_offering_publications FOR EACH ROW EXECUTE FUNCTION assessment_publication_guard();

CREATE FUNCTION assessment_publication_replacement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.retirement_reason='REPLACED' AND NOT EXISTS(SELECT 1 FROM assessment_offering_publications WHERE clinic_id=NEW.clinic_id AND offering_key=NEW.offering_key AND publication_number=NEW.publication_number+1 AND created_at>=NEW.retired_at) THEN RAISE EXCEPTION 'Replaced tariff requires its atomic successor'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER assessment_publication_replacement_guard AFTER UPDATE ON assessment_offering_publications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assessment_publication_replacement_guard();
