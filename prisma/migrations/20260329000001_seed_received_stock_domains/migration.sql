-- Migration: Seed "Received Stock" domain for every business type
-- Purpose: Transferred items need a domain; this provides a stable system domain for that purpose.
-- Safe: ON CONFLICT DO NOTHING — won't overwrite if already present.

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_received_grocery',      'Received Stock', '📥', 'Items received via transfer from another business', 'grocery',      true, true, NOW()),
  ('domain_received_restaurant',   'Received Stock', '📥', 'Items received via transfer from another business', 'restaurant',   true, true, NOW()),
  ('domain_received_clothing',     'Received Stock', '📥', 'Items received via transfer from another business', 'clothing',     true, true, NOW()),
  ('domain_received_hardware',     'Received Stock', '📥', 'Items received via transfer from another business', 'hardware',     true, true, NOW()),
  ('domain_received_construction', 'Received Stock', '📥', 'Items received via transfer from another business', 'construction', true, true, NOW()),
  ('domain_received_vehicles',     'Received Stock', '📥', 'Items received via transfer from another business', 'vehicles',     true, true, NOW()),
  ('domain_received_consulting',   'Received Stock', '📥', 'Items received via transfer from another business', 'consulting',   true, true, NOW()),
  ('domain_received_retail',       'Received Stock', '📥', 'Items received via transfer from another business', 'retail',       true, true, NOW()),
  ('domain_received_services',     'Received Stock', '📥', 'Items received via transfer from another business', 'services',     true, true, NOW()),
  ('domain_received_other',        'Received Stock', '📥', 'Items received via transfer from another business', 'other',        true, true, NOW()),
  ('domain_received_universal',    'Received Stock', '📥', 'Items received via transfer from another business', 'universal',    true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- Backfill: assign "Received Stock" domain to any existing "Transferred Items" categories
-- that currently have no domain set.
UPDATE business_categories bc
SET "domainId" = d.id
FROM businesses b
JOIN inventory_domains d ON d.name = 'Received Stock' AND d."businessType" = b.type
WHERE bc."businessId" = b.id
  AND bc.name = 'Transferred Items'
  AND bc."domainId" IS NULL;
