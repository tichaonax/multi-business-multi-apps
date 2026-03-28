-- =============================================================================
-- Migration: Fix Orphaned Category Domain Links
-- =============================================================================
-- Several business-specific categories (created via UI) have domainId = NULL.
-- This means their barcode_inventory_items count as "NO DOMAIN" in stats.
-- This migration links each category to the correct domain so counts are correct.
--
-- Clothing (HXI Fashions) — 24 categories mapped to restored domains:
--   Cosmetics: Perfume, Perfume spry, Nails, Face Foundation, Shadows, Lip Stick,
--              Lip Gloss, Face Blush, Face Wash
--   Beauty:    Lotion, Body Spry, Glow Oil, Hair, For Body & face, Hair Curling
--   Personal Care: Bath & shower Gel, Rool On, Hair Shampoo, Toothbrush
--   Fashion Accessories: Heart
--   General Merchandise: Medicine, Service, spirit, Hokoyo
--
-- Restaurant (HXI Eats) — 2 categories mapped to Food Service domain:
--   Food Service: Medicine, Service
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- CLOTHING — Cosmetics
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'domain_clothing_cosmetics'
WHERE id IN (
  '9693a621-0a07-45d0-a74a-e4ba887fd3c3',  -- Perfume
  '43afdd7e-c138-4578-9587-9b6691970c65',  -- Perfume spry
  '2b1a22be-cf8d-4ab7-9cc7-4d19d4144813',  -- Nails
  '696bccf9-7093-4d5b-9e86-cf345bdecbfb',  -- Face Foundation
  '4a2259cd-05d3-40a6-9f80-bae11f13b998',  -- Shadows
  '3ba7c9f1-1fb7-4cb0-9d74-8921a4f0e8a4',  -- Lip Stick
  '3cfbbdfb-d5c8-4017-88ab-07bd6df8b117',  -- Lip Gloss
  'cc1b25c6-a477-4908-9b95-df48f55fc52b',  -- Face Blush
  '830f70de-86d7-430c-9fe7-ee6c2d31cb12'   -- Face Wash
)
AND "domainId" IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- CLOTHING — Beauty
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'domain_clothing_beauty'
WHERE id IN (
  'ecfa4583-0e18-4d6d-ae85-b542ad96d23d',  -- Lotion
  '3938e1b6-7198-45e2-ba6a-6c50db670d96',  -- Body Spry
  '8a353e90-ef60-4f85-bf0f-099bc47883c2',  -- Glow Oil
  '9c45b21d-6c23-4013-a54e-a3757b7fd7ba',  -- Hair
  '275af7ee-deb4-4530-9591-4d25f28c2d9a',  -- For Body &face
  'db8c0a7f-a38c-4b3e-9147-d3dfb63a481a'   -- Hair Curling
)
AND "domainId" IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- CLOTHING — Personal Care
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'domain_clothing_personalcare'
WHERE id IN (
  '69c4a4dc-fb52-4282-9393-b63e3e1f124f',  -- Bath & shower Gel
  '8377429a-abf1-4b71-a0b2-118bc4b17cde',  -- Rool On
  'f3728823-57e7-41f9-8a8e-3d0e7239a0e9',  -- Hair Shampoo
  'e4e3c2c2-a987-4e73-ad50-9d80d8e2a9d2'   -- Toothbrush
)
AND "domainId" IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- CLOTHING — Fashion Accessories
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'domain_clothing_fashion_acc'
WHERE id IN (
  '870593dd-1b6a-40fd-acd0-c03e369f06fa'   -- Heart
)
AND "domainId" IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- CLOTHING — General Merchandise (catch-all for uncategorised items)
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'domain_clothing_gen_merch'
WHERE id IN (
  '5acb5312-3ddc-42bd-9859-7d244500b241',  -- Medicine
  '247824f1-10d8-45e5-bc02-3110db5cb2f0',  -- Service
  '9d4fd1d2-0e4a-4aa4-90ba-08243b691a7e',  -- spirit
  'e216f9f5-7856-4c46-81ba-d92ffa06f604'   -- Hokoyo
)
AND "domainId" IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- RESTAURANT — Food Service (Medicine & Service categories at HXI Eats)
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'rdom_food_service'
WHERE id IN (
  '99f94a47-a486-4ba4-9919-b821fb6a7d60',  -- Medicine (HXI Eats)
  'c96e0f3c-1fc5-410f-ae22-3ab16bdd51bf'   -- Service (HXI Eats)
)
AND "domainId" IS NULL;
