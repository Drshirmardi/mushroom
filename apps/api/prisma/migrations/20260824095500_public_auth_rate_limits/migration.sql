CREATE TABLE "auth_rate_limit_buckets" (
    "key" CHAR(64) NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,
    "request_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "auth_rate_limit_buckets_request_count_check" CHECK ("request_count" >= 1)
);

CREATE INDEX "auth_rate_limit_buckets_updated_at_idx"
    ON "auth_rate_limit_buckets"("updated_at");
