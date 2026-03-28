-- Migration 00010: Restaurant canonical taxonomy
-- 12 domains, 39 categories, 203 subcategories
-- Source: Restaurant domains.md
-- Note: Remaps 154 live products, deactivates old domain-linked categories

-- ============================================================
-- 0. RENAME OLD DOMAINS WITH (legacy) SUFFIX TO AVOID NAME CONFLICTS
-- ============================================================
UPDATE inventory_domains
SET name = name || ' (legacy)'
WHERE "businessType" = 'restaurant'
  AND id NOT LIKE 'rdom_%';

-- ============================================================
-- 1. INSERT NEW DOMAINS
-- ============================================================
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('rdom_food_service', 'Food Service',              '🍽️', 'Main food menu items',                  'restaurant', true, true, NOW()),
  ('rdom_beverages',    'Beverages',                 '☕', 'All drinks and beverages',               'restaurant', true, true, NOW()),
  ('rdom_bakery',       'Bakery and Pastry',         '🥖', 'Breads, pastries and baked goods',       'restaurant', true, true, NOW()),
  ('rdom_breakfast',    'Breakfast and Brunch',      '🍳', 'Morning and brunch items',               'restaurant', true, true, NOW()),
  ('rdom_fast_food',    'Fast Food and Quick Service','🍟', 'Quick service menu items',              'restaurant', true, true, NOW()),
  ('rdom_sides',        'Sides and Extras',          '🧂', 'Side dishes and add-ons',               'restaurant', true, true, NOW()),
  ('rdom_pizza',        'Pizza Shop',                '🍕', 'Pizza types, add-ons and sides',         'restaurant', true, true, NOW()),
  ('rdom_mexican',      'Mexican and Latin',         '🌯', 'Mexican and Latin cuisine',              'restaurant', true, true, NOW()),
  ('rdom_asian',        'Asian Cuisine',             '🍣', 'Asian noodle, rice and appetizer dishes','restaurant', true, true, NOW()),
  ('rdom_italian',      'Italian Cuisine',           '🍝', 'Italian pasta, pizza and sides',         'restaurant', true, true, NOW()),
  ('rdom_grill',        'Grill and Steakhouse',      '🥩', 'Grilled meats and steakhouse fare',      'restaurant', true, true, NOW()),
  ('rdom_takeout',      'Takeout and Delivery',      '🥡', 'Combo meals, family meals and packaging','restaurant', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- ============================================================
-- 2. INSERT NEW CATEGORIES
-- ============================================================
INSERT INTO business_categories (id, name, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  -- Food Service
  ('rcat_food_appetizers', 'Appetizers',     '🍲', '#F97316', 'restaurant', 'rdom_food_service', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_food_mains',      'Main Courses',   '🍛', '#EF4444', 'restaurant', 'rdom_food_service', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_food_soups',      'Soups and Stews','🍜', '#F59E0B', 'restaurant', 'rdom_food_service', NULL, true, false, 3, NOW(), NOW()),
  ('rcat_food_salads',     'Salads',         '🥗', '#22C55E', 'restaurant', 'rdom_food_service', NULL, true, false, 4, NOW(), NOW()),
  ('rcat_food_desserts',   'Desserts',       '🍰', '#A855F7', 'restaurant', 'rdom_food_service', NULL, true, false, 5, NOW(), NOW()),
  -- Beverages
  ('rcat_bev_soft',      'Soft Drinks',      '🥤', '#3B82F6', 'restaurant', 'rdom_beverages', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_bev_hot',       'Hot Drinks',       '☕', '#78350F', 'restaurant', 'rdom_beverages', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_bev_specialty', 'Specialty Drinks', '🍹', '#EC4899', 'restaurant', 'rdom_beverages', NULL, true, false, 3, NOW(), NOW()),
  ('rcat_bev_alcohol',   'Alcoholic Drinks', '🍺', '#7C3AED', 'restaurant', 'rdom_beverages', NULL, true, false, 4, NOW(), NOW()),
  -- Bakery
  ('rcat_bak_breads',   'Breads',          '🍞', '#D97706', 'restaurant', 'rdom_bakery', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_bak_pastries', 'Pastries',        '🥐', '#F59E0B', 'restaurant', 'rdom_bakery', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_bak_cakes',    'Cakes and Sweets','🎂', '#F43F5E', 'restaurant', 'rdom_bakery', NULL, true, false, 3, NOW(), NOW()),
  -- Breakfast
  ('rcat_brk_plates',  'Breakfast Plates', '🥞', '#FCD34D', 'restaurant', 'rdom_breakfast', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_brk_brunch',  'Brunch Items',     '🍳', '#F59E0B', 'restaurant', 'rdom_breakfast', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_brk_cereals', 'Cereals and Grains','🥣', '#D97706', 'restaurant', 'rdom_breakfast', NULL, true, false, 3, NOW(), NOW()),
  -- Fast Food
  ('rcat_ff_burgers', 'Burgers and Sandwiches','🍔', '#EF4444', 'restaurant', 'rdom_fast_food', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_ff_fried',   'Fried Foods',          '🍗', '#F97316', 'restaurant', 'rdom_fast_food', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_ff_quick',   'Quick Bites',          '🌮', '#EAB308', 'restaurant', 'rdom_fast_food', NULL, true, false, 3, NOW(), NOW()),
  -- Sides and Extras
  ('rcat_sides_items',  'Side Items',        '🍟', '#84CC16', 'restaurant', 'rdom_sides', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_sides_extras', 'Extras and Add-ons','🧂', '#65A30D', 'restaurant', 'rdom_sides', NULL, true, false, 2, NOW(), NOW()),
  -- Pizza Shop
  ('rcat_piz_types',  'Pizza Types',    '🍕', '#EF4444', 'restaurant', 'rdom_pizza', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_piz_addons', 'Pizza Add-ons',  '🧀', '#F97316', 'restaurant', 'rdom_pizza', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_piz_sides',  'Pizza Sides',    '🥖', '#F59E0B', 'restaurant', 'rdom_pizza', NULL, true, false, 3, NOW(), NOW()),
  -- Mexican and Latin
  ('rcat_mex_mains',  'Main Dishes', '🌮', '#EF4444', 'restaurant', 'rdom_mexican', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_mex_addons', 'Add-ons',     '🧂', '#F97316', 'restaurant', 'rdom_mexican', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_mex_drinks', 'Drinks',      '🥤', '#3B82F6', 'restaurant', 'rdom_mexican', NULL, true, false, 3, NOW(), NOW()),
  -- Asian Cuisine
  ('rcat_asi_noodles',    'Noodle Dishes',    '🍜', '#EF4444', 'restaurant', 'rdom_asian', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_asi_rice',       'Rice Dishes',      '🍚', '#F97316', 'restaurant', 'rdom_asian', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_asi_appetizers', 'Appetizers',       '🥟', '#EAB308', 'restaurant', 'rdom_asian', NULL, true, false, 3, NOW(), NOW()),
  ('rcat_asi_sauces',     'Sauces and Extras','🥢', '#84CC16', 'restaurant', 'rdom_asian', NULL, true, false, 4, NOW(), NOW()),
  -- Italian Cuisine
  ('rcat_ita_pasta',       'Pasta Dishes',       '🍝', '#EF4444', 'restaurant', 'rdom_italian', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_ita_specialties', 'Italian Specialties','🍕', '#F97316', 'restaurant', 'rdom_italian', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_ita_sides',       'Sides',              '🍞', '#F59E0B', 'restaurant', 'rdom_italian', NULL, true, false, 3, NOW(), NOW()),
  -- Grill and Steakhouse
  ('rcat_grl_steaks', 'Steaks',        '🥩', '#991B1B', 'restaurant', 'rdom_grill', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_grl_meats',  'Grilled Meats', '🍗', '#DC2626', 'restaurant', 'rdom_grill', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_grl_sides',  'Sides',         '🥔', '#B45309', 'restaurant', 'rdom_grill', NULL, true, false, 3, NOW(), NOW()),
  -- Takeout and Delivery
  ('rcat_tak_combos',    'Combo Meals',   '📦', '#1D4ED8', 'restaurant', 'rdom_takeout', NULL, true, false, 1, NOW(), NOW()),
  ('rcat_tak_family',    'Family Meals',  '🛍️', '#2563EB', 'restaurant', 'rdom_takeout', NULL, true, false, 2, NOW(), NOW()),
  ('rcat_tak_packaging', 'Packaging',     '🧾', '#3B82F6', 'restaurant', 'rdom_takeout', NULL, true, false, 3, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ============================================================
-- 3. REMAP LIVE PRODUCTS to new canonical categories
-- ============================================================
-- Main Courses (70 products)
UPDATE business_products SET "categoryId" = 'rcat_food_mains'
WHERE "categoryId" = 'cat_restaurant_mains_001';

-- Appetizers (53 products)
UPDATE business_products SET "categoryId" = 'rcat_food_appetizers'
WHERE "categoryId" = 'cat_restaurant_appetizers_001';

-- Beverages (25 products)
UPDATE business_products SET "categoryId" = 'rcat_bev_soft'
WHERE "categoryId" = 'cat_restaurant_beverages_001';

-- Desserts (6 products)
UPDATE business_products SET "categoryId" = 'rcat_food_desserts'
WHERE "categoryId" = 'cat_restaurant_desserts_001';

-- ============================================================
-- 4. DELETE OLD RESTAURANT SUBCATEGORIES (domain-linked only)
-- ============================================================
DELETE FROM inventory_subcategories
WHERE "categoryId" IN (
  SELECT bc.id FROM business_categories bc
  WHERE bc."businessType" = 'restaurant'
    AND bc."domainId" IS NOT NULL
    AND bc.id NOT LIKE 'rcat_%'
);

-- ============================================================
-- 5. DELETE OLD RESTAURANT CATEGORIES (domain-linked only)
-- ============================================================
DELETE FROM business_categories
WHERE "businessType" = 'restaurant'
  AND "domainId" IS NOT NULL
  AND id NOT LIKE 'rcat_%';

-- ============================================================
-- 6. DEACTIVATE OLD RESTAURANT DOMAINS
-- ============================================================
UPDATE inventory_domains
SET "isActive" = false
WHERE "businessType" = 'restaurant'
  AND id NOT LIKE 'rdom_%';

-- ============================================================
-- 7. INSERT SUBCATEGORIES FOR NEW CATEGORIES
-- ============================================================
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Food Service: Appetizers
  ('rsc_fap_1', 'rcat_food_appetizers', 'Salads',            '🥗', false, false, 1, NOW()),
  ('rsc_fap_2', 'rcat_food_appetizers', 'Fries',             '🍟', false, false, 2, NOW()),
  ('rsc_fap_3', 'rcat_food_appetizers', 'Onion rings',       '🧅', false, false, 3, NOW()),
  ('rsc_fap_4', 'rcat_food_appetizers', 'Cheese bites',      '🧀', false, false, 4, NOW()),
  ('rsc_fap_5', 'rcat_food_appetizers', 'Nachos',            '🌮', false, false, 5, NOW()),
  ('rsc_fap_6', 'rcat_food_appetizers', 'Dumplings',         '🥟', false, false, 6, NOW()),
  ('rsc_fap_7', 'rcat_food_appetizers', 'Shrimp appetizers', '🍤', false, false, 7, NOW()),
  ('rsc_fap_8', 'rcat_food_appetizers', 'Wings',             '🍗', false, false, 8, NOW()),
  -- Food Service: Main Courses
  ('rsc_fmc_1',  'rcat_food_mains', 'Burgers',       '🍔', false, false, 1,  NOW()),
  ('rsc_fmc_2',  'rcat_food_mains', 'Chicken dishes','🍗', false, false, 2,  NOW()),
  ('rsc_fmc_3',  'rcat_food_mains', 'Beef dishes',   '🥩', false, false, 3,  NOW()),
  ('rsc_fmc_4',  'rcat_food_mains', 'Fish dishes',   '🐟', false, false, 4,  NOW()),
  ('rsc_fmc_5',  'rcat_food_mains', 'Pasta',         '🍝', false, false, 5,  NOW()),
  ('rsc_fmc_6',  'rcat_food_mains', 'Rice dishes',   '🍚', false, false, 6,  NOW()),
  ('rsc_fmc_7',  'rcat_food_mains', 'Tacos',         '🌮', false, false, 7,  NOW()),
  ('rsc_fmc_8',  'rcat_food_mains', 'Pizza',         '🍕', false, false, 8,  NOW()),
  ('rsc_fmc_9',  'rcat_food_mains', 'Sandwiches',    '🥪', false, false, 9,  NOW()),
  ('rsc_fmc_10', 'rcat_food_mains', 'Rice bowls',    '🍛', false, false, 10, NOW()),
  -- Food Service: Soups and Stews
  ('rsc_fss_1', 'rcat_food_soups', 'Soups',        '🍲', false, false, 1, NOW()),
  ('rsc_fss_2', 'rcat_food_soups', 'Stews',        '🥘', false, false, 2, NOW()),
  ('rsc_fss_3', 'rcat_food_soups', 'Noodle soups', '🍜', false, false, 3, NOW()),
  ('rsc_fss_4', 'rcat_food_soups', 'Bean soups',   '🫘', false, false, 4, NOW()),
  ('rsc_fss_5', 'rcat_food_soups', 'Tomato soups', '🍅', false, false, 5, NOW()),
  -- Food Service: Salads
  ('rsc_fsa_1', 'rcat_food_salads', 'Garden salad',  '🥗', false, false, 1, NOW()),
  ('rsc_fsa_2', 'rcat_food_salads', 'Caesar salad',  '🥙', false, false, 2, NOW()),
  ('rsc_fsa_3', 'rcat_food_salads', 'Chicken salad', '🍗', false, false, 3, NOW()),
  ('rsc_fsa_4', 'rcat_food_salads', 'Avocado salad', '🥑', false, false, 4, NOW()),
  ('rsc_fsa_5', 'rcat_food_salads', 'Seafood salad', '🍤', false, false, 5, NOW()),
  -- Food Service: Desserts
  ('rsc_fde_1', 'rcat_food_desserts', 'Cakes',     '🍰', false, false, 1, NOW()),
  ('rsc_fde_2', 'rcat_food_desserts', 'Pies',      '🥧', false, false, 2, NOW()),
  ('rsc_fde_3', 'rcat_food_desserts', 'Puddings',  '🍮', false, false, 3, NOW()),
  ('rsc_fde_4', 'rcat_food_desserts', 'Ice cream', '🍨', false, false, 4, NOW()),
  ('rsc_fde_5', 'rcat_food_desserts', 'Cookies',   '🍪', false, false, 5, NOW()),
  ('rsc_fde_6', 'rcat_food_desserts', 'Donuts',    '🍩', false, false, 6, NOW()),
  ('rsc_fde_7', 'rcat_food_desserts', 'Brownies',  '🍫', false, false, 7, NOW()),
  -- Beverages: Soft Drinks
  ('rsc_bvs_1', 'rcat_bev_soft', 'Soda',            '🥤', false, false, 1, NOW()),
  ('rsc_bvs_2', 'rcat_bev_soft', 'Juice',            '🧃', false, false, 2, NOW()),
  ('rsc_bvs_3', 'rcat_bev_soft', 'Water',            '💧', false, false, 3, NOW()),
  ('rsc_bvs_4', 'rcat_bev_soft', 'Sparkling water',  '🫧', false, false, 4, NOW()),
  ('rsc_bvs_5', 'rcat_bev_soft', 'Lemonade',         '🍋', false, false, 5, NOW()),
  -- Beverages: Hot Drinks
  ('rsc_bvh_1', 'rcat_bev_hot', 'Coffee',       '☕', false, false, 1, NOW()),
  ('rsc_bvh_2', 'rcat_bev_hot', 'Tea',          '🍵', false, false, 2, NOW()),
  ('rsc_bvh_3', 'rcat_bev_hot', 'Herbal tea',   '🫖', false, false, 3, NOW()),
  ('rsc_bvh_4', 'rcat_bev_hot', 'Hot chocolate','🥛', false, false, 4, NOW()),
  ('rsc_bvh_5', 'rcat_bev_hot', 'Espresso',     '☕', false, false, 5, NOW()),
  -- Beverages: Specialty Drinks
  ('rsc_bvsp_1', 'rcat_bev_specialty', 'Mocktails',              '🍹', false, false, 1, NOW()),
  ('rsc_bvsp_2', 'rcat_bev_specialty', 'Non-alcoholic cocktails','🍸', false, false, 2, NOW()),
  ('rsc_bvsp_3', 'rcat_bev_specialty', 'Bubble tea',             '🧋', false, false, 3, NOW()),
  ('rsc_bvsp_4', 'rcat_bev_specialty', 'Fresh juice blends',     '🧃', false, false, 4, NOW()),
  ('rsc_bvsp_5', 'rcat_bev_specialty', 'Smoothies',              '🥤', false, false, 5, NOW()),
  -- Beverages: Alcoholic Drinks
  ('rsc_bval_1', 'rcat_bev_alcohol', 'Beer',         '🍺', false, false, 1, NOW()),
  ('rsc_bval_2', 'rcat_bev_alcohol', 'Wine',         '🍷', false, false, 2, NOW()),
  ('rsc_bval_3', 'rcat_bev_alcohol', 'Cocktails',    '🍸', false, false, 3, NOW()),
  ('rsc_bval_4', 'rcat_bev_alcohol', 'Whiskey',      '🥃', false, false, 4, NOW()),
  ('rsc_bval_5', 'rcat_bev_alcohol', 'Champagne',    '🥂', false, false, 5, NOW()),
  ('rsc_bval_6', 'rcat_bev_alcohol', 'Mixed drinks', '🍹', false, false, 6, NOW()),
  -- Bakery: Breads
  ('rsc_bkb_1', 'rcat_bak_breads', 'Dinner rolls',    '🍞', false, false, 1, NOW()),
  ('rsc_bkb_2', 'rcat_bak_breads', 'Baguettes',       '🥖', false, false, 2, NOW()),
  ('rsc_bkb_3', 'rcat_bak_breads', 'Sandwich bread',  '🍞', false, false, 3, NOW()),
  ('rsc_bkb_4', 'rcat_bak_breads', 'Flatbread',       '🫓', false, false, 4, NOW()),
  ('rsc_bkb_5', 'rcat_bak_breads', 'Bagels',          '🥯', false, false, 5, NOW()),
  -- Bakery: Pastries
  ('rsc_bkp_1', 'rcat_bak_pastries', 'Croissants',     '🥐', false, false, 1, NOW()),
  ('rsc_bkp_2', 'rcat_bak_pastries', 'Turnovers',      '🥧', false, false, 2, NOW()),
  ('rsc_bkp_3', 'rcat_bak_pastries', 'Donuts',         '🍩', false, false, 3, NOW()),
  ('rsc_bkp_4', 'rcat_bak_pastries', 'Danish pastries','🥮', false, false, 4, NOW()),
  ('rsc_bkp_5', 'rcat_bak_pastries', 'Cookies',        '🍪', false, false, 5, NOW()),
  -- Bakery: Cakes and Sweets
  ('rsc_bkc_1', 'rcat_bak_cakes', 'Cakes',       '🎂', false, false, 1, NOW()),
  ('rsc_bkc_2', 'rcat_bak_cakes', 'Cupcakes',    '🍰', false, false, 2, NOW()),
  ('rsc_bkc_3', 'rcat_bak_cakes', 'Custards',    '🍮', false, false, 3, NOW()),
  ('rsc_bkc_4', 'rcat_bak_cakes', 'Brownies',    '🍫', false, false, 4, NOW()),
  ('rsc_bkc_5', 'rcat_bak_cakes', 'Sweet treats','🍬', false, false, 5, NOW()),
  -- Breakfast: Breakfast Plates
  ('rsc_brp_1', 'rcat_brk_plates', 'Pancakes', '🥞', false, false, 1, NOW()),
  ('rsc_brp_2', 'rcat_brk_plates', 'Waffles',  '🧇', false, false, 2, NOW()),
  ('rsc_brp_3', 'rcat_brk_plates', 'Eggs',     '🍳', false, false, 3, NOW()),
  ('rsc_brp_4', 'rcat_brk_plates', 'Bacon',    '🥓', false, false, 4, NOW()),
  ('rsc_brp_5', 'rcat_brk_plates', 'Sausage',  '🌭', false, false, 5, NOW()),
  ('rsc_brp_6', 'rcat_brk_plates', 'Toast',    '🍞', false, false, 6, NOW()),
  -- Breakfast: Brunch Items
  ('rsc_bri_1', 'rcat_brk_brunch', 'Omelets',                '🥚', false, false, 1, NOW()),
  ('rsc_bri_2', 'rcat_brk_brunch', 'Avocado toast',          '🥑', false, false, 2, NOW()),
  ('rsc_bri_3', 'rcat_brk_brunch', 'Breakfast sandwiches',   '🥪', false, false, 3, NOW()),
  ('rsc_bri_4', 'rcat_brk_brunch', 'Breakfast bowls',        '🍚', false, false, 4, NOW()),
  ('rsc_bri_5', 'rcat_brk_brunch', 'Light breakfast salads', '🥗', false, false, 5, NOW()),
  -- Breakfast: Cereals and Grains
  ('rsc_brc_1', 'rcat_brk_cereals', 'Oatmeal',           '🥣', false, false, 1, NOW()),
  ('rsc_brc_2', 'rcat_brk_cereals', 'Granola',           '🌾', false, false, 2, NOW()),
  ('rsc_brc_3', 'rcat_brk_cereals', 'Cereal',            '🥣', false, false, 3, NOW()),
  ('rsc_brc_4', 'rcat_brk_cereals', 'Grits',             '🍚', false, false, 4, NOW()),
  ('rsc_brc_5', 'rcat_brk_cereals', 'Breakfast muffins', '🍞', false, false, 5, NOW()),
  -- Fast Food: Burgers and Sandwiches
  ('rsc_ffb_1', 'rcat_ff_burgers', 'Burgers',    '🍔', false, false, 1, NOW()),
  ('rsc_ffb_2', 'rcat_ff_burgers', 'Sandwiches', '🥪', false, false, 2, NOW()),
  ('rsc_ffb_3', 'rcat_ff_burgers', 'Hot dogs',   '🌭', false, false, 3, NOW()),
  ('rsc_ffb_4', 'rcat_ff_burgers', 'Wraps',      '🥙', false, false, 4, NOW()),
  ('rsc_ffb_5', 'rcat_ff_burgers', 'Subs',       '🌮', false, false, 5, NOW()),
  -- Fast Food: Fried Foods
  ('rsc_fff_1', 'rcat_ff_fried', 'Fried chicken', '🍗', false, false, 1, NOW()),
  ('rsc_fff_2', 'rcat_ff_fried', 'Fries',         '🍟', false, false, 2, NOW()),
  ('rsc_fff_3', 'rcat_ff_fried', 'Onion rings',   '🧅', false, false, 3, NOW()),
  ('rsc_fff_4', 'rcat_ff_fried', 'Fried fish',    '🐟', false, false, 4, NOW()),
  ('rsc_fff_5', 'rcat_ff_fried', 'Fried shrimp',  '🍤', false, false, 5, NOW()),
  -- Fast Food: Quick Bites
  ('rsc_ffq_1', 'rcat_ff_quick', 'Tacos',         '🌮', false, false, 1, NOW()),
  ('rsc_ffq_2', 'rcat_ff_quick', 'Dumplings',     '🥟', false, false, 2, NOW()),
  ('rsc_ffq_3', 'rcat_ff_quick', 'Pretzels',      '🥨', false, false, 3, NOW()),
  ('rsc_ffq_4', 'rcat_ff_quick', 'Cheese sticks', '🧀', false, false, 4, NOW()),
  ('rsc_ffq_5', 'rcat_ff_quick', 'Burritos',      '🌯', false, false, 5, NOW()),
  -- Sides: Side Items
  ('rsc_sdi_1', 'rcat_sides_items', 'Fries',          '🍟', false, false, 1, NOW()),
  ('rsc_sdi_2', 'rcat_sides_items', 'Mashed potatoes','🥔', false, false, 2, NOW()),
  ('rsc_sdi_3', 'rcat_sides_items', 'Rice',           '🍚', false, false, 3, NOW()),
  ('rsc_sdi_4', 'rcat_sides_items', 'Beans',          '🫘', false, false, 4, NOW()),
  ('rsc_sdi_5', 'rcat_sides_items', 'Side salad',     '🥗', false, false, 5, NOW()),
  ('rsc_sdi_6', 'rcat_sides_items', 'Garlic bread',   '🍞', false, false, 6, NOW()),
  -- Sides: Extras and Add-ons
  ('rsc_sde_1', 'rcat_sides_extras', 'Extra cheese', '🧀', false, false, 1, NOW()),
  ('rsc_sde_2', 'rcat_sides_extras', 'Extra bacon',  '🥓', false, false, 2, NOW()),
  ('rsc_sde_3', 'rcat_sides_extras', 'Hot sauce',    '🌶️', false, false, 3, NOW()),
  ('rsc_sde_4', 'rcat_sides_extras', 'Dipping sauce','🥫', false, false, 4, NOW()),
  ('rsc_sde_5', 'rcat_sides_extras', 'Garlic butter','🧄', false, false, 5, NOW()),
  ('rsc_sde_6', 'rcat_sides_extras', 'Butter',       '🧈', false, false, 6, NOW()),
  -- Pizza: Pizza Types
  ('rsc_pzt_1', 'rcat_piz_types', 'Cheese pizza',     '🍕', false, false, 1, NOW()),
  ('rsc_pzt_2', 'rcat_piz_types', 'Pepperoni pizza',  '🍕', false, false, 2, NOW()),
  ('rsc_pzt_3', 'rcat_piz_types', 'Vegetarian pizza', '🍕', false, false, 3, NOW()),
  ('rsc_pzt_4', 'rcat_piz_types', 'Meat lovers pizza','🍕', false, false, 4, NOW()),
  ('rsc_pzt_5', 'rcat_piz_types', 'Supreme pizza',    '🍕', false, false, 5, NOW()),
  -- Pizza: Add-ons
  ('rsc_pza_1', 'rcat_piz_addons', 'Extra cheese','🧀', false, false, 1, NOW()),
  ('rsc_pza_2', 'rcat_piz_addons', 'Mushrooms',   '🍄', false, false, 2, NOW()),
  ('rsc_pza_3', 'rcat_piz_addons', 'Peppers',     '🫑', false, false, 3, NOW()),
  ('rsc_pza_4', 'rcat_piz_addons', 'Onions',      '🧅', false, false, 4, NOW()),
  ('rsc_pza_5', 'rcat_piz_addons', 'Olives',      '🫒', false, false, 5, NOW()),
  ('rsc_pza_6', 'rcat_piz_addons', 'Sausage',     '🍖', false, false, 6, NOW()),
  ('rsc_pza_7', 'rcat_piz_addons', 'Pineapple',   '🍍', false, false, 7, NOW()),
  -- Pizza: Sides
  ('rsc_pzs_1', 'rcat_piz_sides', 'Breadsticks',     '🥖', false, false, 1, NOW()),
  ('rsc_pzs_2', 'rcat_piz_sides', 'Garlic knots',    '🧄', false, false, 2, NOW()),
  ('rsc_pzs_3', 'rcat_piz_sides', 'Salad',           '🥗', false, false, 3, NOW()),
  ('rsc_pzs_4', 'rcat_piz_sides', 'Wings',           '🍗', false, false, 4, NOW()),
  ('rsc_pzs_5', 'rcat_piz_sides', 'Fountain drinks', '🥤', false, false, 5, NOW()),
  -- Mexican: Main Dishes
  ('rsc_mxm_1', 'rcat_mex_mains', 'Tacos',        '🌮', false, false, 1, NOW()),
  ('rsc_mxm_2', 'rcat_mex_mains', 'Burritos',     '🌯', false, false, 2, NOW()),
  ('rsc_mxm_3', 'rcat_mex_mains', 'Tamales',      '🫔', false, false, 3, NOW()),
  ('rsc_mxm_4', 'rcat_mex_mains', 'Quesadillas',  '🥙', false, false, 4, NOW()),
  ('rsc_mxm_5', 'rcat_mex_mains', 'Burrito bowls','🍚', false, false, 5, NOW()),
  -- Mexican: Add-ons
  ('rsc_mxa_1', 'rcat_mex_addons', 'Cheese',     '🧀', false, false, 1, NOW()),
  ('rsc_mxa_2', 'rcat_mex_addons', 'Beans',      '🫘', false, false, 2, NOW()),
  ('rsc_mxa_3', 'rcat_mex_addons', 'Rice',       '🍚', false, false, 3, NOW()),
  ('rsc_mxa_4', 'rcat_mex_addons', 'Guacamole',  '🥑', false, false, 4, NOW()),
  ('rsc_mxa_5', 'rcat_mex_addons', 'Onions',     '🧅', false, false, 5, NOW()),
  ('rsc_mxa_6', 'rcat_mex_addons', 'Salsa',      '🌶️', false, false, 6, NOW()),
  ('rsc_mxa_7', 'rcat_mex_addons', 'Lettuce',    '🥬', false, false, 7, NOW()),
  -- Mexican: Drinks
  ('rsc_mxd_1', 'rcat_mex_drinks', 'Soda',         '🥤', false, false, 1, NOW()),
  ('rsc_mxd_2', 'rcat_mex_drinks', 'Horchata',     '🧃', false, false, 2, NOW()),
  ('rsc_mxd_3', 'rcat_mex_drinks', 'Lime drinks',  '🍋', false, false, 3, NOW()),
  ('rsc_mxd_4', 'rcat_mex_drinks', 'Aguas frescas','🫗', false, false, 4, NOW()),
  -- Asian: Noodle Dishes
  ('rsc_asn_1', 'rcat_asi_noodles', 'Ramen',              '🍜', false, false, 1, NOW()),
  ('rsc_asn_2', 'rcat_asi_noodles', 'Lo mein',            '🍝', false, false, 2, NOW()),
  ('rsc_asn_3', 'rcat_asi_noodles', 'Udon',               '🍜', false, false, 3, NOW()),
  ('rsc_asn_4', 'rcat_asi_noodles', 'Pho',                '🍜', false, false, 4, NOW()),
  ('rsc_asn_5', 'rcat_asi_noodles', 'Stir-fried noodles', '🥢', false, false, 5, NOW()),
  -- Asian: Rice Dishes
  ('rsc_asr_1', 'rcat_asi_rice', 'Fried rice',  '🍚', false, false, 1, NOW()),
  ('rsc_asr_2', 'rcat_asi_rice', 'Curry rice',  '🍛', false, false, 2, NOW()),
  ('rsc_asr_3', 'rcat_asi_rice', 'Bento rice',  '🍱', false, false, 3, NOW()),
  ('rsc_asr_4', 'rcat_asi_rice', 'Rice bowls',  '🍱', false, false, 4, NOW()),
  -- Asian: Appetizers
  ('rsc_asa_1', 'rcat_asi_appetizers', 'Dumplings',   '🥟', false, false, 1, NOW()),
  ('rsc_asa_2', 'rcat_asi_appetizers', 'Spring rolls', '🥟', false, false, 2, NOW()),
  ('rsc_asa_3', 'rcat_asi_appetizers', 'Tempura',      '🍤', false, false, 3, NOW()),
  ('rsc_asa_4', 'rcat_asi_appetizers', 'Egg rolls',    '🥠', false, false, 4, NOW()),
  -- Asian: Sauces and Extras
  ('rsc_ass_1', 'rcat_asi_sauces', 'Soy sauce',   '🥢', false, false, 1, NOW()),
  ('rsc_ass_2', 'rcat_asi_sauces', 'Chili sauce', '🌶️', false, false, 2, NOW()),
  ('rsc_ass_3', 'rcat_asi_sauces', 'Ginger sauce','🧄', false, false, 3, NOW()),
  ('rsc_ass_4', 'rcat_asi_sauces', 'Sweet sauce', '🍯', false, false, 4, NOW()),
  -- Italian: Pasta Dishes
  ('rsc_itp_1', 'rcat_ita_pasta', 'Spaghetti',           '🍝', false, false, 1, NOW()),
  ('rsc_itp_2', 'rcat_ita_pasta', 'Lasagna',             '🍝', false, false, 2, NOW()),
  ('rsc_itp_3', 'rcat_ita_pasta', 'Fettuccine',          '🍝', false, false, 3, NOW()),
  ('rsc_itp_4', 'rcat_ita_pasta', 'Macaroni and cheese', '🍝', false, false, 4, NOW()),
  ('rsc_itp_5', 'rcat_ita_pasta', 'Ravioli',             '🍝', false, false, 5, NOW()),
  -- Italian: Specialties
  ('rsc_its_1', 'rcat_ita_specialties', 'Pizza',         '🍕', false, false, 1, NOW()),
  ('rsc_its_2', 'rcat_ita_specialties', 'Calzones',      '🥖', false, false, 2, NOW()),
  ('rsc_its_3', 'rcat_ita_specialties', 'Caprese salad', '🥗', false, false, 3, NOW()),
  ('rsc_its_4', 'rcat_ita_specialties', 'Arancini',      '🧀', false, false, 4, NOW()),
  -- Italian: Sides
  ('rsc_itsd_1', 'rcat_ita_sides', 'Breadsticks', '🥖', false, false, 1, NOW()),
  ('rsc_itsd_2', 'rcat_ita_sides', 'Side salad',  '🥗', false, false, 2, NOW()),
  ('rsc_itsd_3', 'rcat_ita_sides', 'Garlic bread','🧄', false, false, 3, NOW()),
  -- Grill: Steaks
  ('rsc_gst_1', 'rcat_grl_steaks', 'Ribeye',       '🥩', false, false, 1, NOW()),
  ('rsc_gst_2', 'rcat_grl_steaks', 'Sirloin',      '🥩', false, false, 2, NOW()),
  ('rsc_gst_3', 'rcat_grl_steaks', 'T-bone',       '🥩', false, false, 3, NOW()),
  ('rsc_gst_4', 'rcat_grl_steaks', 'Filet mignon', '🥩', false, false, 4, NOW()),
  -- Grill: Grilled Meats
  ('rsc_gmt_1', 'rcat_grl_meats', 'Chicken breast','🍗', false, false, 1, NOW()),
  ('rsc_gmt_2', 'rcat_grl_meats', 'Ribs',          '🍖', false, false, 2, NOW()),
  ('rsc_gmt_3', 'rcat_grl_meats', 'Burgers',       '🍔', false, false, 3, NOW()),
  ('rsc_gmt_4', 'rcat_grl_meats', 'Grilled fish',  '🐟', false, false, 4, NOW()),
  -- Grill: Sides
  ('rsc_gsd_1', 'rcat_grl_sides', 'Baked potato', '🥔', false, false, 1, NOW()),
  ('rsc_gsd_2', 'rcat_grl_sides', 'Salad',        '🥗', false, false, 2, NOW()),
  ('rsc_gsd_3', 'rcat_grl_sides', 'Corn',         '🌽', false, false, 3, NOW()),
  ('rsc_gsd_4', 'rcat_grl_sides', 'Rice',         '🍚', false, false, 4, NOW()),
  ('rsc_gsd_5', 'rcat_grl_sides', 'Beans',        '🫘', false, false, 5, NOW()),
  -- Takeout: Combo Meals
  ('rsc_tkc_1', 'rcat_tak_combos', 'Burger combo', '🍔', false, false, 1, NOW()),
  ('rsc_tkc_2', 'rcat_tak_combos', 'Chicken combo','🍗', false, false, 2, NOW()),
  ('rsc_tkc_3', 'rcat_tak_combos', 'Taco combo',   '🌮', false, false, 3, NOW()),
  ('rsc_tkc_4', 'rcat_tak_combos', 'Pizza combo',  '🍕', false, false, 4, NOW()),
  ('rsc_tkc_5', 'rcat_tak_combos', 'Pasta combo',  '🍝', false, false, 5, NOW()),
  -- Takeout: Family Meals
  ('rsc_tkf_1', 'rcat_tak_family', 'Family chicken meal','🍗', false, false, 1, NOW()),
  ('rsc_tkf_2', 'rcat_tak_family', 'Family pizza meal',  '🍕', false, false, 2, NOW()),
  ('rsc_tkf_3', 'rcat_tak_family', 'Large rice trays',   '🍚', false, false, 3, NOW()),
  ('rsc_tkf_4', 'rcat_tak_family', 'Party salad trays',  '🥗', false, false, 4, NOW()),
  -- Takeout: Packaging
  ('rsc_tkp_1', 'rcat_tak_packaging', 'Containers',    '🥡', false, false, 1, NOW()),
  ('rsc_tkp_2', 'rcat_tak_packaging', 'Bags',          '🛍️', false, false, 2, NOW()),
  ('rsc_tkp_3', 'rcat_tak_packaging', 'Napkins',       '🧻', false, false, 3, NOW()),
  ('rsc_tkp_4', 'rcat_tak_packaging', 'Cutlery sets',  '🍴', false, false, 4, NOW()),
  ('rsc_tkp_5', 'rcat_tak_packaging', 'Drink carriers','🥤', false, false, 5, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
