-- Seed Men's Clothing Categories
-- Source: 👔 Men's Clothing Categories.md
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Strategy (same as Women's migration):
--   Existing ccat_mens_tops / bottoms / footwear / outerwear → expanded with new subcategories
--   6 brand-new categories created under cdom_mens ("Men's Clothing")

-- =============================================================================
-- BRAND-NEW BUSINESS CATEGORIES (all under cdom_mens)
-- =============================================================================
-- ccat_mens_tops / bottoms / footwear / outerwear already exist — skipped here.

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
) VALUES
  ('cat_mc_suits',      'Suits & Formalwear',     '🤵', 'Full suits, blazers, tuxedos, dress vests, and formalwear',          '#1E3A5F', 5,  'cdom_mens', 'clothing', false, true, NOW(), NOW()),
  ('cat_mc_knitwear',   'Sweaters & Knits',       '🧶', 'Crewneck, V-neck, cardigans, turtlenecks, and quarter-zips',         '#92400E', 6,  'cdom_mens', 'clothing', false, true, NOW(), NOW()),
  ('cat_mc_activewear', 'Activewear',             '🏋️', 'Performance tees, compression tops, training shorts, and hoodies',   '#065F46', 7,  'cdom_mens', 'clothing', false, true, NOW(), NOW()),
  ('cat_mc_underwear',  'Underwear & Loungewear', '🩲', 'Boxers, briefs, undershirts, pajamas, lounge pants, and robes',      '#4C1D95', 8,  'cdom_mens', 'clothing', false, true, NOW(), NOW()),
  ('cat_mc_accessories','Accessories',            '🧢', 'Hats, scarves, ties, belts, bags, watches, and sunglasses',          '#78350F', 9,  'cdom_mens', 'clothing', false, true, NOW(), NOW()),
  ('cat_mc_specialty',  'Specialty & Seasonal',   '🌧️', 'Rainwear, snow gear, workwear, uniforms, and adaptive clothing',     '#1F2937', 10, 'cdom_mens', 'clothing', false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MEN'S TOPS — expand existing ccat_mens_tops
-- Existing: Dress Shirts, Hoodies, Polo Shirts, Sweaters, Sweaters & Hoodies, Sweatshirts, T-Shirts
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_top_graphic',     'Graphic tees',              'ccat_mens_tops', NULL, 'Printed and graphic design tees',        1,  NOW()),
  ('sub_mc_top_plain',       'Plain/basic tees',          'ccat_mens_tops', NULL, 'Solid colour basic tees',                2,  NOW()),
  ('sub_mc_top_longsleeve',  'Long-sleeve tees',          'ccat_mens_tops', NULL, 'Long-sleeve casual tees',                3,  NOW()),
  ('sub_mc_top_casual_btn',  'Casual button-down shirts', 'ccat_mens_tops', NULL, 'Casual open-collar button-down shirts',  4,  NOW()),
  ('sub_mc_top_knit',        'Knit tops',                 'ccat_mens_tops', NULL, 'Lightweight knit tops',                  5,  NOW()),
  ('sub_mc_top_tank',        'Tank tops & sleeveless',    'ccat_mens_tops', NULL, 'Sleeveless tank and muscle shirts',      6,  NOW()),
  ('sub_mc_top_henley',      'Henley shirts',             'ccat_mens_tops', NULL, 'Button-placket henley tops',             7,  NOW()),
  ('sub_mc_top_thermal',     'Thermal tops',              'ccat_mens_tops', NULL, 'Warm thermal base-layer tops',           8,  NOW()),
  ('sub_mc_top_undershirt',  'Undershirts',               'ccat_mens_tops', NULL, 'Crew and V-neck undershirts',            9,  NOW()),
  ('sub_mc_top_slim',        'Slim-fit shirts',           'ccat_mens_tops', NULL, 'Tailored slim-fit dress shirts',         10, NOW()),
  ('sub_mc_top_printed',     'Printed shirts',            'ccat_mens_tops', NULL, 'Pattern and print shirts',               11, NOW()),
  ('sub_mc_top_cuban',       'Cuban collar shirts',       'ccat_mens_tops', NULL, 'Open-collar Cuban/camp shirts',          12, NOW()),
  ('sub_mc_top_overshirt',   'Overshirts',                'ccat_mens_tops', NULL, 'Flannel and light overshirts',           13, NOW()),
  ('sub_mc_top_statement',   'Statement shirts',          'ccat_mens_tops', NULL, 'Bold and fashion-forward shirts',        14, NOW()),
  ('sub_mc_top_satin',       'Satin/silk shirts',         'ccat_mens_tops', NULL, 'Satin, silk, and shiny dress shirts',   15, NOW()),
  ('sub_mc_top_streetwear',  'Streetwear tops',           'ccat_mens_tops', NULL, 'Urban streetwear and oversized tops',   16, NOW()),
  ('sub_mc_top_designer',    'Designer tees',             'ccat_mens_tops', NULL, 'Branded and designer T-shirts',          17, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MEN'S BOTTOMS — expand existing ccat_mens_bottoms
-- Existing: Casual Pants, Dress Pants, Jeans, Joggers, Shorts, Trousers & Chinos
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_bot_slim_jeans',   'Slim-fit jeans',     'ccat_mens_bottoms', NULL, 'Slim tapered denim jeans',        1,  NOW()),
  ('sub_mc_bot_str_jeans',    'Straight-leg jeans', 'ccat_mens_bottoms', NULL, 'Classic straight-leg denim',      2,  NOW()),
  ('sub_mc_bot_rel_jeans',    'Relaxed-fit jeans',  'ccat_mens_bottoms', NULL, 'Loose and relaxed denim jeans',   3,  NOW()),
  ('sub_mc_bot_chinos',       'Chinos',             'ccat_mens_bottoms', NULL, 'Smart casual chino trousers',     4,  NOW()),
  ('sub_mc_bot_cargo',        'Cargo pants',        'ccat_mens_bottoms', NULL, 'Multi-pocket cargo trousers',     5,  NOW()),
  ('sub_mc_bot_sweatpants',   'Sweatpants',         'ccat_mens_bottoms', NULL, 'Fleece and cotton sweatpants',    6,  NOW()),
  ('sub_mc_bot_denim_shorts', 'Denim shorts',       'ccat_mens_bottoms', NULL, 'Cut-off and tailored denim shorts',7, NOW()),
  ('sub_mc_bot_cargo_shorts', 'Cargo shorts',       'ccat_mens_bottoms', NULL, 'Utility cargo shorts',            8,  NOW()),
  ('sub_mc_bot_ath_shorts',   'Athletic shorts',    'ccat_mens_bottoms', NULL, 'Sport and running shorts',        9,  NOW()),
  ('sub_mc_bot_swimtrunks',   'Swim trunks',        'ccat_mens_bottoms', NULL, 'Board shorts and swim trunks',    10, NOW()),
  ('sub_mc_bot_tailored',     'Tailored trousers',  'ccat_mens_bottoms', NULL, 'Formal tailored trousers',        11, NOW()),
  ('sub_mc_bot_cropped',      'Cropped pants',      'ccat_mens_bottoms', NULL, 'Cropped and ankle-length pants',  12, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MEN'S OUTERWEAR — expand existing ccat_mens_outerwear
-- Existing: Blazers, Coats, Jackets, Vests
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_out_lightweight',  'Lightweight jackets', 'ccat_mens_outerwear', NULL, 'Light zip-up and summer jackets',  1,  NOW()),
  ('sub_mc_out_windbreaker',  'Windbreakers',        'ccat_mens_outerwear', NULL, 'Wind-resistant shell jackets',     2,  NOW()),
  ('sub_mc_out_denim',        'Denim jackets',       'ccat_mens_outerwear', NULL, 'Classic denim/jean jackets',       3,  NOW()),
  ('sub_mc_out_bomber',       'Bomber jackets',      'ccat_mens_outerwear', NULL, 'MA-1 and varsity bomber jackets',  4,  NOW()),
  ('sub_mc_out_hooded',       'Hooded jackets',      'ccat_mens_outerwear', NULL, 'Anorak and hooded shell jackets',  5,  NOW()),
  ('sub_mc_out_fleece',       'Fleece jackets',      'ccat_mens_outerwear', NULL, 'Polar fleece zip-up jackets',      6,  NOW()),
  ('sub_mc_out_track',        'Track jackets',       'ccat_mens_outerwear', NULL, 'Athletic zip-up track tops',       7,  NOW()),
  ('sub_mc_out_parka',        'Parkas',              'ccat_mens_outerwear', NULL, 'Long hooded parka coats',          8,  NOW()),
  ('sub_mc_out_puffer',       'Puffer jackets',      'ccat_mens_outerwear', NULL, 'Padded quilted puffer coats',      9,  NOW()),
  ('sub_mc_out_wool',         'Wool coats',          'ccat_mens_outerwear', NULL, 'Smart wool and cashmere coats',    10, NOW()),
  ('sub_mc_out_trench',       'Trench coats',        'ccat_mens_outerwear', NULL, 'Classic belted trench coats',      11, NOW()),
  ('sub_mc_out_overcoat',     'Overcoats',           'ccat_mens_outerwear', NULL, 'Long formal overcoats',            12, NOW()),
  ('sub_mc_out_peacoat',      'Peacoats',            'ccat_mens_outerwear', NULL, 'Double-breasted peacoats',         13, NOW()),
  ('sub_mc_out_leather',      'Leather jackets',     'ccat_mens_outerwear', NULL, 'Genuine and faux leather jackets', 14, NOW()),
  ('sub_mc_out_suede',        'Suede jackets',       'ccat_mens_outerwear', NULL, 'Suede and nubuck jackets',         15, NOW()),
  ('sub_mc_out_designer',     'Designer coats',      'ccat_mens_outerwear', NULL, 'Branded and designer outerwear',   16, NOW()),
  ('sub_mc_out_statement',    'Statement outerwear', 'ccat_mens_outerwear', NULL, 'Bold fashion-forward outer pieces',17, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MEN'S FOOTWEAR — expand existing ccat_mens_footwear
-- Existing: Boots, Dress Shoes, Sandals, Sneakers
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_fw_slipon',      'Slip-ons',       'ccat_mens_footwear', NULL, 'Slip-on casual shoes',              1,  NOW()),
  ('sub_mc_fw_loafers',     'Loafers',        'ccat_mens_footwear', NULL, 'Penny and tassel loafers',          2,  NOW()),
  ('sub_mc_fw_boatshoes',   'Boat shoes',     'ccat_mens_footwear', NULL, 'Deck and boat shoes',               3,  NOW()),
  ('sub_mc_fw_oxfords',     'Oxfords',        'ccat_mens_footwear', NULL, 'Classic lace-up oxford shoes',      4,  NOW()),
  ('sub_mc_fw_derbies',     'Derbies',        'ccat_mens_footwear', NULL, 'Open-lacing derby shoes',           5,  NOW()),
  ('sub_mc_fw_monk',        'Monk straps',    'ccat_mens_footwear', NULL, 'Single and double monk strap shoes',6,  NOW()),
  ('sub_mc_fw_dressloafer', 'Dress loafers',  'ccat_mens_footwear', NULL, 'Formal slip-on loafers',            7,  NOW()),
  ('sub_mc_fw_chelsea',     'Chelsea boots',  'ccat_mens_footwear', NULL, 'Elastic-sided Chelsea boots',       8,  NOW()),
  ('sub_mc_fw_chukka',      'Chukka boots',   'ccat_mens_footwear', NULL, 'Ankle-height chukka boots',         9,  NOW()),
  ('sub_mc_fw_workboots',   'Work boots',     'ccat_mens_footwear', NULL, 'Heavy-duty work and safety boots',  10, NOW()),
  ('sub_mc_fw_hiking',      'Hiking boots',   'ccat_mens_footwear', NULL, 'Trail and hiking boots',            11, NOW()),
  ('sub_mc_fw_slides',      'Slides',         'ccat_mens_footwear', NULL, 'Open-toe slide sandals',            12, NOW()),
  ('sub_mc_fw_flipflops',   'Flip-flops',     'ccat_mens_footwear', NULL, 'Casual toe-post flip-flops',        13, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUITS & FORMALWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_suit_jacket',    'Suit jackets',    'cat_mc_suits', NULL, 'Single and double-breasted suit jackets', 1,  NOW()),
  ('sub_mc_suit_pants',     'Suit pants',      'cat_mc_suits', NULL, 'Matching suit trousers',                  2,  NOW()),
  ('sub_mc_suit_full',      'Full suits',      'cat_mc_suits', NULL, 'Two-piece and three-piece full suits',    3,  NOW()),
  ('sub_mc_suit_blazer',    'Blazers',         'cat_mc_suits', NULL, 'Smart casual and formal blazers',         4,  NOW()),
  ('sub_mc_suit_sport',     'Sport coats',     'cat_mc_suits', NULL, 'Unstructured and casual sport coats',    5,  NOW()),
  ('sub_mc_suit_vest',      'Dress vests',     'cat_mc_suits', NULL, 'Waistcoats and suit vests',               6,  NOW()),
  ('sub_mc_suit_tux',       'Tuxedos',         'cat_mc_suits', NULL, 'Black-tie tuxedo suits',                  7,  NOW()),
  ('sub_mc_suit_dinner',    'Dinner jackets',  'cat_mc_suits', NULL, 'Evening dinner jackets',                  8,  NOW()),
  ('sub_mc_suit_formal_tr', 'Formal trousers', 'cat_mc_suits', NULL, 'Dress and formal trousers',               9,  NOW()),
  ('sub_mc_suit_waistcoat', 'Waistcoats',      'cat_mc_suits', NULL, 'Vest/waistcoat separate pieces',          10, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SWEATERS & KNITS
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_knit_crewneck',  'Crewneck sweaters',     'cat_mc_knitwear', NULL, 'Classic round-neck knit sweaters',   1, NOW()),
  ('sub_mc_knit_vneck',     'V-neck sweaters',        'cat_mc_knitwear', NULL, 'V-neck knit sweaters',               2, NOW()),
  ('sub_mc_knit_cardigan',  'Cardigans',              'cat_mc_knitwear', NULL, 'Open-front knit cardigans',          3, NOW()),
  ('sub_mc_knit_turtle',    'Turtlenecks',            'cat_mc_knitwear', NULL, 'High-neck roll-collar turtlenecks',  4, NOW()),
  ('sub_mc_knit_quartzip',  'Quarter-zip sweaters',   'cat_mc_knitwear', NULL, 'Zip-neck pullover sweaters',         5, NOW()),
  ('sub_mc_knit_pullover',  'Pullover sweaters',      'cat_mc_knitwear', NULL, 'Classic overhead pullover knits',    6, NOW()),
  ('sub_mc_knit_hoodie',    'Knit hoodies',           'cat_mc_knitwear', NULL, 'Hooded knit sweaters',               7, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ACTIVEWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_act_perf_tee',  'Performance t-shirts', 'cat_mc_activewear', NULL, 'Moisture-wicking performance tees',  1, NOW()),
  ('sub_mc_act_compress',  'Compression tops',     'cat_mc_activewear', NULL, 'Tight-fit compression base layers',  2, NOW()),
  ('sub_mc_act_shorts',    'Training shorts',      'cat_mc_activewear', NULL, 'Gym and running shorts',             3, NOW()),
  ('sub_mc_act_joggers',   'Joggers',              'cat_mc_activewear', NULL, 'Lightweight training joggers',       4, NOW()),
  ('sub_mc_act_trackpants','Track pants',          'cat_mc_activewear', NULL, 'Zip-leg athletic track bottoms',     5, NOW()),
  ('sub_mc_act_hoodie',    'Hoodies',              'cat_mc_activewear', NULL, 'Gym and training hoodies',           6, NOW()),
  ('sub_mc_act_sweatshirt','Sweatshirts',          'cat_mc_activewear', NULL, 'Crew-neck cotton sweatshirts',       7, NOW()),
  ('sub_mc_act_jacket',    'Athletic jackets',     'cat_mc_activewear', NULL, 'Lightweight sport and running jackets',8, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- UNDERWEAR & LOUNGEWEAR
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_uw_boxers',     'Boxers',        'cat_mc_underwear', NULL, 'Loose-fit boxer shorts',              1, NOW()),
  ('sub_mc_uw_briefs',     'Briefs',        'cat_mc_underwear', NULL, 'Classic briefs underwear',            2, NOW()),
  ('sub_mc_uw_boxbrief',   'Boxer briefs',  'cat_mc_underwear', NULL, 'Fitted boxer-brief underwear',        3, NOW()),
  ('sub_mc_uw_trunks',     'Trunks',        'cat_mc_underwear', NULL, 'Short-leg trunk underwear',           4, NOW()),
  ('sub_mc_uw_undershirt', 'Undershirts',   'cat_mc_underwear', NULL, 'Crew and V-neck undershirts',         5, NOW()),
  ('sub_mc_uw_pjset',      'Pajama sets',   'cat_mc_underwear', NULL, 'Matching top and pants pajama sets',  6, NOW()),
  ('sub_mc_uw_loungepants','Lounge pants',  'cat_mc_underwear', NULL, 'Relaxed cotton lounge trousers',      7, NOW()),
  ('sub_mc_uw_sleepshorts','Sleep shorts',  'cat_mc_underwear', NULL, 'Comfortable sleep shorts',            8, NOW()),
  ('sub_mc_uw_robes',      'Robes',         'cat_mc_underwear', NULL, 'Dressing gowns and bath robes',       9, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ACCESSORIES
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_acc_hats',      'Hats & caps',      'cat_mc_accessories', NULL, 'Baseball caps, beanies, and sun hats', 1,  NOW()),
  ('sub_mc_acc_scarves',   'Scarves',           'cat_mc_accessories', NULL, 'Neck scarves and wraps',               2,  NOW()),
  ('sub_mc_acc_gloves',    'Gloves',            'cat_mc_accessories', NULL, 'Winter and fashion gloves',            3,  NOW()),
  ('sub_mc_acc_socks',     'Socks',             'cat_mc_accessories', NULL, 'Everyday and dress socks',             4,  NOW()),
  ('sub_mc_acc_ties',      'Ties',              'cat_mc_accessories', NULL, 'Silk and woven neckties',              5,  NOW()),
  ('sub_mc_acc_bowtie',    'Bow ties',          'cat_mc_accessories', NULL, 'Formal and casual bow ties',           6,  NOW()),
  ('sub_mc_acc_pocket',    'Pocket squares',    'cat_mc_accessories', NULL, 'Suit pocket handkerchiefs',            7,  NOW()),
  ('sub_mc_acc_belts',     'Belts',             'cat_mc_accessories', NULL, 'Leather and fabric belts',             8,  NOW()),
  ('sub_mc_acc_bags',      'Bags & backpacks',  'cat_mc_accessories', NULL, 'Totes, backpacks, and messenger bags', 9,  NOW()),
  ('sub_mc_acc_watches',   'Watches',           'cat_mc_accessories', NULL, 'Fashion and dress watches',            10, NOW()),
  ('sub_mc_acc_sunglasses','Sunglasses',        'cat_mc_accessories', NULL, 'Fashion and sport sunglasses',         11, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SPECIALTY & SEASONAL
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_sp_rainwear',  'Rainwear',          'cat_mc_specialty', NULL, 'Waterproof rain jackets and ponchos',  1, NOW()),
  ('sub_mc_sp_snow',      'Snow gear',         'cat_mc_specialty', NULL, 'Insulated snow and ski wear',          2, NOW()),
  ('sub_mc_sp_workwear',  'Workwear',          'cat_mc_specialty', NULL, 'Heavy-duty workwear and overalls',     3, NOW()),
  ('sub_mc_sp_uniforms',  'Uniforms',          'cat_mc_specialty', NULL, 'Occupational and school uniforms',     4, NOW()),
  ('sub_mc_sp_safety',    'Safety apparel',    'cat_mc_specialty', NULL, 'Hi-vis vests and safety clothing',     5, NOW()),
  ('sub_mc_sp_bigtall',   'Big & tall',        'cat_mc_specialty', NULL, 'Extended sizing for big and tall men', 6, NOW()),
  ('sub_mc_sp_adaptive',  'Adaptive clothing', 'cat_mc_specialty', NULL, 'Accessible adaptive clothing designs', 7, NOW())
ON CONFLICT (id) DO NOTHING;
