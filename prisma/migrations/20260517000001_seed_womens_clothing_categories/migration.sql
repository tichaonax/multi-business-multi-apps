-- Seed Women's Clothing Categories
-- Source: 👗 Women's Clothing Categories.md
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds 14 new business_categories under the existing cdom_womens ("Women's Clothing") domain
-- and 91 inventory_subcategories across all 14 categories.
-- The existing ccat_womens_* categories are left untouched.

-- =============================================================================
-- BUSINESS CATEGORIES (all under cdom_womens)
-- =============================================================================

-- cat_wc_tops / cat_wc_bottoms are skipped here because ccat_womens_tops ("Women's Tops")
-- and ccat_womens_bottoms ("Women's Bottoms") already exist under cdom_womens.
-- Their subcategories are merged into those existing categories below.
INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
) VALUES
  ('cat_wc_dresses',     'Dresses',                    '👗', 'Casual, midi, maxi, bodycon, wrap, and formal dresses',             '#F472B6', 3,  'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_outerwear',   'Outerwear',                  '🧥', 'Jackets, blazers, coats, parkas, and vests',                        '#6366F1', 4,  'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_knitwear',    'Knitwear',                   '🧶', 'Sweaters, pullovers, cardigans, and knit tops',                     '#F59E0B', 5,  'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_swimwear',    'Swimwear',                   '🩱', 'Bikinis, one-pieces, tankinis, and beach cover-ups',                '#06B6D4', 6,  'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_sleepwear',   'Sleepwear & Loungewear',     '🌙', 'Pajamas, nightgowns, robes, and lounge sets',                      '#7C3AED', 7,  'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_intimates',   'Intimates & Shapewear',      '🩲', 'Bras, panties, shapewear, hosiery, and camisoles',                  '#DB2777', 8,  'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_footwear',    'Footwear',                   '👠', 'Heels, flats, sneakers, boots, sandals, and wedges',                '#D97706', 9,  'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_accessories', 'Accessories',                '👜', 'Handbags, scarves, hats, jewelry, belts, and sunglasses',           '#10B981', 10, 'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_outfit_sets', 'Outfit Sets',                '💃', 'Matching sets, co-ords, two-piece sets, and ladies outfits',        '#EF4444', 11, 'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_activewear',  'Activewear',                 '🏋️', 'Leggings, sports bras, workout tops, and athletic wear',           '#3B82F6', 12, 'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_workwear',    'Workwear',                   '👔', 'Blouses, dress pants, work dresses, blazers, and office attire',   '#374151', 13, 'cdom_womens', 'clothing', false, true, NOW(), NOW()),
  ('cat_wc_occasion',    'Occasion Wear',              '🎉', 'Formal dresses, cocktail dresses, bridesmaid and party outfits',   '#9333EA', 14, 'cdom_womens', 'clothing', false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Women's Tops (merged into existing ccat_womens_tops)
-- =============================================================================

-- Existing ccat_womens_tops already has: Blouses, Button-Up Shirts, Cardigans & Sweaters, Hoodies, T-Shirts & Tanks
-- Only inserting new subcategory names not already present
INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_tops_tshirts',         'T-shirts',                  'ccat_womens_tops', NULL, 'Everyday T-shirts',               1,  NOW()),
  ('sub_wc_tops_button_down',     'Button-down shirts',        'ccat_womens_tops', NULL, 'Button-down and button-up shirts', 3,  NOW()),
  ('sub_wc_tops_tunics',          'Tunics',                    'ccat_womens_tops', NULL, 'Long tunic tops',                  4,  NOW()),
  ('sub_wc_tops_knit_tops',       'Knit tops',                 'ccat_womens_tops', NULL, 'Lightweight knit tops',            5,  NOW()),
  ('sub_wc_tops_layer',           'Lightweight layering tops', 'ccat_womens_tops', NULL, 'Layering tops',                    6,  NOW()),
  ('sub_wc_tops_tanks',           'Tank tops',                 'ccat_womens_tops', NULL, 'Sleeveless tank tops',             7,  NOW()),
  ('sub_wc_tops_camis',           'Basic camis',               'ccat_womens_tops', NULL, 'Camisole tops',                    8,  NOW()),
  ('sub_wc_tops_bodysuits',       'Bodysuits',                 'ccat_womens_tops', NULL, 'Snap-bottom bodysuits',            9,  NOW()),
  ('sub_wc_tops_peplum',          'Peplum tops',               'ccat_womens_tops', NULL, 'Flared peplum tops',               10, NOW()),
  ('sub_wc_tops_wrap',            'Wrap tops',                 'ccat_womens_tops', NULL, 'Wrap-style tops',                  11, NOW()),
  ('sub_wc_tops_off_shoulder',    'Off-the-shoulder tops',     'ccat_womens_tops', NULL, 'Bardot neckline tops',             12, NOW()),
  ('sub_wc_tops_crop',            'Crop tops',                 'ccat_womens_tops', NULL, 'Short cropped tops',               13, NOW()),
  ('sub_wc_tops_halter',          'Halter tops',               'ccat_womens_tops', NULL, 'Halterneck tops',                  14, NOW()),
  ('sub_wc_tops_asymmetrical',    'Asymmetrical tops',         'ccat_womens_tops', NULL, 'One-shoulder or uneven hem tops',  15, NOW()),
  ('sub_wc_tops_statement',       'Statement blouses',         'ccat_womens_tops', NULL, 'Bold and decorative blouses',      16, NOW()),
  ('sub_wc_tops_dressy',          'Dressy tops',               'ccat_womens_tops', NULL, 'Elegant going-out tops',           17, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Women's Bottoms (merged into existing ccat_womens_bottoms)
-- =============================================================================

-- Existing: Jeans, Joggers, Leggings, Pants, Shorts, Skirts — only new subcategories added
INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_bot_wide_leg',     'Wide-leg pants',    'ccat_womens_bottoms', NULL, 'Wide-leg trousers',       7,  NOW()),
  ('sub_wc_bot_straight_leg', 'Straight-leg pants','ccat_womens_bottoms', NULL, 'Straight-cut trousers',   8,  NOW()),
  ('sub_wc_bot_skinny',       'Skinny pants',      'ccat_womens_bottoms', NULL, 'Slim-fit pants',          9,  NOW()),
  ('sub_wc_bot_slacks',       'Slacks',            'ccat_womens_bottoms', NULL, 'Smart casual slacks',     10, NOW()),
  ('sub_wc_bot_trousers',     'Trousers',          'ccat_womens_bottoms', NULL, 'Formal trousers',         11, NOW()),
  ('sub_wc_bot_dress_pants',  'Dress pants',       'ccat_womens_bottoms', NULL, 'Formal dress pants',      12, NOW()),
  ('sub_wc_bot_pencil_skirt', 'Pencil skirts',     'ccat_womens_bottoms', NULL, 'Fitted pencil skirts',    13, NOW()),
  ('sub_wc_bot_midi_skirt',   'Midi skirts',       'ccat_womens_bottoms', NULL, 'Mid-length midi skirts',  14, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Dresses
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_dress_casual',    'Casual dresses',        'cat_wc_dresses', NULL, 'Everyday casual dresses',          1,  NOW()),
  ('sub_wc_dress_midi',      'Midi dresses',          'cat_wc_dresses', NULL, 'Mid-length midi dresses',          2,  NOW()),
  ('sub_wc_dress_maxi',      'Maxi dresses',          'cat_wc_dresses', NULL, 'Full-length maxi dresses',         3,  NOW()),
  ('sub_wc_dress_mini',      'Mini dresses',          'cat_wc_dresses', NULL, 'Short mini dresses',               4,  NOW()),
  ('sub_wc_dress_bodycon',   'Bodycon dresses',       'cat_wc_dresses', NULL, 'Fitted bodycon dresses',           5,  NOW()),
  ('sub_wc_dress_wrap',      'Wrap dresses',          'cat_wc_dresses', NULL, 'Wrap-style dresses',               6,  NOW()),
  ('sub_wc_dress_shift',     'Shift dresses',         'cat_wc_dresses', NULL, 'Straight-cut shift dresses',       7,  NOW()),
  ('sub_wc_dress_shirt',     'Shirt dresses',         'cat_wc_dresses', NULL, 'Button-front shirt dresses',       8,  NOW()),
  ('sub_wc_dress_sundress',  'Sundresses',            'cat_wc_dresses', NULL, 'Light summery sundresses',         9,  NOW()),
  ('sub_wc_dress_evening',   'Evening dresses',       'cat_wc_dresses', NULL, 'Elegant evening dresses',          10, NOW()),
  ('sub_wc_dress_party',     'Party dresses',         'cat_wc_dresses', NULL, 'Fun and festive party dresses',    11, NOW()),
  ('sub_wc_dress_cocktail',  'Cocktail dresses',      'cat_wc_dresses', NULL, 'Semi-formal cocktail dresses',     12, NOW()),
  ('sub_wc_dress_gown',      'Formal gowns',          'cat_wc_dresses', NULL, 'Full-length formal gowns',         13, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Outerwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_out_jacket',     'Jackets',          'cat_wc_outerwear', NULL, 'General jackets',            1,  NOW()),
  ('sub_wc_out_blazer',     'Blazers',          'cat_wc_outerwear', NULL, 'Smart blazers',              2,  NOW()),
  ('sub_wc_out_denim',      'Denim jackets',    'cat_wc_outerwear', NULL, 'Jean jackets',               3,  NOW()),
  ('sub_wc_out_leather',    'Leather jackets',  'cat_wc_outerwear', NULL, 'Leather and faux leather',   4,  NOW()),
  ('sub_wc_out_cardigan',   'Cardigans',        'cat_wc_outerwear', NULL, 'Open-front cardigans',       5,  NOW()),
  ('sub_wc_out_trench',     'Trench coats',     'cat_wc_outerwear', NULL, 'Classic trench coats',       6,  NOW()),
  ('sub_wc_out_wool',       'Wool coats',       'cat_wc_outerwear', NULL, 'Heavy wool coats',           7,  NOW()),
  ('sub_wc_out_puffer',     'Puffer coats',     'cat_wc_outerwear', NULL, 'Padded puffer coats',        8,  NOW()),
  ('sub_wc_out_raincoat',   'Raincoats',        'cat_wc_outerwear', NULL, 'Waterproof raincoats',       9,  NOW()),
  ('sub_wc_out_parka',      'Parkas',           'cat_wc_outerwear', NULL, 'Heavy-duty parkas',          10, NOW()),
  ('sub_wc_out_vest',       'Vests',            'cat_wc_outerwear', NULL, 'Sleeveless vests',           11, NOW()),
  ('sub_wc_out_bomber',     'Bomber jackets',   'cat_wc_outerwear', NULL, 'Casual bomber jackets',      12, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Knitwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_knit_sweater',   'Sweaters',          'cat_wc_knitwear', NULL, 'Classic knit sweaters',    1, NOW()),
  ('sub_wc_knit_pullover',  'Pullovers',         'cat_wc_knitwear', NULL, 'Over-the-head pullovers',  2, NOW()),
  ('sub_wc_knit_cardigan',  'Cardigans',         'cat_wc_knitwear', NULL, 'Knit cardigans',           3, NOW()),
  ('sub_wc_knit_turtle',    'Turtlenecks',       'cat_wc_knitwear', NULL, 'High-neck turtlenecks',    4, NOW()),
  ('sub_wc_knit_chunky',    'Chunky knits',      'cat_wc_knitwear', NULL, 'Oversized chunky knits',   5, NOW()),
  ('sub_wc_knit_vest',      'Knit vests',        'cat_wc_knitwear', NULL, 'Sleeveless knit vests',    6, NOW()),
  ('sub_wc_knit_hooded',    'Hooded sweaters',   'cat_wc_knitwear', NULL, 'Knit hoodies',             7, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Swimwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_swim_onepiece',  'One-piece swimsuits', 'cat_wc_swimwear', NULL, 'Full-coverage one-piece swimsuits', 1, NOW()),
  ('sub_wc_swim_bikini',    'Bikinis',             'cat_wc_swimwear', NULL, 'Two-piece bikini sets',             2, NOW()),
  ('sub_wc_swim_tankini',   'Tankinis',            'cat_wc_swimwear', NULL, 'Tankini swimsuits',                 3, NOW()),
  ('sub_wc_swim_bra',       'Bikini tops',         'cat_wc_swimwear', NULL, 'Swim tops and bikini bras',         4, NOW()),
  ('sub_wc_swim_bottom',    'Bikini bottoms',      'cat_wc_swimwear', NULL, 'Swim bottoms',                      5, NOW()),
  ('sub_wc_swim_shorts',    'Swim shorts',         'cat_wc_swimwear', NULL, 'Board and swim shorts',             6, NOW()),
  ('sub_wc_swim_coverup',   'Cover-ups',           'cat_wc_swimwear', NULL, 'Beach cover-up wraps and kaftans',  7, NOW()),
  ('sub_wc_swim_beach',     'Beach dresses',       'cat_wc_swimwear', NULL, 'Lightweight beach dresses',         8, NOW()),
  ('sub_wc_swim_rash',      'Rash guards',         'cat_wc_swimwear', NULL, 'UV-protective rash guards',         9, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Sleepwear & Loungewear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_sleep_pyjamas',   'Pajama sets',             'cat_wc_sleepwear', NULL, 'Matching pajama top and bottom sets', 1, NOW()),
  ('sub_wc_sleep_shirt',     'Sleep shirts',            'cat_wc_sleepwear', NULL, 'Long sleep shirts and nightshirts',   2, NOW()),
  ('sub_wc_sleep_gown',      'Nightgowns',              'cat_wc_sleepwear', NULL, 'Full-length nightgowns',              3, NOW()),
  ('sub_wc_sleep_shorts',    'Sleep shorts',            'cat_wc_sleepwear', NULL, 'Comfortable sleep shorts',            4, NOW()),
  ('sub_wc_sleep_lounge',    'Lounge pants',            'cat_wc_sleepwear', NULL, 'Relaxed-fit lounge trousers',         5, NOW()),
  ('sub_wc_sleep_robe',      'Robes',                   'cat_wc_sleepwear', NULL, 'Dressing gowns and bath robes',       6, NOW()),
  ('sub_wc_sleep_socks',     'Cozy socks',              'cat_wc_sleepwear', NULL, 'Fluffy and thermal sleep socks',      7, NOW()),
  ('sub_wc_sleep_top',       'Lounge tops',             'cat_wc_sleepwear', NULL, 'Relaxed-fit lounge tops',             8, NOW()),
  ('sub_wc_sleep_set',       'Matching loungewear sets','cat_wc_sleepwear', NULL, 'Coordinated lounge top and bottom',   9, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Intimates & Shapewear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_int_bras',        'Bras',              'cat_wc_intimates', NULL, 'All bra styles',                    1,  NOW()),
  ('sub_wc_int_panties',     'Panties',           'cat_wc_intimates', NULL, 'Underwear and panties',             2,  NOW()),
  ('sub_wc_int_cami',        'Camisoles',         'cat_wc_intimates', NULL, 'Thin-strap camisoles',              3,  NOW()),
  ('sub_wc_int_slips',       'Slips',             'cat_wc_intimates', NULL, 'Full and half slips',               4,  NOW()),
  ('sub_wc_int_bodysuit',    'Bodysuits',         'cat_wc_intimates', NULL, 'Snap-bottom bodysuits',             5,  NOW()),
  ('sub_wc_int_shapewear',   'Shapewear',         'cat_wc_intimates', NULL, 'Waist trainers and shaping pieces', 6,  NOW()),
  ('sub_wc_int_hosiery',     'Hosiery',           'cat_wc_intimates', NULL, 'Pantyhose and stockings',           7,  NOW()),
  ('sub_wc_int_tights',      'Tights',            'cat_wc_intimates', NULL, 'Opaque and sheer tights',           8,  NOW()),
  ('sub_wc_int_socks',       'Socks',             'cat_wc_intimates', NULL, 'Everyday socks',                    9,  NOW()),
  ('sub_wc_int_seamless',    'Seamless underwear','cat_wc_intimates', NULL, 'No-show seamless underwear',        10, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Footwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_shoe_heels',      'Heels',            'cat_wc_footwear', NULL, 'High-heel shoes',           1,  NOW()),
  ('sub_wc_shoe_flats',      'Flats',            'cat_wc_footwear', NULL, 'Ballet and flat shoes',     2,  NOW()),
  ('sub_wc_shoe_sneakers',   'Sneakers',         'cat_wc_footwear', NULL, 'Casual sneakers',           3,  NOW()),
  ('sub_wc_shoe_sandals',    'Sandals',          'cat_wc_footwear', NULL, 'Open-toe sandals',          4,  NOW()),
  ('sub_wc_shoe_boots',      'Boots',            'cat_wc_footwear', NULL, 'All boot styles',           5,  NOW()),
  ('sub_wc_shoe_wedges',     'Wedges',           'cat_wc_footwear', NULL, 'Wedge-heel shoes',          6,  NOW()),
  ('sub_wc_shoe_loafers',    'Loafers',          'cat_wc_footwear', NULL, 'Slip-on loafers',           7,  NOW()),
  ('sub_wc_shoe_pumps',      'Pumps',            'cat_wc_footwear', NULL, 'Classic court pumps',       8,  NOW()),
  ('sub_wc_shoe_ankle',      'Ankle boots',      'cat_wc_footwear', NULL, 'Ankle-height boots',        9,  NOW()),
  ('sub_wc_shoe_knee',       'Knee-high boots',  'cat_wc_footwear', NULL, 'Knee-length boots',         10, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Accessories
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_acc_handbag',    'Handbags',           'cat_wc_accessories', NULL, 'Structured and casual handbags', 1,  NOW()),
  ('sub_wc_acc_tote',       'Totes',              'cat_wc_accessories', NULL, 'Large tote bags',                2,  NOW()),
  ('sub_wc_acc_crossbody',  'Crossbody bags',     'cat_wc_accessories', NULL, 'Shoulder and crossbody bags',    3,  NOW()),
  ('sub_wc_acc_clutch',     'Clutches',           'cat_wc_accessories', NULL, 'Evening clutch purses',          4,  NOW()),
  ('sub_wc_acc_scarf',      'Scarves',            'cat_wc_accessories', NULL, 'Neck and head scarves',          5,  NOW()),
  ('sub_wc_acc_hat',        'Hats',               'cat_wc_accessories', NULL, 'All hat styles',                 6,  NOW()),
  ('sub_wc_acc_gloves',     'Gloves',             'cat_wc_accessories', NULL, 'Fashion and winter gloves',      7,  NOW()),
  ('sub_wc_acc_sunglasses', 'Sunglasses',         'cat_wc_accessories', NULL, 'Fashion sunglasses',             8,  NOW()),
  ('sub_wc_acc_jewelry',    'Jewelry',            'cat_wc_accessories', NULL, 'Necklaces, earrings, bracelets', 9,  NOW()),
  ('sub_wc_acc_watches',    'Watches',            'cat_wc_accessories', NULL, 'Fashion and smart watches',      10, NOW()),
  ('sub_wc_acc_hair',       'Hair accessories',   'cat_wc_accessories', NULL, 'Clips, bands, and headbands',    11, NOW()),
  ('sub_wc_acc_hosiery',    'Socks and tights',   'cat_wc_accessories', NULL, 'Decorative socks and tights',    12, NOW()),
  ('sub_wc_acc_belt',       'Belts',              'cat_wc_accessories', NULL, 'Waist and fashion belts',        13, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Outfit Sets
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_set_ladies',    'Ladies outfits',          'cat_wc_outfit_sets', NULL, 'Complete ladies outfit sets',     1, NOW()),
  ('sub_wc_set_matching',  'Matching sets',           'cat_wc_outfit_sets', NULL, 'Co-ordinated matching sets',      2, NOW()),
  ('sub_wc_set_coords',    'Co-ords',                 'cat_wc_outfit_sets', NULL, 'Two-piece co-ord sets',           3, NOW()),
  ('sub_wc_set_two_piece', 'Two-piece sets',          'cat_wc_outfit_sets', NULL, 'Top and bottom two-piece sets',   4, NOW()),
  ('sub_wc_set_dress',     'Dress sets',              'cat_wc_outfit_sets', NULL, 'Dress with matching jacket/wrap', 5, NOW()),
  ('sub_wc_set_knit',      'Knit sets',               'cat_wc_outfit_sets', NULL, 'Knitted matching sets',           6, NOW()),
  ('sub_wc_set_lounge',    'Lounge sets',             'cat_wc_outfit_sets', NULL, 'Matching loungewear sets',        7, NOW()),
  ('sub_wc_set_shorts',    'Shorts sets',             'cat_wc_outfit_sets', NULL, 'Top and shorts sets',             8, NOW()),
  ('sub_wc_set_pants',     'Pant sets',               'cat_wc_outfit_sets', NULL, 'Top and trousers sets',           9, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Activewear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_act_leggings',   'Leggings',          'cat_wc_activewear', NULL, 'High-waist and workout leggings', 1, NOW()),
  ('sub_wc_act_sports_bra', 'Sports bras',       'cat_wc_activewear', NULL, 'Low, medium and high-support bras',2, NOW()),
  ('sub_wc_act_tops',       'Workout tops',      'cat_wc_activewear', NULL, 'Tank, crop, and T-shirt gym tops', 3, NOW()),
  ('sub_wc_act_shorts',     'Athletic shorts',   'cat_wc_activewear', NULL, 'Running and training shorts',     4, NOW()),
  ('sub_wc_act_joggers',    'Joggers',           'cat_wc_activewear', NULL, 'Slim and loose jogger pants',     5, NOW()),
  ('sub_wc_act_hoodie',     'Hoodies',           'cat_wc_activewear', NULL, 'Gym hoodies and zip-ups',         6, NOW()),
  ('sub_wc_act_track',      'Track jackets',     'cat_wc_activewear', NULL, 'Athletic track jackets',          7, NOW()),
  ('sub_wc_act_tennis',     'Tennis skirts',     'cat_wc_activewear', NULL, 'Pleated tennis and skorts',       8, NOW()),
  ('sub_wc_act_shoes',      'Training shoes',    'cat_wc_activewear', NULL, 'Athletic and cross-training shoes',9, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Workwear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_work_blouse',    'Blouses',           'cat_wc_workwear', NULL, 'Office-appropriate blouses',   1, NOW()),
  ('sub_wc_work_shirt',     'Button-up shirts',  'cat_wc_workwear', NULL, 'Formal button-up shirts',      2, NOW()),
  ('sub_wc_work_pants',     'Dress pants',       'cat_wc_workwear', NULL, 'Tailored dress pants',         3, NOW()),
  ('sub_wc_work_dress',     'Work dresses',      'cat_wc_workwear', NULL, 'Smart office dresses',         4, NOW()),
  ('sub_wc_work_skirt',     'Pencil skirts',     'cat_wc_workwear', NULL, 'Fitted office pencil skirts',  5, NOW()),
  ('sub_wc_work_blazer',    'Blazers',           'cat_wc_workwear', NULL, 'Professional blazers',         6, NOW()),
  ('sub_wc_work_set',       'Blazer sets',       'cat_wc_workwear', NULL, 'Matching blazer and trouser',  7, NOW()),
  ('sub_wc_work_shoes',     'Professional shoes','cat_wc_workwear', NULL, 'Heels, flats, and loafers',    8, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — Occasion Wear
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_occ_formal',      'Formal dresses',         'cat_wc_occasion', NULL, 'Black-tie and formal event dresses',  1, NOW()),
  ('sub_wc_occ_cocktail',    'Cocktail dresses',       'cat_wc_occasion', NULL, 'Semi-formal cocktail dresses',        2, NOW()),
  ('sub_wc_occ_wedding',     'Wedding guest dresses',  'cat_wc_occasion', NULL, 'Dresses suitable for weddings',       3, NOW()),
  ('sub_wc_occ_bridesmaid',  'Bridesmaid dresses',     'cat_wc_occasion', NULL, 'Coordinated bridesmaid dresses',      4, NOW()),
  ('sub_wc_occ_graduation',  'Graduation dresses',     'cat_wc_occasion', NULL, 'Outfits for graduation ceremonies',   5, NOW()),
  ('sub_wc_occ_party',       'Party outfits',          'cat_wc_occasion', NULL, 'Festive party and event outfits',     6, NOW()),
  ('sub_wc_occ_shoes',       'Dress shoes',            'cat_wc_occasion', NULL, 'Heels and formal occasion footwear',  7, NOW()),
  ('sub_wc_occ_bag',         'Evening bags',           'cat_wc_occasion', NULL, 'Clutches and small evening bags',     8, NOW())
ON CONFLICT (id) DO NOTHING;
