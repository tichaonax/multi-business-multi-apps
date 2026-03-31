-- ============================================================
-- MBM-169: Seed 3 new business domains (Services, Retail, Consulting)
-- Safe to re-run: ON CONFLICT DO NOTHING on all inserts
-- ============================================================

-- ============================================================
-- DOMAIN: Services
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Services', '🛠️', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Services: Categories
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Home and Repair Services', '🛠️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Personal Care Services', '💇', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Automotive Services', '🚗', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Education and Training Services', '🧑‍🏫', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Business and Office Services', '🧾', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Health and Wellness Services', '🏥', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Cleaning Services', '🧹', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Logistics and Delivery Services', '📦', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Creative Services', '🧑‍🎨', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Retail Support Services', '🛍️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Security Services', '🛡️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Services'
ON CONFLICT ("domainId", name) DO NOTHING;

-- Services: Subcategories — Home and Repair Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'General Repairs', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Home and Repair Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Maintenance Services', '🏠', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Home and Repair Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'HVAC Services', '🔥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Home and Repair Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Personal Care Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Hair Services', '💇', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Personal Care Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Nail Services', '💅', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Personal Care Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Spa Services', '💆', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Personal Care Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Grooming Services', '🪒', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Personal Care Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Automotive Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Maintenance', '🛞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Automotive Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Repair Services', '🧰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Automotive Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Detailing', '🧼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Automotive Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Education and Training Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tutoring', '📚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Education and Training Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Professional Training', '🎓', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Education and Training Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Child Learning', '🧒', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Education and Training Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Business and Office Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Administrative Support', '🗂️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Business and Office Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Consulting', '💼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Business and Office Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Digital Services', '🧑‍💻', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Business and Office Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Health and Wellness Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Medical Support', '🩺', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Health and Wellness Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Wellness Services', '🧘', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Health and Wellness Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Fitness Services', '🏋️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Health and Wellness Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Cleaning Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Residential Cleaning', '🏠', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Cleaning Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Commercial Cleaning', '🏢', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Cleaning Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Specialty Cleaning', '🛋️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Cleaning Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Logistics and Delivery Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Delivery', '🚚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Logistics and Delivery Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Shipping', '🛫', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Logistics and Delivery Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Moving Services', '🧰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Logistics and Delivery Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Creative Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Design', '🎨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Creative Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Media Services', '📸', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Creative Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Writing Services', '✍️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Creative Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Retail Support Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Merchandising', '🏷️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Retail Support Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sales Support', '📊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Retail Support Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Equipment Support', '🧰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Retail Support Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Services: Subcategories — Security Services
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Guard Services', '👮', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Security Services'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Safety Services', '🔐', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Services' AND c.name = 'Security Services'
ON CONFLICT ("categoryId", name) DO NOTHING;


-- ============================================================
-- DOMAIN: Retail
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Retail', '🛍️', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Retail: Categories
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'General Retail', '🛒', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Apparel Retail', '👕', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Health and Beauty Retail', '🧴', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Hardware and Home Improvement Retail', '🧰', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Furniture and Home Goods', '🪑', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Electronics Retail', '📱', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Toy and Hobby Retail', '🧸', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Kitchen and Housewares', '🍽️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Auto Retail', '🚗', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Pet Retail', '🐶', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Baby Retail', '👶', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Seasonal and Specialty Retail', '🎁', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Retail'
ON CONFLICT ("domainId", name) DO NOTHING;

