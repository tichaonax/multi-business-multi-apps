-- =============================================================================
-- Migration 00008: Canonical Taxonomy — Universal Domains + Clothing
-- =============================================================================
-- Purpose:
--   1. Add universal domains (Stationery & School Supplies, Baby & Infant).
--   2. Remap grocery stationery + baby items to the new universal categories.
--   3. Deactivate old grocery stationery + baby categories.
--   4. Replace clothing taxonomy: rename old domains, insert canonical
--      10-domain/33-category structure, remap 1075 live products, clean up old.
-- =============================================================================


-- ============================================================
-- SECTION 1: Universal Domain — Stationery & School Supplies
-- ============================================================

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('dom_univ_stationery', 'Stationery & School Supplies', '📚',
   'Writing instruments, paper and desk accessories — shared across grocery, retail and clothing',
   'universal', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  ('cat_univ_writing', 'Writing Instruments', 'Pens, pencils, markers and highlighters', '✏️', '#3B82F6', 'universal', 'dom_univ_stationery', NULL, true, false, 1, NOW(), NOW()),
  ('cat_univ_paper',   'Paper Products',      'Exercise books, A4 paper, notebooks',      '📄', '#2563EB', 'universal', 'dom_univ_stationery', NULL, true, false, 2, NOW(), NOW()),
  ('cat_univ_desk_acc','Desk Accessories',    'Staplers, scissors, tape, rulers',         '📎', '#1D4ED8', 'universal', 'dom_univ_stationery', NULL, true, false, 3, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  ('subcat_univ_ballpoint', 'cat_univ_writing', 'Ballpoint Pens',         '🖊️', 'Biro, ballpoint and retractable pens',       false, false, 1, NOW()),
  ('subcat_univ_pencils',   'cat_univ_writing', 'Pencils',                '✏️', 'HB, 2B pencils and mechanical pencils',      false, false, 2, NOW()),
  ('subcat_univ_markers',   'cat_univ_writing', 'Markers & Highlighters', '🖍️', 'Permanent markers, highlighters, felt pens', false, false, 3, NOW()),
  ('subcat_univ_ex_books',  'cat_univ_paper',   'Exercise Books',         '📓', 'Ruled, blank and graph exercise books',       false, false, 1, NOW()),
  ('subcat_univ_a4_paper',  'cat_univ_paper',   'A4 Printing Paper',      '📄', 'Reams of A4 and A3 paper',                   false, false, 2, NOW()),
  ('subcat_univ_notebooks', 'cat_univ_paper',   'Notebooks & Jotters',    '📔', 'Spiral, hardcover and softcover notebooks',  false, false, 3, NOW()),
  ('subcat_univ_staplers',  'cat_univ_desk_acc','Staplers & Punches',     '📎', 'Staplers, hole punchers and staples',         false, false, 1, NOW()),
  ('subcat_univ_tape_glue', 'cat_univ_desk_acc','Tape & Glue',            '🔧', 'Sellotape, masking tape, Pritt stick',        false, false, 2, NOW()),
  ('subcat_univ_rulers',    'cat_univ_desk_acc','Rulers & Scissors',      '✂️', 'Plastic rulers, stainless scissors',          false, false, 3, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;


-- ============================================================
-- SECTION 2: Universal Domain — Baby & Infant
-- ============================================================

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('dom_univ_baby', 'Baby & Infant', '👶',
   'Nappies, baby food, baby care and infant clothing — shared across grocery, clothing and retail',
   'universal', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  ('cat_univ_baby_nappies', 'Nappies & Wipes',  'Disposable nappies, training pants and baby wipes', '🍼', '#FCA5A5', 'universal', 'dom_univ_baby', NULL, true, false, 1, NOW(), NOW()),
  ('cat_univ_baby_food',    'Baby Food',         'Purees, cereals, formula and first foods',          '🥣', '#FDBA74', 'universal', 'dom_univ_baby', NULL, true, false, 2, NOW(), NOW()),
  ('cat_univ_baby_care',    'Baby Care',         'Baby powder, lotion, shampoo and wash',             '🛁', '#FDE68A', 'universal', 'dom_univ_baby', NULL, true, false, 3, NOW(), NOW()),
  ('cat_univ_baby_clothing','Baby Clothing',     'Onesies, sleepers, hats and infant wear',           '👕', '#FCA5A5', 'universal', 'dom_univ_baby', NULL, true, false, 4, NOW(), NOW()),
  ('cat_univ_baby_acc',     'Baby Accessories',  'Swaddles, blankets, bibs and booties',              '🧷', '#FCD34D', 'universal', 'dom_univ_baby', NULL, true, false, 5, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  ('subcat_univ_nappies_d',  'cat_univ_baby_nappies', 'Disposable Nappies',    '🍼', 'Newborn to toddler nappy sizes',           false, false, 1, NOW()),
  ('subcat_univ_baby_wipes', 'cat_univ_baby_nappies', 'Baby Wipes',            '🧻', 'Sensitive, unscented and fragrant wipes',  false, false, 2, NOW()),
  ('subcat_univ_formula',    'cat_univ_baby_food',    'Baby Formula & Milk',   '🍼', 'Infant formula and follow-on milk',        false, false, 1, NOW()),
  ('subcat_univ_baby_cereal','cat_univ_baby_food',    'Baby Cereal & Puree',   '🥣', 'Baby porridge, purees and first foods',    false, false, 2, NOW()),
  ('subcat_univ_baby_powder','cat_univ_baby_care',    'Baby Powder & Lotion',  '🧴', 'Baby powder, lotion and moisturisers',     false, false, 1, NOW()),
  ('subcat_univ_baby_shamp', 'cat_univ_baby_care',    'Baby Shampoo & Wash',   '🚿', 'Gentle baby shampoo and body wash',        false, false, 2, NOW()),
  ('subcat_univ_onesies',    'cat_univ_baby_clothing','Onesies & Bodysuits',   '👕', 'Short and long-sleeve onesies',            false, false, 1, NOW()),
  ('subcat_univ_sleepers',   'cat_univ_baby_clothing','Sleepers & Pyjamas',    '🌙', 'Baby sleeping suits and pyjamas',          false, false, 2, NOW()),
  ('subcat_univ_swaddles',   'cat_univ_baby_acc',     'Swaddles & Blankets',   '🧷', 'Muslin swaddles and baby blankets',        false, false, 1, NOW()),
  ('subcat_univ_bibs',       'cat_univ_baby_acc',     'Bibs & Burp Cloths',    '🍼', 'Cotton bibs and burp cloths',              false, false, 2, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;


-- ============================================================
-- SECTION 3: Remap grocery stationery items → universal
-- ============================================================

UPDATE barcode_inventory_items SET "subcategoryId" = NULL
WHERE "categoryId" IN ('cat_groc_writing', 'cat_groc_paper', 'cat_groc_desk_acc');

UPDATE barcode_inventory_items SET "categoryId" = 'cat_univ_writing'  WHERE "categoryId" = 'cat_groc_writing';
UPDATE barcode_inventory_items SET "categoryId" = 'cat_univ_paper'    WHERE "categoryId" = 'cat_groc_paper';
UPDATE barcode_inventory_items SET "categoryId" = 'cat_univ_desk_acc' WHERE "categoryId" = 'cat_groc_desk_acc';

UPDATE business_products SET "categoryId" = 'cat_univ_writing'  WHERE "categoryId" = 'cat_groc_writing';
UPDATE business_products SET "categoryId" = 'cat_univ_paper'    WHERE "categoryId" = 'cat_groc_paper';
UPDATE business_products SET "categoryId" = 'cat_univ_desk_acc' WHERE "categoryId" = 'cat_groc_desk_acc';


-- ============================================================
-- SECTION 4: Remap grocery baby items → universal
-- ============================================================

UPDATE barcode_inventory_items SET "subcategoryId" = NULL
WHERE "categoryId" IN ('cat_groc_nappies', 'cat_groc_baby_food', 'cat_groc_baby_care');

UPDATE barcode_inventory_items SET "categoryId" = 'cat_univ_baby_nappies' WHERE "categoryId" = 'cat_groc_nappies';
UPDATE barcode_inventory_items SET "categoryId" = 'cat_univ_baby_food'    WHERE "categoryId" = 'cat_groc_baby_food';
UPDATE barcode_inventory_items SET "categoryId" = 'cat_univ_baby_care'    WHERE "categoryId" = 'cat_groc_baby_care';

UPDATE business_products SET "categoryId" = 'cat_univ_baby_nappies' WHERE "categoryId" = 'cat_groc_nappies';
UPDATE business_products SET "categoryId" = 'cat_univ_baby_food'    WHERE "categoryId" = 'cat_groc_baby_food';
UPDATE business_products SET "categoryId" = 'cat_univ_baby_care'    WHERE "categoryId" = 'cat_groc_baby_care';


-- ============================================================
-- SECTION 5: Deactivate remapped grocery stationery + baby categories
-- ============================================================

UPDATE business_categories SET "isActive" = false
WHERE id IN (
  'cat_groc_writing', 'cat_groc_paper', 'cat_groc_desk_acc',
  'cat_groc_nappies', 'cat_groc_baby_food', 'cat_groc_baby_care'
);


-- ============================================================
-- SECTION 6: Clothing — Rename old domains to free up name uniqueness
-- Old domains like "Footwear" conflict with new "Footwear" on (name, businessType).
-- Renaming with suffix allows new inserts; old records are deleted afterwards.
-- ============================================================

UPDATE inventory_domains
SET name = name || ' (legacy)'
WHERE "businessType" = 'clothing'
  AND id NOT LIKE 'cdom_%';


-- ============================================================
-- SECTION 7: Clothing canonical taxonomy — 10 Domains
-- ============================================================

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('cdom_apparel',    'Apparel',               '👕', 'General clothing: tops, bottoms, dresses and outerwear',     'clothing', true, true, NOW()),
  ('cdom_mens',       'Men''s Clothing',        '👔', 'Clothing and footwear for men',                              'clothing', true, true, NOW()),
  ('cdom_womens',     'Women''s Clothing',      '👗', 'Clothing and footwear for women',                            'clothing', true, true, NOW()),
  ('cdom_kids',       'Kids Clothing',          '🧒', 'Clothing for boys, girls and infants',                       'clothing', true, true, NOW()),
  ('cdom_baby_wear',  'Baby Wear',              '🍼', 'Newborn and baby essentials and accessories',                'clothing', true, true, NOW()),
  ('cdom_footwear',   'Footwear',               '👟', 'Casual, formal and sports shoes for all',                   'clothing', true, true, NOW()),
  ('cdom_accessories','Accessories',            '🧢', 'Headwear, bags, belts and fashion accessories',             'clothing', true, true, NOW()),
  ('cdom_intimates',  'Intimates & Sleepwear',  '🩱', 'Underwear, bras and sleepwear',                             'clothing', true, true, NOW()),
  ('cdom_activewear', 'Activewear',             '🏋️', 'Sportswear and athleisure clothing',                        'clothing', true, true, NOW()),
  ('cdom_specialty',  'Specialty Clothing',     '🧵', 'Cultural wear, workwear and formal event clothing',         'clothing', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- Clothing Categories
INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  -- Apparel
  ('ccat_tops',           'Tops',               'T-Shirts, polos, blouses, hoodies and sweatshirts',  '👚', '#3B82F6', 'clothing', 'cdom_apparel',    NULL, true, false, 1, NOW(), NOW()),
  ('ccat_bottoms',        'Bottoms',            'Jeans, pants, shorts, skirts and leggings',          '👖', '#2563EB', 'clothing', 'cdom_apparel',    NULL, true, false, 2, NOW(), NOW()),
  ('ccat_dresses',        'Dresses & Sets',     'Casual, formal and maxi dresses; matching sets',     '👗', '#7C3AED', 'clothing', 'cdom_apparel',    NULL, true, false, 3, NOW(), NOW()),
  ('ccat_outerwear',      'Outerwear',          'Coats, jackets, blazers, vests and raincoats',       '🧥', '#6D28D9', 'clothing', 'cdom_apparel',    NULL, true, false, 4, NOW(), NOW()),
  -- Men's
  ('ccat_mens_tops',      'Men''s Tops',        'T-Shirts, polo shirts, dress shirts, hoodies',      '👕', '#1D4ED8', 'clothing', 'cdom_mens',       NULL, true, false, 1, NOW(), NOW()),
  ('ccat_mens_bottoms',   'Men''s Bottoms',     'Jeans, dress pants, shorts, joggers',               '👖', '#1E40AF', 'clothing', 'cdom_mens',       NULL, true, false, 2, NOW(), NOW()),
  ('ccat_mens_outerwear', 'Men''s Outerwear',   'Jackets, coats, blazers and vests',                 '🧥', '#1E3A8A', 'clothing', 'cdom_mens',       NULL, true, false, 3, NOW(), NOW()),
  ('ccat_mens_footwear',  'Men''s Footwear',    'Sneakers, dress shoes, boots and sandals',          '👞', '#1D4ED8', 'clothing', 'cdom_mens',       NULL, true, false, 4, NOW(), NOW()),
  -- Women's
  ('ccat_womens_tops',    'Women''s Tops',      'Blouses, T-Shirts, sweaters, cardigans, hoodies',   '👚', '#DB2777', 'clothing', 'cdom_womens',     NULL, true, false, 1, NOW(), NOW()),
  ('ccat_womens_bottoms', 'Women''s Bottoms',   'Jeans, pants, shorts, skirts, leggings, joggers',   '👖', '#BE185D', 'clothing', 'cdom_womens',     NULL, true, false, 2, NOW(), NOW()),
  ('ccat_womens_dresses', 'Women''s Dresses',   'Casual, formal, maxi, midi, mini and party dresses','👗', '#9D174D', 'clothing', 'cdom_womens',     NULL, true, false, 3, NOW(), NOW()),
  ('ccat_womens_outer',   'Women''s Outerwear', 'Coats, jackets, blazers, vests and raincoats',      '🧥', '#831843', 'clothing', 'cdom_womens',     NULL, true, false, 4, NOW(), NOW()),
  ('ccat_womens_footwear','Women''s Footwear',  'Heels, sneakers, flats, boots and sandals',         '👠', '#DB2777', 'clothing', 'cdom_womens',     NULL, true, false, 5, NOW(), NOW()),
  -- Kids
  ('ccat_boys',           'Boys Clothing',      'T-Shirts, polo shirts, jeans, shorts, hoodies',     '🧒', '#0D9488', 'clothing', 'cdom_kids',       NULL, true, false, 1, NOW(), NOW()),
  ('ccat_girls',          'Girls Clothing',     'Tops, dresses, jeans, skirts, shorts, jackets',     '👧', '#0F766E', 'clothing', 'cdom_kids',       NULL, true, false, 2, NOW(), NOW()),
  ('ccat_infant',         'Infant Clothing',    'Onesies, bodysuits, sleepers, hats and mittens',    '🍼', '#115E59', 'clothing', 'cdom_kids',       NULL, true, false, 3, NOW(), NOW()),
  -- Baby Wear
  ('ccat_newborn',        'Newborn Essentials', 'Onesies, sleepers, caps, mittens and socks',        '👕', '#FCA5A5', 'clothing', 'cdom_baby_wear',  NULL, true, false, 1, NOW(), NOW()),
  ('ccat_baby_acc_clth',  'Baby Accessories',   'Swaddles, blankets, hats and booties',              '🧷', '#FCD34D', 'clothing', 'cdom_baby_wear',  NULL, true, false, 2, NOW(), NOW()),
  -- Footwear
  ('ccat_casual_shoes',   'Casual Shoes',       'Sneakers, slip-ons, sandals, boots and flats',      '👟', '#92400E', 'clothing', 'cdom_footwear',   NULL, true, false, 1, NOW(), NOW()),
  ('ccat_formal_shoes',   'Formal Shoes',       'Dress shoes, heels, loafers and oxfords',           '👞', '#78716C', 'clothing', 'cdom_footwear',   NULL, true, false, 2, NOW(), NOW()),
  ('ccat_sports_shoes',   'Sports Shoes',       'Running shoes, basketball, training and hiking',    '🏃', '#57534E', 'clothing', 'cdom_footwear',   NULL, true, false, 3, NOW(), NOW()),
  -- Accessories
  ('ccat_headwear',       'Headwear',           'Caps, hats, beanies and headscarves',               '🧢', '#D97706', 'clothing', 'cdom_accessories',NULL, true, false, 1, NOW(), NOW()),
  ('ccat_wearable_acc',   'Wearable Accessories','Gloves, scarves, socks, shawls and tights',       '🧤', '#B45309', 'clothing', 'cdom_accessories',NULL, true, false, 2, NOW(), NOW()),
  ('ccat_bags',           'Bags',               'Handbags, backpacks, travel bags and clutches',     '👜', '#92400E', 'clothing', 'cdom_accessories',NULL, true, false, 3, NOW(), NOW()),
  ('ccat_fashion_acc',    'Fashion Accessories','Sunglasses, watches, jewellery and belts',          '💍', '#78716C', 'clothing', 'cdom_accessories',NULL, true, false, 4, NOW(), NOW()),
  -- Intimates
  ('ccat_underwear',      'Underwear',          'Briefs, boxers, bras, undershirts and socks',       '🩲', '#6366F1', 'clothing', 'cdom_intimates',  NULL, true, false, 1, NOW(), NOW()),
  ('ccat_sleepwear',      'Sleepwear',          'Pyjamas, nightgowns, sleep socks and robes',        '😴', '#7C3AED', 'clothing', 'cdom_intimates',  NULL, true, false, 2, NOW(), NOW()),
  -- Activewear
  ('ccat_sportswear',     'Sportswear',         'Gym shorts, training shirts, track pants',          '🩳', '#16A34A', 'clothing', 'cdom_activewear', NULL, true, false, 1, NOW(), NOW()),
  ('ccat_athleisure',     'Athleisure',         'Joggers, sweat tees, hoodies, leggings and caps',   '🧘', '#15803D', 'clothing', 'cdom_activewear', NULL, true, false, 2, NOW(), NOW()),
  -- Specialty
  ('ccat_cultural_wear',  'Cultural Wear',      'Hijabs, traditional garments, embroidered wear',    '🕌', '#9333EA', 'clothing', 'cdom_specialty',  NULL, true, false, 1, NOW(), NOW()),
  ('ccat_workwear',       'Workwear',           'Uniforms, aprons, work pants, safety boots',        '🥼', '#7E22CE', 'clothing', 'cdom_specialty',  NULL, true, false, 2, NOW(), NOW()),
  ('ccat_formal_wear',    'Formal & Event Wear','Suits, evening gowns, dress shirts, formal shoes',  '🎓', '#6B21A8', 'clothing', 'cdom_specialty',  NULL, true, false, 3, NOW(), NOW())

ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- Clothing Subcategories
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  ('csub_tshirts',          'ccat_tops',          'T-Shirts',              '👕', 'Round neck, V-neck and graphic tees',         false, false, 1, NOW()),
  ('csub_polos',            'ccat_tops',          'Polo Shirts',           '👔', 'Classic and sport polo shirts',               false, false, 2, NOW()),
  ('csub_blouses',          'ccat_tops',          'Blouses & Button-Ups',  '👚', 'Blouses and button-down shirts',              false, false, 3, NOW()),
  ('csub_hoodies',          'ccat_tops',          'Hoodies & Sweatshirts', '🧥', 'Zip-up and pull-over hoodies',                false, false, 4, NOW()),
  ('csub_jeans',            'ccat_bottoms',       'Jeans',                 '👖', 'Skinny, straight, bootcut and mom jeans',     false, false, 1, NOW()),
  ('csub_shorts',           'ccat_bottoms',       'Shorts',                '🩳', 'Casual, cargo and sport shorts',              false, false, 2, NOW()),
  ('csub_leggings',         'ccat_bottoms',       'Leggings & Joggers',    '🩳', 'High-waist leggings and jogger pants',        false, false, 3, NOW()),
  ('csub_casual_dresses',   'ccat_dresses',       'Casual Dresses',        '👗', 'Day dresses and sundresses',                  false, false, 1, NOW()),
  ('csub_formal_dresses',   'ccat_dresses',       'Formal Dresses',        '👗', 'Evening gowns and formal wear',               false, false, 2, NOW()),
  ('csub_jumpsuits',        'ccat_dresses',       'Jumpsuits & Rompers',   '👘', 'One-piece jumpsuits and rompers',             false, false, 3, NOW()),
  ('csub_mens_tees',        'ccat_mens_tops',     'T-Shirts',              '👕', 'Classic and graphic T-Shirts',                false, false, 1, NOW()),
  ('csub_mens_dress_shirts','ccat_mens_tops',     'Dress Shirts',          '👔', 'Formal and casual dress shirts',              false, false, 2, NOW()),
  ('csub_mens_sweaters',    'ccat_mens_tops',     'Sweaters & Hoodies',    '🧥', 'Knit sweaters and hooded sweatshirts',        false, false, 3, NOW()),
  ('csub_mens_jeans',       'ccat_mens_bottoms',  'Jeans',                 '👖', 'Straight, slim and tapered jeans',            false, false, 1, NOW()),
  ('csub_mens_trousers',    'ccat_mens_bottoms',  'Trousers & Chinos',     '👖', 'Dress trousers and chino pants',              false, false, 2, NOW()),
  ('csub_mens_shorts',      'ccat_mens_bottoms',  'Shorts',                '🩳', 'Casual and sports shorts',                   false, false, 3, NOW()),
  ('csub_wom_blouses',      'ccat_womens_tops',   'Blouses',               '👚', 'Casual and formal blouses',                   false, false, 1, NOW()),
  ('csub_wom_tees',         'ccat_womens_tops',   'T-Shirts & Tanks',      '👕', 'Graphic tees and tank tops',                  false, false, 2, NOW()),
  ('csub_wom_cardigans',    'ccat_womens_tops',   'Cardigans & Sweaters',  '🧥', 'Knit cardigans and sweaters',                 false, false, 3, NOW()),
  ('csub_wom_jeans',        'ccat_womens_bottoms','Jeans',                 '👖', 'Skinny, bootcut and wide-leg jeans',          false, false, 1, NOW()),
  ('csub_wom_skirts',       'ccat_womens_bottoms','Skirts',                '👗', 'Mini, midi and maxi skirts',                  false, false, 2, NOW()),
  ('csub_wom_leggings',     'ccat_womens_bottoms','Leggings',              '🩳', 'High-waist and sport leggings',               false, false, 3, NOW()),
  ('csub_boys_tees',        'ccat_boys',          'T-Shirts & Tops',       '👕', 'Graphic tees and polo shirts for boys',       false, false, 1, NOW()),
  ('csub_boys_bottoms',     'ccat_boys',          'Shorts & Jeans',        '👖', 'Cargo shorts, jeans and track pants',         false, false, 2, NOW()),
  ('csub_girls_dresses',    'ccat_girls',         'Dresses & Skirts',      '👗', 'Casual dresses and skirts for girls',         false, false, 1, NOW()),
  ('csub_girls_tops',       'ccat_girls',         'Tops & Shirts',         '👚', 'T-Shirts, blouses and polo shirts',           false, false, 2, NOW()),
  ('csub_infant_onesies',   'ccat_infant',        'Onesies & Bodysuits',   '👕', 'Short and long-sleeve infant onesies',        false, false, 1, NOW()),
  ('csub_infant_sleepers',  'ccat_infant',        'Sleepers & Growbags',   '🌙', 'Baby sleeping suits',                         false, false, 2, NOW()),
  ('csub_sneakers',         'ccat_casual_shoes',  'Sneakers',              '👟', 'Canvas, leather and running-style sneakers',  false, false, 1, NOW()),
  ('csub_sandals',          'ccat_casual_shoes',  'Sandals & Flip-Flops',  '🩴', 'Open-toe sandals and flip-flops',             false, false, 2, NOW()),
  ('csub_boots',            'ccat_casual_shoes',  'Boots',                 '🥾', 'Ankle, knee-high and combat boots',           false, false, 3, NOW()),
  ('csub_dress_shoes',      'ccat_formal_shoes',  'Dress Shoes',           '👞', 'Oxfords, loafers and brogues',                false, false, 1, NOW()),
  ('csub_heels',            'ccat_formal_shoes',  'Heels & Pumps',         '👠', 'Block, stiletto and kitten heels',            false, false, 2, NOW()),
  ('csub_handbags',         'ccat_bags',          'Handbags',              '👜', 'Leather and fabric handbags',                 false, false, 1, NOW()),
  ('csub_backpacks',        'ccat_bags',          'Backpacks',             '🎒', 'School, fashion and travel backpacks',        false, false, 2, NOW()),
  ('csub_clutches',         'ccat_bags',          'Clutches & Evening Bags','👝','Evening clutches and mini bags',              false, false, 3, NOW()),
  ('csub_caps',             'ccat_headwear',      'Caps & Snapbacks',      '🧢', 'Baseball caps and snapback hats',             false, false, 1, NOW()),
  ('csub_beanies',          'ccat_headwear',      'Beanies & Bobs',        '🪖', 'Winter beanies and bobble hats',              false, false, 2, NOW()),
  ('csub_briefs_boxers',    'ccat_underwear',     'Briefs & Boxers',       '🩲', 'Men''s and women''s underwear',               false, false, 1, NOW()),
  ('csub_bras',             'ccat_underwear',     'Bras & Bralettes',      '👙', 'Push-up, sports and t-shirt bras',            false, false, 2, NOW()),
  ('csub_gym_shorts',       'ccat_sportswear',    'Gym Shorts',            '🩳', 'Training and compression shorts',             false, false, 1, NOW()),
  ('csub_training_shirts',  'ccat_sportswear',    'Training Shirts',       '👕', 'Dry-fit and moisture-wicking training tops',  false, false, 2, NOW()),
  ('csub_track_pants',      'ccat_sportswear',    'Track Pants & Joggers', '🩳', 'Running tights and track pants',              false, false, 3, NOW()),
  ('csub_uniforms',         'ccat_workwear',      'Uniforms',              '🦺', 'Work uniforms and corporate wear',            false, false, 1, NOW()),
  ('csub_aprons',           'ccat_workwear',      'Aprons',                '👕', 'Kitchen, gardening and craft aprons',         false, false, 2, NOW()),
  ('csub_suits',            'ccat_formal_wear',   'Suits & Blazers',       '🤵', 'Two-piece and three-piece suits',             false, false, 1, NOW()),
  ('csub_evening_gowns',    'ccat_formal_wear',   'Evening Gowns',         '👗', 'Ball gowns and cocktail dresses',             false, false, 2, NOW())

ON CONFLICT ("categoryId", name) DO NOTHING;


-- ============================================================
-- SECTION 8: Remap live clothing products to new canonical categories
-- Maps by the old domain of each product's current category.
-- New categories (ccat_*) must exist before this runs (inserted above).
-- ============================================================

-- Null out subcategoryIds first (old subcategories will be deleted with old categories)
UPDATE business_products bp
SET "subcategoryId" = NULL
FROM business_categories bc
WHERE bp."categoryId" = bc.id
  AND bc."businessType" = 'clothing'
  AND bc."businessId" IS NULL
  AND bc.id NOT LIKE 'ccat_%';

-- Remap business_products categoryId based on old domain patterns
UPDATE business_products bp
SET "categoryId" = CASE
  WHEN bc."domainId" = 'domain_clothing_mens'        THEN 'ccat_mens_tops'
  WHEN bc."domainId" = 'domain_clothing_womens'      THEN 'ccat_womens_tops'
  WHEN bc."domainId" = 'domain_clothing_boys'        THEN 'ccat_boys'
  WHEN bc."domainId" = 'domain_clothing_girls'       THEN 'ccat_girls'
  WHEN bc."domainId" = 'domain_clothing_baby'        THEN 'ccat_infant'
  WHEN bc."domainId" = 'domain_clothing_footwear'    THEN 'ccat_casual_shoes'
  WHEN bc."domainId" = 'domain_clothing_accessories' THEN 'ccat_fashion_acc'
  WHEN bc."domainId" = 'domain_clothing_sportswear'  THEN 'ccat_sportswear'
  WHEN bc."domainId" = 'domain_clothing_underwear'   THEN 'ccat_underwear'
  WHEN bc."domainId" = 'domain_clothing_nightwear'   THEN 'ccat_sleepwear'
  WHEN bc."domainId" = 'domain_clothing_workwear'    THEN 'ccat_workwear'
  WHEN bc."domainId" = 'domain_clothing_schoolwear'  THEN 'ccat_workwear'
  WHEN bc."domainId" = 'domain_clothing_bags'        THEN 'ccat_bags'
  WHEN bc."domainId" = 'domain_clothing_hats'        THEN 'ccat_headwear'
  WHEN bc."domainId" = 'domain_clothing_jewellery'   THEN 'ccat_fashion_acc'
  WHEN bc."domainId" = 'domain_clothing_eyewear'     THEN 'ccat_fashion_acc'
  WHEN bc."domainId" = 'domain_clothing_belts'       THEN 'ccat_wearable_acc'
  WHEN bc."domainId" = 'domain_clothing_scarves'     THEN 'ccat_wearable_acc'
  WHEN bc."domainId" = 'domain_clothing_outerwear'   THEN 'ccat_outerwear'
  WHEN bc."domainId" = 'domain_clothing_kids'        THEN 'ccat_boys'
  WHEN bc."domainId" = 'domain_clothing_maternity'   THEN 'ccat_womens_tops'
  WHEN bc."domainId" = 'domain_clothing_plussize'    THEN 'ccat_womens_tops'
  WHEN bc."domainId" = 'domain_clothing_swimwear'    THEN 'ccat_sportswear'
  ELSE 'ccat_tops'   -- catch-all: vintage, seasonal, home_textiles, general_merch, toys, beauty, etc.
END
FROM business_categories bc
WHERE bp."categoryId" = bc.id
  AND bc."businessType" = 'clothing'
  AND bc."businessId" IS NULL
  AND bc.id NOT LIKE 'ccat_%';

-- Also remap barcode_inventory_items for clothing
UPDATE barcode_inventory_items bi
SET "subcategoryId" = NULL
FROM business_categories bc
WHERE bi."categoryId" = bc.id
  AND bc."businessType" = 'clothing'
  AND bc."businessId" IS NULL
  AND bc.id NOT LIKE 'ccat_%';

UPDATE barcode_inventory_items bi
SET "categoryId" = CASE
  WHEN bc."domainId" = 'domain_clothing_mens'        THEN 'ccat_mens_tops'
  WHEN bc."domainId" = 'domain_clothing_womens'      THEN 'ccat_womens_tops'
  WHEN bc."domainId" = 'domain_clothing_boys'        THEN 'ccat_boys'
  WHEN bc."domainId" = 'domain_clothing_girls'       THEN 'ccat_girls'
  WHEN bc."domainId" = 'domain_clothing_baby'        THEN 'ccat_infant'
  WHEN bc."domainId" = 'domain_clothing_footwear'    THEN 'ccat_casual_shoes'
  WHEN bc."domainId" = 'domain_clothing_accessories' THEN 'ccat_fashion_acc'
  WHEN bc."domainId" = 'domain_clothing_sportswear'  THEN 'ccat_sportswear'
  WHEN bc."domainId" = 'domain_clothing_underwear'   THEN 'ccat_underwear'
  WHEN bc."domainId" = 'domain_clothing_nightwear'   THEN 'ccat_sleepwear'
  WHEN bc."domainId" = 'domain_clothing_workwear'    THEN 'ccat_workwear'
  WHEN bc."domainId" = 'domain_clothing_schoolwear'  THEN 'ccat_workwear'
  WHEN bc."domainId" = 'domain_clothing_bags'        THEN 'ccat_bags'
  WHEN bc."domainId" = 'domain_clothing_hats'        THEN 'ccat_headwear'
  WHEN bc."domainId" = 'domain_clothing_jewellery'   THEN 'ccat_fashion_acc'
  WHEN bc."domainId" = 'domain_clothing_eyewear'     THEN 'ccat_fashion_acc'
  WHEN bc."domainId" = 'domain_clothing_belts'       THEN 'ccat_wearable_acc'
  WHEN bc."domainId" = 'domain_clothing_scarves'     THEN 'ccat_wearable_acc'
  WHEN bc."domainId" = 'domain_clothing_outerwear'   THEN 'ccat_outerwear'
  WHEN bc."domainId" = 'domain_clothing_kids'        THEN 'ccat_boys'
  WHEN bc."domainId" = 'domain_clothing_maternity'   THEN 'ccat_womens_tops'
  WHEN bc."domainId" = 'domain_clothing_plussize'    THEN 'ccat_womens_tops'
  WHEN bc."domainId" = 'domain_clothing_swimwear'    THEN 'ccat_sportswear'
  ELSE 'ccat_tops'
END
FROM business_categories bc
WHERE bi."categoryId" = bc.id
  AND bc."businessType" = 'clothing'
  AND bc."businessId" IS NULL
  AND bc.id NOT LIKE 'ccat_%';


-- ============================================================
-- SECTION 9: Delete old clothing categories + domains
-- All products have been remapped away from these categories.
-- inventory_subcategories cascade-delete automatically.
-- ============================================================

DELETE FROM business_categories
WHERE "businessType" = 'clothing'
  AND "businessId" IS NULL
  AND id NOT LIKE 'ccat_%'
  AND id NOT LIKE 'cat_univ_%';

-- Delete old clothing domains (now have "(legacy)" in their names)
DELETE FROM inventory_domains
WHERE "businessType" = 'clothing'
  AND id NOT LIKE 'cdom_%';
