-- ═══════════════════════════════════════════════════════════════
-- Home Expense Domain — full 3-level hierarchy
-- Domain → ExpenseCategories (subcategories) → ExpenseSubcategories (sub-subcategories)
-- ═══════════════════════════════════════════════════════════════

-- ── Domain ───────────────────────────────────────────────────
INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
VALUES ('domain-home', 'Home', '🏠', 'Home and household expense categories', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Subcategories (ExpenseCategories under domain-home) ──────
INSERT INTO expense_categories (id, name, emoji, description, "domainId", "isDefault", "isUserCreated", "requiresSubcategory", "createdAt")
VALUES
  ('cat-home-rent-accommodation',   'Rent & Accommodation',      '🏘️', 'Rent, deposits, and accommodation costs',           'domain-home', true, false, true, NOW()),
  ('cat-home-utilities',            'Utilities',                  '💡', 'Electricity, water, gas, internet, and TV',         'domain-home', true, false, true, NOW()),
  ('cat-home-groceries-food',       'Groceries & Household Food', '🛒', 'Food and grocery purchases for the home',           'domain-home', true, false, true, NOW()),
  ('cat-home-maintenance-repairs',  'Maintenance & Repairs',      '🔧', 'Home repairs, maintenance, and upkeep',             'domain-home', true, false, true, NOW()),
  ('cat-home-domestic-workers',     'Domestic Workers',           '👷', 'Wages for household staff',                         'domain-home', true, false, true, NOW()),
  ('cat-home-furniture-appliances', 'Furniture & Appliances',     '🛋️', 'Furniture, appliances, and home equipment',         'domain-home', true, false, true, NOW()),
  ('cat-home-security',             'Home Security',              '🔒', 'Alarm systems, guards, CCTV, and fencing',          'domain-home', true, false, true, NOW()),
  ('cat-home-garden-outdoor',       'Garden & Outdoor',           '🌿', 'Garden, lawn, pool, and outdoor maintenance',       'domain-home', true, false, true, NOW()),
  ('cat-home-cleaning-toiletries',  'Cleaning & Toiletries',      '🧴', 'Cleaning products, hygiene, and laundry supplies',  'domain-home', true, false, true, NOW()),
  ('cat-home-insurance-rates',      'Insurance & Rates',          '🛡️', 'Home insurance, contents insurance, and rates',     'domain-home', true, false, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Sub-subcategories (ExpenseSubcategories) ─────────────────

-- Rent & Accommodation
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-rent-monthly',       'Monthly Rent',                '💰', 'Regular monthly rent payment',                   'cat-home-rent-accommodation', true, false, NOW()),
  ('subcat-home-rent-deposit',       'Lease / Security Deposit',    '🔑', 'Deposit paid at start of lease',                 'cat-home-rent-accommodation', true, false, NOW()),
  ('subcat-home-rent-ground',        'Ground Rent / Council Rates', '📋', 'Local authority and ground rent charges',        'cat-home-rent-accommodation', true, false, NOW()),
  ('subcat-home-rent-temporary',     'Temporary Accommodation',     '🏨', 'Hotels, lodges, or short-term accommodation',    'cat-home-rent-accommodation', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Utilities
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-util-electricity',   'Electricity / ZESA Tokens',   '⚡', 'Prepaid tokens or electricity bill',             'cat-home-utilities', true, false, NOW()),
  ('subcat-home-util-water',         'Water & Sewage',               '💧', 'Municipal water and sewage charges',             'cat-home-utilities', true, false, NOW()),
  ('subcat-home-util-gas',           'Gas / Cooking Fuel',           '🔥', 'Gas cylinders and cooking fuel',                 'cat-home-utilities', true, false, NOW()),
  ('subcat-home-util-internet',      'Internet & WiFi',              '📶', 'Home internet and WiFi subscription',            'cat-home-utilities', true, false, NOW()),
  ('subcat-home-util-tv',            'Pay TV (DSTV / ZBC)',          '📺', 'Satellite and cable TV subscriptions',           'cat-home-utilities', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Groceries & Household Food
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-groc-produce',       'Fresh Produce & Vegetables',  '🥦', 'Fresh fruit, vegetables, and herbs',             'cat-home-groceries-food', true, false, NOW()),
  ('subcat-home-groc-meat',          'Meat & Poultry',              '🥩', 'Beef, chicken, fish, and other meats',           'cat-home-groceries-food', true, false, NOW()),
  ('subcat-home-groc-dairy',         'Dairy & Eggs',                '🥛', 'Milk, cheese, yoghurt, and eggs',                'cat-home-groceries-food', true, false, NOW()),
  ('subcat-home-groc-pantry',        'Pantry & Dry Goods',          '🌾', 'Rice, flour, oil, sugar, and staples',           'cat-home-groceries-food', true, false, NOW()),
  ('subcat-home-groc-beverages',     'Beverages & Drinks',          '🧃', 'Juice, soft drinks, tea, coffee, and water',     'cat-home-groceries-food', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Maintenance & Repairs
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-maint-plumbing',     'Plumbing',                    '🚿', 'Pipe repairs, taps, and water fittings',         'cat-home-maintenance-repairs', true, false, NOW()),
  ('subcat-home-maint-electrical',   'Electrical Work',             '🔌', 'Wiring, sockets, and electrical repairs',        'cat-home-maintenance-repairs', true, false, NOW()),
  ('subcat-home-maint-painting',     'Painting & Plastering',       '🎨', 'Interior and exterior painting and plastering',  'cat-home-maintenance-repairs', true, false, NOW()),
  ('subcat-home-maint-general',      'General Repairs',             '🔨', 'Miscellaneous fixes and maintenance work',       'cat-home-maintenance-repairs', true, false, NOW()),
  ('subcat-home-maint-roofing',      'Roofing & Structure',         '🏗️', 'Roof repairs, gutters, and structural work',     'cat-home-maintenance-repairs', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Domestic Workers
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-dom-maid',           'Maid / Housekeeper',          '🧹', 'Wages for domestic cleaning and housekeeping',   'cat-home-domestic-workers', true, false, NOW()),
  ('subcat-home-dom-gardener',       'Gardener',                    '🌱', 'Wages for garden and yard work',                 'cat-home-domestic-workers', true, false, NOW()),
  ('subcat-home-dom-security',       'Security Guard',              '💂', 'Wages for residential security',                 'cat-home-domestic-workers', true, false, NOW()),
  ('subcat-home-dom-nanny',          'Nanny / Childminder',         '👶', 'Childcare and babysitting wages',                'cat-home-domestic-workers', true, false, NOW()),
  ('subcat-home-dom-cook',           'Cook',                        '👨‍🍳', 'Wages for household cooking',                  'cat-home-domestic-workers', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Furniture & Appliances
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-furn-furniture',     'Furniture & Fittings',        '🛋️', 'Sofas, beds, tables, chairs, and wardrobes',    'cat-home-furniture-appliances', true, false, NOW()),
  ('subcat-home-furn-appliances',    'Kitchen Appliances',          '🍳', 'Stoves, fridges, microwaves, and kettles',       'cat-home-furniture-appliances', true, false, NOW()),
  ('subcat-home-furn-electronics',   'Electronics & Entertainment', '📺', 'TVs, speakers, computers, and gadgets',          'cat-home-furniture-appliances', true, false, NOW()),
  ('subcat-home-furn-bedding',       'Bedding & Linen',             '🛏️', 'Sheets, pillows, blankets, and towels',          'cat-home-furniture-appliances', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Home Security
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-sec-alarm',          'Alarm System',                '🚨', 'Alarm installation and equipment',               'cat-home-security', true, false, NOW()),
  ('subcat-home-sec-subscription',   'Security Subscription',       '📅', 'Monthly armed response and monitoring fees',     'cat-home-security', true, false, NOW()),
  ('subcat-home-sec-cctv',           'CCTV & Cameras',              '📷', 'Camera installation and maintenance',            'cat-home-security', true, false, NOW()),
  ('subcat-home-sec-fencing',        'Perimeter Fencing',           '🏗️', 'Walls, electric fencing, and gates',            'cat-home-security', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Garden & Outdoor
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-gard-plants',        'Plants, Seeds & Soil',        '🌱', 'Garden plants, seeds, compost, and soil',        'cat-home-garden-outdoor', true, false, NOW()),
  ('subcat-home-gard-tools',         'Garden Tools & Equipment',    '🪣', 'Spades, hoses, lawnmowers, and tools',           'cat-home-garden-outdoor', true, false, NOW()),
  ('subcat-home-gard-lawn',          'Lawn & Hedge Care',           '✂️', 'Grass cutting, hedge trimming, and treatment',   'cat-home-garden-outdoor', true, false, NOW()),
  ('subcat-home-gard-pool',          'Pool Maintenance',            '🏊', 'Pool chemicals, cleaning, and servicing',        'cat-home-garden-outdoor', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Cleaning & Toiletries
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-clean-supplies',     'Cleaning Supplies',           '🧽', 'Detergents, mops, brooms, and cleaning products','cat-home-cleaning-toiletries', true, false, NOW()),
  ('subcat-home-clean-toiletries',   'Personal Hygiene & Toiletries','🧼', 'Soap, shampoo, toothpaste, and toiletries',     'cat-home-cleaning-toiletries', true, false, NOW()),
  ('subcat-home-clean-laundry',      'Laundry Products',            '👕', 'Washing powder, fabric softener, and detergent', 'cat-home-cleaning-toiletries', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insurance & Rates
INSERT INTO expense_subcategories (id, name, emoji, description, "categoryId", "isDefault", "isUserCreated", "createdAt")
VALUES
  ('subcat-home-ins-building',       'Home Insurance',              '🏠', 'Building and property insurance',                'cat-home-insurance-rates', true, false, NOW()),
  ('subcat-home-ins-contents',       'Contents Insurance',          '📦', 'Insurance for household contents and valuables', 'cat-home-insurance-rates', true, false, NOW()),
  ('subcat-home-ins-rates',          'Council Rates & Levies',      '🏛️', 'Local authority rates and municipal charges',   'cat-home-insurance-rates', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
