-- =============================================================================
-- Migration: Fix Cosmetics / Beauty Domain Mapping
-- =============================================================================
-- Migration 20260328000002 incorrectly mapped too many categories to Cosmetics.
-- Based on production backup (2026-03-27T16:14:32), the correct split is:
--
-- Cosmetics  → ONLY: Perfume, home city tothbrush
-- Beauty     → Nails, Lip Gloss, Lip Stick, Face Foundation, Shadows, Face Blush,
--              Perfume spry, Body Spry, Face Wash, For Body & face, Lotion, Glow Oil,
--              Hair Shampoo, Hair Curling, Bath & shower Gel, Hair, Toothbrush,
--              Rool On (19 categories)
-- Personal Care → super clean toothbrush (not present locally)
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Move categories from Cosmetics → Beauty
-- (they were incorrectly placed in Cosmetics by migration 00002)
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'domain_clothing_beauty'
WHERE id IN (
  '696bccf9-7093-4d5b-9e86-cf345bdecbfb',  -- Face Foundation
  '830f70de-86d7-430c-9fe7-ee6c2d31cb12',  -- Face Wash
  '2b1a22be-cf8d-4ab7-9cc7-4d19d4144813',  -- Nails
  'cc1b25c6-a477-4908-9b95-df48f55fc52b',  -- Face Blush
  '3cfbbdfb-d5c8-4017-88ab-07bd6df8b117',  -- Lip Gloss
  '3ba7c9f1-1fb7-4cb0-9d74-8921a4f0e8a4',  -- Lip Stick
  '4a2259cd-05d3-40a6-9f80-bae11f13b998',  -- Shadows
  '43afdd7e-c138-4578-9587-9b6691970c65'   -- Perfume spry
)
AND "domainId" = 'domain_clothing_cosmetics';

-- ──────────────────────────────────────────────────────────────────────────────
-- Move categories from Personal Care → Beauty
-- (production maps these to Beauty, not Personal Care)
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'domain_clothing_beauty'
WHERE id IN (
  '69c4a4dc-fb52-4282-9393-b63e3e1f124f',  -- Bath &shower Gel
  '8377429a-abf1-4b71-a0b2-118bc4b17cde',  -- Rool On
  'f3728823-57e7-41f9-8a8e-3d0e7239a0e9',  -- Hair Shampoo
  'e4e3c2c2-a987-4e73-ad50-9d80d8e2a9d2'   -- Toothbrush
)
AND "domainId" = 'domain_clothing_personalcare';

-- ──────────────────────────────────────────────────────────────────────────────
-- Move spirit → Maternity (matches production exactly)
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE business_categories
SET "domainId" = 'domain_clothing_maternity'
WHERE id = '9d4fd1d2-0e4a-4aa4-90ba-08243b691a7e'  -- spirit
AND "domainId" = 'domain_clothing_gen_merch';
