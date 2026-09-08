-- Follow-up to 20260908120000_rename_clothing_brand_categories: that
-- migration renamed every clothing category referencing a third-party
-- brand/IP name EXCEPT this one, because -- unlike the other 117 -- it is a
-- real, user-created, business-owned category (businessId is not null) with
-- a live BarcodeInventoryItems row attached ("T-Shirt"), so it was left for
-- a direct decision rather than swept up automatically.
--
-- This applies the same fix now: removes the "Gucci" reference from both the
-- name and description, and upgrades the emoji from the generic brand
-- fallback (see the 20260908110000 clothing emoji migration) to one that
-- reflects the actual product type. Matched by exact id (not name) since
-- this is a single business-owned row, not a shared preset -- the FK
-- (BarcodeInventoryItems.categoryId) is untouched, so the live inventory
-- item keeps pointing at the same category, just under its new name.
--
-- Idempotent -- safe to re-run.

UPDATE business_categories
SET name = 'Designer Short Sleeve Shirt',
    description = 'Short Sleeve Shirt',
    emoji = '👕',
    "updatedAt" = NOW()
WHERE id = '964966f4-ec56-46e0-afdc-f29175291ef2'
  AND "businessType" = 'clothing';
