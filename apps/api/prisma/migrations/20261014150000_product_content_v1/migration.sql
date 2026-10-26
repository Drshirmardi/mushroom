CREATE TYPE "commerce_product_content_source_kind" AS ENUM
  ('MANUFACTURER_DOCUMENT', 'PACKAGING', 'SUPPLIER_DOCUMENT', 'OTHER_DOCUMENT');

ALTER TABLE "commerce_products"
  ADD COLUMN "brand" VARCHAR(240),
  ADD COLUMN "manufacturer" VARCHAR(240),
  ADD COLUMN "short_description" VARCHAR(500),
  ADD COLUMN "ingredients" TEXT,
  ADD COLUMN "usage_instructions" TEXT,
  ADD COLUMN "warnings" TEXT,
  ADD COLUMN "contraindications" TEXT,
  ADD COLUMN "content_revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "legacy_content" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "source_kind" "commerce_product_content_source_kind",
  ADD COLUMN "source_reference" VARCHAR(1000),
  ADD COLUMN "approved_content_revision" INTEGER,
  ADD COLUMN "content_approved_at" TIMESTAMPTZ(3),
  ADD COLUMN "content_approved_by_user_id" UUID;

-- Only classify rows that predate this migration. Do not modify their content,
-- lifecycle, timestamps, financial records or invent an approval/source.
UPDATE "commerce_products" SET "legacy_content" = true;

ALTER TABLE "commerce_products"
  ADD CONSTRAINT "commerce_product_content_approver_fkey"
    FOREIGN KEY ("content_approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "commerce_product_content_revision_check" CHECK ("content_revision" >= 0),
  ADD CONSTRAINT "commerce_product_content_source_check" CHECK (
    ("source_kind" IS NULL AND "source_reference" IS NULL) OR
    ("source_kind" IS NOT NULL AND "source_reference" IS NOT NULL AND length(btrim("source_reference")) > 0)
  ),
  ADD CONSTRAINT "commerce_product_content_approval_check" CHECK (
    ("approved_content_revision" IS NULL AND "content_approved_at" IS NULL AND "content_approved_by_user_id" IS NULL) OR
    ("approved_content_revision" IS NOT NULL AND "content_approved_at" IS NOT NULL AND "content_approved_by_user_id" IS NOT NULL
      AND "approved_content_revision" = "content_revision" AND NOT "legacy_content"
      AND "source_kind" IS NOT NULL AND "source_reference" IS NOT NULL
      AND coalesce("brand", "manufacturer", "short_description", "description", "ingredients", "usage_instructions", "warnings", "contraindications") IS NOT NULL)
  ),
  ADD CONSTRAINT "commerce_product_legacy_content_check" CHECK (
    NOT "legacy_content" OR ("content_revision" = 0 AND "approved_content_revision" IS NULL)
  );
