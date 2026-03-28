-- Migration 00017: Retail new domains
-- Source: Retail-Business-Domains.md
-- Keeps existing 7 domains. Adds 12 new canonical domains + 37 categories + 171 subcategories.

-- ─────────────────────────────────────────
-- STEP 1: New retail domains (12)
-- ─────────────────────────────────────────
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('rtldom_general',   'General Retail',                      '🛒', 'Storefront goods and impulse items',                        'retail', true, true, NOW()),
  ('rtldom_apparel',   'Apparel Retail',                      '👕', 'Clothing, footwear, and accessories',                       'retail', true, true, NOW()),
  ('rtldom_hbeauty',   'Health and Beauty Retail',            '🧴', 'Cosmetics, personal care, and wellness products',           'retail', true, true, NOW()),
  ('rtldom_hardware',  'Hardware and Home Improvement Retail','🧰', 'Tools, hardware, and home improvement supplies',            'retail', true, true, NOW()),
  ('rtldom_furniture', 'Furniture and Home Goods',            '🪑', 'Furniture, home decor, and storage solutions',              'retail', true, true, NOW()),
  ('rtldom_elec',      'Electronics Retail',                  '📱', 'Consumer electronics, accessories, and power products',     'retail', true, true, NOW()),
  ('rtldom_toys',      'Toy and Hobby Retail',                '🧸', 'Toys, crafts, hobbies, and entertainment',                  'retail', true, true, NOW()),
  ('rtldom_kitchen',   'Kitchen and Housewares',              '🍽️','Kitchenware, cleaning supplies, and drinkware',             'retail', true, true, NOW()),
  ('rtldom_auto',      'Auto Retail',                         '🚗', 'Car accessories and automotive maintenance supplies',        'retail', true, true, NOW()),
  ('rtldom_pet',       'Pet Retail',                          '🐶', 'Supplies and accessories for dogs, cats, and small animals','retail', true, true, NOW()),
  ('rtldom_baby',      'Baby Retail',                         '👶', 'Baby care products and baby clothing',                      'retail', true, true, NOW()),
  ('rtldom_seasonal',  'Seasonal and Specialty Retail',       '🎁', 'Seasonal goods, clearance, and specialty items',            'retail', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 2: Categories (37)
-- ─────────────────────────────────────────
INSERT INTO business_categories (id, name, emoji, "businessType", "domainId", "businessId", "updatedAt", "createdAt")
VALUES
  -- General Retail (2)
  ('rtlcat_gen_store', 'Storefront Goods','🏬', 'retail', 'rtldom_general',   NULL, NOW(), NOW()),
  ('rtlcat_gen_impl',  'Impulse Items',   '💳', 'retail', 'rtldom_general',   NULL, NOW(), NOW()),
  -- Apparel Retail (3)
  ('rtlcat_app_cloth', 'Clothing',   '👚', 'retail', 'rtldom_apparel',   NULL, NOW(), NOW()),
  ('rtlcat_app_foot',  'Footwear',   '👟', 'retail', 'rtldom_apparel',   NULL, NOW(), NOW()),
  ('rtlcat_app_acc',   'Accessories','👜', 'retail', 'rtldom_apparel',   NULL, NOW(), NOW()),
  -- Health and Beauty Retail (3)
  ('rtlcat_hb_cosm',   'Cosmetics',   '💄', 'retail', 'rtldom_hbeauty',   NULL, NOW(), NOW()),
  ('rtlcat_hb_pers',   'Personal Care','🧼', 'retail', 'rtldom_hbeauty',   NULL, NOW(), NOW()),
  ('rtlcat_hb_well',   'Wellness',    '💊', 'retail', 'rtldom_hbeauty',   NULL, NOW(), NOW()),
  -- Hardware and Home Improvement (3)
  ('rtlcat_hw_tools',  'Tools',           '🔧', 'retail', 'rtldom_hardware',  NULL, NOW(), NOW()),
  ('rtlcat_hw_hard',   'Hardware',        '🔩', 'retail', 'rtldom_hardware',  NULL, NOW(), NOW()),
  ('rtlcat_hw_home',   'Home Improvement','🏠', 'retail', 'rtldom_hardware',  NULL, NOW(), NOW()),
  -- Furniture and Home Goods (3)
  ('rtlcat_fh_furn',   'Furniture',  '🛋️','retail', 'rtldom_furniture',  NULL, NOW(), NOW()),
  ('rtlcat_fh_decor',  'Home Decor', '🏡', 'retail', 'rtldom_furniture',  NULL, NOW(), NOW()),
  ('rtlcat_fh_stor',   'Storage',    '🧺', 'retail', 'rtldom_furniture',  NULL, NOW(), NOW()),
  -- Electronics Retail (3)
  ('rtlcat_el_cons',   'Consumer Electronics','📺', 'retail', 'rtldom_elec',      NULL, NOW(), NOW()),
  ('rtlcat_el_comp',   'Computer Accessories','🖨️','retail', 'rtldom_elec',      NULL, NOW(), NOW()),
  ('rtlcat_el_pow',    'Power and Charging',  '🔋', 'retail', 'rtldom_elec',      NULL, NOW(), NOW()),
  -- Toy and Hobby (3)
  ('rtlcat_ty_toys',   'Toys',             '🧩', 'retail', 'rtldom_toys',      NULL, NOW(), NOW()),
  ('rtlcat_ty_craft',  'Crafts and Hobbies','🎨', 'retail', 'rtldom_toys',      NULL, NOW(), NOW()),
  ('rtlcat_ty_ent',    'Entertainment',    '🎮', 'retail', 'rtldom_toys',      NULL, NOW(), NOW()),
  -- Kitchen and Housewares (3)
  ('rtlcat_kh_kitch',  'Kitchenware',      '🍳', 'retail', 'rtldom_kitchen',   NULL, NOW(), NOW()),
  ('rtlcat_kh_clean',  'Cleaning Supplies','🧽', 'retail', 'rtldom_kitchen',   NULL, NOW(), NOW()),
  ('rtlcat_kh_drink',  'Drinkware',        '🥤', 'retail', 'rtldom_kitchen',   NULL, NOW(), NOW()),
  -- Auto Retail (2)
  ('rtlcat_au_acc',    'Car Accessories',      '🛞', 'retail', 'rtldom_auto',      NULL, NOW(), NOW()),
  ('rtlcat_au_maint',  'Maintenance Supplies', '🧰', 'retail', 'rtldom_auto',      NULL, NOW(), NOW()),
  -- Pet Retail (3)
  ('rtlcat_pt_dog',    'Dog Supplies',          '🐕', 'retail', 'rtldom_pet',       NULL, NOW(), NOW()),
  ('rtlcat_pt_cat',    'Cat Supplies',          '🐈', 'retail', 'rtldom_pet',       NULL, NOW(), NOW()),
  ('rtlcat_pt_small',  'Small Animal and Bird', '🐦', 'retail', 'rtldom_pet',       NULL, NOW(), NOW()),
  -- Baby Retail (2)
  ('rtlcat_bb_care',   'Baby Care',    '🍼', 'retail', 'rtldom_baby',      NULL, NOW(), NOW()),
  ('rtlcat_bb_cloth',  'Baby Clothing','👕', 'retail', 'rtldom_baby',      NULL, NOW(), NOW()),
  -- Seasonal and Specialty (2)
  ('rtlcat_ss_seas',   'Seasonal Goods',      '🎄', 'retail', 'rtldom_seasonal',  NULL, NOW(), NOW()),
  ('rtlcat_ss_clear',  'Clearance and Value', '🏷️','retail', 'rtldom_seasonal',  NULL, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 3: Subcategories (171)
-- ─────────────────────────────────────────
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Storefront Goods (7)
  ('rtlsc_gs1','rtlcat_gen_store','Toys',               '🧸',false,false,1,NOW()),
  ('rtlsc_gs2','rtlcat_gen_store','Books',              '📚',false,false,2,NOW()),
  ('rtlsc_gs3','rtlcat_gen_store','Gifts',              '🎁',false,false,3,NOW()),
  ('rtlsc_gs4','rtlcat_gen_store','Home decor',         '🖼️',false,false,4,NOW()),
  ('rtlsc_gs5','rtlcat_gen_store','Candles',            '🕯️',false,false,5,NOW()),
  ('rtlsc_gs6','rtlcat_gen_store','Storage items',      '🧺',false,false,6,NOW()),
  ('rtlsc_gs7','rtlcat_gen_store','Small household items','🪴',false,false,7,NOW()),
  -- Impulse Items (6)
  ('rtlsc_gi1','rtlcat_gen_impl','Candy',         '🍬',false,false,1,NOW()),
  ('rtlsc_gi2','rtlcat_gen_impl','Chocolates',    '🍫',false,false,2,NOW()),
  ('rtlsc_gi3','rtlcat_gen_impl','Snacks',        '🥤',false,false,3,NOW()),
  ('rtlsc_gi4','rtlcat_gen_impl','Batteries',     '🔋',false,false,4,NOW()),
  ('rtlsc_gi5','rtlcat_gen_impl','Travel tissue', '🧻',false,false,5,NOW()),
  ('rtlsc_gi6','rtlcat_gen_impl','Small health items','🩹',false,false,6,NOW()),
  -- Clothing (8)
  ('rtlsc_ac1','rtlcat_app_cloth','T-shirts','👕',false,false,1,NOW()),
  ('rtlsc_ac2','rtlcat_app_cloth','Shirts',  '👔',false,false,2,NOW()),
  ('rtlsc_ac3','rtlcat_app_cloth','Pants',   '👖',false,false,3,NOW()),
  ('rtlsc_ac4','rtlcat_app_cloth','Dresses', '👗',false,false,4,NOW()),
  ('rtlsc_ac5','rtlcat_app_cloth','Shorts',  '🩳',false,false,5,NOW()),
  ('rtlsc_ac6','rtlcat_app_cloth','Jackets', '🧥',false,false,6,NOW()),
  ('rtlsc_ac7','rtlcat_app_cloth','Socks',   '🧦',false,false,7,NOW()),
  ('rtlsc_ac8','rtlcat_app_cloth','Hats',    '🧢',false,false,8,NOW()),
  -- Footwear (5)
  ('rtlsc_af1','rtlcat_app_foot','Sneakers',   '👟',false,false,1,NOW()),
  ('rtlsc_af2','rtlcat_app_foot','Dress shoes','👞',false,false,2,NOW()),
  ('rtlsc_af3','rtlcat_app_foot','Boots',      '🥾',false,false,3,NOW()),
  ('rtlsc_af4','rtlcat_app_foot','Flats',      '🥿',false,false,4,NOW()),
  ('rtlsc_af5','rtlcat_app_foot','Sandals',    '🩴',false,false,5,NOW()),
  -- Accessories (7)
  ('rtlsc_aa1','rtlcat_app_acc','Scarves',   '🧣',false,false,1,NOW()),
  ('rtlsc_aa2','rtlcat_app_acc','Gloves',    '🧤',false,false,2,NOW()),
  ('rtlsc_aa3','rtlcat_app_acc','Handbags',  '👜',false,false,3,NOW()),
  ('rtlsc_aa4','rtlcat_app_acc','Belts',     '🪢',false,false,4,NOW()),
  ('rtlsc_aa5','rtlcat_app_acc','Jewelry',   '💍',false,false,5,NOW()),
  ('rtlsc_aa6','rtlcat_app_acc','Watches',   '⌚',false,false,6,NOW()),
  ('rtlsc_aa7','rtlcat_app_acc','Sunglasses','👓',false,false,7,NOW()),
  -- Cosmetics (5)
  ('rtlsc_hc1','rtlcat_hb_cosm','Lipstick',    '💋',false,false,1,NOW()),
  ('rtlsc_hc2','rtlcat_hb_cosm','Makeup kits', '🪞',false,false,2,NOW()),
  ('rtlsc_hc3','rtlcat_hb_cosm','Foundation',  '🧴',false,false,3,NOW()),
  ('rtlsc_hc4','rtlcat_hb_cosm','Eyeliner',    '👁️',false,false,4,NOW()),
  ('rtlsc_hc5','rtlcat_hb_cosm','Nail products','💅',false,false,5,NOW()),
  -- Personal Care (5)
  ('rtlsc_hp1','rtlcat_hb_pers','Oral care',        '🪥',false,false,1,NOW()),
  ('rtlsc_hp2','rtlcat_hb_pers','Hair care',        '🧴',false,false,2,NOW()),
  ('rtlsc_hp3','rtlcat_hb_pers','Skin care',        '🧼',false,false,3,NOW()),
  ('rtlsc_hp4','rtlcat_hb_pers','Shaving products', '🪒',false,false,4,NOW()),
  ('rtlsc_hp5','rtlcat_hb_pers','Hygiene products', '🧻',false,false,5,NOW()),
  -- Wellness (5)
  ('rtlsc_hw1','rtlcat_hb_well','Vitamins',          '💊',false,false,1,NOW()),
  ('rtlsc_hw2','rtlcat_hb_well','Supplements',       '🧪',false,false,2,NOW()),
  ('rtlsc_hw3','rtlcat_hb_well','Herbal care',       '🌿',false,false,3,NOW()),
  ('rtlsc_hw4','rtlcat_hb_well','First aid',         '🩹',false,false,4,NOW()),
  ('rtlsc_hw5','rtlcat_hb_well','Protective health items','😷',false,false,5,NOW()),
  -- Tools (5)
  ('rtlsc_ht1','rtlcat_hw_tools','Hand tools',      '🛠️',false,false,1,NOW()),
  ('rtlsc_ht2','rtlcat_hw_tools','Power tools',     '⚡',false,false,2,NOW()),
  ('rtlsc_ht3','rtlcat_hw_tools','Tool accessories','🧰',false,false,3,NOW()),
  ('rtlsc_ht4','rtlcat_hw_tools','Fastening tools', '🪛',false,false,4,NOW()),
  ('rtlsc_ht5','rtlcat_hw_tools','Cutting tools',   '🪚',false,false,5,NOW()),
  -- Hardware (6)
  ('rtlsc_hh1','rtlcat_hw_hard','Screws', '🔩',false,false,1,NOW()),
  ('rtlsc_hh2','rtlcat_hw_hard','Nails',  '🪙',false,false,2,NOW()),
  ('rtlsc_hh3','rtlcat_hw_hard','Bolts',  '🪛',false,false,3,NOW()),
  ('rtlsc_hh4','rtlcat_hw_hard','Anchors','🧷',false,false,4,NOW()),
  ('rtlsc_hh5','rtlcat_hw_hard','Locks',  '🔒',false,false,5,NOW()),
  ('rtlsc_hh6','rtlcat_hw_hard','Hinges', '🚪',false,false,6,NOW()),
  -- Home Improvement (7)
  ('rtlsc_hi1','rtlcat_hw_home','Lumber',            '🪵',false,false,1,NOW()),
  ('rtlsc_hi2','rtlcat_hw_home','Cement',            '🧱',false,false,2,NOW()),
  ('rtlsc_hi3','rtlcat_hw_home','Paint',             '🎨',false,false,3,NOW()),
  ('rtlsc_hi4','rtlcat_hw_home','Sealants',          '🧴',false,false,4,NOW()),
  ('rtlsc_hi5','rtlcat_hw_home','Lighting',          '💡',false,false,5,NOW()),
  ('rtlsc_hi6','rtlcat_hw_home','Electrical supplies','🔌',false,false,6,NOW()),
  ('rtlsc_hi7','rtlcat_hw_home','Plumbing supplies', '🚿',false,false,7,NOW()),
  -- Furniture (5)
  ('rtlsc_ff1','rtlcat_fh_furn','Beds',    '🛏️',false,false,1,NOW()),
  ('rtlsc_ff2','rtlcat_fh_furn','Chairs',  '🪑',false,false,2,NOW()),
  ('rtlsc_ff3','rtlcat_fh_furn','Sofas',   '🛋️',false,false,3,NOW()),
  ('rtlsc_ff4','rtlcat_fh_furn','Cabinets','🗄️',false,false,4,NOW()),
  ('rtlsc_ff5','rtlcat_fh_furn','Tables',  '🪞',false,false,5,NOW()),
  -- Home Decor (5)
  ('rtlsc_fd1','rtlcat_fh_decor','Clocks',            '🕰️',false,false,1,NOW()),
  ('rtlsc_fd2','rtlcat_fh_decor','Wall art',          '🖼️',false,false,2,NOW()),
  ('rtlsc_fd3','rtlcat_fh_decor','Decorative candles','🕯️',false,false,3,NOW()),
  ('rtlsc_fd4','rtlcat_fh_decor','Vases',             '🪴',false,false,4,NOW()),
  ('rtlsc_fd5','rtlcat_fh_decor','Curtains',          '🪟',false,false,5,NOW()),
  -- Storage (5)
  ('rtlsc_fs1','rtlcat_fh_stor','Bins',              '📦',false,false,1,NOW()),
  ('rtlsc_fs2','rtlcat_fh_stor','Hampers',           '🧺',false,false,2,NOW()),
  ('rtlsc_fs3','rtlcat_fh_stor','Organizers',        '🗂️',false,false,3,NOW()),
  ('rtlsc_fs4','rtlcat_fh_stor','Hooks',             '🪝',false,false,4,NOW()),
  ('rtlsc_fs5','rtlcat_fh_stor','Closet accessories','🧳',false,false,5,NOW()),
  -- Consumer Electronics (6)
  ('rtlsc_ec1','rtlcat_el_cons','Phones',     '📱',false,false,1,NOW()),
  ('rtlsc_ec2','rtlcat_el_cons','Laptops',    '💻',false,false,2,NOW()),
  ('rtlsc_ec3','rtlcat_el_cons','TVs',        '📺',false,false,3,NOW()),
  ('rtlsc_ec4','rtlcat_el_cons','Headphones', '🎧',false,false,4,NOW()),
  ('rtlsc_ec5','rtlcat_el_cons','Speakers',   '🔊',false,false,5,NOW()),
  ('rtlsc_ec6','rtlcat_el_cons','Smartwatches','⌚',false,false,6,NOW()),
  -- Computer Accessories (5)
  ('rtlsc_ea1','rtlcat_el_comp','Mice',           '🖱️',false,false,1,NOW()),
  ('rtlsc_ea2','rtlcat_el_comp','Keyboards',      '⌨️',false,false,2,NOW()),
  ('rtlsc_ea3','rtlcat_el_comp','Printers',       '🖨️',false,false,3,NOW()),
  ('rtlsc_ea4','rtlcat_el_comp','Cables',         '🔌',false,false,4,NOW()),
  ('rtlsc_ea5','rtlcat_el_comp','Storage devices','💽',false,false,5,NOW()),
  -- Power and Charging (5)
  ('rtlsc_ep1','rtlcat_el_pow','Batteries',  '🔋',false,false,1,NOW()),
  ('rtlsc_ep2','rtlcat_el_pow','Chargers',   '🔌',false,false,2,NOW()),
  ('rtlsc_ep3','rtlcat_el_pow','Power banks','🔋',false,false,3,NOW()),
  ('rtlsc_ep4','rtlcat_el_pow','Adapters',   '🔌',false,false,4,NOW()),
  ('rtlsc_ep5','rtlcat_el_pow','Extension cords','⚡',false,false,5,NOW()),
  -- Toys (5)
  ('rtlsc_tt1','rtlcat_ty_toys','Plush toys', '🧸',false,false,1,NOW()),
  ('rtlsc_tt2','rtlcat_ty_toys','Puzzles',    '🧩',false,false,2,NOW()),
  ('rtlsc_tt3','rtlcat_ty_toys','Games',      '🪀',false,false,3,NOW()),
  ('rtlsc_tt4','rtlcat_ty_toys','RC toys',    '🚗',false,false,4,NOW()),
  ('rtlsc_tt5','rtlcat_ty_toys','Board games','🎲',false,false,5,NOW()),
  -- Crafts and Hobbies (5)
  ('rtlsc_tc1','rtlcat_ty_craft','Art supplies',    '🖍️',false,false,1,NOW()),
  ('rtlsc_tc2','rtlcat_ty_craft','Sewing supplies', '🧵',false,false,2,NOW()),
  ('rtlsc_tc3','rtlcat_ty_craft','Craft tools',     '✂️',false,false,3,NOW()),
  ('rtlsc_tc4','rtlcat_ty_craft','DIY kits',        '🪡',false,false,4,NOW()),
  ('rtlsc_tc5','rtlcat_ty_craft','Painting supplies','🎨',false,false,5,NOW()),
  -- Entertainment (4)
  ('rtlsc_te1','rtlcat_ty_ent','Video games',    '🎮',false,false,1,NOW()),
  ('rtlsc_te2','rtlcat_ty_ent','Game accessories','🕹️',false,false,2,NOW()),
  ('rtlsc_te3','rtlcat_ty_ent','Game media',     '📀',false,false,3,NOW()),
  ('rtlsc_te4','rtlcat_ty_ent','Audio accessories','🎧',false,false,4,NOW()),
  -- Kitchenware (5)
  ('rtlsc_kk1','rtlcat_kh_kitch','Cookware',  '🍳',false,false,1,NOW()),
  ('rtlsc_kk2','rtlcat_kh_kitch','Dinnerware','🍽️',false,false,2,NOW()),
  ('rtlsc_kk3','rtlcat_kh_kitch','Utensils',  '🥄',false,false,3,NOW()),
  ('rtlsc_kk4','rtlcat_kh_kitch','Bowls',     '🥣',false,false,4,NOW()),
  ('rtlsc_kk5','rtlcat_kh_kitch','Cutlery',   '🍴',false,false,5,NOW()),
  -- Cleaning Supplies (5)
  ('rtlsc_kc1','rtlcat_kh_clean','Dish soap',     '🧼',false,false,1,NOW()),
  ('rtlsc_kc2','rtlcat_kh_clean','Sponges',       '🧽',false,false,2,NOW()),
  ('rtlsc_kc3','rtlcat_kh_clean','Trash bags',    '🗑️',false,false,3,NOW()),
  ('rtlsc_kc4','rtlcat_kh_clean','Cleaners',      '🧴',false,false,4,NOW()),
  ('rtlsc_kc5','rtlcat_kh_clean','Paper products','🧻',false,false,5,NOW()),
  -- Drinkware (5)
  ('rtlsc_kd1','rtlcat_kh_drink','Mugs',   '☕',false,false,1,NOW()),
  ('rtlsc_kd2','rtlcat_kh_drink','Cups',   '🥤',false,false,2,NOW()),
  ('rtlsc_kd3','rtlcat_kh_drink','Glasses','🥛',false,false,3,NOW()),
  ('rtlsc_kd4','rtlcat_kh_drink','Tumblers','🧊',false,false,4,NOW()),
  ('rtlsc_kd5','rtlcat_kh_drink','Bottles','🍼',false,false,5,NOW()),
  -- Car Accessories (5)
  ('rtlsc_car1','rtlcat_au_acc','Tires',            '🛞',false,false,1,NOW()),
  ('rtlsc_car2','rtlcat_au_acc','Batteries',        '🔋',false,false,2,NOW()),
  ('rtlsc_car3','rtlcat_au_acc','Car care products','🧴',false,false,3,NOW()),
  ('rtlsc_car4','rtlcat_au_acc','Cleaning supplies','🧽',false,false,4,NOW()),
  ('rtlsc_car5','rtlcat_au_acc','Seat covers',      '🚘',false,false,5,NOW()),
  -- Maintenance Supplies (5)
  ('rtlsc_am1','rtlcat_au_maint','Motor oil',     '🛢️',false,false,1,NOW()),
  ('rtlsc_am2','rtlcat_au_maint','Fluids',        '🧴',false,false,2,NOW()),
  ('rtlsc_am3','rtlcat_au_maint','Tools',         '🧰',false,false,3,NOW()),
  ('rtlsc_am4','rtlcat_au_maint','Emergency kits','🧯',false,false,4,NOW()),
  ('rtlsc_am5','rtlcat_au_maint','Bulbs',         '💡',false,false,5,NOW()),
  -- Dog Supplies (5)
  ('rtlsc_pd1','rtlcat_pt_dog','Food',         '🐶',false,false,1,NOW()),
  ('rtlsc_pd2','rtlcat_pt_dog','Treats',       '🍖',false,false,2,NOW()),
  ('rtlsc_pd3','rtlcat_pt_dog','Grooming items','🧴',false,false,3,NOW()),
  ('rtlsc_pd4','rtlcat_pt_dog','Toys',         '🦴',false,false,4,NOW()),
  ('rtlsc_pd5','rtlcat_pt_dog','Beds',         '🛏️',false,false,5,NOW()),
  -- Cat Supplies (5)
  ('rtlsc_pc1','rtlcat_pt_cat','Food',         '🐈',false,false,1,NOW()),
  ('rtlsc_pc2','rtlcat_pt_cat','Litter',       '🪣',false,false,2,NOW()),
  ('rtlsc_pc3','rtlcat_pt_cat','Grooming items','🧴',false,false,3,NOW()),
  ('rtlsc_pc4','rtlcat_pt_cat','Toys',         '🧶',false,false,4,NOW()),
  ('rtlsc_pc5','rtlcat_pt_cat','Beds',         '🛏️',false,false,5,NOW()),
  -- Small Animal and Bird (5)
  ('rtlsc_ps1','rtlcat_pt_small','Food',      '🐹',false,false,1,NOW()),
  ('rtlsc_ps2','rtlcat_pt_small','Feed',      '🐦',false,false,2,NOW()),
  ('rtlsc_ps3','rtlcat_pt_small','Cages',     '🏠',false,false,3,NOW()),
  ('rtlsc_ps4','rtlcat_pt_small','Care items','🧴',false,false,4,NOW()),
  ('rtlsc_ps5','rtlcat_pt_small','Toys',      '🎾',false,false,5,NOW()),
  -- Baby Care (5)
  ('rtlsc_bc1','rtlcat_bb_care','Formula',   '🍼',false,false,1,NOW()),
  ('rtlsc_bc2','rtlcat_bb_care','Diapers',   '👶',false,false,2,NOW()),
  ('rtlsc_bc3','rtlcat_bb_care','Wipes',     '🧻',false,false,3,NOW()),
  ('rtlsc_bc4','rtlcat_bb_care','Creams',    '🧴',false,false,4,NOW()),
  ('rtlsc_bc5','rtlcat_bb_care','Baby toys', '🧸',false,false,5,NOW()),
  -- Baby Clothing (5)
  ('rtlsc_bl1','rtlcat_bb_cloth','Onesies',  '👕',false,false,1,NOW()),
  ('rtlsc_bl2','rtlcat_bb_cloth','Socks',    '🧦',false,false,2,NOW()),
  ('rtlsc_bl3','rtlcat_bb_cloth','Hats',     '🧢',false,false,3,NOW()),
  ('rtlsc_bl4','rtlcat_bb_cloth','Sleepwear','🩳',false,false,4,NOW()),
  ('rtlsc_bl5','rtlcat_bb_cloth','Blankets', '🧣',false,false,5,NOW()),
  -- Seasonal Goods (5)
  ('rtlsc_sg1','rtlcat_ss_seas','Holiday items',       '🎁',false,false,1,NOW()),
  ('rtlsc_sg2','rtlcat_ss_seas','Summer items',        '☀️',false,false,2,NOW()),
  ('rtlsc_sg3','rtlcat_ss_seas','Winter items',        '❄️',false,false,3,NOW()),
  ('rtlsc_sg4','rtlcat_ss_seas','Back-to-school items','🎒',false,false,4,NOW()),
  ('rtlsc_sg5','rtlcat_ss_seas','Spring items',        '🌸',false,false,5,NOW()),
  -- Clearance and Value (5)
  ('rtlsc_sv1','rtlcat_ss_clear','Clearance items','🏷️',false,false,1,NOW()),
  ('rtlsc_sv2','rtlcat_ss_clear','Discount goods', '💲',false,false,2,NOW()),
  ('rtlsc_sv3','rtlcat_ss_clear','Bulk items',     '📦',false,false,3,NOW()),
  ('rtlsc_sv4','rtlcat_ss_clear','Premium items',  '⭐',false,false,4,NOW()),
  ('rtlsc_sv5','rtlcat_ss_clear','Transfer items', '🔄',false,false,5,NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
