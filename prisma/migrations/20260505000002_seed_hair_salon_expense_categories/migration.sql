-- Seed Hair Salon and Braiding Expense Categories
-- Creates the Hair Salon ExpenseDomain and adds categories and subcategories.
-- Source: Hair-Salon-and-Braiding-Expense-Cat.md
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds:
--   1 expense_domain  (domain-hair-salon)
--   6 expense_categories  under domain-hair-salon
--   10 expense_subcategories

-- =============================================================================
-- EXPENSE DOMAIN
-- =============================================================================

INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-hair-salon', 'Hair Salon', '💇', 'Expense categories for hair salon and braiding businesses', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-hair-salon');

-- =============================================================================
-- EXPENSE CATEGORIES
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-hs-services', 'domain-hair-salon', 'Hair Services', '💇', '#EC4899', 'Salon haircuts, styling, coloring, relaxers, hair braiding and specialty hair services', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-hs-products', 'domain-hair-salon', 'Hair Products and Supplies', '🧴', '#06B6D4', 'Shampoos, conditioners, oils, gels, styling tools, dryers, braiding hair and accessories', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-hs-operations', 'domain-hair-salon', 'Salon Operations', '🪑', '#3B82F6', 'Rent, utilities, internet, insurance, licenses, staff wages and contractor payments', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-hs-cleaning', 'domain-hair-salon', 'Cleaning and Maintenance', '🧹', '#10B981', 'Disinfectants, towels, sanitizers, laundry supplies, chair repairs and tool servicing', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-hs-retail', 'domain-hair-salon', 'Product and Retail Sales', '📦', '#F59E0B', 'Retail shampoos, conditioners, oils, combs, accessories, braiding hair and bonnet sales', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-hs-support', 'domain-hair-salon', 'Business Support', '🚚', '#6366F1', 'Supply delivery, bulk hair purchases, shipping fees, import charges and vendor fees', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — HAIR SERVICES
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-services-salon', 'cat-hs-services', 'Salon Services', '✂️', 'Haircuts, hair coloring, blowouts, hair washing, deep conditioning, scalp treatments, relaxers and styling', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-services-braiding', 'cat-hs-services', 'Hair Braiding Services', '🧶', 'Box braids, knotless braids, cornrows, twists, feed-in braids, crochet braids, dread retwists and braiding styles', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — HAIR PRODUCTS AND SUPPLIES
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-products-salon', 'cat-hs-products', 'Salon Products', '🧴', 'Shampoo, conditioner, hair oils, gels, edge control, mousse, styling cream and heat protectant', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-products-tools', 'cat-hs-products', 'Tools and Equipment', '🪮', 'Combs, brushes, flat irons, curling irons, hair dryers, clips, braiding hair and clippers', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — SALON OPERATIONS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-ops-costs', 'cat-hs-operations', 'Operating Costs', '💡', 'Electricity, water, internet, phone service, software fees, insurance, licenses and rent', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-ops-labor', 'cat-hs-operations', 'Labor and Staff', '👷', 'Hair stylists, braiders, shampoo assistants, reception staff, commissions, wages, tips paid out and contractor payments', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — CLEANING AND MAINTENANCE
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-clean-sanitation', 'cat-hs-cleaning', 'Sanitation Supplies', '🧽', 'Disinfectant, towels, sanitizer, cleaning sprays, laundry detergent, trash bags, gloves and mop supplies', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-clean-maintenance', 'cat-hs-cleaning', 'Equipment Maintenance', '🔧', 'Chair repairs, mirror repairs, dryer maintenance, tool repairs, blade oil, replacement batteries and service calls', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — PRODUCT AND RETAIL SALES
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-retail-products', 'cat-hs-retail', 'Retail Hair Products', '🛍️', 'Shampoo sales, conditioner sales, oils, combs, hair accessories, braiding hair, bonnets and wraps for retail', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — BUSINESS SUPPORT
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-hs-support-delivery', 'cat-hs-support', 'Supplies and Delivery', '📦', 'Supply delivery, bulk hair purchases, shipping fees, restocking fees, packaging supplies, import charges, vendor fees and travel expenses', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
