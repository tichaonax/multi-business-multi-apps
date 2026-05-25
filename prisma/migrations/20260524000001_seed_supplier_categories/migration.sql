-- Seed Supplier Category Groups (Level 1) and Supplier Categories (Level 2)

-- ============================================================
-- GROUPS
-- ============================================================
INSERT INTO "public"."supplier_category_groups" ("id", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('scg_food',         'Food & Grocery',           '🥬', 1,  true, NOW()),
  ('scg_hardware',     'Hardware & Tools',          '🛠️', 2,  true, NOW()),
  ('scg_apparel',      'Apparel & Clothing',        '👕', 3,  true, NOW()),
  ('scg_health',       'Health & Beauty',           '🧴', 4,  true, NOW()),
  ('scg_electronics',  'Electronics & Tech',        '📱', 5,  true, NOW()),
  ('scg_household',    'Household & Home',          '🧼', 6,  true, NOW()),
  ('scg_automotive',   'Automotive',                '🚗', 7,  true, NOW()),
  ('scg_construction', 'Construction & Industrial', '🏗️', 8,  true, NOW()),
  ('scg_packaging',    'Packaging & Office',        '📦', 9,  true, NOW()),
  ('scg_pets',         'Pets',                      '🐾', 10, true, NOW()),
  ('scg_agriculture',  'Agriculture & Garden',      '🌿', 11, true, NOW()),
  ('scg_restaurant',   'Restaurant & Hospitality',  '🍽️', 12, true, NOW()),
  ('scg_kids',         'Kids & Toys',               '🧸', 13, true, NOW()),
  ('scg_business',     'Business Terms',            '💼', 14, true, NOW());

-- ============================================================
-- CATEGORIES — Food & Grocery
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_food_grocery',  'scg_food', 'Grocery Supplier',      '🥦', 1,  true, NOW()),
  ('sc_food_meat',     'scg_food', 'Meat Supplier',         '🥩', 2,  true, NOW()),
  ('sc_food_seafood',  'scg_food', 'Seafood Supplier',      '🐟', 3,  true, NOW()),
  ('sc_food_dairy',    'scg_food', 'Dairy Supplier',        '🥛', 4,  true, NOW()),
  ('sc_food_bakery',   'scg_food', 'Bakery Supplier',       '🍞', 5,  true, NOW()),
  ('sc_food_produce',  'scg_food', 'Produce Supplier',      '🍎', 6,  true, NOW()),
  ('sc_food_canned',   'scg_food', 'Canned Goods Supplier', '🥫', 7,  true, NOW()),
  ('sc_food_spices',   'scg_food', 'Spices Supplier',       '🧂', 8,  true, NOW()),
  ('sc_food_beverage', 'scg_food', 'Beverage Supplier',     '🥤', 9,  true, NOW()),
  ('sc_food_frozen',   'scg_food', 'Frozen Foods Supplier', '🧊', 10, true, NOW()),
  ('sc_food_snacks',   'scg_food', 'Snacks Supplier',       '🍬', 11, true, NOW()),
  ('sc_food_dry',      'scg_food', 'Dry Goods Supplier',    '🍚', 12, true, NOW());

-- ============================================================
-- CATEGORIES — Hardware & Tools
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_hw_hardware',    'scg_hardware', 'Hardware Supplier',           '🔩', 1,  true, NOW()),
  ('sc_hw_tools',       'scg_hardware', 'Tools Supplier',              '🔨', 2,  true, NOW()),
  ('sc_hw_fasteners',   'scg_hardware', 'Fasteners Supplier',          '🪛', 3,  true, NOW()),
  ('sc_hw_equipment',   'scg_hardware', 'Equipment Supplier',          '🧰', 4,  true, NOW()),
  ('sc_hw_industrial',  'scg_hardware', 'Industrial Parts Supplier',   '⚙️', 5,  true, NOW()),
  ('sc_hw_lumber',      'scg_hardware', 'Lumber Supplier',             '🪚', 6,  true, NOW()),
  ('sc_hw_building',    'scg_hardware', 'Building Materials Supplier', '🪵', 7,  true, NOW()),
  ('sc_hw_electrical',  'scg_hardware', 'Electrical Supplies Supplier','🔌', 8,  true, NOW()),
  ('sc_hw_plumbing',    'scg_hardware', 'Plumbing Supplies Supplier',  '🚰', 9,  true, NOW()),
  ('sc_hw_paint',       'scg_hardware', 'Paint Supplier',              '🎨', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Apparel & Clothing
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_ap_womens',      'scg_apparel', 'Women''s Clothing Supplier', '👚', 1,  true, NOW()),
  ('sc_ap_mens',        'scg_apparel', 'Men''s Clothing Supplier',   '👔', 2,  true, NOW()),
  ('sc_ap_baby',        'scg_apparel', 'Baby Clothing Supplier',     '👶', 3,  true, NOW()),
  ('sc_ap_girls',       'scg_apparel', 'Girls'' Clothing Supplier',  '👧', 4,  true, NOW()),
  ('sc_ap_boys',        'scg_apparel', 'Boys'' Clothing Supplier',   '👦', 5,  true, NOW()),
  ('sc_ap_toddler',     'scg_apparel', 'Toddler Clothing Supplier',  '🧸', 6,  true, NOW()),
  ('sc_ap_footwear',    'scg_apparel', 'Footwear Supplier',          '👟', 7,  true, NOW()),
  ('sc_ap_accessories', 'scg_apparel', 'Accessories Supplier',       '👜', 8,  true, NOW()),
  ('sc_ap_hosiery',     'scg_apparel', 'Hosiery Supplier',           '🧦', 9,  true, NOW()),
  ('sc_ap_textile',     'scg_apparel', 'Textile Supplier',           '🧵', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Health & Beauty
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_hb_cosmetics',  'scg_health', 'Cosmetics Supplier',       '💄', 1, true, NOW()),
  ('sc_hb_personal',   'scg_health', 'Personal Care Supplier',   '🧴', 2, true, NOW()),
  ('sc_hb_hygiene',    'scg_health', 'Hygiene Supplier',         '🧼', 3, true, NOW()),
  ('sc_hb_pharmacy',   'scg_health', 'Pharmacy Supplier',        '💊', 4, true, NOW()),
  ('sc_hb_oral',       'scg_health', 'Oral Care Supplier',       '🪥', 5, true, NOW()),
  ('sc_hb_tissue',     'scg_health', 'Tissue Supplier',          '🧻', 6, true, NOW()),
  ('sc_hb_medical',    'scg_health', 'Medical Supplies Supplier','🧪', 7, true, NOW()),
  ('sc_hb_firstaid',   'scg_health', 'First Aid Supplier',       '🩹', 8, true, NOW());

-- ============================================================
-- CATEGORIES — Electronics & Tech
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_el_electronics', 'scg_electronics', 'Electronics Supplier',         '💻', 1, true, NOW()),
  ('sc_el_mobile',      'scg_electronics', 'Mobile Accessories Supplier',  '📱', 2, true, NOW()),
  ('sc_el_battery',     'scg_electronics', 'Battery Supplier',             '🔋', 3, true, NOW()),
  ('sc_el_printer',     'scg_electronics', 'Printer Supplier',             '🖨️', 4, true, NOW()),
  ('sc_el_audio',       'scg_electronics', 'Audio Equipment Supplier',     '🎧', 5, true, NOW()),
  ('sc_el_computer',    'scg_electronics', 'Computer Accessories Supplier','🖱️', 6, true, NOW()),
  ('sc_el_network',     'scg_electronics', 'Network Equipment Supplier',   '🧭', 7, true, NOW()),
  ('sc_el_cables',      'scg_electronics', 'Cables Supplier',              '🔌', 8, true, NOW());

-- ============================================================
-- CATEGORIES — Household & Home
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_hh_cleaning',   'scg_household', 'Cleaning Supplies Supplier',   '🧽', 1,  true, NOW()),
  ('sc_hh_laundry',    'scg_household', 'Laundry Supplies Supplier',    '🧺', 2,  true, NOW()),
  ('sc_hh_janitorial', 'scg_household', 'Janitorial Supplier',          '🗑️', 3,  true, NOW()),
  ('sc_hh_homegoods',  'scg_household', 'Home Goods Supplier',          '🪣', 4,  true, NOW()),
  ('sc_hh_furniture',  'scg_household', 'Furniture Supplier',           '🛋️', 5,  true, NOW()),
  ('sc_hh_bedding',    'scg_household', 'Bedding Supplier',             '🛏️', 6,  true, NOW()),
  ('sc_hh_paper',      'scg_household', 'Paper Goods Supplier',         '🧻', 7,  true, NOW()),
  ('sc_hh_lighting',   'scg_household', 'Lighting Supplier',            '💡', 8,  true, NOW()),
  ('sc_hh_windows',    'scg_household', 'Window Coverings Supplier',    '🪟', 9,  true, NOW()),
  ('sc_hh_chemicals',  'scg_household', 'Household Chemicals Supplier', '🧴', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Automotive
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_auto_parts',   'scg_automotive', 'Auto Parts Supplier',         '🚗', 1, true, NOW()),
  ('sc_auto_tire',    'scg_automotive', 'Tire Supplier',               '🛞', 2, true, NOW()),
  ('sc_auto_repair',  'scg_automotive', 'Vehicle Repair Parts Supplier','🔧', 3, true, NOW()),
  ('sc_auto_fuel',    'scg_automotive', 'Fuel Supplier',               '⛽', 4, true, NOW()),
  ('sc_auto_lube',    'scg_automotive', 'Lubricants Supplier',         '🛢️', 5, true, NOW()),
  ('sc_auto_access',  'scg_automotive', 'Vehicle Accessories Supplier', '🚙', 6, true, NOW());

-- ============================================================
-- CATEGORIES — Construction & Industrial
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_con_materials',   'scg_construction', 'Construction Materials Supplier','🏗️', 1, true, NOW()),
  ('sc_con_lumber',      'scg_construction', 'Lumber Supplier',                '🪵', 2, true, NOW()),
  ('sc_con_cement',      'scg_construction', 'Cement Supplier',                '🧱', 3, true, NOW()),
  ('sc_con_industrial',  'scg_construction', 'Industrial Supply Supplier',     '🧰', 4, true, NOW()),
  ('sc_con_machinery',   'scg_construction', 'Machinery Supplier',             '⚙️', 5, true, NOW()),
  ('sc_con_maintenance', 'scg_construction', 'Maintenance Supplies Supplier',  '🪛', 6, true, NOW()),
  ('sc_con_safety',      'scg_construction', 'Safety Equipment Supplier',      '🦺', 7, true, NOW());

-- ============================================================
-- CATEGORIES — Packaging & Office
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_pk_packaging',  'scg_packaging', 'Packaging Supplier',      '📦', 1, true, NOW()),
  ('sc_pk_office',     'scg_packaging', 'Office Supplies Supplier','🧾', 2, true, NOW()),
  ('sc_pk_stationery', 'scg_packaging', 'Stationery Supplier',     '🖊️', 3, true, NOW()),
  ('sc_pk_paper',      'scg_packaging', 'Paper Supplier',          '📄', 4, true, NOW()),
  ('sc_pk_filing',     'scg_packaging', 'Filing Supplies Supplier','📎', 5, true, NOW()),
  ('sc_pk_print',      'scg_packaging', 'Print Supplies Supplier', '🖨️', 6, true, NOW()),
  ('sc_pk_mailing',    'scg_packaging', 'Mailing Supplies Supplier','✉️', 7, true, NOW());

-- ============================================================
-- CATEGORIES — Pets
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_pet_food',      'scg_pets', 'Pet Food Supplier',    '🐶', 1, true, NOW()),
  ('sc_pet_supplies',  'scg_pets', 'Pet Supplies Supplier','🐱', 2, true, NOW()),
  ('sc_pet_care',      'scg_pets', 'Animal Care Supplier', '🐾', 3, true, NOW()),
  ('sc_pet_treats',    'scg_pets', 'Pet Treats Supplier',  '🦴', 4, true, NOW()),
  ('sc_pet_aquarium',  'scg_pets', 'Aquarium Supplier',    '🐠', 5, true, NOW());

-- ============================================================
-- CATEGORIES — Agriculture & Garden
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_ag_farm',       'scg_agriculture', 'Farm Supplies Supplier',     '🌾', 1, true, NOW()),
  ('sc_ag_garden',     'scg_agriculture', 'Garden Supplies Supplier',   '🪴', 2, true, NOW()),
  ('sc_ag_tools',      'scg_agriculture', 'Gardening Tools Supplier',   '🧤', 3, true, NOW()),
  ('sc_ag_seeds',      'scg_agriculture', 'Seeds Supplier',             '🌱', 4, true, NOW()),
  ('sc_ag_irrigation', 'scg_agriculture', 'Irrigation Supplier',        '💧', 5, true, NOW()),
  ('sc_ag_livestock',  'scg_agriculture', 'Livestock Supplies Supplier','🐄', 6, true, NOW());

-- ============================================================
-- CATEGORIES — Restaurant & Hospitality
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_res_supplies',    'scg_restaurant', 'Restaurant Supplies Supplier', '🍽️', 1, true, NOW()),
  ('sc_res_cutlery',     'scg_restaurant', 'Cutlery Supplier',             '🍴', 2, true, NOW()),
  ('sc_res_kitchen',     'scg_restaurant', 'Kitchen Equipment Supplier',   '🍳', 3, true, NOW()),
  ('sc_res_takeout',     'scg_restaurant', 'Takeout Packaging Supplier',   '🥡', 4, true, NOW()),
  ('sc_res_beverage',    'scg_restaurant', 'Beverage Dispenser Supplier',  '🧊', 5, true, NOW()),
  ('sc_res_janitorial',  'scg_restaurant', 'Janitorial Supplier',          '🧽', 6, true, NOW()),
  ('sc_res_hospitality', 'scg_restaurant', 'Hospitality Supplier',         '🛎️', 7, true, NOW());

-- ============================================================
-- CATEGORIES — Kids & Toys
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_kid_toys',   'scg_kids', 'Toy Supplier',            '🧸', 1, true, NOW()),
  ('sc_kid_games',  'scg_kids', 'Game Supplier',           '🪀', 2, true, NOW()),
  ('sc_kid_baby',   'scg_kids', 'Baby Products Supplier',  '🍼', 3, true, NOW()),
  ('sc_kid_school', 'scg_kids', 'School Supplies Supplier','🎒', 4, true, NOW()),
  ('sc_kid_arts',   'scg_kids', 'Arts & Crafts Supplier',  '🎨', 5, true, NOW());

-- ============================================================
-- CATEGORIES — Business Terms
-- ============================================================
INSERT INTO "public"."supplier_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('sc_bt_wholesale',    'scg_business', 'Wholesale Supplier', '🏢', 1, true, NOW()),
  ('sc_bt_distributor',  'scg_business', 'Distributor',        '🚚', 2, true, NOW()),
  ('sc_bt_manufacturer', 'scg_business', 'Manufacturer',       '📦', 3, true, NOW()),
  ('sc_bt_retail',       'scg_business', 'Retail Vendor',      '🛒', 4, true, NOW()),
  ('sc_bt_trade',        'scg_business', 'Trade Supplier',     '🤝', 5, true, NOW()),
  ('sc_bt_import',       'scg_business', 'Import Supplier',    '🌍', 6, true, NOW()),
  ('sc_bt_factory',      'scg_business', 'Factory Supplier',   '🏭', 7, true, NOW()),
  ('sc_bt_contract',     'scg_business', 'Contract Supplier',  '📋', 8, true, NOW());
