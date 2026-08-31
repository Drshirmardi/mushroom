-- Persist the Phase 04 clinic directory and deterministic scheduling inputs.
CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TYPE "directory_publication_status" AS ENUM ('UNPUBLISHED', 'PUBLISHED');
CREATE TYPE "visit_mode" AS ENUM ('IN_PERSON', 'ONLINE');
CREATE TYPE "doctor_availability_exception_kind" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

ALTER TABLE "clinics"
  ADD CONSTRAINT "clinics_name_check"
    CHECK (btrim("name") <> '' AND "name" = btrim("name")),
  ADD CONSTRAINT "clinics_time_zone_check"
    CHECK (btrim("time_zone") <> '' AND "time_zone" = btrim("time_zone"));

CREATE FUNCTION directory_text_array_is_valid(
  values_to_check TEXT[],
  maximum_items INTEGER,
  maximum_item_length INTEGER,
  require_unique BOOLEAN
) RETURNS BOOLEAN AS $$
  SELECT
    cardinality(values_to_check) <= maximum_items
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(values_to_check) AS item
      WHERE item IS NULL
        OR btrim(item) = ''
        OR item <> btrim(item)
        OR char_length(item) > maximum_item_length
    )
    AND (
      NOT require_unique
      OR cardinality(values_to_check) = (
        SELECT count(DISTINCT item)
        FROM unnest(values_to_check) AS item
      )
    );
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;

CREATE TABLE "doctor_profiles" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "user_id" UUID,
  "display_name" VARCHAR(160) NOT NULL,
  "biography" TEXT,
  "years_experience" INTEGER,
  "profile_image_url" VARCHAR(2048),
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "education" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "publication_status" "directory_publication_status" NOT NULL DEFAULT 'UNPUBLISHED',
  "published_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "doctor_profiles_display_name_check" CHECK (
    btrim("display_name") <> '' AND "display_name" = btrim("display_name")
  ),
  CONSTRAINT "doctor_profiles_biography_check" CHECK (
    "biography" IS NULL
    OR (btrim("biography") <> '' AND "biography" = btrim("biography") AND char_length("biography") <= 3000)
  ),
  CONSTRAINT "doctor_profiles_years_experience_check" CHECK (
    "years_experience" IS NULL OR "years_experience" BETWEEN 0 AND 80
  ),
  CONSTRAINT "doctor_profiles_image_url_check" CHECK (
    "profile_image_url" IS NULL
    OR ("profile_image_url" = btrim("profile_image_url") AND "profile_image_url" ~* '^https://[^[:space:]]+$')
  ),
  CONSTRAINT "doctor_profiles_languages_check" CHECK (
    directory_text_array_is_valid("languages", 10, 80, true)
  ),
  CONSTRAINT "doctor_profiles_education_check" CHECK (
    directory_text_array_is_valid("education", 20, 240, false)
  ),
  CONSTRAINT "doctor_profiles_certifications_check" CHECK (
    directory_text_array_is_valid("certifications", 20, 240, false)
  ),
  CONSTRAINT "doctor_profiles_publication_check" CHECK (
    ("publication_status" = 'UNPUBLISHED' AND "published_at" IS NULL)
    OR ("publication_status" = 'PUBLISHED' AND "published_at" IS NOT NULL)
  )
);

CREATE TABLE "specialties" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "canonical_name" VARCHAR(320) NOT NULL,
  "description" VARCHAR(1000),
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "publication_status" "directory_publication_status" NOT NULL DEFAULT 'UNPUBLISHED',
  "published_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "specialties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "specialties_name_check" CHECK (
    btrim("name") <> '' AND "name" = btrim("name")
    AND btrim("canonical_name") <> '' AND "canonical_name" = btrim("canonical_name")
  ),
  CONSTRAINT "specialties_description_check" CHECK (
    "description" IS NULL OR (btrim("description") <> '' AND "description" = btrim("description"))
  ),
  CONSTRAINT "specialties_publication_check" CHECK (
    ("publication_status" = 'UNPUBLISHED' AND "published_at" IS NULL)
    OR ("publication_status" = 'PUBLISHED' AND "published_at" IS NOT NULL)
  )
);

CREATE TABLE "doctor_specialties" (
  "clinic_id" UUID NOT NULL,
  "doctor_id" UUID NOT NULL,
  "specialty_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "doctor_specialties_pkey" PRIMARY KEY ("doctor_id", "specialty_id")
);

CREATE TABLE "services" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "canonical_name" VARCHAR(320) NOT NULL,
  "description" VARCHAR(1000),
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "publication_status" "directory_publication_status" NOT NULL DEFAULT 'UNPUBLISHED',
  "published_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "services_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "services_name_check" CHECK (
    btrim("name") <> '' AND "name" = btrim("name")
    AND btrim("canonical_name") <> '' AND "canonical_name" = btrim("canonical_name")
  ),
  CONSTRAINT "services_description_check" CHECK (
    "description" IS NULL OR (btrim("description") <> '' AND "description" = btrim("description"))
  ),
  CONSTRAINT "services_publication_check" CHECK (
    ("publication_status" = 'UNPUBLISHED' AND "published_at" IS NULL)
    OR ("publication_status" = 'PUBLISHED' AND "published_at" IS NOT NULL)
  )
);

