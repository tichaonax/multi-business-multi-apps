-- Migration 00014: Add missing grocery domains from source file
-- Keeps all 22 existing domains. Adds 9 new canonical domains with categories + subcategories.
-- Source: Grocery Business Domains.md
-- All inserts use ON CONFLICT DO NOTHING — safe to re-run, no existing data touched.

-- ─────────────────────────────────────────
-- STEP 1: New grocery domains (9)
-- ─────────────────────────────────────────
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('gdom_fresh_foods',     'Fresh Foods',            '🥦', 'Fresh produce, meat, seafood, deli, and bakery items', 'grocery', true, true, NOW()),
  ('gdom_dairy_refrig',    'Dairy and Refrigerated', '🧀', 'Dairy products and chilled refrigerated foods',        'grocery', true, true, NOW()),
  ('gdom_packaged_foods',  'Packaged Foods',         '🥫', 'Canned goods, dry grocery, condiments, and snacks',    'grocery', true, true, NOW()),
  ('gdom_beverages',       'Beverages',              '🥤', 'Soft drinks, juice, water, coffee, and energy drinks', 'grocery', true, true, NOW()),
  ('gdom_health_beauty',   'Health and Beauty',      '💊', 'Oral care, skin care, hair care, and personal care',   'grocery', true, true, NOW()),
  ('gdom_household_clean', 'Household and Cleaning', '🧼', 'Laundry, cleaning supplies, and paper products',      'grocery', true, true, NOW()),
  ('gdom_baby_care',       'Baby Care',              '👶', 'Infant formula, diapers, wipes, and baby food',        'grocery', true, true, NOW()),
  ('gdom_tobacco_lottery', 'Tobacco and Lottery',    '🚬', 'Tobacco products and lottery items',                  'grocery', true, true, NOW()),
  ('gdom_pharmacy_well',   'Pharmacy and Wellness',  '🩺', 'Vitamins, OTC medicine, and first aid',               'grocery', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 2: Categories for new domains (34)
-- ─────────────────────────────────────────
INSERT INTO business_categories (id, name, emoji, "businessType", "domainId", "businessId", "updatedAt", "createdAt")
VALUES
  -- Fresh Foods (5)
  ('gcat_ff_produce',  'Produce',            '🍎', 'grocery', 'gdom_fresh_foods',     NULL, NOW(), NOW()),
  ('gcat_ff_meat',     'Meat',               '🥩', 'grocery', 'gdom_fresh_foods',     NULL, NOW(), NOW()),
  ('gcat_ff_seafood',  'Seafood',            '🐟', 'grocery', 'gdom_fresh_foods',     NULL, NOW(), NOW()),
  ('gcat_ff_deli',     'Deli',               '🥪', 'grocery', 'gdom_fresh_foods',     NULL, NOW(), NOW()),
  ('gcat_ff_bakery',   'Bakery',             '🥖', 'grocery', 'gdom_fresh_foods',     NULL, NOW(), NOW()),
  -- Dairy and Refrigerated (2)
  ('gcat_dr_dairy',    'Dairy',              '🥛', 'grocery', 'gdom_dairy_refrig',    NULL, NOW(), NOW()),
  ('gcat_dr_refrig',   'Refrigerated Foods', '❄️', 'grocery', 'gdom_dairy_refrig',    NULL, NOW(), NOW()),
  -- Packaged Foods (6)
  ('gcat_pf_canned',   'Canned Goods',          '🥫', 'grocery', 'gdom_packaged_foods', NULL, NOW(), NOW()),
  ('gcat_pf_dry',      'Dry Grocery',            '🍚', 'grocery', 'gdom_packaged_foods', NULL, NOW(), NOW()),
  ('gcat_pf_cond',     'Condiments',             '🍯', 'grocery', 'gdom_packaged_foods', NULL, NOW(), NOW()),
  ('gcat_pf_spices',   'Spices and Seasonings',  '🌿', 'grocery', 'gdom_packaged_foods', NULL, NOW(), NOW()),
  ('gcat_pf_snacks',   'Snacks',                 '🍿', 'grocery', 'gdom_packaged_foods', NULL, NOW(), NOW()),
  ('gcat_pf_bkfast',   'Breakfast Foods',        '🌅', 'grocery', 'gdom_packaged_foods', NULL, NOW(), NOW()),
  -- Beverages (5)
  ('gcat_bev_soft',    'Soft Drinks',   '🥤', 'grocery', 'gdom_beverages', NULL, NOW(), NOW()),
  ('gcat_bev_juice',   'Juice',         '🧃', 'grocery', 'gdom_beverages', NULL, NOW(), NOW()),
  ('gcat_bev_water',   'Water',         '💧', 'grocery', 'gdom_beverages', NULL, NOW(), NOW()),
  ('gcat_bev_tcoffee', 'Tea and Coffee','☕', 'grocery', 'gdom_beverages', NULL, NOW(), NOW()),
  ('gcat_bev_energy',  'Energy Drinks', '⚡', 'grocery', 'gdom_beverages', NULL, NOW(), NOW()),
  -- Health and Beauty (4)
  ('gcat_hb_oral',  'Oral Care',    '🦷', 'grocery', 'gdom_health_beauty', NULL, NOW(), NOW()),
  ('gcat_hb_skin',  'Skin Care',    '🧴', 'grocery', 'gdom_health_beauty', NULL, NOW(), NOW()),
  ('gcat_hb_hair',  'Hair Care',    '💇', 'grocery', 'gdom_health_beauty', NULL, NOW(), NOW()),
  ('gcat_hb_pers',  'Personal Care','🧍', 'grocery', 'gdom_health_beauty', NULL, NOW(), NOW()),
  -- Household and Cleaning (4)
  ('gcat_hc_laundry', 'Laundry',           '🧺', 'grocery', 'gdom_household_clean', NULL, NOW(), NOW()),
  ('gcat_hc_clean',   'Cleaning Supplies', '🧹', 'grocery', 'gdom_household_clean', NULL, NOW(), NOW()),
  ('gcat_hc_paper',   'Paper Products',    '🧻', 'grocery', 'gdom_household_clean', NULL, NOW(), NOW()),
  ('gcat_hc_kitch',   'Kitchen Supplies',  '🍽️','grocery', 'gdom_household_clean', NULL, NOW(), NOW()),
  -- Baby Care (3)
  ('gcat_bc_formula', 'Infant Formula',   '🍼', 'grocery', 'gdom_baby_care', NULL, NOW(), NOW()),
  ('gcat_bc_diapers', 'Diapers and Wipes','👶', 'grocery', 'gdom_baby_care', NULL, NOW(), NOW()),
  ('gcat_bc_food',    'Baby Food',        '🥣', 'grocery', 'gdom_baby_care', NULL, NOW(), NOW()),
  -- Tobacco and Lottery (2)
  ('gcat_tl_tobacco', 'Tobacco','🚬', 'grocery', 'gdom_tobacco_lottery', NULL, NOW(), NOW()),
  ('gcat_tl_lottery', 'Lottery','🎟️','grocery', 'gdom_tobacco_lottery', NULL, NOW(), NOW()),
  -- Pharmacy and Wellness (3)
  ('gcat_pw_vitamins', 'Vitamins',    '💊', 'grocery', 'gdom_pharmacy_well', NULL, NOW(), NOW()),
  ('gcat_pw_otc',      'OTC Medicine','💊', 'grocery', 'gdom_pharmacy_well', NULL, NOW(), NOW()),
  ('gcat_pw_firstaid', 'First Aid',   '🩹', 'grocery', 'gdom_pharmacy_well', NULL, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 3: Subcategories (166)
-- ─────────────────────────────────────────
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Produce (6)
  ('gsc_ffp_1','gcat_ff_produce','Fruits',           '🍓',false,false,1,NOW()),
  ('gsc_ffp_2','gcat_ff_produce','Vegetables',       '🥕',false,false,2,NOW()),
  ('gsc_ffp_3','gcat_ff_produce','Herbs',            '🌿',false,false,3,NOW()),
  ('gsc_ffp_4','gcat_ff_produce','Salads',           '🥗',false,false,4,NOW()),
  ('gsc_ffp_5','gcat_ff_produce','Packaged produce', '📦',false,false,5,NOW()),
  ('gsc_ffp_6','gcat_ff_produce','Organic produce',  '🌱',false,false,6,NOW()),
  -- Meat (8)
  ('gsc_ffm_1','gcat_ff_meat','Beef',          '🐄',false,false,1,NOW()),
  ('gsc_ffm_2','gcat_ff_meat','Chicken',       '🍗',false,false,2,NOW()),
  ('gsc_ffm_3','gcat_ff_meat','Pork',          '🐖',false,false,3,NOW()),
  ('gsc_ffm_4','gcat_ff_meat','Lamb',          '🐐',false,false,4,NOW()),
  ('gsc_ffm_5','gcat_ff_meat','Goat',          '🐑',false,false,5,NOW()),
  ('gsc_ffm_6','gcat_ff_meat','Marinated meat','🧂',false,false,6,NOW()),
  ('gsc_ffm_7','gcat_ff_meat','Ground meat',   '🍖',false,false,7,NOW()),
  ('gsc_ffm_8','gcat_ff_meat','Sausage',       '🌭',false,false,8,NOW()),
  -- Seafood (6)
  ('gsc_ffs_1','gcat_ff_seafood','Fish',          '🐟',false,false,1,NOW()),
  ('gsc_ffs_2','gcat_ff_seafood','Shrimp',        '🍤',false,false,2,NOW()),
  ('gsc_ffs_3','gcat_ff_seafood','Crab',          '🦀',false,false,3,NOW()),
  ('gsc_ffs_4','gcat_ff_seafood','Shellfish',     '🦪',false,false,4,NOW()),
  ('gsc_ffs_5','gcat_ff_seafood','Frozen seafood','🧊',false,false,5,NOW()),
  ('gsc_ffs_6','gcat_ff_seafood','Smoked seafood','🐠',false,false,6,NOW()),
  -- Deli (6)
  ('gsc_ffd_1','gcat_ff_deli','Sliced meats', '🥓',false,false,1,NOW()),
  ('gsc_ffd_2','gcat_ff_deli','Cheeses',      '🧀',false,false,2,NOW()),
  ('gsc_ffd_3','gcat_ff_deli','Prepared meats','🍖',false,false,3,NOW()),
  ('gsc_ffd_4','gcat_ff_deli','Salads',       '🥗',false,false,4,NOW()),
  ('gsc_ffd_5','gcat_ff_deli','Hot foods',    '🍲',false,false,5,NOW()),
  ('gsc_ffd_6','gcat_ff_deli','Sandwiches',   '🥪',false,false,6,NOW()),
  -- Bakery (7)
  ('gsc_ffb_1','gcat_ff_bakery','Bread',    '🍞',false,false,1,NOW()),
  ('gsc_ffb_2','gcat_ff_bakery','Rolls',    '🥯',false,false,2,NOW()),
  ('gsc_ffb_3','gcat_ff_bakery','Cakes',    '🎂',false,false,3,NOW()),
  ('gsc_ffb_4','gcat_ff_bakery','Pastries', '🥐',false,false,4,NOW()),
  ('gsc_ffb_5','gcat_ff_bakery','Cookies',  '🍪',false,false,5,NOW()),
  ('gsc_ffb_6','gcat_ff_bakery','Donuts',   '🍩',false,false,6,NOW()),
  ('gsc_ffb_7','gcat_ff_bakery','Tortillas','🌮',false,false,7,NOW()),
  -- Dairy (7)
  ('gsc_drd_1','gcat_dr_dairy','Milk',          '🥛',false,false,1,NOW()),
  ('gsc_drd_2','gcat_dr_dairy','Cream',         '🧴',false,false,2,NOW()),
  ('gsc_drd_3','gcat_dr_dairy','Yogurt',        '🍦',false,false,3,NOW()),
  ('gsc_drd_4','gcat_dr_dairy','Butter',        '🧈',false,false,4,NOW()),
  ('gsc_drd_5','gcat_dr_dairy','Sour cream',    '🥣',false,false,5,NOW()),
  ('gsc_drd_6','gcat_dr_dairy','Cottage cheese','🧀',false,false,6,NOW()),
  ('gsc_drd_7','gcat_dr_dairy','Eggs',          '🥚',false,false,7,NOW()),
  -- Refrigerated Foods (6)
  ('gsc_drr_1','gcat_dr_refrig','Chilled meals',     '🍱',false,false,1,NOW()),
  ('gsc_drr_2','gcat_dr_refrig','Cheese',            '🧀',false,false,2,NOW()),
  ('gsc_drr_3','gcat_dr_refrig','Dips',              '🥣',false,false,3,NOW()),
  ('gsc_drr_4','gcat_dr_refrig','Desserts',          '🍮',false,false,4,NOW()),
  ('gsc_drr_5','gcat_dr_refrig','Tofu',              '🥬',false,false,5,NOW()),
  ('gsc_drr_6','gcat_dr_refrig','Refrigerated juice','🧃',false,false,6,NOW()),
  -- Canned Goods (7)
  ('gsc_pfc_1','gcat_pf_canned','Vegetables','🌽',false,false,1,NOW()),
  ('gsc_pfc_2','gcat_pf_canned','Fruit',     '🍑',false,false,2,NOW()),
  ('gsc_pfc_3','gcat_pf_canned','Soup',      '🍜',false,false,3,NOW()),
  ('gsc_pfc_4','gcat_pf_canned','Beans',     '🫘',false,false,4,NOW()),
  ('gsc_pfc_5','gcat_pf_canned','Meat',      '🍖',false,false,5,NOW()),
  ('gsc_pfc_6','gcat_pf_canned','Fish',      '🐟',false,false,6,NOW()),
  ('gsc_pfc_7','gcat_pf_canned','Sauces',    '🍅',false,false,7,NOW()),
  -- Dry Grocery (8)
  ('gsc_pfd_1','gcat_pf_dry','Rice',   '🍚',false,false,1,NOW()),
  ('gsc_pfd_2','gcat_pf_dry','Pasta',  '🍝',false,false,2,NOW()),
  ('gsc_pfd_3','gcat_pf_dry','Flour',  '🌾',false,false,3,NOW()),
  ('gsc_pfd_4','gcat_pf_dry','Sugar',  '🍬',false,false,4,NOW()),
  ('gsc_pfd_5','gcat_pf_dry','Salt',   '🧂',false,false,5,NOW()),
  ('gsc_pfd_6','gcat_pf_dry','Grains', '🌾',false,false,6,NOW()),
  ('gsc_pfd_7','gcat_pf_dry','Cereal', '🥣',false,false,7,NOW()),
  ('gsc_pfd_8','gcat_pf_dry','Beans',  '🫘',false,false,8,NOW()),
  -- Condiments (6)
  ('gsc_pfcn_1','gcat_pf_cond','Ketchup',       '🍅',false,false,1,NOW()),
  ('gsc_pfcn_2','gcat_pf_cond','Mustard',       '🟡',false,false,2,NOW()),
  ('gsc_pfcn_3','gcat_pf_cond','Mayo',          '🥪',false,false,3,NOW()),
  ('gsc_pfcn_4','gcat_pf_cond','Salad dressing','🥗',false,false,4,NOW()),
  ('gsc_pfcn_5','gcat_pf_cond','Vinegar',       '🍾',false,false,5,NOW()),
  ('gsc_pfcn_6','gcat_pf_cond','Hot sauce',     '🌶️',false,false,6,NOW()),
  -- Spices and Seasonings (5)
  ('gsc_pfsp_1','gcat_pf_spices','Herbs',           '🌿',false,false,1,NOW()),
  ('gsc_pfsp_2','gcat_pf_spices','Spice blends',    '🧂',false,false,2,NOW()),
  ('gsc_pfsp_3','gcat_pf_spices','Marinades',       '🍲',false,false,3,NOW()),
  ('gsc_pfsp_4','gcat_pf_spices','Bouillon',        '🧊',false,false,4,NOW()),
  ('gsc_pfsp_5','gcat_pf_spices','Seasoning mixes', '🧂',false,false,5,NOW()),
  -- Snacks (6)
  ('gsc_pfsn_1','gcat_pf_snacks','Chips',    '🥔',false,false,1,NOW()),
  ('gsc_pfsn_2','gcat_pf_snacks','Crackers', '🍘',false,false,2,NOW()),
  ('gsc_pfsn_3','gcat_pf_snacks','Nuts',     '🥜',false,false,3,NOW()),
  ('gsc_pfsn_4','gcat_pf_snacks','Popcorn',  '🍿',false,false,4,NOW()),
  ('gsc_pfsn_5','gcat_pf_snacks','Pretzels', '🥨',false,false,5,NOW()),
  ('gsc_pfsn_6','gcat_pf_snacks','Trail mix','🥜',false,false,6,NOW()),
  -- Breakfast Foods (5)
  ('gsc_pfbk_1','gcat_pf_bkfast','Cereal',        '🥣',false,false,1,NOW()),
  ('gsc_pfbk_2','gcat_pf_bkfast','Oats',          '🌾',false,false,2,NOW()),
  ('gsc_pfbk_3','gcat_pf_bkfast','Pancake mix',   '🥞',false,false,3,NOW()),
  ('gsc_pfbk_4','gcat_pf_bkfast','Syrup',         '🍯',false,false,4,NOW()),
  ('gsc_pfbk_5','gcat_pf_bkfast','Breakfast bars','🍫',false,false,5,NOW()),
  -- Soft Drinks (4)
  ('gsc_bvs_1','gcat_bev_soft','Cola',         '🥤',false,false,1,NOW()),
  ('gsc_bvs_2','gcat_bev_soft','Lemon-lime',   '🫗',false,false,2,NOW()),
  ('gsc_bvs_3','gcat_bev_soft','Root beer',    '🟤',false,false,3,NOW()),
  ('gsc_bvs_4','gcat_bev_soft','Flavored soda','🍒',false,false,4,NOW()),
  -- Juice (4)
  ('gsc_bvj_1','gcat_bev_juice','Fruit juice',    '🍊',false,false,1,NOW()),
  ('gsc_bvj_2','gcat_bev_juice','Vegetable juice','🥕',false,false,2,NOW()),
  ('gsc_bvj_3','gcat_bev_juice','Juice blends',   '🍹',false,false,3,NOW()),
  ('gsc_bvj_4','gcat_bev_juice','Smoothies',      '🥤',false,false,4,NOW()),
  -- Water (4)
  ('gsc_bvw_1','gcat_bev_water','Still water',    '💧',false,false,1,NOW()),
  ('gsc_bvw_2','gcat_bev_water','Sparkling water','🫧',false,false,2,NOW()),
  ('gsc_bvw_3','gcat_bev_water','Flavored water', '🍋',false,false,3,NOW()),
  ('gsc_bvw_4','gcat_bev_water','Purified water', '🚰',false,false,4,NOW()),
  -- Tea and Coffee (4)
  ('gsc_bvt_1','gcat_bev_tcoffee','Ground coffee', '☕',false,false,1,NOW()),
  ('gsc_bvt_2','gcat_bev_tcoffee','Instant coffee','⚪',false,false,2,NOW()),
  ('gsc_bvt_3','gcat_bev_tcoffee','Tea bags',      '🍵',false,false,3,NOW()),
  ('gsc_bvt_4','gcat_bev_tcoffee','Bottled tea',   '🧊',false,false,4,NOW()),
  -- Energy Drinks (3)
  ('gsc_bve_1','gcat_bev_energy','Energy cans',         '⚡',false,false,1,NOW()),
  ('gsc_bve_2','gcat_bev_energy','Energy shots',        '🧃',false,false,2,NOW()),
  ('gsc_bve_3','gcat_bev_energy','Sports energy drinks','🏃',false,false,3,NOW()),
  -- Oral Care (4)
  ('gsc_hbo_1','gcat_hb_oral','Toothpaste',  '🪥',false,false,1,NOW()),
  ('gsc_hbo_2','gcat_hb_oral','Toothbrushes','🪥',false,false,2,NOW()),
  ('gsc_hbo_3','gcat_hb_oral','Mouthwash',   '🧴',false,false,3,NOW()),
  ('gsc_hbo_4','gcat_hb_oral','Floss',       '🧵',false,false,4,NOW()),
  -- Skin Care (5)
  ('gsc_hbs_1','gcat_hb_skin','Lotion',   '🧼',false,false,1,NOW()),
  ('gsc_hbs_2','gcat_hb_skin','Soap',     '🧼',false,false,2,NOW()),
  ('gsc_hbs_3','gcat_hb_skin','Body wash','🚿',false,false,3,NOW()),
  ('gsc_hbs_4','gcat_hb_skin','Face wash','🧴',false,false,4,NOW()),
  ('gsc_hbs_5','gcat_hb_skin','Sunscreen','🧴',false,false,5,NOW()),
  -- Hair Care (4)
  ('gsc_hbh_1','gcat_hb_hair','Shampoo',         '🧴',false,false,1,NOW()),
  ('gsc_hbh_2','gcat_hb_hair','Conditioner',     '🧴',false,false,2,NOW()),
  ('gsc_hbh_3','gcat_hb_hair','Styling products','💆',false,false,3,NOW()),
  ('gsc_hbh_4','gcat_hb_hair','Hair treatment',  '🧴',false,false,4,NOW()),
  -- Personal Care (4)
  ('gsc_hbp_1','gcat_hb_pers','Deodorant',       '🧴',false,false,1,NOW()),
  ('gsc_hbp_2','gcat_hb_pers','Shaving products','🪒',false,false,2,NOW()),
  ('gsc_hbp_3','gcat_hb_pers','Feminine care',   '🩸',false,false,3,NOW()),
  ('gsc_hbp_4','gcat_hb_pers','Razors',          '🪒',false,false,4,NOW()),
  -- Laundry (4)
  ('gsc_hcl_1','gcat_hc_laundry','Detergent',      '🧼',false,false,1,NOW()),
  ('gsc_hcl_2','gcat_hc_laundry','Fabric softener','🌸',false,false,2,NOW()),
  ('gsc_hcl_3','gcat_hc_laundry','Stain remover',  '🧽',false,false,3,NOW()),
  ('gsc_hcl_4','gcat_hc_laundry','Bleach',         '🧴',false,false,4,NOW()),
  -- Cleaning Supplies (4)
  ('gsc_hcc_1','gcat_hc_clean','All-purpose cleaner','🧽',false,false,1,NOW()),
  ('gsc_hcc_2','gcat_hc_clean','Disinfectant',       '🦠',false,false,2,NOW()),
  ('gsc_hcc_3','gcat_hc_clean','Glass cleaner',      '🪟',false,false,3,NOW()),
  ('gsc_hcc_4','gcat_hc_clean','Sponges',            '🧽',false,false,4,NOW()),
  -- Paper Products (4)
  ('gsc_hcp_1','gcat_hc_paper','Toilet tissue','🧻',false,false,1,NOW()),
  ('gsc_hcp_2','gcat_hc_paper','Paper towels', '🧻',false,false,2,NOW()),
  ('gsc_hcp_3','gcat_hc_paper','Napkins',      '🧻',false,false,3,NOW()),
  ('gsc_hcp_4','gcat_hc_paper','Tissues',      '🧻',false,false,4,NOW()),
  -- Kitchen Supplies (5)
  ('gsc_hck_1','gcat_hc_kitch','Foil',        '🧻',false,false,1,NOW()),
  ('gsc_hck_2','gcat_hc_kitch','Plastic wrap', '🧴',false,false,2,NOW()),
  ('gsc_hck_3','gcat_hc_kitch','Trash bags',   '🗑️',false,false,3,NOW()),
  ('gsc_hck_4','gcat_hc_kitch','Storage bags', '🫙',false,false,4,NOW()),
  ('gsc_hck_5','gcat_hc_kitch','Dish soap',    '🧼',false,false,5,NOW()),
  -- Infant Formula (3)
  ('gsc_bcf_1','gcat_bc_formula','Formula',         '🍼',false,false,1,NOW()),
  ('gsc_bcf_2','gcat_bc_formula','Baby milk',       '🥛',false,false,2,NOW()),
  ('gsc_bcf_3','gcat_bc_formula','Feeding supplies','🥣',false,false,3,NOW()),
  -- Diapers and Wipes (4)
  ('gsc_bcd_1','gcat_bc_diapers','Diapers',       '🧷',false,false,1,NOW()),
  ('gsc_bcd_2','gcat_bc_diapers','Training pants','👖',false,false,2,NOW()),
  ('gsc_bcd_3','gcat_bc_diapers','Wipes',         '🧻',false,false,3,NOW()),
  ('gsc_bcd_4','gcat_bc_diapers','Rash cream',    '🧴',false,false,4,NOW()),
  -- Baby Food (4)
  ('gsc_bcfd_1','gcat_bc_food','Purees', '🍎',false,false,1,NOW()),
  ('gsc_bcfd_2','gcat_bc_food','Cereals','🌾',false,false,2,NOW()),
  ('gsc_bcfd_3','gcat_bc_food','Snacks', '🍪',false,false,3,NOW()),
  ('gsc_bcfd_4','gcat_bc_food','Drinks', '🧃',false,false,4,NOW()),
  -- Tobacco (4)
  ('gsc_tlt_1','gcat_tl_tobacco','Cigarettes',     '🚬',false,false,1,NOW()),
  ('gsc_tlt_2','gcat_tl_tobacco','Cigars',         '🌿',false,false,2,NOW()),
  ('gsc_tlt_3','gcat_tl_tobacco','Rolling tobacco','🌀',false,false,3,NOW()),
  ('gsc_tlt_4','gcat_tl_tobacco','Vape products',  '💨',false,false,4,NOW()),
  -- Lottery (3)
  ('gsc_tll_1','gcat_tl_lottery','Tickets',      '🎫',false,false,1,NOW()),
  ('gsc_tll_2','gcat_tl_lottery','Scratch cards', '🧾',false,false,2,NOW()),
  ('gsc_tll_3','gcat_tl_lottery','Terminal sales','🖥️',false,false,3,NOW()),
  -- Vitamins (4)
  ('gsc_pwv_1','gcat_pw_vitamins','Multivitamins','💊',false,false,1,NOW()),
  ('gsc_pwv_2','gcat_pw_vitamins','Supplements',  '🧪',false,false,2,NOW()),
  ('gsc_pwv_3','gcat_pw_vitamins','Minerals',     '⚪',false,false,3,NOW()),
  ('gsc_pwv_4','gcat_pw_vitamins','Protein',      '🥤',false,false,4,NOW()),
  -- OTC Medicine (4)
  ('gsc_pwo_1','gcat_pw_otc','Pain relief',   '💊',false,false,1,NOW()),
  ('gsc_pwo_2','gcat_pw_otc','Cold and flu',  '🤧',false,false,2,NOW()),
  ('gsc_pwo_3','gcat_pw_otc','Allergy',       '🌼',false,false,3,NOW()),
  ('gsc_pwo_4','gcat_pw_otc','Digestive care','🍽️',false,false,4,NOW()),
  -- First Aid (4)
  ('gsc_pwfa_1','gcat_pw_firstaid','Bandages',    '🩹',false,false,1,NOW()),
  ('gsc_pwfa_2','gcat_pw_firstaid','Ointment',    '🧴',false,false,2,NOW()),
  ('gsc_pwfa_3','gcat_pw_firstaid','Antiseptics', '🧴',false,false,3,NOW()),
  ('gsc_pwfa_4','gcat_pw_firstaid','Thermometers','🌡️',false,false,4,NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
