-- The farm/veterinary taxonomy (Antibiotics, Antifungals, Antiparasitics,
-- Biologics & Vaccines, Disinfectants & Biosecurity, Feed Supplements,
-- Livestock/Poultry/Aquaculture Feed, Anti-inflammatories & Analgesics) was
-- seeded onto the generic "Personal" domain ('domain_personal') instead of
-- the dedicated "Personal Farm" domain ('domain-personal', 🌾) that exists
-- specifically for it and was left empty. Re-parent the 11 categories —
-- their subcategories move with them automatically since subcategories
-- reference categoryId, not domainId, so no subcategory rows change and no
-- existing expense_account_payments classification is affected.
UPDATE "expense_categories"
SET "domainId" = 'domain-personal'
WHERE "domainId" = 'domain_personal'
  AND id IN (
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
    'cat-personal-poultry-feed'
  );
