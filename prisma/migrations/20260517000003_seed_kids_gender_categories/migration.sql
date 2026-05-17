-- Seed Kids Gender-Specific Clothing Categories
-- Source: "Mixed  baby boys, girls and boys too.md"
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds 13 new business_categories under existing cdom_kids ("Kids Clothing") domain:
--   6 Boys-specific type categories
--   7 Girls-specific type categories
-- Plus ~65 inventory_subcategories across all 13 categories.

-- =============================================================================
-- BUSINESS CATEGORIES
-- =============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
) VALUES
  -- Boys
  ('cat_boy_tops',     'Boys Tops',           '👕', 'T-shirts, long-sleeve tops, graphic tees, polo and button-down shirts', '#93C5FD', 20, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_boy_bottoms',  'Boys Bottoms',        '👖', 'Pull-on pants, shorts, joggers, and jeans',                            '#6EE7B7', 21, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_boy_sleep',    'Boys Sleepwear',      '🌙', 'Pajama sets, footed pajamas, and sleep shirts',                        '#818CF8', 22, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_boy_outer',    'Boys Outerwear',      '🧥', 'Jackets, hoodies, coats, raincoats, puffer jackets, gloves, scarves',  '#60A5FA', 23, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_boy_footwear', 'Boys Footwear',       '👟', 'Sneakers, first-walker shoes, boots, sandals, soft and dress shoes',   '#FB923C', 24, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_boy_acc',      'Boys Accessories',    '🧢', 'Hats, bibs, socks, and small backpacks',                              '#34D399', 25, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  -- Girls
  ('cat_girl_tops',    'Girls Tops',          '👚', 'T-shirts, long-sleeve tops, graphic tees, and cardigans',             '#F9A8D4', 30, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_bottoms', 'Girls Bottoms',       '👖', 'Pull-on pants, shorts, leggings, jeans, and skirts',                  '#C4B5FD', 31, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_dresses', 'Girls Dresses',       '👗', 'Baby dresses, casual dresses, and rompers',                           '#FCA5A5', 32, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_sleep',   'Girls Sleepwear',     '🌙', 'Pajama sets, nightgowns, and sleep shirts',                           '#A78BFA', 33, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_outer',   'Girls Outerwear',     '🧥', 'Jackets, hoodies, coats, raincoats, puffer jackets, gloves, scarves', '#7DD3FC', 34, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_footwear','Girls Footwear',      '👟', 'Sneakers, first-walker shoes, boots, sandals, and flats',             '#FDE68A', 35, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_acc',     'Girls Accessories',   '🎀', 'Headbands, hats, bibs, socks, small backpacks, and jewelry',          '#F472B6', 36, 'cdom_kids', 'clothing', false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BOYS TOPS
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_boy_top_tshirts',    'T-shirts',           'cat_boy_tops', NULL, 'Everyday short-sleeve T-shirts',       1, NOW()),
  ('sub_boy_top_longsleeve', 'Long-sleeve tops',   'cat_boy_tops', NULL, 'Warm-weather long-sleeve tops',        2, NOW()),
  ('sub_boy_top_graphic',    'Graphic tees',       'cat_boy_tops', NULL, 'Fun graphic print tees',               3, NOW()),
  ('sub_boy_top_polo',       'Polo shirts',        'cat_boy_tops', NULL, 'Classic collared polo shirts',         4, NOW()),
  ('sub_boy_top_button',     'Button-down shirts', 'cat_boy_tops', NULL, 'Smart button-down shirts',             5, NOW()),
  ('sub_boy_top_sweater',    'Sweaters & cardigans','cat_boy_tops', NULL, 'Knit sweaters and cardigans',         6, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BOYS BOTTOMS
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_boy_bot_pullon',  'Pull-on pants', 'cat_boy_bottoms', NULL, 'Easy elastic-waist pull-on pants', 1, NOW()),
  ('sub_boy_bot_shorts',  'Shorts',        'cat_boy_bottoms', NULL, 'Casual everyday shorts',           2, NOW()),
  ('sub_boy_bot_joggers', 'Joggers',       'cat_boy_bottoms', NULL, 'Soft jogger pants',                3, NOW()),
  ('sub_boy_bot_jeans',   'Jeans',         'cat_boy_bottoms', NULL, 'Denim jeans',                      4, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BOYS SLEEPWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_boy_sl_pjset',   'Pajama sets',   'cat_boy_sleep', NULL, 'Matching top and pants pajama sets', 1, NOW()),
  ('sub_boy_sl_footed',  'Footed pajamas','cat_boy_sleep', NULL, 'One-piece footed pajamas',            2, NOW()),
  ('sub_boy_sl_shirt',   'Sleep shirts',  'cat_boy_sleep', NULL, 'Comfortable sleep shirts',            3, NOW()),
  ('sub_boy_sl_socks',   'Cozy socks',    'cat_boy_sleep', NULL, 'Warm bedtime socks',                  4, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BOYS OUTERWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_boy_ow_jacket',  'Light jackets',   'cat_boy_outer', NULL, 'Light zip-up jackets',            1, NOW()),
  ('sub_boy_ow_hoodie',  'Hoodies',         'cat_boy_outer', NULL, 'Pullover and zip-up hoodies',     2, NOW()),
  ('sub_boy_ow_coat',    'Coats',           'cat_boy_outer', NULL, 'Warm winter coats',               3, NOW()),
  ('sub_boy_ow_rain',    'Raincoats',       'cat_boy_outer', NULL, 'Waterproof raincoats',            4, NOW()),
  ('sub_boy_ow_puffer',  'Puffer jackets',  'cat_boy_outer', NULL, 'Padded puffer jackets',           5, NOW()),
  ('sub_boy_ow_gloves',  'Gloves',          'cat_boy_outer', NULL, 'Winter gloves and mittens',       6, NOW()),
  ('sub_boy_ow_scarves', 'Scarves',         'cat_boy_outer', NULL, 'Neck scarves and warmers',        7, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BOYS FOOTWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_boy_fw_sneakers',    'Sneakers',            'cat_boy_footwear', NULL, 'Casual everyday sneakers',         1, NOW()),
  ('sub_boy_fw_firstwalker', 'First-walker shoes',  'cat_boy_footwear', NULL, 'Flexible-sole early walkers',      2, NOW()),
  ('sub_boy_fw_boots',       'Boots',               'cat_boy_footwear', NULL, 'Ankle and knee-high boots',        3, NOW()),
  ('sub_boy_fw_sandals',     'Sandals',             'cat_boy_footwear', NULL, 'Open-toe sandals',                 4, NOW()),
  ('sub_boy_fw_soft',        'Soft shoes',          'cat_boy_footwear', NULL, 'Soft-soled crib and indoor shoes', 5, NOW()),
  ('sub_boy_fw_dress',       'Dress shoes',         'cat_boy_footwear', NULL, 'Smart occasion dress shoes',       6, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BOYS ACCESSORIES
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_boy_acc_hats',  'Hats & caps',    'cat_boy_acc', NULL, 'Sun hats, beanies, and caps',    1, NOW()),
  ('sub_boy_acc_bibs',  'Bibs',           'cat_boy_acc', NULL, 'Feeding and drool bibs',         2, NOW()),
  ('sub_boy_acc_socks', 'Socks',          'cat_boy_acc', NULL, 'Everyday and decorative socks',  3, NOW()),
  ('sub_boy_acc_bags',  'Small backpacks','cat_boy_acc', NULL, 'Mini backpacks and daycare bags', 4, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS TOPS
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_girl_top_tshirts',    'T-shirts',         'cat_girl_tops', NULL, 'Short-sleeve everyday T-shirts', 1, NOW()),
  ('sub_girl_top_longsleeve', 'Long-sleeve tops', 'cat_girl_tops', NULL, 'Long-sleeve casual tops',        2, NOW()),
  ('sub_girl_top_graphic',    'Graphic tees',     'cat_girl_tops', NULL, 'Fun graphic print tees',         3, NOW()),
  ('sub_girl_top_cardigan',   'Cardigans',        'cat_girl_tops', NULL, 'Light open-front cardigans',     4, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS BOTTOMS
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_girl_bot_pullon',   'Pull-on pants', 'cat_girl_bottoms', NULL, 'Easy elastic-waist pull-on pants', 1, NOW()),
  ('sub_girl_bot_shorts',   'Shorts',        'cat_girl_bottoms', NULL, 'Casual everyday shorts',           2, NOW()),
  ('sub_girl_bot_leggings', 'Leggings',      'cat_girl_bottoms', NULL, 'Stretch leggings',                 3, NOW()),
  ('sub_girl_bot_jeans',    'Jeans',         'cat_girl_bottoms', NULL, 'Denim jeans',                      4, NOW()),
  ('sub_girl_bot_skirts',   'Skirts',        'cat_girl_bottoms', NULL, 'Casual and dressy skirts',         5, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS DRESSES
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_girl_dr_baby',    'Baby dresses',   'cat_girl_dresses', NULL, 'Soft dresses for babies 0-12M',  1, NOW()),
  ('sub_girl_dr_casual',  'Casual dresses', 'cat_girl_dresses', NULL, 'Everyday simple dresses',        2, NOW()),
  ('sub_girl_dr_party',   'Party dresses',  'cat_girl_dresses', NULL, 'Dressy party and occasion dresses', 3, NOW()),
  ('sub_girl_dr_rompers', 'Rompers',        'cat_girl_dresses', NULL, 'One-piece rompers and playsuits', 4, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS SLEEPWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_girl_sl_pjset',    'Pajama sets',  'cat_girl_sleep', NULL, 'Matching top and pants pajama sets', 1, NOW()),
  ('sub_girl_sl_nightgown','Nightgowns',   'cat_girl_sleep', NULL, 'Full-length nightgowns',             2, NOW()),
  ('sub_girl_sl_shirt',    'Sleep shirts', 'cat_girl_sleep', NULL, 'Comfortable sleep shirts',           3, NOW()),
  ('sub_girl_sl_socks',    'Cozy socks',   'cat_girl_sleep', NULL, 'Warm bedtime socks',                 4, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS OUTERWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_girl_ow_jacket',  'Light jackets',  'cat_girl_outer', NULL, 'Light zip-up jackets',        1, NOW()),
  ('sub_girl_ow_hoodie',  'Hoodies',        'cat_girl_outer', NULL, 'Pullover and zip-up hoodies', 2, NOW()),
  ('sub_girl_ow_coat',    'Coats',          'cat_girl_outer', NULL, 'Warm winter coats',           3, NOW()),
  ('sub_girl_ow_rain',    'Raincoats',      'cat_girl_outer', NULL, 'Waterproof raincoats',        4, NOW()),
  ('sub_girl_ow_puffer',  'Puffer jackets', 'cat_girl_outer', NULL, 'Padded puffer jackets',       5, NOW()),
  ('sub_girl_ow_gloves',  'Gloves',         'cat_girl_outer', NULL, 'Winter gloves and mittens',   6, NOW()),
  ('sub_girl_ow_scarves', 'Scarves',        'cat_girl_outer', NULL, 'Neck scarves and warmers',    7, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS FOOTWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_girl_fw_sneakers',    'Sneakers',           'cat_girl_footwear', NULL, 'Casual everyday sneakers',        1, NOW()),
  ('sub_girl_fw_firstwalker', 'First-walker shoes', 'cat_girl_footwear', NULL, 'Flexible-sole early walkers',     2, NOW()),
  ('sub_girl_fw_boots',       'Boots',              'cat_girl_footwear', NULL, 'Ankle and knee-high boots',       3, NOW()),
  ('sub_girl_fw_sandals',     'Sandals',            'cat_girl_footwear', NULL, 'Open-toe sandals',                4, NOW()),
  ('sub_girl_fw_flats',       'Flats',              'cat_girl_footwear', NULL, 'Ballet flats and slip-on shoes',  5, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS ACCESSORIES
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_girl_acc_headbands', 'Headbands & bows', 'cat_girl_acc', NULL, 'Fabric headbands and bow clips',   1, NOW()),
  ('sub_girl_acc_hats',      'Hats & caps',      'cat_girl_acc', NULL, 'Sun hats, beanies, and caps',      2, NOW()),
  ('sub_girl_acc_bibs',      'Bibs',             'cat_girl_acc', NULL, 'Feeding and drool bibs',           3, NOW()),
  ('sub_girl_acc_socks',     'Socks',            'cat_girl_acc', NULL, 'Everyday and decorative socks',    4, NOW()),
  ('sub_girl_acc_bags',      'Small backpacks',  'cat_girl_acc', NULL, 'Mini backpacks and daycare bags',  5, NOW()),
  ('sub_girl_acc_jewelry',   'Jewelry',          'cat_girl_acc', NULL, 'Clip-on earrings and bracelets',   6, NOW())
ON CONFLICT (id) DO NOTHING;
