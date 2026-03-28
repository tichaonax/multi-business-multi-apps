-- =============================================================================
-- Migration: Reclassify Existing Grocery Inventory Items
-- =============================================================================
-- Fixes items that are either:
--   (a) Uncategorised (categoryId IS NULL)
--   (b) Assigned to a business-specific category (not shared type-level)
--   (c) Clearly misclassified (e.g. Royco under Dairy, cheetos under Dairy)
-- Uses keyword matching on item name. Only updates grocery businesses.
-- All target categories are from the type-level taxonomy (businessId IS NULL).
-- =============================================================================

-- Helper: update grocery items whose name matches keywords, assigning them to
-- the correct type-level category.
-- Strategy: update items where category IS NULL *or* category is business-specific.
-- We never overwrite a correctly assigned type-level category unless misclassified.

-- ── 1. Sugar → Sugar & Salt ──────────────────────────────────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_sugar_salt'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND bi.name ILIKE '%sugar%'
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 2. Salt → Sugar & Salt ───────────────────────────────────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_sugar_salt'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND bi.name ILIKE '%salt%'
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 3. Rice → Grains & Cereals ───────────────────────────────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_grains'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND bi.name ILIKE '%rice%'
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 4. Maize Meal / Sadza → Grains & Cereals ─────────────────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_grains'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (bi.name ILIKE '%maize%' OR bi.name ILIKE '%meal%' OR bi.name ILIKE '%flour%' OR bi.name ILIKE '%oats%' OR bi.name ILIKE '%cereal%')
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 5. Cooking Oil → Cooking Oils ────────────────────────────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_oils'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (bi.name ILIKE '%oil%' OR bi.name ILIKE '%cooking oil%')
  AND bi.name NOT ILIKE '%petroleum%'
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 6. Crisps / Chips / Snacks (e.g. cheetos, Mega Snax) → Crisps & Chips ───
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_crisps'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%crisp%'
    OR bi.name ILIKE '%chip%'
    OR bi.name ILIKE '%cheeto%'
    OR bi.name ILIKE '%snax%'
    OR bi.name ILIKE '%puffed%'
    OR bi.name ILIKE '%popcorn%'
    OR bi.name ILIKE '%corn chip%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND (bc."businessId" IS NOT NULL OR bc.name IN ('Dairy Products','Fresh Produce','Pantry & Canned Goods'))
    )
  );

-- ── 7. Toothpaste / Toothbrush / Colgate / Oral B → Oral Care ────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_oral_care'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%toothpaste%'
    OR bi.name ILIKE '%toothbrush%'
    OR bi.name ILIKE '%colgate%'
    OR bi.name ILIKE '%oral b%'
    OR bi.name ILIKE '%oral-b%'
    OR bi.name ILIKE '%mouthwash%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 8. Royco / stock cubes / gravy → Sauces & Condiments ────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_sauces'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%royco%'
    OR bi.name ILIKE '%knorr%'
    OR bi.name ILIKE '%stock cube%'
    OR bi.name ILIKE '%gravy%'
    OR bi.name ILIKE '%tomato sauce%'
    OR bi.name ILIKE '%ketchup%'
    OR bi.name ILIKE '%mayonnaise%'
    OR bi.name ILIKE '%mayo%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND (bc."businessId" IS NOT NULL OR bc.name IN ('Dairy Products'))
    )
  );

