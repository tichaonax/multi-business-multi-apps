-- ============================================================
-- MBM-169: Seed categories and subcategories for 6 existing business domains
-- Domains: Groceries, Hardware, Clothing, Restaurant, Construction, Personal
-- Safe to re-run: ON CONFLICT DO NOTHING on all inserts
-- ============================================================

-- ============================================================
-- DOMAIN: Groceries
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Groceries', '🛒', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Fresh Foods
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Fresh Foods', '🥦', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Produce', '🍎', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Fresh Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Meat', '🥩', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Fresh Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Seafood', '🐟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Fresh Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Deli', '🥪', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Fresh Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Bakery', '🥖', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Fresh Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Dairy and Refrigerated
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Dairy and Refrigerated', '🧀', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Dairy', '🥛', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Dairy and Refrigerated'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Refrigerated Foods', '❄️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Dairy and Refrigerated'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Frozen Foods
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Frozen Foods', '🧊', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Frozen Meals', '🍽️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Frozen Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Frozen Snacks', '🍟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Frozen Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Frozen Desserts', '🍨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Frozen Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Packaged Foods
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Packaged Foods', '🥫', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Canned Goods', '🥫', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Packaged Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Dry Grocery', '🍚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Packaged Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Condiments', '🍯', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Packaged Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Spices and Seasonings', '🌿', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Packaged Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Snacks', '🍿', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Packaged Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Breakfast Foods', '🌅', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Packaged Foods'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Beverages
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Beverages', '🥤', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Soft Drinks', '🥤', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Juice', '🧃', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Water', '💧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tea and Coffee', '☕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Energy Drinks', '⚡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Health and Beauty
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Health and Beauty', '💊', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Oral Care', '🦷', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Health and Beauty'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Skin Care', '🧴', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Health and Beauty'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Hair Care', '💇', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Health and Beauty'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Personal Care', '🧍', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Health and Beauty'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Household and Cleaning
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Household and Cleaning', '🧼', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Laundry', '🧺', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Household and Cleaning'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cleaning Supplies', '🧹', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Household and Cleaning'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Paper Products', '🧻', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Household and Cleaning'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Kitchen Supplies', '🍽️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Household and Cleaning'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- General Merchandise
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'General Merchandise', '🛒', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Household Goods', '🏠', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'General Merchandise'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Seasonal', '🎄', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'General Merchandise'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Small Appliances', '🔌', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'General Merchandise'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Hardware', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'General Merchandise'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Pet Supplies
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Pet Supplies', '🐶', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Dog Care', '🐕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Pet Supplies'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cat Care', '🐈', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Pet Supplies'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Baby Care
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Baby Care', '👶', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Infant Formula', '🍼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Baby Care'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Diapers and Wipes', '🧷', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Baby Care'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Baby Food', '🥣', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Baby Care'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Tobacco and Lottery
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Tobacco and Lottery', '🚬', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tobacco', '🚬', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Tobacco and Lottery'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Lottery', '🎟️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Tobacco and Lottery'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Pharmacy and Wellness
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Pharmacy and Wellness', '🩺', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Groceries'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Vitamins', '💊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Pharmacy and Wellness'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'OTC Medicine', '💊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Pharmacy and Wellness'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'First Aid', '🩹', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Groceries' AND c.name = 'Pharmacy and Wellness'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- ============================================================
-- DOMAIN: Hardware
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Hardware', '🔧', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Tools and Equipment
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Tools and Equipment', '🔧', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Hand Tools', '🛠️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Tools and Equipment'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Power Tools', '⚡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Tools and Equipment'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tool Accessories', '🧰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Tools and Equipment'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Fasteners and Fixings
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Fasteners and Fixings', '🔩', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Screws', '🔩', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Fasteners and Fixings'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Nails', '🪙', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Fasteners and Fixings'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Bolts and Nuts', '🪛', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Fasteners and Fixings'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Anchoring Hardware', '🧷', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Fasteners and Fixings'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Building Materials
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Building Materials', '🧱', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Lumber', '🪵', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Building Materials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cement and Masonry', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Building Materials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sheet Goods', '🪟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Building Materials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Adhesives and Sealants', '🧴', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Building Materials'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Electrical
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Electrical', '💡', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Wiring and Cable', '🔌', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Electrical'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Lighting', '💡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Electrical'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Electrical Components', '🔋', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Electrical'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Electrical Hardware', '🧰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Electrical'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Plumbing
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Plumbing', '🚿', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pipes and Fittings', '🚰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Plumbing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Bathroom Plumbing', '🚽', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Plumbing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Plumbing Tools', '🛠️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Plumbing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Plumbing Supplies', '🧼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Plumbing'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Paint and Finishing
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Paint and Finishing', '🪟', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Paint', '🎨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Paint and Finishing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Painting Supplies', '🖌️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Paint and Finishing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Finishing Products', '✨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Paint and Finishing'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Doors and Windows
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Doors and Windows', '🚪', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Door Hardware', '🚪', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Doors and Windows'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Window Hardware', '🪟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Doors and Windows'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Trim and Moulding', '🪵', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Doors and Windows'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Cleaning and Maintenance
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Cleaning and Maintenance', '🧹', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cleaning Supplies', '🧼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Cleaning and Maintenance'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Safety and PPE', '🧯', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Cleaning and Maintenance'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Maintenance Items', '🪣', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Cleaning and Maintenance'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Automotive Hardware
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Automotive Hardware', '🚗', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Auto Accessories', '🛞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Automotive Hardware'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Garage Supplies', '🧰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Automotive Hardware'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Home and Storage
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Home and Storage', '🏠', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Home Organization', '🪑', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Home and Storage'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Household Fixtures', '🪟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Home and Storage'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Garden and Outdoor
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Garden and Outdoor', '🪴', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Hardware'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Gardening Tools', '🌱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Garden and Outdoor'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Outdoor Supplies', '🌿', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Garden and Outdoor'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Outdoor Living', '🪑', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Hardware' AND c.name = 'Garden and Outdoor'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- ============================================================
-- DOMAIN: Clothing
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Clothing', '👔', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Apparel
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Apparel', '👕', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tops', '👚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Apparel'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Bottoms', '👖', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Apparel'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Dresses and Sets', '👗', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Apparel'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Outerwear', '🧥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Apparel'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Men's Clothing
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Men''s Clothing', '👔', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Men''s Tops', '👕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Men''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Men''s Bottoms', '👖', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Men''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Men''s Outerwear', '🧥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Men''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Men''s Footwear', '👞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Men''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Women's Clothing
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Women''s Clothing', '👗', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Women''s Tops', '👚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Women''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Women''s Bottoms', '👖', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Women''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Women''s Dresses', '👗', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Women''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Women''s Outerwear', '🧥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Women''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Women''s Footwear', '👠', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Women''s Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Kids Clothing
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Kids Clothing', '👶', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Boys Clothing', '🧒', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Kids Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Girls Clothing', '👧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Kids Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Infant Clothing', '🍼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Kids Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Baby Wear
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Baby Wear', '👶', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Newborn Essentials', '🍼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Baby Wear'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Baby Accessories', '🍼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Baby Wear'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Footwear
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Footwear', '👟', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Casual Shoes', '👟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Footwear'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Formal Shoes', '👞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Footwear'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sports Shoes', '🏃', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Footwear'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Accessories
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Accessories', '🧢', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Headwear', '🧢', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Accessories'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Wearable Accessories', '🧤', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Accessories'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Bags', '👜', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Accessories'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Fashion Accessories', '💍', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Accessories'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Intimates and Sleepwear
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Intimates and Sleepwear', '🩱', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Underwear', '🩲', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Intimates and Sleepwear'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sleepwear', '😴', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Intimates and Sleepwear'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Activewear
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Activewear', '🏋️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sportswear', '🏃', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Activewear'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Athleisure', '🧘', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Activewear'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Specialty Clothing
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Specialty Clothing', '🧵', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Clothing'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cultural Wear', '🕌', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Specialty Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Workwear', '🥼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Specialty Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Formal and Event Wear', '🎓', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Clothing' AND c.name = 'Specialty Clothing'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- ============================================================
-- DOMAIN: Restaurant
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Restaurant', '🍽️', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Food Service
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Food Service', '🍽️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Appetizers', '🍲', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Food Service'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Main Courses', '🍛', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Food Service'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Soups and Stews', '🍜', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Food Service'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Salads', '🥗', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Food Service'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Desserts', '🍰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Food Service'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Beverages
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Beverages', '☕', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Soft Drinks', '🥤', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Hot Drinks', '☕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Specialty Drinks', '🍹', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Alcoholic Drinks', '🍺', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Beverages'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Bakery and Pastry
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Bakery and Pastry', '🥖', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Breads', '🍞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Bakery and Pastry'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pastries', '🥐', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Bakery and Pastry'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cakes and Sweets', '🎂', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Bakery and Pastry'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Breakfast and Brunch
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Breakfast and Brunch', '🍳', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Breakfast Plates', '🥞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Breakfast and Brunch'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Brunch Items', '🍳', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Breakfast and Brunch'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cereals and Grains', '🥣', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Breakfast and Brunch'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Fast Food and Quick Service
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Fast Food and Quick Service', '🍟', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Burgers and Sandwiches', '🍔', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Fast Food and Quick Service'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Fried Foods', '🍗', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Fast Food and Quick Service'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Quick Bites', '🌮', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Fast Food and Quick Service'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Sides and Extras
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Sides and Extras', '🧂', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Side Items', '🍟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Sides and Extras'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Extras and Add-ons', '🧂', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Sides and Extras'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Pizza Shop
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Pizza Shop', '🍕', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pizza Types', '🍕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Pizza Shop'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pizza Add-ons', '🧀', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Pizza Shop'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pizza Sides', '🥖', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Pizza Shop'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Mexican and Latin
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Mexican and Latin', '🌯', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Main Dishes', '🌮', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Mexican and Latin'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Add-ons', '🧂', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Mexican and Latin'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Drinks', '🥤', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Mexican and Latin'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Asian Cuisine
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Asian Cuisine', '🍣', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Noodle Dishes', '🍜', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Asian Cuisine'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Rice Dishes', '🍚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Asian Cuisine'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Appetizers', '🥟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Asian Cuisine'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sauces and Extras', '🥢', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Asian Cuisine'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Italian Cuisine
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Italian Cuisine', '🍝', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pasta Dishes', '🍝', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Italian Cuisine'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Italian Specialties', '🍕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Italian Cuisine'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sides', '🍞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Italian Cuisine'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Grill and Steakhouse
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Grill and Steakhouse', '🥩', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Steaks', '🥩', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Grill and Steakhouse'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Grilled Meats', '🍗', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Grill and Steakhouse'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sides', '🥔', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Grill and Steakhouse'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Takeout and Delivery
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Takeout and Delivery', '🥡', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Restaurant'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Combo Meals', '📦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Takeout and Delivery'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Family Meals', '🛍️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Takeout and Delivery'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Packaging', '🧾', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Restaurant' AND c.name = 'Takeout and Delivery'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- ============================================================
-- DOMAIN: Construction
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Construction', '🏗️', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- General Construction
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'General Construction', '🏗️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Building Construction', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'General Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Renovation and Remodeling', '🔨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'General Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Site Preparation', '🧹', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'General Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Structural Work
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Structural Work', '🧱', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Foundations', '🏛️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Structural Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Framing', '🪵', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Structural Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Masonry', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Structural Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Plumbing and HVAC
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Plumbing and HVAC', '🚿', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Plumbing', '🚰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Plumbing and HVAC'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'HVAC', '❄️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Plumbing and HVAC'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Mechanical', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Plumbing and HVAC'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Electrical Work
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Electrical Work', '⚡', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Rough-In', '🔌', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Electrical Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Fixtures', '💡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Electrical Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Electrical Service', '🛡️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Electrical Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Finish Work
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Finish Work', '🚪', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Carpentry', '🪚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Finish Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Painting', '🎨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Finish Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Drywall', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Finish Work'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Civil Construction
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Civil Construction', '🛣️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Roadwork', '🚧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Civil Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Infrastructure', '🌉', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Civil Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Drainage and Utilities', '💧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Civil Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Equipment and Machinery
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Equipment and Machinery', '🧰', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Heavy Equipment', '🚜', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Equipment and Machinery'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Equipment Services', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Equipment and Machinery'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tooling', '📦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Equipment and Machinery'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Safety and Compliance
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Safety and Compliance', '🧯', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Jobsite Safety', '🦺', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Safety and Compliance'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Compliance', '📋', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Safety and Compliance'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Risk Control', '🚨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Safety and Compliance'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Roofing and Exterior
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Roofing and Exterior', '🪟', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Roofing', '🏠', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Roofing and Exterior'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Exterior Finishes', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Roofing and Exterior'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Waterproofing', '🌧️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Roofing and Exterior'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Project Management and Estimating
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Project Management and Estimating', '🏢', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pre-Construction', '📋', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Project Management and Estimating'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Project Control', '📅', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Project Management and Estimating'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Procurement', '📦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Project Management and Estimating'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Specialty Construction
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Specialty Construction', '🏠', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pools and Outdoor Living', '🏊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Specialty Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Industrial Builds', '🏭', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Specialty Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Institutional Work', '🏥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Specialty Construction'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- ============================================================
-- DOMAIN: Personal
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Personal', '👤', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Housing
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Housing', '🏠', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Rent and Mortgage', '🏡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Housing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Home Maintenance', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Housing'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Utilities', '⚡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Housing'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Food and Dining
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Food and Dining', '🍽️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Groceries', '🛒', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Food and Dining'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Dining Out', '🍔', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Food and Dining'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Snacks and Treats', '🧁', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Food and Dining'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Transportation
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Transportation', '🚗', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Vehicle Fuel', '⛽', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Transportation'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Vehicle Maintenance', '🛞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Transportation'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Public and Other Transport', '🚕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Transportation'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Health and Wellness
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Health and Wellness', '🏥', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Medical', '🩺', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Health and Wellness'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Wellness', '💆', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Health and Wellness'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Personal Care', '🧴', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Health and Wellness'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Clothing and Accessories
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Clothing and Accessories', '👕', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Apparel', '👚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Clothing and Accessories'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Footwear', '👟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Clothing and Accessories'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Accessories', '👜', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Clothing and Accessories'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Education
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Education', '🎓', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'School and Courses', '📚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Education'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Training', '🧑‍🏫', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Education'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Personal and Leisure
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Personal and Leisure', '🏖️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Entertainment', '🎬', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Personal and Leisure'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Travel', '✈️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Personal and Leisure'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Hobbies', '🧸', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Personal and Leisure'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Family and Dependents
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Family and Dependents', '👶', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Baby Care', '🍼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Family and Dependents'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Children''s Needs', '🧒', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Family and Dependents'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Elder Care', '👵', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Family and Dependents'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Financial Obligations
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Financial Obligations', '🧾', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Debt Payments', '💳', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Financial Obligations'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Banking Fees', '🏦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Financial Obligations'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Insurance', '🛡️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Financial Obligations'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Technology and Subscriptions
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Technology and Subscriptions', '📱', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Devices', '💻', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Technology and Subscriptions'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Subscriptions', '📦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Technology and Subscriptions'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Software and Services', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Technology and Subscriptions'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Gifts and Donations
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Gifts and Donations', '🎁', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Gifts', '🎉', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Gifts and Donations'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Donations', '❤️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Gifts and Donations'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Miscellaneous
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Miscellaneous', '🚨', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Personal'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Fees and Charges', '🧾', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Miscellaneous'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'One-time Purchases', '📦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Personal' AND c.name = 'Miscellaneous'
ON CONFLICT ("categoryId", name) DO NOTHING;

