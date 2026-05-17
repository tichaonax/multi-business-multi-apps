-- Seed Girls' Clothing Categories (expanded)
-- Source: 🎀 Girls' Clothing Categories.md
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Expands existing cat_girl_* categories with new subcategories (avoiding name conflicts)
-- and adds 5 brand-new categories under cdom_kids ("Kids Clothing"):
--   Girls Sweaters & Hoodies, Girls School Wear, Girls Activewear,
--   Girls Underwear & Essentials, Girls Specialty & Seasonal

-- =============================================================================
-- 5 BRAND-NEW CATEGORIES (under cdom_kids)
-- =============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
) VALUES
  ('cat_girl_knitwear',   'Girls Sweaters & Hoodies',       '🧶', 'Sweaters, cardigans, pullovers, turtlenecks, and hoodies',            '#FCD34D', 37, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_schoolwear', 'Girls School Wear',              '🏫', 'Uniform tops, skirts, pants, blazers, polo shirts, and jumpers',       '#6EE7B7', 38, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_activewear', 'Girls Activewear',               '🏃', 'Active tops, leggings, joggers, tracksuits, and athletic jackets',     '#34D399', 39, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_underwear',  'Girls Underwear & Essentials',   '🧦', 'Underwear, training bras, socks, tights, and undershirts',            '#F9A8D4', 40, 'cdom_kids', 'clothing', false, true, NOW(), NOW()),
  ('cat_girl_specialty',  'Girls Specialty & Seasonal',     '🧸', 'Costumes, holiday outfits, swimwear, snow suits, and adaptive wear',  '#C4B5FD', 41, 'cdom_kids', 'clothing', false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS TOPS — expand existing cat_girl_tops
-- Existing: Cardigans, Graphic tees, Long-sleeve tops, T-shirts
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_top_blouses',       'Blouses',               'cat_girl_tops', NULL, 'Casual and dressy blouses',            1,  NOW()),
  ('sub_gt_top_tank',          'Tank tops',             'cat_girl_tops', NULL, 'Sleeveless tank tops',                 2,  NOW()),
  ('sub_gt_top_cami',          'Camisoles',             'cat_girl_tops', NULL, 'Thin-strap camisole tops',             3,  NOW()),
  ('sub_gt_top_knit',          'Knit tops',             'cat_girl_tops', NULL, 'Lightweight knit tops',                4,  NOW()),
  ('sub_gt_top_polo',          'Polo shirts',           'cat_girl_tops', NULL, 'Collared polo shirts',                 5,  NOW()),
  ('sub_gt_top_tunic',         'Tunics',                'cat_girl_tops', NULL, 'Long flowy tunic tops',                6,  NOW()),
  ('sub_gt_top_layer',         'Layering tops',         'cat_girl_tops', NULL, 'Thin tops for layering',               7,  NOW()),
  ('sub_gt_top_peplum',        'Peplum tops',           'cat_girl_tops', NULL, 'Flared hem peplum tops',               8,  NOW()),
  ('sub_gt_top_ruffle',        'Ruffle tops',           'cat_girl_tops', NULL, 'Ruffle and frill detail tops',         9,  NOW()),
  ('sub_gt_top_offshoulder',   'Off-the-shoulder tops', 'cat_girl_tops', NULL, 'Bardot and off-shoulder necklines',    10, NOW()),
  ('sub_gt_top_crop',          'Crop tops',             'cat_girl_tops', NULL, 'Short cropped tops',                   11, NOW()),
  ('sub_gt_top_halter',        'Halter tops',           'cat_girl_tops', NULL, 'Halterneck tie tops',                  12, NOW()),
  ('sub_gt_top_sequin',        'Sequin tops',           'cat_girl_tops', NULL, 'Sparkly sequin party tops',            13, NOW()),
  ('sub_gt_top_lace',          'Lace tops',             'cat_girl_tops', NULL, 'Lace and crochet detail tops',         14, NOW()),
  ('sub_gt_top_embellished',   'Embellished tops',      'cat_girl_tops', NULL, 'Beaded and embellished tops',          15, NOW()),
  ('sub_gt_top_statement',     'Statement blouses',     'cat_girl_tops', NULL, 'Bold and decorative blouses',          16, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS BOTTOMS — expand existing cat_girl_bottoms
-- Existing: Jeans, Leggings, Pull-on pants, Shorts, Skirts
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_bot_jeggings',   'Jeggings',      'cat_girl_bottoms', NULL, 'Denim-look stretch jeggings',    1,  NOW()),
  ('sub_gt_bot_casual',     'Casual pants',  'cat_girl_bottoms', NULL, 'Relaxed everyday pants',         2,  NOW()),
  ('sub_gt_bot_chinos',     'Chinos',        'cat_girl_bottoms', NULL, 'Smart casual chino trousers',    3,  NOW()),
  ('sub_gt_bot_joggers',    'Joggers',       'cat_girl_bottoms', NULL, 'Soft jogger pants',              4,  NOW()),
  ('sub_gt_bot_sweatpants', 'Sweatpants',    'cat_girl_bottoms', NULL, 'Fleece and cotton sweatpants',   5,  NOW()),
  ('sub_gt_bot_denim_sh',   'Denim shorts',  'cat_girl_bottoms', NULL, 'Denim cut-off shorts',           6,  NOW()),
  ('sub_gt_bot_ath_sh',     'Athletic shorts','cat_girl_bottoms', NULL, 'Sport and gym shorts',          7,  NOW()),
  ('sub_gt_bot_bike_sh',    'Bike shorts',   'cat_girl_bottoms', NULL, 'Fitted cycling-style shorts',    8,  NOW()),
  ('sub_gt_bot_skorts',     'Skorts',        'cat_girl_bottoms', NULL, 'Skirt-front short combos',       9,  NOW()),
  ('sub_gt_bot_denim_sk',   'Denim skirts',  'cat_girl_bottoms', NULL, 'Casual denim skirts',            10, NOW()),
  ('sub_gt_bot_pleated',    'Pleated skirts','cat_girl_bottoms', NULL, 'Pleated school and fashion skirts',11,NOW()),
  ('sub_gt_bot_tulle',      'Tulle skirts',  'cat_girl_bottoms', NULL, 'Layered tulle and tutu skirts',  12, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS DRESSES — expand existing cat_girl_dresses
-- Existing: Baby dresses, Casual dresses, Party dresses, Rompers
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_dr_tshirt',     'T-shirt dresses',    'cat_girl_dresses', NULL, 'Relaxed T-shirt style dresses',   1,  NOW()),
  ('sub_gt_dr_cotton',     'Cotton dresses',     'cat_girl_dresses', NULL, 'Soft everyday cotton dresses',    2,  NOW()),
  ('sub_gt_dr_play',       'Play dresses',       'cat_girl_dresses', NULL, 'Durable easy-wear play dresses',  3,  NOW()),
  ('sub_gt_dr_sundress',   'Sundresses',         'cat_girl_dresses', NULL, 'Light warm-weather sundresses',   4,  NOW()),
  ('sub_gt_dr_holiday',    'Holiday dresses',    'cat_girl_dresses', NULL, 'Christmas and holiday dresses',   5,  NOW()),
  ('sub_gt_dr_birthday',   'Birthday dresses',   'cat_girl_dresses', NULL, 'Special birthday occasion dresses',6, NOW()),
  ('sub_gt_dr_flowergirl', 'Flower girl dresses','cat_girl_dresses', NULL, 'Wedding flower girl dresses',     7,  NOW()),
  ('sub_gt_dr_formal',     'Formal dresses',     'cat_girl_dresses', NULL, 'Smart formal occasion dresses',   8,  NOW()),
  ('sub_gt_dr_maxi',       'Maxi dresses',       'cat_girl_dresses', NULL, 'Full-length maxi dresses',        9,  NOW()),
  ('sub_gt_dr_midi',       'Midi dresses',       'cat_girl_dresses', NULL, 'Mid-length midi dresses',         10, NOW()),
  ('sub_gt_dr_skater',     'Skater dresses',     'cat_girl_dresses', NULL, 'Flared A-line skater dresses',    11, NOW()),
  ('sub_gt_dr_tiered',     'Tiered dresses',     'cat_girl_dresses', NULL, 'Multi-layer tiered dresses',      12, NOW()),
  ('sub_gt_dr_tutu',       'Tutu dresses',       'cat_girl_dresses', NULL, 'Ballerina tutu dresses',          13, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS SLEEPWEAR — expand existing cat_girl_sleep
-- Existing: Cozy socks, Nightgowns, Pajama sets, Sleep shirts
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_sl_onesies',  'Onesies',      'cat_girl_sleep', NULL, 'All-in-one sleep onesies',          1, NOW()),
  ('sub_gt_sl_loungeset','Lounge sets',  'cat_girl_sleep', NULL, 'Matching lounge top and pants sets', 2, NOW()),
  ('sub_gt_sl_loungepan','Lounge pants', 'cat_girl_sleep', NULL, 'Relaxed-fit lounge trousers',        3, NOW()),
  ('sub_gt_sl_cozytop',  'Cozy tops',   'cat_girl_sleep', NULL, 'Soft relaxed lounge tops',           4, NOW()),
  ('sub_gt_sl_robes',    'Robes',        'cat_girl_sleep', NULL, 'Dressing gowns and fluffy robes',    5, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS OUTERWEAR — expand existing cat_girl_outer
-- Existing: Coats, Gloves, Hoodies, Light jackets, Puffer jackets, Raincoats, Scarves
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_ow_denim',     'Denim jackets',    'cat_girl_outer', NULL, 'Classic denim jean jackets',       1,  NOW()),
  ('sub_gt_ow_bomber',    'Bomber jackets',   'cat_girl_outer', NULL, 'Casual bomber jackets',            2,  NOW()),
  ('sub_gt_ow_zipup',     'Zip-up hoodies',   'cat_girl_outer', NULL, 'Zip-front hooded sweatshirts',     3,  NOW()),
  ('sub_gt_ow_fleece',    'Fleece jackets',   'cat_girl_outer', NULL, 'Warm polar fleece zip jackets',    4,  NOW()),
  ('sub_gt_ow_parka',     'Parkas',           'cat_girl_outer', NULL, 'Long hooded parka coats',          5,  NOW()),
  ('sub_gt_ow_wool',      'Wool coats',       'cat_girl_outer', NULL, 'Smart wool and blend coats',       6,  NOW()),
  ('sub_gt_ow_snow',      'Snow jackets',     'cat_girl_outer', NULL, 'Insulated waterproof snow jackets',7,  NOW()),
  ('sub_gt_ow_fauxfur',   'Faux fur coats',   'cat_girl_outer', NULL, 'Soft faux fur fashion coats',      8,  NOW()),
  ('sub_gt_ow_sequin',    'Sequin jackets',   'cat_girl_outer', NULL, 'Sparkly sequin party jackets',     9,  NOW()),
  ('sub_gt_ow_statement', 'Statement jackets','cat_girl_outer', NULL, 'Bold fashion statement jackets',   10, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS FOOTWEAR — expand existing cat_girl_footwear
-- Existing: Boots, First-walker shoes, Flats, Sandals, Sneakers
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_fw_slipon',    'Slip-ons',        'cat_girl_footwear', NULL, 'Easy slip-on casual shoes',      1,  NOW()),
  ('sub_gt_fw_canvas',    'Canvas shoes',    'cat_girl_footwear', NULL, 'Light canvas casual shoes',      2,  NOW()),
  ('sub_gt_fw_ballet',    'Ballet flats',    'cat_girl_footwear', NULL, 'Classic round-toe ballet flats', 3,  NOW()),
  ('sub_gt_fw_maryjane',  'Mary Janes',      'cat_girl_footwear', NULL, 'Strap Mary Jane shoes',          4,  NOW()),
  ('sub_gt_fw_dresssand', 'Dress sandals',   'cat_girl_footwear', NULL, 'Strappy dressy sandals',         5,  NOW()),
  ('sub_gt_fw_ankle',     'Ankle boots',     'cat_girl_footwear', NULL, 'Fashion ankle boots',            6,  NOW()),
  ('sub_gt_fw_winter',    'Winter boots',    'cat_girl_footwear', NULL, 'Insulated warm winter boots',    7,  NOW()),
  ('sub_gt_fw_rain',      'Rain boots',      'cat_girl_footwear', NULL, 'Waterproof rubber rain boots',   8,  NOW()),
  ('sub_gt_fw_flipflops', 'Flip-flops',      'cat_girl_footwear', NULL, 'Casual toe-post flip-flops',     9,  NOW()),
  ('sub_gt_fw_slides',    'Slides',          'cat_girl_footwear', NULL, 'Open-toe slide sandals',         10, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS ACCESSORIES — expand existing cat_girl_acc
-- Existing: Bibs, Hats & caps, Headbands & bows, Jewelry, Small backpacks, Socks
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_acc_hairbows',  'Hair bows',     'cat_girl_acc', NULL, 'Clip-on and tie hair bows',       1, NOW()),
  ('sub_gt_acc_scarves',   'Scarves',       'cat_girl_acc', NULL, 'Neck scarves and wraps',          2, NOW()),
  ('sub_gt_acc_gloves',    'Gloves',        'cat_girl_acc', NULL, 'Winter and fashion gloves',       3, NOW()),
  ('sub_gt_acc_bags',      'Bags & purses', 'cat_girl_acc', NULL, 'Mini bags, totes, and purses',    4, NOW()),
  ('sub_gt_acc_backpacks', 'Backpacks',     'cat_girl_acc', NULL, 'School and fashion backpacks',    5, NOW()),
  ('sub_gt_acc_sunnies',   'Sunglasses',    'cat_girl_acc', NULL, 'Kids fashion sunglasses',         6, NOW()),
  ('sub_gt_acc_watches',   'Watches',       'cat_girl_acc', NULL, 'Kids fashion watches',            7, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS SWEATERS & HOODIES (new category)
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_kn_sweaters',   'Sweaters',       'cat_girl_knitwear', NULL, 'Classic knit sweaters',             1, NOW()),
  ('sub_gt_kn_cardigans',  'Cardigans',      'cat_girl_knitwear', NULL, 'Open-front knit cardigans',         2, NOW()),
  ('sub_gt_kn_pullovers',  'Pullovers',      'cat_girl_knitwear', NULL, 'Over-the-head pullover knits',      3, NOW()),
  ('sub_gt_kn_turtleneck', 'Turtlenecks',    'cat_girl_knitwear', NULL, 'High-neck roll collar knitwear',    4, NOW()),
  ('sub_gt_kn_knithood',   'Knit hoodies',   'cat_girl_knitwear', NULL, 'Hooded knit sweaters',              5, NOW()),
  ('sub_gt_kn_hoodies',    'Hoodies',        'cat_girl_knitwear', NULL, 'Pullover and zip-up hoodies',       6, NOW()),
  ('sub_gt_kn_sweatshirt', 'Sweatshirts',    'cat_girl_knitwear', NULL, 'Crew-neck sweatshirts',             7, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS SCHOOL WEAR (new category)
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_sc_uni_top',   'Uniform tops',   'cat_girl_schoolwear', NULL, 'School uniform blouses and tops', 1, NOW()),
  ('sub_gt_sc_uni_skirt', 'Uniform skirts', 'cat_girl_schoolwear', NULL, 'Pleated school uniform skirts',   2, NOW()),
  ('sub_gt_sc_uni_pants', 'Uniform pants',  'cat_girl_schoolwear', NULL, 'Smart school uniform trousers',   3, NOW()),
  ('sub_gt_sc_polo',      'Polo shirts',    'cat_girl_schoolwear', NULL, 'Collared school polo shirts',     4, NOW()),
  ('sub_gt_sc_blazer',    'Blazers',        'cat_girl_schoolwear', NULL, 'Smart school blazers',            5, NOW()),
  ('sub_gt_sc_sweater',   'Sweaters',       'cat_girl_schoolwear', NULL, 'School V-neck sweaters',          6, NOW()),
  ('sub_gt_sc_jumper',    'Jumpers',        'cat_girl_schoolwear', NULL, 'Pinafore and school jumpers',     7, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS ACTIVEWEAR (new category)
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_act_tops',      'Active tops',            'cat_girl_activewear', NULL, 'Moisture-wicking sport tops',        1, NOW()),
  ('sub_gt_act_sportsbra', 'Sports bras',            'cat_girl_activewear', NULL, 'Age-appropriate sports bras',        2, NOW()),
  ('sub_gt_act_leggings',  'Leggings',               'cat_girl_activewear', NULL, 'High-waist athletic leggings',       3, NOW()),
  ('sub_gt_act_joggers',   'Joggers',                'cat_girl_activewear', NULL, 'Lightweight training joggers',       4, NOW()),
  ('sub_gt_act_shorts',    'Shorts',                 'cat_girl_activewear', NULL, 'Athletic sport shorts',              5, NOW()),
  ('sub_gt_act_tracksuit', 'Tracksuits',             'cat_girl_activewear', NULL, 'Matching athletic tracksuit sets',   6, NOW()),
  ('sub_gt_act_jacket',    'Athletic jackets',       'cat_girl_activewear', NULL, 'Lightweight sport jackets',          7, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS UNDERWEAR & ESSENTIALS (new category)
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_uw_underwear',   'Underwear',       'cat_girl_underwear', NULL, 'Girls everyday underwear',      1, NOW()),
  ('sub_gt_uw_trainingbra', 'Training bras',   'cat_girl_underwear', NULL, 'Starter and training bras',     2, NOW()),
  ('sub_gt_uw_socks',       'Socks',           'cat_girl_underwear', NULL, 'Everyday and ankle socks',      3, NOW()),
  ('sub_gt_uw_tights',      'Tights',          'cat_girl_underwear', NULL, 'Opaque and sheer tights',       4, NOW()),
  ('sub_gt_uw_legwarmers',  'Leg warmers',     'cat_girl_underwear', NULL, 'Knit and fleece leg warmers',   5, NOW()),
  ('sub_gt_uw_undershirt',  'Undershirts',     'cat_girl_underwear', NULL, 'Thin crew and vest undershirts',6, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GIRLS SPECIALTY & SEASONAL (new category)
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_gt_sp_costumes',   'Costumes',         'cat_girl_specialty', NULL, 'Dress-up and play costumes',       1,  NOW()),
  ('sub_gt_sp_halloween',  'Halloween outfits','cat_girl_specialty', NULL, 'Halloween costumes and outfits',   2,  NOW()),
  ('sub_gt_sp_holiday',    'Holiday outfits',  'cat_girl_specialty', NULL, 'Christmas and festive outfits',    3,  NOW()),
  ('sub_gt_sp_easter',     'Easter dresses',   'cat_girl_specialty', NULL, 'Easter and spring dresses',        4,  NOW()),
  ('sub_gt_sp_swimwear',   'Swimwear',         'cat_girl_specialty', NULL, 'Swimsuits and bikinis',            5,  NOW()),
  ('sub_gt_sp_coverup',    'Cover-ups',        'cat_girl_specialty', NULL, 'Beach cover-ups and sarongs',      6,  NOW()),
  ('sub_gt_sp_snowsuit',   'Snow suits',       'cat_girl_specialty', NULL, 'One-piece insulated snow suits',   7,  NOW()),
  ('sub_gt_sp_raingear',   'Rain gear',        'cat_girl_specialty', NULL, 'Waterproof rain sets and ponchos', 8,  NOW()),
  ('sub_gt_sp_plussize',   'Plus sizes',       'cat_girl_specialty', NULL, 'Extended plus-size range',         9,  NOW()),
  ('sub_gt_sp_adaptive',   'Adaptive clothing','cat_girl_specialty', NULL, 'Accessible adaptive designs',      10, NOW())
ON CONFLICT (id) DO NOTHING;
