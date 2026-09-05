-- MBM-294: Clothing category/image import + reusable image gallery + business image gallery
-- Hand-written (not `prisma migrate dev`) — the dev DB has pre-existing, unrelated drift against
-- the migration history (confirmed via shadow-DB replay failure on an older, unrelated migration),
-- so this contains only the statements for this feature's own schema changes.

-- AlterTable: category icon image (Part A)
ALTER TABLE "business_categories" ADD COLUMN     "iconImageId" TEXT;

-- AlterTable: image business/uploader attribution (Part B)
ALTER TABLE "images" ADD COLUMN     "businessId" TEXT,
ADD COLUMN     "uploadedBy" TEXT;

-- CreateTable: shared, category-tagged reference image pool (Part A)
CREATE TABLE "category_reference_images" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "businessType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "isUserUploaded" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_reference_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable: per-business tag vocabulary (Part B)
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: image <-> tag join (Part B)
CREATE TABLE "image_tags" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_reference_images_businessType_idx" ON "category_reference_images"("businessType");

-- CreateIndex
CREATE INDEX "category_reference_images_categoryId_idx" ON "category_reference_images"("categoryId");

-- CreateIndex
CREATE INDEX "category_reference_images_subcategoryId_idx" ON "category_reference_images"("subcategoryId");

-- CreateIndex
CREATE INDEX "category_reference_images_imageId_idx" ON "category_reference_images"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_businessId_name_key" ON "tags"("businessId", "name");

-- CreateIndex
CREATE INDEX "image_tags_tagId_idx" ON "image_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "image_tags_imageId_tagId_key" ON "image_tags"("imageId", "tagId");

-- CreateIndex
CREATE INDEX "images_businessId_idx" ON "images"("businessId");

-- AddForeignKey
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_iconImageId_fkey" FOREIGN KEY ("iconImageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_reference_images" ADD CONSTRAINT "category_reference_images_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_reference_images" ADD CONSTRAINT "category_reference_images_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "business_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_reference_images" ADD CONSTRAINT "category_reference_images_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "inventory_subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_reference_images" ADD CONSTRAINT "category_reference_images_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_tags" ADD CONSTRAINT "image_tags_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_tags" ADD CONSTRAINT "image_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: attribute pre-existing product images to the business that owns
-- the product they're already used on (confirmed required on first go — see
-- projectplan-MBM-294 §Phase 7). Images with no product_images row (e.g.
-- employee photos, business logos) correctly stay businessId = NULL, since
-- they were never product images.
UPDATE "images" i
SET "businessId" = bp."businessId"
FROM "product_images" pi
JOIN "business_products" bp ON bp."id" = pi."productId"
WHERE pi."imageId" = i."id"
  AND i."businessId" IS NULL;
