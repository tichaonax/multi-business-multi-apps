-- MBM-295: Tag System Expansion (schema only — data seed is the follow-up migration)
--
-- Hand-trimmed from `prisma migrate diff` output: the raw diff against the
-- live dev DB also surfaced a large amount of unrelated pre-existing drift
-- (the shadow-database replay for `prisma migrate dev` fails on an
-- unrelated, pre-existing drifted migration — same issue documented in
-- MBM-294's Phase 1), so only this feature's own statements are included
-- here, applied via `prisma migrate deploy` instead.
--
-- - Tags.businessId becomes nullable: NULL = a shared system tag (scoped by
--   businessType instead), matching BusinessCategories.businessId's own
--   nullable global/business-owned split.
-- - Tags.emoji defaults to '🏷️' so every existing row (all business-owned
--   today) and every future row without an explicit emoji gets one
--   automatically — no application-side guessing needed.
-- - Tags.groupLabel is for the seeded vocabulary's own section headers.
-- - tags_businessType_name_key is what makes ON CONFLICT ("businessType",
--   name) DO NOTHING possible in the follow-up seed migration — it only
--   actually constrains system tags, since Postgres treats every NULL in
--   businessType as distinct (per-business custom tags keep colliding only
--   within their own businessId via the pre-existing tags_businessId_name_key).
-- - product_tags mirrors image_tags' existing shape exactly, linking
--   BusinessProducts to Tags so products (not just images) can be tagged.

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "emoji" TEXT NOT NULL DEFAULT '🏷️',
ADD COLUMN     "groupLabel" TEXT,
ALTER COLUMN "businessId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "product_tags" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_tags_tagId_idx" ON "product_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "product_tags_productId_tagId_key" ON "product_tags"("productId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_businessType_name_key" ON "tags"("businessType", "name");

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
