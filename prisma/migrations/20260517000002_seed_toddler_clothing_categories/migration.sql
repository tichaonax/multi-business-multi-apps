-- Seed Toddler Clothing Categories
-- Source: merged from 🧸 Toddler Clothing Categories.md + 🧸 Toddlers' Clothing Categories.md
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds 12 new business_categories under existing cdom_kids ("Kids Clothing") domain
-- and ~72 inventory_subcategories across all 12 categories.

-- =============================================================================
-- BUSINESS CATEGORIES (all under cdom_kids)
-- =============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
) VALUES
  ('cat_td_baby_basics', 'Baby Basics',         '🍼', 'Onesies, sleepers, soft pants, and essentials for 0–12 months', '#FDE68A', 1,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_tops',        'Toddler Tops',        '👕', 'T-shirts, long-sleeve tops, graphic tees, and play tops',        '#FCA5A5', 2,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_bottoms',     'Toddler Bottoms',     '👖', 'Pull-on pants, joggers, shorts, jeans, overalls, and skirts',    '#A78BFA', 3,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_dresses',     'Dresses & Rompers',   '👗', 'Simple dresses, rompers, jumpsuits, and party dresses',          '#F9A8D4', 4,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_knitwear',    'Sweaters & Hoodies',  '🧶', 'Sweaters, pullovers, cardigans, and zip-up hoodies',             '#FCD34D', 5,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_sleepwear',   'Toddler Sleepwear',   '🌙', 'Footed pajamas, pajama sets, sleep sacks, and sleep shirts',     '#818CF8', 6,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_underwear',   'Training & Underwear','🩲', 'Training underwear, pull-ups, undershirts, and swim diapers',    '#6EE7B7', 7,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_outerwear',   'Toddler Outerwear',   '🧥', 'Jackets, puffer coats, raincoats, gloves, and scarves',          '#93C5FD', 8,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_activewear',  'Active & Playwear',   '🏃', 'Waterproof smocks, rash guards, sun-protective and active sets', '#6EE7B7', 9,  'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_occasion',    'Special Occasion',    '🎉', 'Party dresses, mini blazers, dress shoes, and bows',             '#F472B6', 10, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_footwear',    'Toddler Footwear',    '👟', 'Crib shoes, first-walker sneakers, boots, sandals, and Velcro',  '#FB923C', 11, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_td_accessories', 'Toddler Accessories', '🧸', 'Headbands, hats, bibs, small backpacks, and decorative socks',   '#34D399', 12, 'cdom_kids', 'clothing', false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Baby Basics (0–12 months)
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_bb_onesies',     'Onesies',                'cat_td_baby_basics', NULL, 'Short- and long-sleeve onesies',         1, NOW()),
  ('sub_td_bb_sleepers',    'Footed sleepers',        'cat_td_baby_basics', NULL, 'One-piece footed sleepers',              2, NOW()),
  ('sub_td_bb_pants',       'Soft pants',             'cat_td_baby_basics', NULL, 'Soft pull-on baby pants',                3, NOW()),
  ('sub_td_bb_bibs',        'Bibs',                   'cat_td_baby_basics', NULL, 'Feeding and drool bibs',                 4, NOW()),
  ('sub_td_bb_hats',        'Baby hats',              'cat_td_baby_basics', NULL, 'Newborn caps and beanies',               5, NOW()),
  ('sub_td_bb_mittens',     'Mittens',                'cat_td_baby_basics', NULL, 'Scratch and warm mittens',               6, NOW()),
  ('sub_td_bb_socks',       'Socks & booties',        'cat_td_baby_basics', NULL, 'Baby socks and booties',                 7, NOW()),
  ('sub_td_bb_shoes',       'Soft-soled crib shoes',  'cat_td_baby_basics', NULL, 'Pre-walker soft-soled shoes',            8, NOW()),
  ('sub_td_bb_swaddle',     'Swaddle blankets',       'cat_td_baby_basics', NULL, 'Swaddles and wearable blankets',         9, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Toddler Tops
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_top_tshirts',    'T-shirts',               'cat_td_tops', NULL, 'Short-sleeve everyday T-shirts',         1, NOW()),
  ('sub_td_top_longsleeve', 'Long-sleeve tops',       'cat_td_tops', NULL, 'Warm-weather long-sleeve tops',          2, NOW()),
  ('sub_td_top_graphic',    'Graphic tees',           'cat_td_tops', NULL, 'Fun graphic print tees',                 3, NOW()),
  ('sub_td_top_play',       'Play tees & tanks',      'cat_td_tops', NULL, 'Durable play tops and tank tops',        4, NOW()),
  ('sub_td_top_polo',       'Polo shirts',            'cat_td_tops', NULL, 'Collared polo shirts',                   5, NOW()),
  ('sub_td_top_button',     'Button-down shirts',     'cat_td_tops', NULL, 'Smart button-down shirts',               6, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Toddler Bottoms
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_bot_pullon',     'Pull-on pants',          'cat_td_bottoms', NULL, 'Easy pull-on elastic waist pants',    1, NOW()),
  ('sub_td_bot_joggers',    'Joggers',                'cat_td_bottoms', NULL, 'Soft jogger pants',                   2, NOW()),
  ('sub_td_bot_shorts',     'Shorts',                 'cat_td_bottoms', NULL, 'Casual everyday shorts',              3, NOW()),
  ('sub_td_bot_jeans',      'Jeans',                  'cat_td_bottoms', NULL, 'Denim jeans with comfortable fit',    4, NOW()),
  ('sub_td_bot_dress',      'Dress pants',            'cat_td_bottoms', NULL, 'Smart dress trousers',                5, NOW()),
  ('sub_td_bot_reinforced', 'Reinforced-knee pants',  'cat_td_bottoms', NULL, 'Durable knee-patch play pants',       6, NOW()),
  ('sub_td_bot_overalls',   'Overalls',               'cat_td_bottoms', NULL, 'Denim and soft overalls',             7, NOW()),
  ('sub_td_bot_skirts',     'Skirts',                 'cat_td_bottoms', NULL, 'Casual and dressy skirts',            8, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Dresses & Rompers
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_dr_casual',      'Casual dresses',         'cat_td_dresses', NULL, 'Everyday simple dresses',             1, NOW()),
  ('sub_td_dr_rompers',     'Rompers',                'cat_td_dresses', NULL, 'One-piece rompers and playsuits',     2, NOW()),
  ('sub_td_dr_jumpsuits',   'Jumpsuits',              'cat_td_dresses', NULL, 'Full-length jumpsuits',               3, NOW()),
  ('sub_td_dr_party',       'Party dresses',          'cat_td_dresses', NULL, 'Dressy party and occasion dresses',   4, NOW()),
  ('sub_td_dr_neutral',     'Gender-neutral rompers', 'cat_td_dresses', NULL, 'Unisex rompers and onesie dresses',   5, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Sweaters & Hoodies
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_kn_sweaters',    'Sweaters & pullovers',   'cat_td_knitwear', NULL, 'Knit sweaters and pullover tops',    1, NOW()),
  ('sub_td_kn_cardigans',   'Cardigans',              'cat_td_knitwear', NULL, 'Open-front knit cardigans',          2, NOW()),
  ('sub_td_kn_hoodies',     'Zip-up hoodies',         'cat_td_knitwear', NULL, 'Lightweight zip-up hoodies',         3, NOW()),
  ('sub_td_kn_fleece',      'Fleece tops',            'cat_td_knitwear', NULL, 'Warm fleece pullovers and jackets',  4, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Toddler Sleepwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_sl_footed',      'Footed pajamas',         'cat_td_sleepwear', NULL, 'One-piece footed pajamas/sleepers', 1, NOW()),
  ('sub_td_sl_set',         'Pajama sets',            'cat_td_sleepwear', NULL, 'Matching top and pants pajama sets',2, NOW()),
  ('sub_td_sl_shirt',       'Sleep shirts',           'cat_td_sleepwear', NULL, 'Comfortable sleep shirts',          3, NOW()),
  ('sub_td_sl_shorts',      'Sleep shorts',           'cat_td_sleepwear', NULL, 'Loose sleep shorts',                4, NOW()),
  ('sub_td_sl_sacks',       'Sleep sacks',            'cat_td_sleepwear', NULL, 'Wearable blankets and sleep sacks', 5, NOW()),
  ('sub_td_sl_socks',       'Non-slip socks',         'cat_td_sleepwear', NULL, 'Cozy non-slip bedtime socks',       6, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Training & Underwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_uw_training',    'Training underwear',     'cat_td_underwear', NULL, 'Potty training pull-up underwear',  1, NOW()),
  ('sub_td_uw_pullups',     'Pull-ups',               'cat_td_underwear', NULL, 'Disposable and reusable pull-ups',  2, NOW()),
  ('sub_td_uw_underwear',   'Underwear',              'cat_td_underwear', NULL, 'Regular toddler underwear',         3, NOW()),
  ('sub_td_uw_undershirts', 'Undershirts & camisoles','cat_td_underwear', NULL, 'Base layer undershirts',            4, NOW()),
  ('sub_td_uw_swimdiapers', 'Swim diapers',           'cat_td_underwear', NULL, 'Reusable and disposable swim nappies',5, NOW()),
  ('sub_td_uw_socks',       'Undergarment socks',     'cat_td_underwear', NULL, 'Plain everyday socks',              6, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Toddler Outerwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_ow_jackets',     'Jackets & windbreakers', 'cat_td_outerwear', NULL, 'Light jackets and windbreakers',    1, NOW()),
  ('sub_td_ow_puffer',      'Puffer & insulated coats','cat_td_outerwear',NULL, 'Warm puffer and padded coats',      2, NOW()),
  ('sub_td_ow_rain',        'Raincoats & ponchos',    'cat_td_outerwear', NULL, 'Waterproof raincoats and ponchos',  3, NOW()),
  ('sub_td_ow_gloves',      'Gloves & mittens',       'cat_td_outerwear', NULL, 'Winter gloves and mittens',         4, NOW()),
  ('sub_td_ow_scarves',     'Scarves & neck warmers', 'cat_td_outerwear', NULL, 'Soft scarves and neck warmers',     5, NOW()),
  ('sub_td_ow_boots',       'Rain & winter boots',    'cat_td_outerwear', NULL, 'Waterproof and insulated boots',    6, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Active & Playwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_ac_smocks',      'Waterproof bibs & smocks','cat_td_activewear',NULL, 'Messy-play smocks and bib aprons', 1, NOW()),
  ('sub_td_ac_upf',         'Sun-protective clothing', 'cat_td_activewear',NULL, 'UPF-rated shirts and play sets',   2, NOW()),
  ('sub_td_ac_rashguards',  'Rash guards',             'cat_td_activewear',NULL, 'UV rash guard swim tops',          3, NOW()),
  ('sub_td_ac_sets',        'Active play sets',        'cat_td_activewear',NULL, 'Coordinated tops and bottoms sets',4, NOW()),
  ('sub_td_ac_sneakers',    'Activity sneakers',       'cat_td_activewear',NULL, 'Slip-on sneakers for first steps', 5, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Special Occasion
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_oc_party',       'Party dresses & outfits', 'cat_td_occasion', NULL, 'Festive party and photo outfits',   1, NOW()),
  ('sub_td_oc_blazers',     'Mini blazers & dress shirts','cat_td_occasion',NULL,'Smart occasion blazers',           2, NOW()),
  ('sub_td_oc_dresspants',  'Dress pants & skirts',    'cat_td_occasion', NULL, 'Formal trousers and skirts',        3, NOW()),
  ('sub_td_oc_accessories', 'Bows, headbands & ties',  'cat_td_occasion', NULL, 'Dressy hair accessories and ties',  4, NOW()),
  ('sub_td_oc_shoes',       'Dress shoes & ballet flats','cat_td_occasion',NULL, 'Formal and occasion footwear',     5, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Toddler Footwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_fw_crib',        'Soft-soled crib shoes',   'cat_td_footwear', NULL, 'Pre-walker soft-soled shoes',       1, NOW()),
  ('sub_td_fw_firstwalker', 'First-walker sneakers',   'cat_td_footwear', NULL, 'Flexible-sole early walking shoes', 2, NOW()),
  ('sub_td_fw_boots',       'Boots',                   'cat_td_footwear', NULL, 'Easy-closure ankle and knee boots', 3, NOW()),
  ('sub_td_fw_sandals',     'Sandals',                 'cat_td_footwear', NULL, 'Sandals with heel straps',          4, NOW()),
  ('sub_td_fw_velcro',      'Slip-on & Velcro shoes',  'cat_td_footwear', NULL, 'Independence-promoting easy shoes', 5, NOW()),
  ('sub_td_fw_rainboots',   'Rain boots',              'cat_td_footwear', NULL, 'Waterproof rubber rain boots',      6, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Toddler Accessories
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_td_acc_headbands',  'Headbands & bows',        'cat_td_accessories', NULL, 'Fabric headbands and bow clips',  1, NOW()),
  ('sub_td_acc_hats',       'Hats & sun caps',         'cat_td_accessories', NULL, 'Sun hats, caps, and beanies',     2, NOW()),
  ('sub_td_acc_bibs',       'Bibs',                    'cat_td_accessories', NULL, 'Feeding bibs and drool bibs',     3, NOW()),
  ('sub_td_acc_bags',       'Small backpacks',         'cat_td_accessories', NULL, 'Mini backpacks and daycare bags', 4, NOW()),
  ('sub_td_acc_socks',      'Decorative socks',        'cat_td_accessories', NULL, 'Fun patterned and gift socks',    5, NOW()),
  ('sub_td_acc_hair',       'Hair accessories',        'cat_td_accessories', NULL, 'Clips, bands, and pins',          6, NOW())
ON CONFLICT (id) DO NOTHING;
