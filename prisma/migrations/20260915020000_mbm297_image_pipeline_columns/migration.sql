-- MBM-297 Phase C: product image pipeline additions to `images`.
-- All new columns are nullable — every existing row (uploaded before this
-- pipeline existed) stays valid with no backfill needed.

CREATE TYPE "ImageSourceType" AS ENUM ('DESKTOP_UPLOAD', 'MOBILE_UPLOAD', 'MOBILE_CAMERA');
CREATE TYPE "BackgroundProcessingStatus" AS ENUM ('NONE', 'PROCESSED', 'FAILED', 'KEPT_ORIGINAL');

ALTER TABLE "images" ADD COLUMN "thumbnailImageId" TEXT;
ALTER TABLE "images" ADD COLUMN "sourceType" "ImageSourceType";
ALTER TABLE "images" ADD COLUMN "backgroundProcessingStatus" "BackgroundProcessingStatus";
ALTER TABLE "images" ADD COLUMN "contentHash" TEXT;

ALTER TABLE "images" ADD CONSTRAINT "images_thumbnailImageId_key" UNIQUE ("thumbnailImageId");
ALTER TABLE "images" ADD CONSTRAINT "images_thumbnailImageId_fkey"
  FOREIGN KEY ("thumbnailImageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "images_contentHash_idx" ON "images"("contentHash");
