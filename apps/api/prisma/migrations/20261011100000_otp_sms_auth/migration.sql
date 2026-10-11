CREATE TYPE "sms_provider_credential_status" AS ENUM ('ACTIVE', 'RETIRED', 'CRYPTO_SHREDDED');
CREATE TYPE "otp_challenge_status" AS ENUM ('PENDING', 'ACCEPTED', 'FAILED', 'UNKNOWN', 'CONSUMED', 'EXPIRED', 'SUPERSEDED', 'LOCKED');
CREATE TYPE "sms_delivery_attempt_status" AS ENUM ('PENDING', 'ACCEPTED', 'FAILED', 'UNKNOWN');

CREATE TABLE "sms_provider_configs" (
  "id" UUID NOT NULL,
  "provider_code" VARCHAR(64) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "active_revision_id" UUID,
  "health_metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sms_provider_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sms_provider_configs_enabled_default_check" CHECK (NOT "is_default" OR "enabled")
);
CREATE UNIQUE INDEX "sms_provider_configs_provider_code_key" ON "sms_provider_configs"("provider_code");
CREATE UNIQUE INDEX "sms_provider_configs_active_revision_id_key" ON "sms_provider_configs"("active_revision_id");
CREATE UNIQUE INDEX "sms_provider_configs_single_default_key" ON "sms_provider_configs" ((true)) WHERE "is_default";

CREATE TABLE "sms_provider_credential_versions" (
  "id" UUID NOT NULL,
  "config_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "status" "sms_provider_credential_status" NOT NULL DEFAULT 'ACTIVE',
  "encrypted_payload" BYTEA,
  "encryption_nonce" BYTEA,
  "authentication_tag" BYTEA,
  "encryption_key_version" VARCHAR(100),
  "crypto_shredded_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sms_provider_credential_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sms_provider_credential_material_check" CHECK (("status" = 'CRYPTO_SHREDDED' AND "encrypted_payload" IS NULL AND "encryption_nonce" IS NULL AND "authentication_tag" IS NULL) OR ("status" <> 'CRYPTO_SHREDDED' AND "encrypted_payload" IS NOT NULL AND "encryption_nonce" IS NOT NULL AND "authentication_tag" IS NOT NULL AND "encryption_key_version" IS NOT NULL))
);
CREATE UNIQUE INDEX "sms_provider_credential_versions_config_version_key" ON "sms_provider_credential_versions"("config_id", "version_number");
CREATE UNIQUE INDEX "sms_provider_credential_versions_one_active_key" ON "sms_provider_credential_versions"("config_id") WHERE "status" = 'ACTIVE';

