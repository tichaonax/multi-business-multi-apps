-- MBM-294 correction: "top-level category icon" belongs on InventoryDomains,
-- not BusinessCategories. Live DB audit during Phase 3 planning showed
-- clothing's actual top-level tier (comparable in count/granularity to
-- the source catalog's 23 top-level categories) is InventoryDomains (42 rows), while
-- BusinessCategories (242 rows, e.g. "Night Dress", "Winter Jacket") is the
-- next tier down — the previous migration put iconImageId on the wrong tier.
-- Safe to drop outright: the column was added in the immediately-preceding
-- migration and nothing has ever written to it (zero categories imported yet).

-- DropForeignKey
ALTER TABLE "business_categories" DROP CONSTRAINT "business_categories_iconImageId_fkey";

-- AlterTable
ALTER TABLE "business_categories" DROP COLUMN "iconImageId";

-- AlterTable: icon now lives on the actual top-level tier
ALTER TABLE "inventory_domains" ADD COLUMN     "iconImageId" TEXT;

-- AlterTable: the source catalog's floating gallery images attach at the domain (top-level)
-- tier — see MBM-294 plan §2.1 — categoryId/subcategoryId remain for Part B's
-- product-driven auto-tagging use case (products reference BusinessCategories
-- directly), so a reference image row can now attach to any one of the three
-- tiers depending on which flow created it.
ALTER TABLE "category_reference_images" ADD COLUMN     "domainId" TEXT;

-- CreateIndex
CREATE INDEX "inventory_domains_iconImageId_idx" ON "inventory_domains"("iconImageId");

-- CreateIndex
CREATE INDEX "category_reference_images_domainId_idx" ON "category_reference_images"("domainId");

-- AddForeignKey
ALTER TABLE "inventory_domains" ADD CONSTRAINT "inventory_domains_iconImageId_fkey" FOREIGN KEY ("iconImageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_reference_images" ADD CONSTRAINT "category_reference_images_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "inventory_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
