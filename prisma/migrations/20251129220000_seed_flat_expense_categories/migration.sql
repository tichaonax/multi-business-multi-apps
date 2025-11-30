-- Seed Global Flat Expense Categories (domain_id IS NULL)
-- Idempotent using fixed IDs and ON CONFLICT (id) DO NOTHING

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_contractor_services',
  'Contractor Services',
  '🔨',
  '#F59E0B',
  'Payments to individual contractors, handymen, and service providers',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_professional_fees',
  'Professional Fees',
  '💼',
  '#3B82F6',
  'Lawyers, accountants, consultants, and other professional services',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_utilities_services',
  'Utilities & Services',
  '⚡',
  '#10B981',
  'Electricity, water, internet, phone, and other utility payments',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_office_supplies',
  'Office Supplies',
  '📎',
  '#8B5CF6',
  'General office supplies and materials',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_maintenance_repairs',
  'Maintenance & Repairs',
  '🔧',
  '#EF4444',
  'Property maintenance, equipment repairs, and upkeep',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_transportation',
  'Transportation',
  '🚗',
  '#06B6D4',
  'Fuel, parking, tolls, and transportation costs',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_insurance',
  'Insurance',
  '🛡️',
  '#14B8A6',
  'Insurance premiums and related payments',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_subscriptions',
  'Subscriptions',
  '📱',
  '#A855F7',
  'Software subscriptions, memberships, and recurring services',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_miscellaneous',
  'Miscellaneous',
  '💰',
  '#6B7280',
  'Other expenses that do not fit into specific categories',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (
  id, name, emoji, color, description, "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt"
) VALUES (
  'exp_flat_salaries',
  'Salaries',
  '💵',
  '#059669',
  'Employee salaries and wages',
  false,
  true,
  false,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
