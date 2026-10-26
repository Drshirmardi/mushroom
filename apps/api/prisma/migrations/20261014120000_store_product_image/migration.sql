CREATE TYPE "commerce_product_image_status" AS ENUM ('READY', 'DELETE_PENDING');
CREATE TABLE "commerce_product_images" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "object_key" VARCHAR(512) NOT NULL,
  "mime_type" VARCHAR(40) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "alt_text" VARCHAR(240) NOT NULL,
  "status" "commerce_product_image_status" NOT NULL DEFAULT 'READY',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_product_images_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "commerce_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commerce_product_images_verified_webp" CHECK ("mime_type" = 'image/webp'),
  CONSTRAINT "commerce_product_images_size_bounds" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880),
  CONSTRAINT "commerce_product_images_dimension_bounds" CHECK ("width" > 0 AND "height" > 0 AND "width" <= 1600 AND "height" <= 1600)
);
CREATE UNIQUE INDEX "commerce_product_images_product_id_key" ON "commerce_product_images"("product_id");
CREATE UNIQUE INDEX "commerce_product_images_object_key_key" ON "commerce_product_images"("object_key");