CREATE TABLE "doctor_services" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "doctor_id" UUID NOT NULL,
  "service_id" UUID NOT NULL,
  "visit_mode" "visit_mode" NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "buffer_minutes" INTEGER NOT NULL DEFAULT 0,
  "price_amount" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "publication_status" "directory_publication_status" NOT NULL DEFAULT 'UNPUBLISHED',
  "published_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "doctor_services_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "doctor_services_terms_check" CHECK (
    "duration_minutes" BETWEEN 5 AND 480
    AND "buffer_minutes" BETWEEN 0 AND 240
    AND "duration_minutes" + "buffer_minutes" <= 480
    AND "price_amount" BETWEEN 0 AND 2147483647
    AND "currency" = 'IRR'
  ),
  CONSTRAINT "doctor_services_publication_check" CHECK (
    ("publication_status" = 'UNPUBLISHED' AND "published_at" IS NULL)
    OR ("publication_status" = 'PUBLISHED' AND "published_at" IS NOT NULL)
  )
);

CREATE TABLE "availability_rules" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "doctor_id" UUID NOT NULL,
  "visit_mode" "visit_mode" NOT NULL,
  "iso_weekday" INTEGER NOT NULL,
  "start_local_time" TIME(0) NOT NULL,
  "end_local_time" TIME(0) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "availability_rules_interval_check" CHECK (
    "iso_weekday" BETWEEN 1 AND 7
    AND "start_local_time" < "end_local_time"
    AND date_part('second', "start_local_time") = 0
    AND date_part('second', "end_local_time") = 0
  )
);

CREATE TABLE "clinic_closures" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3) NOT NULL,
  "label" VARCHAR(160) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "clinic_closures_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinic_closures_interval_check" CHECK (
    isfinite("starts_at") AND isfinite("ends_at") AND "starts_at" < "ends_at"
  ),
  CONSTRAINT "clinic_closures_label_check" CHECK (
    btrim("label") <> '' AND "label" = btrim("label")
  )
);

CREATE TABLE "doctor_availability_exceptions" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "doctor_id" UUID NOT NULL,
  "kind" "doctor_availability_exception_kind" NOT NULL,
  "visit_mode" "visit_mode",
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3) NOT NULL,
  "label" VARCHAR(160),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "doctor_availability_exceptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "doctor_availability_exceptions_interval_check" CHECK (
    isfinite("starts_at") AND isfinite("ends_at") AND "starts_at" < "ends_at"
  ),
  CONSTRAINT "doctor_availability_exceptions_mode_check" CHECK (
    "kind" = 'UNAVAILABLE' OR "visit_mode" IS NOT NULL
  ),
  CONSTRAINT "doctor_availability_exceptions_label_check" CHECK (
    "label" IS NULL OR (btrim("label") <> '' AND "label" = btrim("label"))
  )
);

CREATE UNIQUE INDEX "doctor_profiles_user_id_key" ON "doctor_profiles"("user_id");
CREATE UNIQUE INDEX "doctor_profiles_id_clinic_key" ON "doctor_profiles"("id", "clinic_id");
CREATE INDEX "doctor_profiles_directory_idx" ON "doctor_profiles"("clinic_id", "is_active", "publication_status", "display_name", "id");

CREATE UNIQUE INDEX "specialties_clinic_canonical_name_key" ON "specialties"("clinic_id", "canonical_name");
CREATE UNIQUE INDEX "specialties_id_clinic_key" ON "specialties"("id", "clinic_id");
CREATE INDEX "specialties_directory_idx" ON "specialties"("clinic_id", "is_active", "publication_status", "canonical_name", "id");
CREATE INDEX "doctor_specialties_specialty_idx" ON "doctor_specialties"("clinic_id", "specialty_id", "doctor_id");

CREATE UNIQUE INDEX "services_clinic_canonical_name_key" ON "services"("clinic_id", "canonical_name");
CREATE UNIQUE INDEX "services_id_clinic_key" ON "services"("id", "clinic_id");
CREATE INDEX "services_directory_idx" ON "services"("clinic_id", "is_active", "publication_status", "canonical_name", "id");

CREATE UNIQUE INDEX "doctor_services_offering_key" ON "doctor_services"("clinic_id", "doctor_id", "service_id", "visit_mode");
CREATE INDEX "doctor_services_doctor_mode_idx" ON "doctor_services"("clinic_id", "doctor_id", "visit_mode", "is_active", "publication_status");
CREATE INDEX "doctor_services_service_mode_idx" ON "doctor_services"("clinic_id", "service_id", "visit_mode", "is_active", "publication_status");

