-- F09-T09 additive order operations. Historical order/payment snapshots remain immutable.

ALTER TYPE "commerce_order_status" ADD VALUE IF NOT EXISTS 'FULFILLMENT_PENDING';
ALTER TYPE "commerce_order_status" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';
ALTER TYPE "commerce_order_status" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "commerce_order_status" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "commerce_order_status" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED';
ALTER TYPE "commerce_order_status" ADD VALUE IF NOT EXISTS 'RETURN_REQUESTED';
ALTER TYPE "commerce_order_status" ADD VALUE IF NOT EXISTS 'CANCELLATION_REJECTED';
ALTER TYPE "commerce_order_status" ADD VALUE IF NOT EXISTS 'RETURN_REJECTED';
ALTER TYPE "refund_status" ADD VALUE IF NOT EXISTS 'MANUAL_EXECUTION_PENDING';

ALTER TABLE "commerce_orders"
  ADD COLUMN "carrier_name" VARCHAR(160),
  ADD COLUMN "tracking_code" VARCHAR(160),
  ADD COLUMN "tracking_url" VARCHAR(2048),
  ADD COLUMN "tracking_updated_at" TIMESTAMPTZ(3),
  ADD CONSTRAINT "commerce_orders_tracking_shape_check"
    CHECK (("tracking_url" IS NULL OR "tracking_url" ~ '^https://') AND
           ("tracking_code" IS NULL OR length(trim("tracking_code")) > 0) AND
           ("carrier_name" IS NULL OR length(trim("carrier_name")) > 0));

CREATE TABLE "commerce_order_operations" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "idempotency_key" VARCHAR(240) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commerce_order_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_order_operations_order_action_key" UNIQUE ("order_id", "action", "idempotency_key"),
  CONSTRAINT "commerce_order_operations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_order_operations_action_check" CHECK ("action" ~ '^[A-Z_]{3,64}$')
);

ALTER TABLE "payment_attempts"
  ADD COLUMN "reconciliation_evidence_reference" VARCHAR(512),
  ADD COLUMN "reconciled_at" TIMESTAMPTZ(3);

ALTER TABLE "refunds"
  ADD COLUMN "approved_at" TIMESTAMPTZ(3),
  ADD COLUMN "rejected_at" TIMESTAMPTZ(3);

CREATE OR REPLACE FUNCTION "reject_payment_mutation_after_verification"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' OR NEW."order_id" IS DISTINCT FROM OLD."order_id" OR NEW."payment_attempt_id" IS DISTINCT FROM OLD."payment_attempt_id" OR NEW."commerce_amount_toman" IS DISTINCT FROM OLD."commerce_amount_toman" OR NEW."provider_amount" IS DISTINCT FROM OLD."provider_amount" OR NEW."provider_unit" IS DISTINCT FROM OLD."provider_unit" THEN
    RAISE EXCEPTION 'verified payment commercial facts are immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "payments_commercial_facts_immutable" BEFORE UPDATE OR DELETE ON "payments"
FOR EACH ROW EXECUTE FUNCTION "reject_payment_mutation_after_verification"();
