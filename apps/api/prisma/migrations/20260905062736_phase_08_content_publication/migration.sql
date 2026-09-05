-- CreateEnum
CREATE TYPE "content_publication_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

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

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_clinic_slug_key" ON "article_categories"("clinic_id", "slug");

-- CreateIndex
CREATE INDEX "articles_clinic_publication_published_idx" ON "articles"("clinic_id", "publication_status", "published_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_clinic_slug_key" ON "articles"("clinic_id", "slug");

-- CreateIndex
CREATE INDEX "banners_clinic_publication_published_idx" ON "banners"("clinic_id", "publication_status", "published_at", "id");

-- AddForeignKey
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "article_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
