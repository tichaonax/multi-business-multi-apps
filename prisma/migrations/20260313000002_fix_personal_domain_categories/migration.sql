-- Migration: fix_personal_domain_categories
-- Removes veterinary/agricultural categories incorrectly seeded into the Personal domain.
-- These categories already exist under domain-business (General), so Personal domain
-- users can still access them via the Business (General) category selector.
-- Also removes two duplicate categories (Dining, Entertainment) in Personal domain
-- that have more descriptive equivalents (Food & Dining (Personal), Entertainment & Leisure).

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Migrate the 1 payment that references a personal-domain veterinary
--         category → point it at the equivalent Business (General) category.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE "expense_account_payments"
SET "categoryId" = 'cat-business-antiparasitics-coccidiostats'
WHERE "categoryId" = 'cat-personal-antiparasitics-coccidiostats';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Delete subcategories belonging to the 11 personal veterinary/
--         agricultural categories (74 rows).
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM "expense_subcategories"
WHERE "categoryId" IN (
  'cat-personal-anti-inflammatories-analgesics',
  'cat-personal-antibiotics-antibacterials',
  'cat-personal-antifungals',
  'cat-personal-antiparasitics-coccidiostats',
  'cat-personal-antiparasitics-dewormers-external',
  'cat-personal-aquaculture-feed',
  'cat-personal-biologics-vaccines',
  'cat-personal-disinfectants-biosecurity',
  'cat-personal-feed-supplements-additives',
  'cat-personal-livestock-feed',
  'cat-personal-nutritional-supplements-vitamins',
  'cat-personal-poultry-feed'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Delete the 12 personal veterinary/agricultural expense categories.
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM "expense_categories"
WHERE id IN (
  'cat-personal-anti-inflammatories-analgesics',
  'cat-personal-antibiotics-antibacterials',
  'cat-personal-antifungals',
  'cat-personal-antiparasitics-coccidiostats',
  'cat-personal-antiparasitics-dewormers-external',
  'cat-personal-aquaculture-feed',
  'cat-personal-biologics-vaccines',
  'cat-personal-disinfectants-biosecurity',
  'cat-personal-feed-supplements-additives',
  'cat-personal-livestock-feed',
  'cat-personal-nutritional-supplements-vitamins',
  'cat-personal-poultry-feed'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Remove duplicate personal categories that have more descriptive
--         equivalents already in the domain.
--         'Dining'        → kept as 'Food & Dining (Personal)'
--         'Entertainment' → kept as 'Entertainment & Leisure'
--         Neither has any subcategories or payment references.
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM "expense_categories"
WHERE id IN (
  'exp_personal_dining',
  'exp_personal_entertainment'
);
