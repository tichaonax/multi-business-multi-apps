-- =============================================================================
-- Migration: Catch-all category for remaining unclassified grocery inventory
-- =============================================================================
-- Creates a "General & Miscellaneous" domain + "General Grocery" category for
-- any grocery barcode_inventory_items that still have no categoryId after the
-- keyword-based reclassification migration (20260327000006).
-- Only affects grocery businesses and only items with categoryId IS NULL.
-- =============================================================================

-- ── 1. Insert catch-all domain (grocery only) ─────────────────────────────────
INSERT INTO inventory_domains (id, name, emoji, "businessType")
VALUES (
  'domain_grocery_general',
  'General & Miscellaneous',
  '🛒',
  'grocery'
)
ON CONFLICT (name, "businessType") DO NOTHING;

-- ── 2. Insert catch-all category linked to domain ─────────────────────────────
INSERT INTO business_categories (id, name, "businessType", "domainId", "businessId", "updatedAt")
VALUES (
  'cat_groc_general',
  'General Grocery',
  'grocery',
  'domain_grocery_general',
  NULL,
  NOW()
)
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ── 3. Assign all remaining unclassified grocery items to the catch-all ───────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_general'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND bi."categoryId" IS NULL;