-- Retail: Subcategories — General Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Storefront Goods', '🏬', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'General Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Impulse Items', '💳', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'General Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Apparel Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Clothing', '👚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Apparel Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Footwear', '👟', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Apparel Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Accessories', '👜', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Apparel Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Health and Beauty Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cosmetics', '💄', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Health and Beauty Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Personal Care', '🧼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Health and Beauty Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Wellness', '💊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Health and Beauty Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Hardware and Home Improvement Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tools', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Hardware and Home Improvement Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Hardware', '🔩', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Hardware and Home Improvement Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Home Improvement', '🏠', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Hardware and Home Improvement Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Furniture and Home Goods
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Furniture', '🛋️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Furniture and Home Goods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Home Decor', '🏡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Furniture and Home Goods'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Storage', '🧺', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Furniture and Home Goods'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Electronics Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Consumer Electronics', '📺', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Electronics Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Computer Accessories', '🖨️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Electronics Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Power and Charging', '🔋', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Electronics Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Toy and Hobby Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Toys', '🧩', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Toy and Hobby Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Crafts and Hobbies', '🎨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Toy and Hobby Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Entertainment', '🎮', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Toy and Hobby Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Kitchen and Housewares
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Kitchenware', '🍳', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Kitchen and Housewares'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cleaning Supplies', '🧽', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Kitchen and Housewares'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Drinkware', '🥤', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Kitchen and Housewares'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Auto Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Car Accessories', '🛞', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Auto Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Maintenance Supplies', '🧰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Auto Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Pet Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Dog Supplies', '🐕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Pet Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cat Supplies', '🐈', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Pet Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Small Animal and Bird', '🐦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Pet Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Baby Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Baby Care', '🍼', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Baby Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Baby Clothing', '👕', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Baby Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Retail: Subcategories — Seasonal and Specialty Retail
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Seasonal Goods', '🎄', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Seasonal and Specialty Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Clearance and Value', '🏷️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Retail' AND c.name = 'Seasonal and Specialty Retail'
ON CONFLICT ("categoryId", name) DO NOTHING;


-- ============================================================
-- DOMAIN: Consulting
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Consulting', '💼', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Consulting: Categories
INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Business Consulting', '💼', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Financial Consulting', '📈', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'IT Consulting', '🧠', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Marketing Consulting', '📣', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Training and Coaching', '🧑‍🏫', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Legal and Compliance Consulting', '⚖️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Project and Program Consulting', '🏗️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Healthcare Consulting', '🏥', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Retail Consulting', '🛒', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'HR and Staffing Consulting', '🏢', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Real Estate Consulting', '🏠', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Consulting'
ON CONFLICT ("domainId", name) DO NOTHING;

-- Consulting: Subcategories — Business Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Strategy', '📊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Business Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Operations', '🏢', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Business Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Management', '💰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Business Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — Financial Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Accounting and Bookkeeping', '💵', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Financial Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Financial Planning', '📊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Financial Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tax and Compliance', '🧮', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Financial Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — IT Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Systems', '💻', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'IT Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Software', '🧪', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'IT Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Cybersecurity', '🛡️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'IT Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — Marketing Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Branding', '🖼️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Marketing Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Digital Marketing', '📲', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Marketing Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sales Enablement', '🛍️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Marketing Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — Training and Coaching
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Professional Coaching', '🧠', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Training and Coaching'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Workshops', '📚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Training and Coaching'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Group Programs', '👥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Training and Coaching'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — Legal and Compliance Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Regulatory', '📄', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Legal and Compliance Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Contracts', '🤝', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Legal and Compliance Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Corporate', '🧾', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Legal and Compliance Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — Project and Program Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Project Planning', '📅', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Project and Program Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Delivery Support', '🧪', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Project and Program Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Program Management', '👥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Project and Program Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — Healthcare Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Operations', '🏨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Healthcare Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Administration', '💊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Healthcare Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Quality and Compliance', '🛡️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Healthcare Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — Retail Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Store Operations', '🏬', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Retail Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Sales and Reporting', '📊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Retail Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Systems and Process', '🔄', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Retail Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — HR and Staffing Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Recruitment', '👥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'HR and Staffing Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Employee Relations', '🧑‍🤝‍🧑', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'HR and Staffing Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Performance', '📈', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'HR and Staffing Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Consulting: Subcategories — Real Estate Consulting
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Commercial', '🏢', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Real Estate Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Residential', '🏡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Real Estate Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Development', '🏗️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Consulting' AND c.name = 'Real Estate Consulting'
ON CONFLICT ("categoryId", name) DO NOTHING;
