-- Seed Personal Expenses domain with its categories and subcategories
-- Based on Personal Expenses.md taxonomy
-- Fully idempotent — uses ON CONFLICT DO NOTHING

-- ============================================================
-- DOMAIN
-- ============================================================
INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-personal-expenses', 'Personal Expenses', '🏠', 'Personal household and lifestyle expense categories', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-personal-expenses');

-- ============================================================
-- CATEGORIES (## sections from Personal Expenses.md)
-- ============================================================
INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES
  ('cat-pe-housing',      'domain-personal-expenses', 'Housing',                    '🏠', '#6366F1', 'Rent, utilities, and home maintenance',          true, false, false, NOW(), NOW()),
  ('cat-pe-food',         'domain-personal-expenses', 'Food and Dining',            '🍽️', '#F59E0B', 'Groceries, dining out, and snacks',              true, false, false, NOW(), NOW()),
  ('cat-pe-transport',    'domain-personal-expenses', 'Transportation',             '🚗', '#10B981', 'Vehicle, fuel, and public transport',            true, false, false, NOW(), NOW()),
  ('cat-pe-health',       'domain-personal-expenses', 'Health and Wellness',        '🏥', '#EF4444', 'Medical, wellness, and personal care',           true, false, false, NOW(), NOW()),
  ('cat-pe-clothing',     'domain-personal-expenses', 'Clothing and Accessories',   '👕', '#EC4899', 'Apparel, footwear, and accessories',             true, false, false, NOW(), NOW()),
  ('cat-pe-education',    'domain-personal-expenses', 'Education',                  '🎓', '#8B5CF6', 'Tuition, books, and training',                  true, false, false, NOW(), NOW()),
  ('cat-pe-leisure',      'domain-personal-expenses', 'Personal and Leisure',       '🏖️', '#14B8A6', 'Entertainment, travel, and hobbies',            true, false, false, NOW(), NOW()),
  ('cat-pe-family',       'domain-personal-expenses', 'Family and Dependents',      '👶', '#F97316', 'Baby care, children, and elder care',            true, false, false, NOW(), NOW()),
  ('cat-pe-financial',    'domain-personal-expenses', 'Financial Obligations',      '🧾', '#64748B', 'Debt, banking fees, and insurance',             true, false, false, NOW(), NOW()),
  ('cat-pe-technology',   'domain-personal-expenses', 'Technology and Subscriptions','📱', '#0EA5E9', 'Devices, subscriptions, and software',          true, false, false, NOW(), NOW()),
  ('cat-pe-gifts',        'domain-personal-expenses', 'Gifts and Donations',        '🎁', '#D97706', 'Gifts and charitable donations',                true, false, false, NOW(), NOW()),
  ('cat-pe-misc',         'domain-personal-expenses', 'Miscellaneous',              '🚨', '#9CA3AF', 'Fees, charges, and one-time purchases',          true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- ============================================================
-- SUBCATEGORIES (### sections from Personal Expenses.md)
-- ============================================================

-- Housing
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-housing-rent-mortgage',  'cat-pe-housing', 'Rent and Mortgage',   '🏡', 'Rent, mortgage payments, property tax, and insurance', true, false, NOW()),
  ('subcat-pe-housing-maintenance',    'cat-pe-housing', 'Home Maintenance',    '🔧', 'Repairs, painting, cleaning, and improvements',         true, false, NOW()),
  ('subcat-pe-housing-utilities',      'cat-pe-housing', 'Utilities',           '⚡', 'Electricity, water, gas, internet, and phone',          true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Food and Dining
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-food-groceries',         'cat-pe-food', 'Groceries',          '🛒', 'Produce, meat, packaged foods, and household items', true, false, NOW()),
  ('subcat-pe-food-dining-out',        'cat-pe-food', 'Dining Out',         '🍔', 'Restaurants, fast food, coffee, and takeout',        true, false, NOW()),
  ('subcat-pe-food-snacks',            'cat-pe-food', 'Snacks and Treats',  '🧁', 'Candy, cookies, chips, and desserts',                true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Transportation
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-transport-fuel',         'cat-pe-transport', 'Vehicle Fuel',               '⛽', 'Gasoline, electric charging, and fluids',      true, false, NOW()),
  ('subcat-pe-transport-maintenance',  'cat-pe-transport', 'Vehicle Maintenance',         '🛞', 'Repairs, tires, car wash, and registration',   true, false, NOW()),
  ('subcat-pe-transport-public',       'cat-pe-transport', 'Public and Other Transport',  '🚕', 'Bus, train, rideshare, and travel transport',  true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Health and Wellness
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-health-medical',         'cat-pe-health', 'Medical',         '🩺', 'Doctor visits, hospital, prescriptions, and dental',    true, false, NOW()),
  ('subcat-pe-health-wellness',        'cat-pe-health', 'Wellness',        '💆', 'Gym, yoga, massage, therapy, and coaching',             true, false, NOW()),
  ('subcat-pe-health-personal-care',   'cat-pe-health', 'Personal Care',   '🧴', 'Oral care, skin care, hair care, and grooming',         true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Clothing and Accessories
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-clothing-apparel',       'cat-pe-clothing', 'Apparel',      '👚', 'Shirts, pants, dresses, jackets, and socks',  true, false, NOW()),
  ('subcat-pe-clothing-footwear',      'cat-pe-clothing', 'Footwear',     '👟', 'Shoes, boots, sandals, and flats',            true, false, NOW()),
  ('subcat-pe-clothing-accessories',   'cat-pe-clothing', 'Accessories',  '👜', 'Hats, bags, watches, jewelry, and scarves',   true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Education
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-edu-school',             'cat-pe-education', 'School and Courses', '📚', 'Tuition, books, supplies, and exam fees',             true, false, NOW()),
  ('subcat-pe-edu-training',           'cat-pe-education', 'Training',           '🧑‍🏫', 'Workshops, certifications, and online courses',  true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Personal and Leisure
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-leisure-entertainment',  'cat-pe-leisure', 'Entertainment',  '🎬', 'Movies, music, games, and streaming',           true, false, NOW()),
  ('subcat-pe-leisure-travel',         'cat-pe-leisure', 'Travel',         '✈️', 'Flights, hotels, car rental, and travel dining', true, false, NOW()),
  ('subcat-pe-leisure-hobbies',        'cat-pe-leisure', 'Hobbies',        '🧸', 'Arts, photography, gardening, and crafts',      true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Family and Dependents
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-family-baby',            'cat-pe-family', 'Baby Care',          '🍼', 'Formula, diapers, wipes, and baby products',         true, false, NOW()),
  ('subcat-pe-family-children',        'cat-pe-family', 'Children''s Needs',  '🧒', 'School fees, supplies, clothing, and activities',    true, false, NOW()),
  ('subcat-pe-family-elder',           'cat-pe-family', 'Elder Care',         '👵', 'Medical support, care supplies, and transport',      true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Financial Obligations
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-fin-debt',               'cat-pe-financial', 'Debt Payments',  '💳', 'Credit cards, personal loans, and auto loans',         true, false, NOW()),
  ('subcat-pe-fin-banking',            'cat-pe-financial', 'Banking Fees',   '🏦', 'Account fees, transfer fees, and ATM charges',         true, false, NOW()),
  ('subcat-pe-fin-insurance',          'cat-pe-financial', 'Insurance',      '🛡️', 'Auto, home, health, life, and travel insurance',      true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Technology and Subscriptions
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-tech-devices',           'cat-pe-technology', 'Devices',               '💻', 'Phone, laptop, desktop, and accessories',              true, false, NOW()),
  ('subcat-pe-tech-subscriptions',     'cat-pe-technology', 'Subscriptions',         '📦', 'Streaming, music, cloud storage, and gaming',          true, false, NOW()),
  ('subcat-pe-tech-software',          'cat-pe-technology', 'Software and Services', '🔧', 'Apps, security software, domains, and licenses',       true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Gifts and Donations
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-gifts-gifts',            'cat-pe-gifts', 'Gifts',     '🎉', 'Birthdays, holidays, graduation, and weddings',         true, false, NOW()),
  ('subcat-pe-gifts-donations',        'cat-pe-gifts', 'Donations', '❤️', 'Charity, religious, community, and animal support',     true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Miscellaneous
INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-pe-misc-fees',              'cat-pe-misc', 'Fees and Charges',    '🧾', 'Late fees, service charges, and permit fees',           true, false, NOW()),
  ('subcat-pe-misc-purchases',         'cat-pe-misc', 'One-time Purchases',  '📦', 'Furniture, household items, and unexpected expenses',   true, false, NOW())
ON CONFLICT (id) DO NOTHING;
