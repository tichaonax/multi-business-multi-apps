-- Add sub_category_id column to stock_take_draft_items
-- This separates the 4-level hierarchy properly:
-- domain (domainId) → category (categoryId) → sub-category (subCategoryId)
-- Previously categoryId was overloaded to store either a BusinessCategory or InventorySubcategory id.

ALTER TABLE "stock_take_draft_items"
  ADD COLUMN IF NOT EXISTS "subCategoryId" TEXT;

-- Back-fill existing rows: where categoryId points to an inventory_subcategory,
-- move it into subCategoryId and replace categoryId with the parent BusinessCategory id.
UPDATE "stock_take_draft_items" sdi
SET
  "subCategoryId" = sdi."categoryId",
  "categoryId"    = isc."categoryId"
FROM "inventory_subcategories" isc
WHERE sdi."categoryId" = isc.id
  AND sdi."subCategoryId" IS NULL;
