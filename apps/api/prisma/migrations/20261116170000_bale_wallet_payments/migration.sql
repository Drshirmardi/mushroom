-- Native Bale payment identities are bound to the authenticated session, not browser hints.
ALTER TABLE "sessions" ADD COLUMN "bale_provider_user_id" VARCHAR(64);

-- Native invoices share BillingIntent's atomic settlement and provider revisions.
ALTER TABLE "billing_gateway_attempts"
  ADD COLUMN "bale_provider_user_id" VARCHAR(64),
  ADD COLUMN "bale_transaction_id" VARCHAR(128),
  ADD COLUMN "bale_precheckout_approved_at" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "billing_gateway_attempts_bale_transaction_id_key"
  ON "billing_gateway_attempts"("bale_transaction_id");