CREATE INDEX "availability_rules_lookup_idx" ON "availability_rules"("clinic_id", "doctor_id", "visit_mode", "iso_weekday", "is_active", "start_local_time");
CREATE INDEX "clinic_closures_lookup_idx" ON "clinic_closures"("clinic_id", "is_active", "starts_at", "ends_at");
CREATE INDEX "doctor_availability_exceptions_lookup_idx" ON "doctor_availability_exceptions"("clinic_id", "doctor_id", "kind", "visit_mode", "is_active", "starts_at", "ends_at");

ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "specialties" ADD CONSTRAINT "specialties_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_doctor_clinic_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_specialty_clinic_fkey" FOREIGN KEY ("specialty_id", "clinic_id") REFERENCES "specialties"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_doctor_clinic_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_service_clinic_fkey" FOREIGN KEY ("service_id", "clinic_id") REFERENCES "services"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_doctor_clinic_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinic_closures" ADD CONSTRAINT "clinic_closures_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_availability_exceptions" ADD CONSTRAINT "doctor_availability_exceptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_availability_exceptions" ADD CONSTRAINT "doctor_availability_exceptions_doctor_clinic_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_no_active_overlap"
  EXCLUDE USING gist (
    "clinic_id" WITH =,
    "doctor_id" WITH =,
    "visit_mode" WITH =,
    "iso_weekday" WITH =,
    int4range(
      extract(epoch FROM "start_local_time")::INTEGER,
      extract(epoch FROM "end_local_time")::INTEGER,
      '[)'
    ) WITH &&
  ) WHERE ("is_active");

ALTER TABLE "clinic_closures" ADD CONSTRAINT "clinic_closures_no_active_overlap"
  EXCLUDE USING gist (
    "clinic_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("is_active");

ALTER TABLE "doctor_availability_exceptions" ADD CONSTRAINT "doctor_availability_exceptions_no_active_overlap"
  EXCLUDE USING gist (
    "clinic_id" WITH =,
    "doctor_id" WITH =,
    "kind" WITH =,
    int4range(
      CASE WHEN "visit_mode" = 'ONLINE' THEN 2 ELSE 1 END,
      CASE WHEN "visit_mode" = 'IN_PERSON' THEN 2 ELSE 3 END,
      '[)'
    ) WITH &&,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("is_active");

CREATE FUNCTION enforce_doctor_publication_dependencies() RETURNS trigger AS $$
BEGIN
  IF NEW.publication_status = 'PUBLISHED'
    AND (
      TG_OP = 'INSERT'
      OR OLD.publication_status IS DISTINCT FROM NEW.publication_status
      OR OLD.clinic_id IS DISTINCT FROM NEW.clinic_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "doctor_specialties" AS assignment
      JOIN "specialties" AS specialty
        ON specialty.id = assignment.specialty_id
        AND specialty.clinic_id = assignment.clinic_id
      WHERE assignment.doctor_id = NEW.id
        AND assignment.clinic_id = NEW.clinic_id
        AND specialty.is_active = true
        AND specialty.publication_status = 'PUBLISHED'
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'doctor_profiles_publication_dependencies_check',
      MESSAGE = 'published doctors require an active published same-clinic specialty';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "doctor_profiles_enforce_publication_dependencies"
BEFORE INSERT OR UPDATE ON "doctor_profiles"
FOR EACH ROW EXECUTE FUNCTION enforce_doctor_publication_dependencies();

CREATE FUNCTION enforce_doctor_service_publication_dependencies() RETURNS trigger AS $$
BEGIN
  IF NEW.publication_status = 'PUBLISHED'
    AND (
      TG_OP = 'INSERT'
      OR OLD.publication_status IS DISTINCT FROM NEW.publication_status
      OR OLD.clinic_id IS DISTINCT FROM NEW.clinic_id
      OR OLD.doctor_id IS DISTINCT FROM NEW.doctor_id
      OR OLD.service_id IS DISTINCT FROM NEW.service_id
    )
    AND NOT (
      EXISTS (
        SELECT 1
        FROM "doctor_profiles"
        WHERE id = NEW.doctor_id
          AND clinic_id = NEW.clinic_id
          AND is_active = true
          AND publication_status = 'PUBLISHED'
      )
      AND EXISTS (
        SELECT 1
        FROM "services"
        WHERE id = NEW.service_id
          AND clinic_id = NEW.clinic_id
          AND is_active = true
          AND publication_status = 'PUBLISHED'
      )
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'doctor_services_publication_dependencies_check',
      MESSAGE = 'published doctor services require active published same-clinic parents';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "doctor_services_enforce_publication_dependencies"
BEFORE INSERT OR UPDATE ON "doctor_services"
FOR EACH ROW EXECUTE FUNCTION enforce_doctor_service_publication_dependencies();
