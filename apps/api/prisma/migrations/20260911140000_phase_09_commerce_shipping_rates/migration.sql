-- F09-T05 additive checkout/shipping configuration.
-- Existing Phase 09 foundation migration remains immutable.

CREATE TABLE "commerce_shipping_rates" (
  "id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "method" "commerce_shipping_method" NOT NULL DEFAULT 'COURIER',
  "amount_toman" BIGINT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_shipping_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_shipping_rates_clinic_method_key" UNIQUE ("clinic_id", "method"),
  CONSTRAINT "commerce_shipping_rates_courier_amount_check" CHECK ("method" = 'COURIER' AND "amount_toman" >= 0),
  CONSTRAINT "commerce_shipping_rates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "commerce_shipping_rates_clinic_method_active_idx" ON "commerce_shipping_rates"("clinic_id", "method", "is_active");

-- A numeric sequence is created by the checkout task. It is not a Sadad/provider OrderId and does not imply
-- provider amount conversion or any live gateway behavior.
CREATE SEQUENCE "commerce_order_number_seq" AS BIGINT;
SELECT setval(
  'commerce_order_number_seq',
  COALESCE((SELECT MAX("order_number") FROM "commerce_orders"), 0) + 1,
  false
);
ALTER TABLE "commerce_orders"
  ALTER COLUMN "order_number" SET DEFAULT nextval('commerce_order_number_seq'::regclass);
