-- Phase 09 commerce and provider-neutral payment foundation.
-- All commerce amounts are BIGINT TOMAN; no medical/appointment IRR field is altered.

CREATE TYPE "commerce_product_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "commerce_discount_kind" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');
CREATE TYPE "inventory_ledger_entry_type" AS ENUM ('RECEIPT', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'CONSUMPTION');
CREATE TYPE "inventory_reservation_status" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');
CREATE TYPE "commerce_shipping_method" AS ENUM ('PICKUP', 'COURIER');
CREATE TYPE "commerce_order_status" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'FULFILLING', 'FULFILLED', 'CANCELLED', 'PAYMENT_FAILED', 'REQUIRES_RECONCILIATION', 'REFUND_PENDING', 'REFUNDED');
CREATE TYPE "payment_attempt_status" AS ENUM ('CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING', 'VERIFIED', 'FAILED', 'EXPIRED', 'REQUIRES_RECONCILIATION', 'CANCELLED');
CREATE TYPE "payment_status" AS ENUM ('VERIFIED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED');
CREATE TYPE "refund_status" AS ENUM ('REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "credential_version_status" AS ENUM ('ACTIVE', 'RETIRED', 'CRYPTO_SHREDDED');

CREATE TABLE "commerce_categories" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL, "slug" VARCHAR(140) NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_categories_clinic_slug_key" UNIQUE ("clinic_id", "slug"),
  CONSTRAINT "commerce_categories_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "commerce_products" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "category_id" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL, "slug" VARCHAR(260) NOT NULL, "description" TEXT,
  "status" "commerce_product_status" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_products_clinic_slug_key" UNIQUE ("clinic_id", "slug"),
  CONSTRAINT "commerce_products_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "commerce_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "commerce_products_clinic_status_id_idx" ON "commerce_products"("clinic_id", "status", "id");

CREATE TABLE "commerce_skus" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "product_id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL, "title" VARCHAR(240), "current_price_toman" BIGINT NOT NULL,
  "current_tax_toman" BIGINT NOT NULL DEFAULT 0, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_skus_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_skus_clinic_code_key" UNIQUE ("clinic_id", "code"),
  CONSTRAINT "commerce_skus_amounts_check" CHECK ("current_price_toman" >= 0 AND "current_tax_toman" >= 0),
  CONSTRAINT "commerce_skus_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_skus_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "commerce_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "commerce_skus_product_active_id_idx" ON "commerce_skus"("product_id", "is_active", "id");

CREATE TABLE "inventory_items" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "sku_id" UUID NOT NULL,
  "on_hand_quantity" INTEGER NOT NULL DEFAULT 0, "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"), CONSTRAINT "inventory_items_sku_id_key" UNIQUE ("sku_id"),
  CONSTRAINT "inventory_items_stock_check" CHECK ("on_hand_quantity" >= 0 AND "reserved_quantity" >= 0 AND "reserved_quantity" <= "on_hand_quantity"),
  CONSTRAINT "inventory_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "commerce_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "inventory_items_clinic_id_idx" ON "inventory_items"("clinic_id", "id");

