-- Add Beauty, Cosmetics, and Personal Care departments to clothing inventory domains

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_beauty',       'Beauty',        '💄', 'Beauty products and tools', 'clothing', true, false, NOW()),
  ('domain_clothing_cosmetics',    'Cosmetics',     '💋', 'Makeup and cosmetic products', 'clothing', true, false, NOW()),
  ('domain_clothing_personalcare', 'Personal Care', '🧴', 'Personal care and hygiene products', 'clothing', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