-- ── 9. Bread / Loaf → Bread ──────────────────────────────────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_bread'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (bi.name ILIKE '%bread%' OR bi.name ILIKE '%loaf%' OR bi.name ILIKE '%bun%')
  AND bi.name NOT ILIKE '%breadcrumb%'
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 10. Tomatoes / vegetables → Vegetables ────────────────────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_vegetables'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%tomato%'
    OR bi.name ILIKE '%potato%'
    OR bi.name ILIKE '%onion%'
    OR bi.name ILIKE '%carrot%'
    OR bi.name ILIKE '%spinach%'
    OR bi.name ILIKE '%cabbage%'
    OR bi.name ILIKE '%lettuce%'
    OR bi.name ILIKE '%pepper%'
    OR bi.name ILIKE '%garlic%'
    OR bi.name ILIKE '%butternut%'
  )
  AND bi.name NOT ILIKE '%tomato sauce%'
  AND bi.name NOT ILIKE '%tomato paste%'
  AND bi.name NOT ILIKE '%canned tomato%'
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 11. Canned fish (Pilchards, Sardines, Tuna) → Canned Goods ───────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_canned_goods'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%pilchard%'
    OR bi.name ILIKE '%sardine%'
    OR bi.name ILIKE '%tuna%'
    OR bi.name ILIKE '%canned fish%'
    OR bi.name ILIKE '%baked bean%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 12. Soft drinks / Juice / Water / Beverage → Soft Drinks ─────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_soft_drinks'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%revive%'
    OR bi.name ILIKE '%coca cola%'
    OR bi.name ILIKE '%pepsi%'
    OR bi.name ILIKE '%sprite%'
    OR bi.name ILIKE '%fanta%'
    OR bi.name ILIKE '%juice%'
    OR bi.name ILIKE '%energade%'
    OR bi.name ILIKE '%ribena%'
    OR bi.name ILIKE '%red bull%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 13. Milk, Butter, Cheese, Yogurt → Milk & Cream / Yogurt / Eggs & Butter ─
-- (only items that are business-specifically categorised or uncategorised)
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_milk'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%milk%'
    OR bi.name ILIKE '%cream%'
  )
  AND bi.name NOT ILIKE '%ice cream%'
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 14. Shampoo / Conditioner / Hair → Hair Care ─────────────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_hair_care'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%shampoo%'
    OR bi.name ILIKE '%conditioner%'
    OR bi.name ILIKE '%hair oil%'
    OR bi.name ILIKE '%relaxer%'
    OR bi.name ILIKE '%hair food%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 15. Soap / Body Wash / Lotion / Deodorant → Body Care ────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_body_care'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%soap%'
    OR bi.name ILIKE '%body wash%'
    OR bi.name ILIKE '%shower gel%'
    OR bi.name ILIKE '%lotion%'
    OR bi.name ILIKE '%moisturis%'
    OR bi.name ILIKE '%deodorant%'
    OR bi.name ILIKE '%roll-on%'
  )
  AND bi.name NOT ILIKE '%dishwash%'
  AND bi.name NOT ILIKE '%laundry%'
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 16. Laundry / Washing / Detergent / Bleach → Laundry ─────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_laundry'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%laundry%'
    OR bi.name ILIKE '%washing powder%'
    OR bi.name ILIKE '%detergent%'
    OR bi.name ILIKE '%bleach%'
    OR bi.name ILIKE '%vanish%'
    OR bi.name ILIKE '%surf%'
    OR bi.name ILIKE '%omo%'
    OR bi.name ILIKE '%skip%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 17. Markers / Pens / Pencils → Writing Instruments ───────────────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_writing'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%marker%'
    OR bi.name ILIKE '%permanent marker%'
    OR bi.name ILIKE '%ballpoint%'
    OR bi.name ILIKE '%biro%'
    OR bi.name ILIKE '%highlighter%'
    OR bi.name ILIKE '%pencil%'
    OR bi.name ILIKE '%fine liner%'
    OR bi.name ILIKE '%fine line%'
    OR bi.name ILIKE '%felt pen%'
    OR bi.name ILIKE '%duplicate tip%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );

-- ── 18. Exercise books / notebooks / A4 paper → Paper Products ───────────────
UPDATE barcode_inventory_items bi
SET "categoryId" = 'cat_groc_paper'
FROM businesses b
WHERE bi."businessId" = b.id
  AND b.type = 'grocery'
  AND (
    bi.name ILIKE '%exercise book%'
    OR bi.name ILIKE '%notebook%'
    OR bi.name ILIKE '%a4 paper%'
    OR bi.name ILIKE '%a4 ream%'
    OR bi.name ILIKE '%jotter%'
    OR bi.name ILIKE '%writing pad%'
  )
  AND (
    bi."categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM business_categories bc
      WHERE bc.id = bi."categoryId"
        AND bc."businessId" IS NOT NULL
    )
  );
