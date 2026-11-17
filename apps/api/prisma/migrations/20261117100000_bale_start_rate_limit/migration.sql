CREATE TABLE "bale_start_rate_limits" (
    "provider_user_id" VARCHAR(64) NOT NULL,
    "last_update_id" BIGINT NOT NULL,
    "recent_start_at" TIMESTAMPTZ(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMPTZ(3)[],
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "bale_start_rate_limits_pkey" PRIMARY KEY ("provider_user_id")
);
