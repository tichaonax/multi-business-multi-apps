-- Migration: Seed Personal Income domain, categories, and subcategories
-- Domain: Personal Income (domain-personal-income)
-- 5 categories: Employment, Business, Investment, Government, Other
-- 15 subcategories (3 per category)

-- Ensure domain exists
INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
VALUES ('domain-personal-income', 'Personal Income', '💵', 'Personal income sources and classifications', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CATEGORIES
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-pi-employment', 'domain-personal-income', 'Employment Income', '💼', '#3B82F6', 'Income from employment: salary, wages, and labor', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-pi-biz-income', 'domain-personal-income', 'Business Income', '📈', '#8B5CF6', 'Income from personal business activities and sales', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-pi-investment', 'domain-personal-income', 'Investment Income', '💰', '#10B981', 'Income from investments: capital gains, dividends, rental', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-pi-government', 'domain-personal-income', 'Government Income', '🧾', '#EF4444', 'Government benefits, tax credits, and public support', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-pi-other', 'domain-personal-income', 'Other Income', '🎁', '#F97316', 'Gifts, miscellaneous, and passive or occasional income', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Employment Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pi-emp-salary',  'cat-pi-employment', 'Salary and Wages',       '🧑‍💻', 'Regular salary, hourly wages, overtime, bonuses, and commissions', true, false, NOW()),
  ('subcat-pi-emp-self',    'cat-pi-employment', 'Self-Employment Income',  '🏢', 'Freelance, contract work, side business, consulting, and independent services', true, false, NOW()),
  ('subcat-pi-emp-labor',   'cat-pi-employment', 'Labor Income',            '👷', 'Construction pay, delivery pay, retail, service industry, and skilled trade pay', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Business Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pi-biz-sales',      'cat-pi-biz-income', 'Small Business Sales',       '🏪', 'Product sales, service sales, online and store sales', true, false, NOW()),
  ('subcat-pi-biz-service',    'cat-pi-biz-income', 'Service Revenue',            '💳', 'Consulting, training, cleaning, repair, and creative service revenue', true, false, NOW()),
  ('subcat-pi-biz-recurring',  'cat-pi-biz-income', 'Recurring Business Income',  '🔄', 'Subscription income, retainer income, membership fees, and contract renewals', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Investment Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pi-inv-gains',    'cat-pi-investment', 'Capital Gains',         '📊', 'Stock gains, crypto gains, real estate gains, and asset appreciation', true, false, NOW()),
  ('subcat-pi-inv-dividend', 'cat-pi-investment', 'Dividend and Interest', '💵', 'Bank interest, dividends, bond interest, savings interest, and REIT distributions', true, false, NOW()),
  ('subcat-pi-inv-rental',   'cat-pi-investment', 'Rental Income',         '🏘️', 'Residential rent, commercial rent, parking, storage, and short-term rental', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Government Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pi-gov-benefits', 'cat-pi-government', 'Benefits',                 '🛡️', 'Retirement, disability, family support, child benefits, and welfare assistance', true, false, NOW()),
  ('subcat-pi-gov-tax',      'cat-pi-government', 'Tax Credits and Refunds',  '💸', 'Tax refunds, child tax credits, education credits, housing and earned income credits', true, false, NOW()),
  ('subcat-pi-gov-support',  'cat-pi-government', 'Public Support',           '🎖️', 'Veterans benefits, medical assistance, education grants, student aid, and emergency assistance', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Other Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pi-other-gifts',   'cat-pi-other', 'Gifts and Support',             '🎉', 'Cash gifts, family support, contributions from others, and cultural gifts', true, false, NOW()),
  ('subcat-pi-other-misc',    'cat-pi-other', 'Miscellaneous Income',          '🧰', 'Refunds, rebates, prizes, settlements, and returned deposits', true, false, NOW()),
  ('subcat-pi-other-passive', 'cat-pi-other', 'Passive or Occasional Income',  '🧑‍🏫', 'Royalties, content monetization, affiliate income, app income, and hobby income', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
