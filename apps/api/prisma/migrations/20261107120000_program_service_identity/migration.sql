BEGIN;

-- CreateTable
CREATE TABLE "program_service_categories" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "program_service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_services" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "program_key" VARCHAR(100) NOT NULL,
    "locale" VARCHAR(40) NOT NULL,
    "category_id" UUID,
    "audience" VARCHAR(24) NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "draft" JSONB NOT NULL DEFAULT '{}',
    "import_baseline" JSONB,
    "source_references" JSONB NOT NULL DEFAULT '[]',
    "published_definition_id" UUID,
    "selling_enabled" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(3),
    "base_amount_rial" BIGINT,
    "discount_percent" INTEGER NOT NULL DEFAULT 0,
    "discount_starts_at" TIMESTAMPTZ(3),
    "discount_ends_at" TIMESTAMPTZ(3),
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "program_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "program_service_categories_id_clinic_id_key" ON "program_service_categories"("id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_service_categories_clinic_id_key_key" ON "program_service_categories"("clinic_id", "key");

-- CreateIndex
CREATE INDEX "program_services_clinic_id_archived_at_idx" ON "program_services"("clinic_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "program_services_clinic_id_program_key_locale_key" ON "program_services"("clinic_id", "program_key", "locale");

-- AddForeignKey
ALTER TABLE "program_service_categories" ADD CONSTRAINT "program_service_categories_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_services" ADD CONSTRAINT "program_services_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_services" ADD CONSTRAINT "program_services_category_id_clinic_id_fkey" FOREIGN KEY ("category_id", "clinic_id") REFERENCES "program_service_categories"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_services" ADD CONSTRAINT "program_services_published_definition_id_clinic_id_fkey" FOREIGN KEY ("published_definition_id", "clinic_id") REFERENCES "program_definition_versions"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE program_service_categories ADD CONSTRAINT program_category_revision CHECK(revision > 0);
ALTER TABLE program_services ADD CONSTRAINT program_service_shape CHECK (
 revision > 0 AND audience IN ('SHARED','FEMALE','MALE','REVIEW_REQUIRED')
 AND jsonb_typeof(draft)='object'
 AND (import_baseline IS NULL OR jsonb_typeof(import_baseline)='object')
 AND jsonb_typeof(source_references)='array'
 AND (base_amount_rial IS NULL OR base_amount_rial BETWEEN 0 AND 9000000000000000000)
 -- Enable 100 percent only after discounted FREE activation has integration coverage.
 AND discount_percent BETWEEN 0 AND 99
 AND (discount_starts_at IS NULL OR discount_ends_at IS NULL OR discount_starts_at < discount_ends_at)
 AND (archived_at IS NULL OR NOT selling_enabled)
);

-- Resolve old purchases through their definitions; never update retained purchase/grant rows.
INSERT INTO program_service_categories(id,clinic_id,key,name)
 SELECT gen_random_uuid(),clinic_id,md5(category),category
 FROM program_definition_versions WHERE kind='READY_EDUCATION' GROUP BY clinic_id,category;

INSERT INTO program_services(id,clinic_id,program_key,locale,category_id,draft,published_definition_id,selling_enabled,base_amount_rial)
 SELECT gen_random_uuid(),d.clinic_id,d.program_key,d.locale,c.id,
 jsonb_build_object('title',d.title,'summary',d.summary,'body',d.body,'category',d.category,
   'eligibilityDescription',d.eligibility_description,'safety',d.safety,'contentReferences',d.content_references),
 pub.program_definition_id,COALESCE(pub.status='ACTIVE',false),pub.amount_rial
 FROM (SELECT DISTINCT ON(clinic_id,program_key,locale) * FROM program_definition_versions
       WHERE kind='READY_EDUCATION' ORDER BY clinic_id,program_key,locale,version_number DESC) d
 JOIN program_service_categories c ON c.clinic_id=d.clinic_id AND c.name=d.category
 LEFT JOIN LATERAL (SELECT * FROM program_offering_publications p
   WHERE p.clinic_id=d.clinic_id AND p.program_key=d.program_key AND p.locale=d.locale
   ORDER BY publication_number DESC LIMIT 1) pub ON true;

CREATE FUNCTION program_service_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Program service identity is retained; archive instead'; END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.clinic_id,NEW.program_key,NEW.locale)
   IS DISTINCT FROM ROW(OLD.id,OLD.clinic_id,OLD.program_key,OLD.locale)
 THEN RAISE EXCEPTION 'Program service identity is immutable'; END IF;
 IF NEW.published_definition_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM program_definition_versions d WHERE d.id=NEW.published_definition_id
   AND d.clinic_id=NEW.clinic_id AND d.program_key=NEW.program_key AND d.locale=NEW.locale AND d.kind='READY_EDUCATION')
 THEN RAISE EXCEPTION 'Published definition must belong to the same ready service'; END IF;
 IF NEW.published_definition_id IS NOT NULL AND
   (TG_OP='INSERT' OR NEW.published_definition_id IS DISTINCT FROM OLD.published_definition_id) THEN
   IF NOT program_definition_usable(NEW.published_definition_id) OR NOT EXISTS (
     SELECT 1 FROM program_offering_publications p WHERE p.program_definition_id=NEW.published_definition_id
     AND p.clinic_id=NEW.clinic_id)
   THEN RAISE EXCEPTION 'Current content requires reviewed and published program evidence'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_service_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON program_services
 FOR EACH ROW EXECUTE FUNCTION program_service_identity_guard();

-- Capture future identities without replacing a manually edited working draft.
CREATE FUNCTION program_service_capture_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.kind='READY_EDUCATION' THEN
   INSERT INTO program_services(id,clinic_id,program_key,locale,draft)
   VALUES(gen_random_uuid(),NEW.clinic_id,NEW.program_key,NEW.locale,
     jsonb_build_object('title',NEW.title,'summary',NEW.summary,'body',NEW.body,'category',NEW.category,
       'eligibilityDescription',NEW.eligibility_description,'safety',NEW.safety,'contentReferences',NEW.content_references))
   ON CONFLICT(clinic_id,program_key,locale) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_service_capture_identity AFTER INSERT ON program_definition_versions
 FOR EACH ROW EXECUTE FUNCTION program_service_capture_identity();

COMMIT;
