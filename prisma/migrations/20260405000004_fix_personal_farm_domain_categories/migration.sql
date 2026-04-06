-- Ensure Personal Farm domain categories have the correct domainId.
-- Migrations 20260225000002 and 20260403000001 already insert them
-- with domain-personal, but this ensures any that slipped through
-- (e.g. from old seeding before the migration cycle ran) are corrected.
-- This is a safe no-op if the data is already correct.

UPDATE "expense_categories"
SET "domainId" = 'domain-personal'
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
)
AND "domainId" != 'domain-personal';