CREATE TABLE "sms_provider_config_revisions" (
  "id" UUID NOT NULL,
  "config_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "non_secret_config" JSONB NOT NULL DEFAULT '{}',
  "capability_snapshot" JSONB NOT NULL DEFAULT '{}',
  "credential_version_id" UUID,
  "created_by_user_id" UUID,
  "idempotency_key" VARCHAR(240),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sms_provider_config_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sms_provider_config_revisions_config_revision_key" ON "sms_provider_config_revisions"("config_id", "revision_number");
CREATE UNIQUE INDEX "sms_provider_config_revisions_config_idempotency_key" ON "sms_provider_config_revisions"("config_id", "idempotency_key");

CREATE TABLE "otp_policies" (
  "id" VARCHAR(64) NOT NULL DEFAULT 'default', "enabled" BOOLEAN NOT NULL DEFAULT true,
  "code_length" INTEGER NOT NULL DEFAULT 6, "expires_in_seconds" INTEGER NOT NULL DEFAULT 120,
  "resend_cooldown_seconds" INTEGER NOT NULL DEFAULT 60, "max_verify_attempts" INTEGER NOT NULL DEFAULT 5,
  "phone_request_limit" INTEGER NOT NULL DEFAULT 3, "request_window_seconds" INTEGER NOT NULL DEFAULT 900,
  "updated_by_user_id" UUID, "updated_at" TIMESTAMPTZ(3) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otp_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "otp_policy_bounds_check" CHECK ("code_length" BETWEEN 4 AND 8 AND "expires_in_seconds" BETWEEN 60 AND 600 AND "resend_cooldown_seconds" BETWEEN 30 AND 600 AND "max_verify_attempts" BETWEEN 3 AND 10 AND "phone_request_limit" BETWEEN 1 AND 10 AND "request_window_seconds" BETWEEN 300 AND 3600)
);

CREATE TABLE "otp_challenges" (
  "id" UUID NOT NULL, "purpose" VARCHAR(64) NOT NULL, "canonical_phone" VARCHAR(13) NOT NULL,
  "verifier" CHAR(64) NOT NULL, "status" "otp_challenge_status" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMPTZ(3) NOT NULL, "resend_available_at" TIMESTAMPTZ(3) NOT NULL,
  "verify_attempt_count" INTEGER NOT NULL DEFAULT 0, "max_verify_attempts" INTEGER NOT NULL,
  "remember" BOOLEAN NOT NULL DEFAULT false, "idempotency_key" VARCHAR(240) NOT NULL, "request_ip_hash" CHAR(64),
  "provider_config_revision_id" UUID, "consumed_at" TIMESTAMPTZ(3), "superseded_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "otp_challenge_purpose_check" CHECK ("purpose" = 'AUTHENTICATION'),
  CONSTRAINT "otp_challenge_attempts_check" CHECK ("verify_attempt_count" >= 0 AND "max_verify_attempts" BETWEEN 3 AND 10)
);
CREATE UNIQUE INDEX "otp_challenges_purpose_phone_idempotency_key" ON "otp_challenges"("purpose", "canonical_phone", "idempotency_key");
CREATE INDEX "otp_challenges_phone_created_at_idx" ON "otp_challenges"("canonical_phone", "created_at");
CREATE INDEX "otp_challenges_status_expires_at_idx" ON "otp_challenges"("status", "expires_at");

CREATE TABLE "sms_delivery_attempts" (
  "id" UUID NOT NULL, "challenge_id" UUID, "provider_config_id" UUID, "provider_config_revision_id" UUID,
  "recipient_hash" CHAR(64) NOT NULL, "recipient_masked" VARCHAR(32) NOT NULL,
  "status" "sms_delivery_attempt_status" NOT NULL DEFAULT 'PENDING', "provider_reference" VARCHAR(256),
  "error_category" VARCHAR(100), "is_test" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolved_at" TIMESTAMPTZ(3),
  CONSTRAINT "sms_delivery_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sms_delivery_attempts_created_at_id_idx" ON "sms_delivery_attempts"("created_at", "id");
CREATE INDEX "sms_delivery_attempts_challenge_id_idx" ON "sms_delivery_attempts"("challenge_id");

ALTER TABLE "sms_provider_credential_versions" ADD CONSTRAINT "sms_provider_credential_versions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "sms_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sms_provider_config_revisions" ADD CONSTRAINT "sms_provider_config_revisions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "sms_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sms_provider_config_revisions" ADD CONSTRAINT "sms_provider_config_revisions_credential_version_id_fkey" FOREIGN KEY ("credential_version_id") REFERENCES "sms_provider_credential_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sms_provider_config_revisions" ADD CONSTRAINT "sms_provider_config_revisions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sms_provider_configs" ADD CONSTRAINT "sms_provider_configs_active_revision_id_fkey" FOREIGN KEY ("active_revision_id") REFERENCES "sms_provider_config_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_provider_config_revision_id_fkey" FOREIGN KEY ("provider_config_revision_id") REFERENCES "sms_provider_config_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sms_delivery_attempts" ADD CONSTRAINT "sms_delivery_attempts_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "otp_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sms_delivery_attempts" ADD CONSTRAINT "sms_delivery_attempts_provider_config_id_fkey" FOREIGN KEY ("provider_config_id") REFERENCES "sms_provider_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sms_delivery_attempts" ADD CONSTRAINT "sms_delivery_attempts_provider_config_revision_id_fkey" FOREIGN KEY ("provider_config_revision_id") REFERENCES "sms_provider_config_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "otp_policies" ("id", "updated_at") VALUES ('default', CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
