-- Add optional imageId FK to product_images so images stored as bytea in the
-- images table can be linked to a product image record and served via /api/images/[id].
-- imageUrl stays unchanged for backwards compatibility.
ALTER TABLE "public"."product_images"
    ADD COLUMN IF NOT EXISTS "imageId" TEXT;

ALTER TABLE "public"."product_images"
    ADD CONSTRAINT "product_images_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "public"."images"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
