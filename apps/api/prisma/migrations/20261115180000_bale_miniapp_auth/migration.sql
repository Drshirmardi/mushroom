-- Additive Bale mini-app identity and one-time verified-contact onboarding.
-- Existing users, password/OTP flows and sessions are unchanged.
CREATE TABLE "external_auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(24) NOT NULL,
    "provider_user_id" VARCHAR(64) NOT NULL,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_auth_identities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "external_auth_identities_provider_user_key"
    ON "external_auth_identities"("provider", "provider_user_id");
CREATE INDEX "external_auth_identities_user_id_idx"
    ON "external_auth_identities"("user_id");
ALTER TABLE "external_auth_identities"
    ADD CONSTRAINT "external_auth_identities_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "bale_contact_challenges" (
    "id" UUID NOT NULL,
    "provider_user_id" VARCHAR(64) NOT NULL,
    "ticket_hash" CHAR(64) NOT NULL,
    "phone" VARCHAR(13),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "verified_at" TIMESTAMPTZ(3),
    "consumed_at" TIMESTAMPTZ(3),
    CONSTRAINT "bale_contact_challenges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bale_contact_challenges_provider_user_key"
    ON "bale_contact_challenges"("provider_user_id");
CREATE INDEX "bale_contact_challenges_expires_at_idx"
    ON "bale_contact_challenges"("expires_at");

CREATE TABLE "bale_webhook_events" (
    "update_id" BIGINT NOT NULL,
    "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bale_webhook_events_pkey" PRIMARY KEY ("update_id")
);