CREATE TABLE "commerce_carts" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "patient_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_carts_pkey" PRIMARY KEY ("id"), CONSTRAINT "commerce_carts_patient_id_key" UNIQUE ("patient_id"),
  CONSTRAINT "commerce_carts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_carts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "commerce_cart_items" (
  "id" UUID NOT NULL, "cart_id" UUID NOT NULL, "sku_id" UUID NOT NULL, "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_cart_items_pkey" PRIMARY KEY ("id"), CONSTRAINT "commerce_cart_items_cart_sku_key" UNIQUE ("cart_id", "sku_id"),
  CONSTRAINT "commerce_cart_items_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "commerce_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "commerce_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "commerce_cart_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "commerce_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "wishlist_items" (
  "id" UUID NOT NULL, "patient_id" UUID NOT NULL, "sku_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id"), CONSTRAINT "wishlist_items_patient_sku_key" UNIQUE ("patient_id", "sku_id"),
  CONSTRAINT "wishlist_items_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wishlist_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "commerce_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "commerce_addresses" (
  "id" UUID NOT NULL, "patient_id" UUID NOT NULL, "label" VARCHAR(100) NOT NULL,
  "recipient_name" VARCHAR(160) NOT NULL, "phone" VARCHAR(32) NOT NULL, "province" VARCHAR(100) NOT NULL, "city" VARCHAR(100) NOT NULL,
  "postal_code" VARCHAR(32), "line1" VARCHAR(500) NOT NULL, "line2" VARCHAR(500), "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_addresses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "commerce_addresses_patient_created_id_idx" ON "commerce_addresses"("patient_id", "created_at", "id");
CREATE UNIQUE INDEX "commerce_addresses_one_default_per_patient_idx" ON "commerce_addresses"("patient_id") WHERE "is_default";

CREATE TABLE "commerce_discounts" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "code" VARCHAR(80) NOT NULL, "title" VARCHAR(160) NOT NULL,
  "kind" "commerce_discount_kind" NOT NULL, "amount_toman" BIGINT, "percentage_basis_points" INTEGER,
  "starts_at" TIMESTAMPTZ(3), "ends_at" TIMESTAMPTZ(3), "usage_limit" INTEGER, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_discounts_pkey" PRIMARY KEY ("id"), CONSTRAINT "commerce_discounts_clinic_code_key" UNIQUE ("clinic_id", "code"),
  CONSTRAINT "commerce_discounts_shape_check" CHECK (("kind" = 'FIXED_AMOUNT' AND "amount_toman" > 0 AND "percentage_basis_points" IS NULL) OR ("kind" = 'PERCENTAGE' AND "amount_toman" IS NULL AND "percentage_basis_points" BETWEEN 1 AND 10000)),
  CONSTRAINT "commerce_discounts_window_check" CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" > "starts_at"),
  CONSTRAINT "commerce_discounts_usage_limit_check" CHECK ("usage_limit" IS NULL OR "usage_limit" > 0),
  CONSTRAINT "commerce_discounts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "commerce_discounts_clinic_active_window_idx" ON "commerce_discounts"("clinic_id", "is_active", "starts_at", "ends_at");

CREATE TABLE "commerce_orders" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "patient_id" UUID NOT NULL, "order_number" BIGINT NOT NULL,
  "status" "commerce_order_status" NOT NULL DEFAULT 'PENDING_PAYMENT', "idempotency_key" VARCHAR(240) NOT NULL, "shipping_method" "commerce_shipping_method" NOT NULL,
  "shipping_address_snapshot" JSONB, "shipping_detail_snapshot" JSONB NOT NULL DEFAULT '{}',
  "subtotal_amount_toman" BIGINT NOT NULL, "tax_amount_toman" BIGINT NOT NULL DEFAULT 0, "discount_amount_toman" BIGINT NOT NULL DEFAULT 0, "shipping_amount_toman" BIGINT NOT NULL DEFAULT 0, "total_amount_toman" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id"), CONSTRAINT "commerce_orders_order_number_key" UNIQUE ("order_number"), CONSTRAINT "commerce_orders_patient_idempotency_key" UNIQUE ("patient_id", "idempotency_key"),
  CONSTRAINT "commerce_orders_amounts_check" CHECK ("subtotal_amount_toman" >= 0 AND "tax_amount_toman" >= 0 AND "discount_amount_toman" >= 0 AND "shipping_amount_toman" >= 0 AND "total_amount_toman" >= 0 AND "total_amount_toman" = "subtotal_amount_toman" + "tax_amount_toman" - "discount_amount_toman" + "shipping_amount_toman"),
  CONSTRAINT "commerce_orders_shipping_address_check" CHECK (("shipping_method" = 'PICKUP' AND "shipping_address_snapshot" IS NULL) OR ("shipping_method" = 'COURIER' AND "shipping_address_snapshot" IS NOT NULL)),
  CONSTRAINT "commerce_orders_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "commerce_orders_clinic_status_created_id_idx" ON "commerce_orders"("clinic_id", "status", "created_at", "id");
CREATE TABLE "commerce_order_lines" (
  "id" UUID NOT NULL, "order_id" UUID NOT NULL, "sku_id" UUID, "position" INTEGER NOT NULL,
  "sku_code_snapshot" VARCHAR(80) NOT NULL, "product_title_snapshot" VARCHAR(240) NOT NULL, "quantity" INTEGER NOT NULL,
  "unit_price_toman" BIGINT NOT NULL, "unit_tax_toman" BIGINT NOT NULL DEFAULT 0, "discount_amount_toman" BIGINT NOT NULL DEFAULT 0, "line_total_toman" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commerce_order_lines_pkey" PRIMARY KEY ("id"), CONSTRAINT "commerce_order_lines_order_position_key" UNIQUE ("order_id", "position"),
  CONSTRAINT "commerce_order_lines_amounts_check" CHECK ("position" > 0 AND "quantity" > 0 AND "unit_price_toman" >= 0 AND "unit_tax_toman" >= 0 AND "discount_amount_toman" >= 0 AND "line_total_toman" = (("unit_price_toman" + "unit_tax_toman") * "quantity") - "discount_amount_toman" AND "line_total_toman" >= 0),
  CONSTRAINT "commerce_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_order_lines_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "commerce_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "commerce_order_snapshots" (
  "id" UUID NOT NULL, "order_id" UUID NOT NULL, "subtotal_amount_toman" BIGINT NOT NULL, "tax_amount_toman" BIGINT NOT NULL DEFAULT 0,
  "discount_amount_toman" BIGINT NOT NULL DEFAULT 0, "shipping_amount_toman" BIGINT NOT NULL DEFAULT 0, "total_amount_toman" BIGINT NOT NULL,
  "payload" JSONB NOT NULL, "integrity_hash" CHAR(64) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commerce_order_snapshots_pkey" PRIMARY KEY ("id"), CONSTRAINT "commerce_order_snapshots_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "commerce_order_snapshots_amounts_check" CHECK ("subtotal_amount_toman" >= 0 AND "tax_amount_toman" >= 0 AND "discount_amount_toman" >= 0 AND "shipping_amount_toman" >= 0 AND "total_amount_toman" >= 0 AND "total_amount_toman" = "subtotal_amount_toman" + "tax_amount_toman" - "discount_amount_toman" + "shipping_amount_toman"),
  CONSTRAINT "commerce_order_snapshots_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "inventory_reservations" (
  "id" UUID NOT NULL, "inventory_item_id" UUID NOT NULL, "order_id" UUID NOT NULL, "quantity" INTEGER NOT NULL,
  "status" "inventory_reservation_status" NOT NULL DEFAULT 'ACTIVE', "expires_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"), CONSTRAINT "inventory_reservations_item_order_key" UNIQUE ("inventory_item_id", "order_id"),
  CONSTRAINT "inventory_reservations_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_reservations_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "inventory_reservations_status_expires_id_idx" ON "inventory_reservations"("status", "expires_at", "id");
CREATE TABLE "inventory_ledger_entries" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "inventory_item_id" UUID NOT NULL, "entry_type" "inventory_ledger_entry_type" NOT NULL,
  "quantity_delta" INTEGER NOT NULL, "reference_type" VARCHAR(80) NOT NULL, "reference_id" UUID NOT NULL, "idempotency_key" VARCHAR(240) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_ledger_entries_pkey" PRIMARY KEY ("id"), CONSTRAINT "inventory_ledger_entries_idempotency_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "inventory_ledger_entries_quantity_delta_check" CHECK ("quantity_delta" <> 0),
  CONSTRAINT "inventory_ledger_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_ledger_entries_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "inventory_ledger_entries_item_created_id_idx" ON "inventory_ledger_entries"("inventory_item_id", "created_at", "id");
CREATE INDEX "inventory_ledger_entries_reference_idx" ON "inventory_ledger_entries"("reference_type", "reference_id");

CREATE TABLE "payment_provider_configs" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "provider_code" VARCHAR(64) NOT NULL,
  "provider_unit" VARCHAR(32) NOT NULL DEFAULT 'UNCONFIRMED', "go_live_ready" BOOLEAN NOT NULL DEFAULT false, "enabled" BOOLEAN NOT NULL DEFAULT false, "is_default" BOOLEAN NOT NULL DEFAULT false,
  "active_revision_id" UUID, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payment_provider_configs_pkey" PRIMARY KEY ("id"), CONSTRAINT "payment_provider_configs_clinic_provider_code_key" UNIQUE ("clinic_id", "provider_code"), CONSTRAINT "payment_provider_configs_active_revision_id_key" UNIQUE ("active_revision_id"),
  CONSTRAINT "payment_provider_configs_provider_code_check" CHECK ("provider_code" ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  CONSTRAINT "payment_provider_configs_go_live_check" CHECK ((NOT "enabled" AND NOT "is_default") OR ("go_live_ready" AND "provider_unit" <> 'UNCONFIRMED')),
  CONSTRAINT "payment_provider_configs_default_check" CHECK (NOT "is_default" OR "enabled"),
  CONSTRAINT "payment_provider_configs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "payment_provider_configs_one_default_per_clinic_idx" ON "payment_provider_configs"("clinic_id") WHERE "is_default";
CREATE TABLE "payment_provider_credential_versions" (
  "id" UUID NOT NULL, "config_id" UUID NOT NULL, "version_number" INTEGER NOT NULL, "status" "credential_version_status" NOT NULL DEFAULT 'ACTIVE',
  "encrypted_payload" BYTEA, "encryption_nonce" BYTEA, "authentication_tag" BYTEA, "encryption_key_version" VARCHAR(100), "crypto_shredded_at" TIMESTAMPTZ(3), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_provider_credential_versions_pkey" PRIMARY KEY ("id"), CONSTRAINT "payment_provider_credential_versions_config_version_key" UNIQUE ("config_id", "version_number"),
  CONSTRAINT "payment_provider_credential_versions_shape_check" CHECK (("status" = 'CRYPTO_SHREDDED' AND "encrypted_payload" IS NULL AND "encryption_nonce" IS NULL AND "authentication_tag" IS NULL AND "encryption_key_version" IS NULL AND "crypto_shredded_at" IS NOT NULL) OR ("status" <> 'CRYPTO_SHREDDED' AND "encrypted_payload" IS NOT NULL AND "encryption_nonce" IS NOT NULL AND "authentication_tag" IS NOT NULL AND "encryption_key_version" IS NOT NULL AND "crypto_shredded_at" IS NULL)),
  CONSTRAINT "payment_provider_credential_versions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "payment_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "payment_provider_config_revisions" (
  "id" UUID NOT NULL, "config_id" UUID NOT NULL, "revision_number" INTEGER NOT NULL, "provider_unit" VARCHAR(32) NOT NULL DEFAULT 'UNCONFIRMED', "go_live_ready" BOOLEAN NOT NULL DEFAULT false,
  "capability_snapshot" JSONB NOT NULL DEFAULT '{}', "credential_version_id" UUID, "created_by_user_id" UUID, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_provider_config_revisions_pkey" PRIMARY KEY ("id"), CONSTRAINT "payment_provider_config_revisions_config_revision_key" UNIQUE ("config_id", "revision_number"),
  CONSTRAINT "payment_provider_config_revisions_number_check" CHECK ("revision_number" > 0),
  CONSTRAINT "payment_provider_config_revisions_go_live_check" CHECK (NOT "go_live_ready" OR "provider_unit" <> 'UNCONFIRMED'),
  CONSTRAINT "payment_provider_config_revisions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "payment_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_provider_config_revisions_credential_version_id_fkey" FOREIGN KEY ("credential_version_id") REFERENCES "payment_provider_credential_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_provider_config_revisions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
ALTER TABLE "payment_provider_configs" ADD CONSTRAINT "payment_provider_configs_active_revision_id_fkey" FOREIGN KEY ("active_revision_id") REFERENCES "payment_provider_config_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE OR REPLACE FUNCTION "validate_payment_provider_config_revision_link"() RETURNS TRIGGER AS $$
DECLARE revision_config_id UUID; revision_unit VARCHAR(32); revision_ready BOOLEAN;
BEGIN
  IF NEW."active_revision_id" IS NULL THEN RETURN NEW; END IF;
  SELECT "config_id", "provider_unit", "go_live_ready" INTO revision_config_id, revision_unit, revision_ready
  FROM "payment_provider_config_revisions" WHERE "id" = NEW."active_revision_id";
  IF revision_config_id IS DISTINCT FROM NEW."id" THEN
    RAISE EXCEPTION 'active payment provider revision must belong to its config';
  END IF;
  IF NEW."provider_unit" <> revision_unit OR NEW."go_live_ready" <> revision_ready THEN
    RAISE EXCEPTION 'payment provider config must mirror its active revision readiness';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "payment_provider_configs_validate_active_revision" BEFORE INSERT OR UPDATE ON "payment_provider_configs" FOR EACH ROW EXECUTE FUNCTION "validate_payment_provider_config_revision_link"();
CREATE OR REPLACE FUNCTION "validate_payment_provider_revision_credential"() RETURNS TRIGGER AS $$
DECLARE credential_config_id UUID;
BEGIN
  IF NEW."credential_version_id" IS NULL THEN RETURN NEW; END IF;
  SELECT "config_id" INTO credential_config_id FROM "payment_provider_credential_versions" WHERE "id" = NEW."credential_version_id";
  IF credential_config_id IS DISTINCT FROM NEW."config_id" THEN
    RAISE EXCEPTION 'payment provider credential version must belong to its config';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "payment_provider_config_revisions_validate_credential" BEFORE INSERT OR UPDATE ON "payment_provider_config_revisions" FOR EACH ROW EXECUTE FUNCTION "validate_payment_provider_revision_credential"();

CREATE TABLE "payment_attempts" (
  "id" UUID NOT NULL, "clinic_id" UUID NOT NULL, "patient_id" UUID NOT NULL, "order_id" UUID NOT NULL, "provider_config_revision_id" UUID NOT NULL,
  "provider_order_id" BIGINT NOT NULL, "commerce_amount_toman" BIGINT NOT NULL, "provider_amount" BIGINT, "provider_unit" VARCHAR(32) NOT NULL DEFAULT 'UNCONFIRMED',
  "status" "payment_attempt_status" NOT NULL DEFAULT 'CREATED', "idempotency_key" VARCHAR(240) NOT NULL, "provider_token" VARCHAR(512), "provider_result_code" VARCHAR(32),
  "callback_received_at" TIMESTAMPTZ(3), "verified_at" TIMESTAMPTZ(3), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id"), CONSTRAINT "payment_attempts_provider_order_id_key" UNIQUE ("provider_order_id"), CONSTRAINT "payment_attempts_provider_token_key" UNIQUE ("provider_token"), CONSTRAINT "payment_attempts_patient_idempotency_key" UNIQUE ("patient_id", "idempotency_key"),
  CONSTRAINT "payment_attempts_amounts_check" CHECK ("provider_order_id" > 0 AND "commerce_amount_toman" > 0 AND (("provider_unit" = 'UNCONFIRMED' AND "provider_amount" IS NULL) OR ("provider_unit" <> 'UNCONFIRMED' AND "provider_amount" > 0))),
  CONSTRAINT "payment_attempts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_attempts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_attempts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_attempts_provider_config_revision_id_fkey" FOREIGN KEY ("provider_config_revision_id") REFERENCES "payment_provider_config_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "payment_attempts_order_created_id_idx" ON "payment_attempts"("order_id", "created_at", "id");
CREATE TABLE "payments" (
  "id" UUID NOT NULL, "order_id" UUID NOT NULL, "payment_attempt_id" UUID NOT NULL,
  "commerce_amount_toman" BIGINT NOT NULL, "provider_amount" BIGINT NOT NULL, "provider_unit" VARCHAR(32) NOT NULL,
  "provider_reference_id" VARCHAR(128), "provider_trace_number" VARCHAR(128), "status" "payment_status" NOT NULL DEFAULT 'VERIFIED', "verified_at" TIMESTAMPTZ(3) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"), CONSTRAINT "payments_order_id_key" UNIQUE ("order_id"), CONSTRAINT "payments_payment_attempt_id_key" UNIQUE ("payment_attempt_id"), CONSTRAINT "payments_provider_reference_id_key" UNIQUE ("provider_reference_id"),
  CONSTRAINT "payments_amounts_check" CHECK ("commerce_amount_toman" > 0 AND "provider_amount" > 0 AND "provider_unit" <> 'UNCONFIRMED'),
  CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payments_payment_attempt_id_fkey" FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "refunds" (
  "id" UUID NOT NULL, "payment_id" UUID NOT NULL, "amount_toman" BIGINT NOT NULL, "status" "refund_status" NOT NULL DEFAULT 'REQUESTED', "idempotency_key" VARCHAR(240) NOT NULL,
  "completed_at" TIMESTAMPTZ(3), "evidence_reference" VARCHAR(512), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"), CONSTRAINT "refunds_idempotency_key" UNIQUE ("idempotency_key"), CONSTRAINT "refunds_amount_toman_check" CHECK ("amount_toman" > 0),
  CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "refunds_payment_status_created_idx" ON "refunds"("payment_id", "status", "created_at");

CREATE OR REPLACE FUNCTION "reject_commerce_order_snapshot_mutation"() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'commerce order snapshot is immutable'; RETURN NULL; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "commerce_order_snapshots_immutable" BEFORE UPDATE OR DELETE ON "commerce_order_snapshots" FOR EACH ROW EXECUTE FUNCTION "reject_commerce_order_snapshot_mutation"();
CREATE OR REPLACE FUNCTION "reject_payment_provider_config_revision_mutation"() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'payment provider config revision is immutable'; RETURN NULL; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "payment_provider_config_revisions_immutable" BEFORE UPDATE OR DELETE ON "payment_provider_config_revisions" FOR EACH ROW EXECUTE FUNCTION "reject_payment_provider_config_revision_mutation"();
