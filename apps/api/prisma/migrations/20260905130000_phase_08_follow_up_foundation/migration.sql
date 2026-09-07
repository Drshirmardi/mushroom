-- CreateEnum
CREATE TYPE "content_publication_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "outbox_event_status" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "HealthObservationMetric" AS ENUM ('PAIN', 'MOOD', 'SLEEP_HOURS', 'STRESS', 'ENERGY', 'WEIGHT');

-- CreateEnum
CREATE TYPE "HealthObservationUnit" AS ENUM ('SCORE_10', 'SCORE_5', 'HOURS', 'KILOGRAMS');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('REMINDER', 'TREATMENT', 'CONTENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('IN_APP');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('DELIVERED');

-- CreateTable
CREATE TABLE "article_categories" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "summary" VARCHAR(500),
    "body" TEXT NOT NULL,
    "publication_status" "content_publication_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "cover_object_key" VARCHAR(512),
    "cover_content_type" VARCHAR(120),
    "cover_size_bytes" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "destination_url" VARCHAR(2048),
    "publication_status" "content_publication_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "media_object_key" VARCHAR(512),
    "media_content_type" VARCHAR(120),
    "media_size_bytes" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(120) NOT NULL,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(240) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_event_status" NOT NULL DEFAULT 'PENDING',
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(500),
    "delivered_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "channel" "NotificationDeliveryChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL,
    "delivered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "patient_id" UUID NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("patient_id","category")
);

-- CreateTable
CREATE TABLE "health_observations" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "metric" "HealthObservationMetric" NOT NULL,
    "unit" "HealthObservationUnit" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mezaj_results" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "assessment_submission_id" UUID NOT NULL,
    "result_band_snapshot" JSONB NOT NULL,
    "assessed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mezaj_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_clinic_slug_key" ON "article_categories"("clinic_id", "slug");

-- CreateIndex
CREATE INDEX "articles_clinic_publication_published_idx" ON "articles"("clinic_id", "publication_status", "published_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_clinic_slug_key" ON "articles"("clinic_id", "slug");

-- CreateIndex
CREATE INDEX "banners_clinic_publication_published_idx" ON "banners"("clinic_id", "publication_status", "published_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_idempotency_key" ON "outbox_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_idx" ON "outbox_events"("status", "available_at", "id");

-- CreateIndex
CREATE INDEX "notifications_recipient_read_created_idx" ON "notifications"("recipient_id", "read_at", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notification_channel_key" ON "notification_deliveries"("notification_id", "channel");

-- CreateIndex
CREATE INDEX "health_observations_patient_metric_time_idx" ON "health_observations"("patient_id", "metric", "observed_at", "id");

-- CreateIndex
CREATE INDEX "health_observations_clinic_patient_time_idx" ON "health_observations"("clinic_id", "patient_id", "observed_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "mezaj_results_submission_id_key" ON "mezaj_results"("assessment_submission_id");

-- CreateIndex
CREATE INDEX "mezaj_results_patient_assessed_idx" ON "mezaj_results"("patient_id", "assessed_at", "id");

-- AddForeignKey
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "article_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_observations" ADD CONSTRAINT "health_observations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_observations" ADD CONSTRAINT "health_observations_patient_id_clinic_id_fkey" FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patient_profiles"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mezaj_results" ADD CONSTRAINT "mezaj_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mezaj_results" ADD CONSTRAINT "mezaj_results_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mezaj_results" ADD CONSTRAINT "mezaj_results_assessment_submission_id_fkey" FOREIGN KEY ("assessment_submission_id") REFERENCES "patient_assessment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
