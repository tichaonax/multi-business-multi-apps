-- Migration: Seed Business Income domain, categories, and subcategories
-- Domain: Business Income (domain-business-income)
-- 5 categories: Sales Revenue, Operating Income, Financial Income, Government and Support, Other Business Income
-- 15 subcategories (3 per category)

-- Ensure domain exists
INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
VALUES ('domain-business-income', 'Business Income', '🏢', 'Business income sources and revenue classifications', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CATEGORIES
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-bi-sales', 'domain-business-income', 'Sales Revenue', '💼', '#3B82F6', 'Revenue from product sales, service sales, and recurring sales', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-bi-operating', 'domain-business-income', 'Operating Income', '🏢', '#8B5CF6', 'Professional fees, rental and usage income, commissions and referrals', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-bi-financial', 'domain-business-income', 'Financial Income', '💰', '#10B981', 'Investment returns and cash management income', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-bi-government', 'domain-business-income', 'Government and Support Income', '🧾', '#EF4444', 'Business grants, tax credits, rebates, and subsidies', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-bi-other', 'domain-business-income', 'Other Business Income', '🎁', '#F97316', 'Miscellaneous revenue, intellectual property, and partnership income', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Sales Revenue
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-bi-sales-products',  'cat-bi-sales', 'Product Sales',    '🛍️', 'Retail, in-store, online, delivery, and wholesale sales', true, false, NOW()),
  ('subcat-bi-sales-services',  'cat-bi-sales', 'Service Sales',    '🧾', 'Repair, IT, cleaning, training, and creative services', true, false, NOW()),
  ('subcat-bi-sales-recurring', 'cat-bi-sales', 'Recurring Sales',  '🔁', 'Subscription revenue, retainer revenue, membership fees, and contract renewals', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Operating Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-bi-op-professional', 'cat-bi-operating', 'Professional Income',          '💼', 'Consulting, legal, advisory, management, and administrative fees', true, false, NOW()),
  ('subcat-bi-op-rental',       'cat-bi-operating', 'Rental and Usage Income',      '🏠', 'Office rental, equipment rental, vehicle rental, storage rental, and space usage fees', true, false, NOW()),
  ('subcat-bi-op-commission',   'cat-bi-operating', 'Commission and Referral',      '📣', 'Sales commissions, referral fees, affiliate commissions, brokerage, and lead generation', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Financial Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-bi-fin-investment', 'cat-bi-financial', 'Investment Returns',       '📊', 'Capital gains, dividend income, interest income, fund distributions, and real estate returns', true, false, NOW()),
  ('subcat-bi-fin-cash',       'cat-bi-financial', 'Cash Management Income',   '💳', 'Late payment fees, processing fees, currency gain, account interest, and service charges', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Government and Support Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-bi-gov-grants',     'cat-bi-government', 'Business Grants',           '🛡️', 'Training, expansion, innovation, sustainability, and hiring incentive grants', true, false, NOW()),
  ('subcat-bi-gov-tax',        'cat-bi-government', 'Tax Credits and Rebates',   '📑', 'Tax refunds, payroll tax credits, equipment rebates, energy rebates, and local incentives', true, false, NOW()),
  ('subcat-bi-gov-subsidies',  'cat-bi-government', 'Subsidies and Assistance',  '🤝', 'Operating subsidies, transport support, utility assistance, small business aid, and recovery assistance', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBCATEGORIES — Other Business Income
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-bi-other-misc',        'cat-bi-other', 'Miscellaneous Revenue',          '🎉', 'Prize money, settlements, refunds, restocking fees, and write-off recovery', true, false, NOW()),
  ('subcat-bi-other-ip',          'cat-bi-other', 'Intellectual Property Income',   '📚', 'Royalties, content licensing, patent income, design licensing, and software licensing', true, false, NOW()),
  ('subcat-bi-other-partnership', 'cat-bi-other', 'Partnership Income',             '🤝', 'Profit sharing, joint venture income, equity distributions, revenue sharing, and partner reimbursements', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
