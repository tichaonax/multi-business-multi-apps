-- Add "Services" domain and category for grocery business type
-- This enables in-store services (cellphone charging, airtime top-up, etc.)
-- to be correctly classified when added to or copied into a grocery business.

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES (
  'domain_grocery_services',
  'Services',
  '🛎️',
  'In-store services such as cellphone charging, airtime top-up, and similar',
  'grocery',
  true,
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "businessId", "domainId", "isActive", "displayOrder", "isUserCreated", "updatedAt")
VALUES (
  'cat_grocery_services',
  'Services',
  'In-store services sold to customers',
  '🛎️',
  '#8B5CF6',
  'grocery',
  NULL,
  'domain_grocery_services',
  true,
  99,
  false,
  NOW()
)
ON CONFLICT DO NOTHING;
