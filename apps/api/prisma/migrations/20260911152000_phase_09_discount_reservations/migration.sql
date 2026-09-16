-- F09-T07: order-wide discount reservations and strict, clinic-scoped discount policy.
CREATE TYPE "discount_reservation_status" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

ALTER TABLE "commerce_discounts"
  ALTER COLUMN "code" TYPE VARCHAR(40),
  ADD COLUMN "per_patient_usage_limit" INTEGER,
  ADD CONSTRAINT "commerce_discounts_per_patient_usage_limit_check"
    CHECK ("per_patient_usage_limit" IS NULL OR "per_patient_usage_limit" > 0),
  ADD CONSTRAINT "commerce_discounts_code_canonical_check"
    CHECK ("code" ~ '^[A-Z0-9_-]{3,40}$');

CREATE TABLE "commerce_discount_reservations" (
  "id" UUID NOT NULL,
  "discount_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "discount_amount_toman" BIGINT NOT NULL,
  "status" "discount_reservation_status" NOT NULL DEFAULT 'ACTIVE',
  "expires_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_discount_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_discount_reservations_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "commerce_discount_reservations_amount_check" CHECK ("discount_amount_toman" > 0),
  CONSTRAINT "commerce_discount_reservations_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "commerce_discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_discount_reservations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_discount_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "commerce_discount_reservations_discount_status_expires_id_idx" ON "commerce_discount_reservations"("discount_id", "status", "expires_at", "id");
CREATE INDEX "commerce_discount_reservations_patient_status_expires_id_idx" ON "commerce_discount_reservations"("discount_id", "patient_id", "status", "expires_at", "id");

CREATE OR REPLACE FUNCTION "reject_commerce_discount_code_mutation"() RETURNS trigger AS $$
BEGIN
  IF NEW."code" IS DISTINCT FROM OLD."code" THEN
    RAISE EXCEPTION 'commerce discount code is immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "commerce_discounts_code_immutable" BEFORE UPDATE ON "commerce_discounts"
FOR EACH ROW EXECUTE FUNCTION "reject_commerce_discount_code_mutation"();

CREATE OR REPLACE FUNCTION "reject_commerce_discount_delete_with_history"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "commerce_discount_reservations" WHERE "discount_id" = OLD."id") THEN
    RAISE EXCEPTION 'commerce discount with reservation history cannot be deleted';
  END IF;
  RETURN OLD;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "commerce_discounts_no_delete_with_history" BEFORE DELETE ON "commerce_discounts"
FOR EACH ROW EXECUTE FUNCTION "reject_commerce_discount_delete_with_history"();
