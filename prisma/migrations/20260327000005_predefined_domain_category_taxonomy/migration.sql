-- =============================================================================
-- Migration: Predefined Domain / Category / Sub-Category Taxonomy
-- =============================================================================
-- NOTE: grocery, hardware and restaurant domains already exist in the DB.
--       This migration adds rich categories + subcategories under those existing
--       domains, and seeds full domain+category+subcategory trees for retail,
--       services and consulting (which had none).
-- =============================================================================

-- Step 1: Replace global name-unique INDEX with composite (name, businessType)
--         The original constraint is a btree index, not a CONSTRAINT.
-- =============================================================================
DROP INDEX IF EXISTS inventory_domains_name_key;

ALTER TABLE inventory_domains
  ADD CONSTRAINT inventory_domains_name_businessType_key
  UNIQUE (name, "businessType");

-- =============================================================================
-- Step 2: GROCERY — add categories to existing domains
-- (domains already exist: domain_grocery_produce, domain_grocery_dairy, etc.)
-- =============================================================================
INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  -- Fresh Produce (domain_grocery_produce)
  ('cat_groc_vegetables',    'Vegetables',           'Fresh vegetables',                '🥕', '#22C55E', 'grocery', 'domain_grocery_produce',      NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_fruits',        'Fruits',               'Fresh and seasonal fruits',        '🍎', '#F97316', 'grocery', 'domain_grocery_produce',      NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_herbs',         'Fresh Herbs',          'Fresh culinary herbs',             '🌿', '#4ADE80', 'grocery', 'domain_grocery_produce',      NULL, true, false, 3,  NOW(), NOW()),

  -- Dairy (domain_grocery_dairy)
  ('cat_groc_milk',          'Milk & Cream',         'Fresh and UHT milk, cream',        '🥛', '#A78BFA', 'grocery', 'domain_grocery_dairy',        NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_cheese',        'Cheese',               'Hard, soft and processed cheese',  '🧀', '#FDE68A', 'grocery', 'domain_grocery_dairy',        NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_eggs_butter',   'Eggs & Butter',        'Eggs, butter and margarine',       '🥚', '#FBBF24', 'grocery', 'domain_grocery_dairy',        NULL, true, false, 3,  NOW(), NOW()),
  ('cat_groc_yogurt',        'Yogurt & Desserts',    'Yogurt, custard and puddings',     '🍮', '#C084FC', 'grocery', 'domain_grocery_dairy',        NULL, true, false, 4,  NOW(), NOW()),

  -- Meat & Seafood (domain_grocery_meat)
  ('cat_groc_beef',          'Beef',                 'Fresh and frozen beef',            '🥩', '#DC2626', 'grocery', 'domain_grocery_meat',         NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_chicken',       'Chicken',              'Whole, portions and processed',    '🍗', '#EF4444', 'grocery', 'domain_grocery_meat',         NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_pork',          'Pork',                 'Chops, sausages and bacon',        '🥓', '#F87171', 'grocery', 'domain_grocery_meat',         NULL, true, false, 3,  NOW(), NOW()),
  ('cat_groc_proc_meat',     'Processed Meats',      'Polony, viennas and cold cuts',    '🌭', '#FB923C', 'grocery', 'domain_grocery_meat',         NULL, true, false, 4,  NOW(), NOW()),
  ('cat_groc_fresh_fish',    'Fresh Fish',           'Tilapia, catfish and local fish',  '🐟', '#38BDF8', 'grocery', 'domain_grocery_meat',         NULL, true, false, 5,  NOW(), NOW()),
  ('cat_groc_dried_fish',    'Dried & Salted Fish',  'Kapenta, matemba, dried fish',     '🐠', '#0EA5E9', 'grocery', 'domain_grocery_meat',         NULL, true, false, 6,  NOW(), NOW()),

  -- Bakery (domain_grocery_bakery)
  ('cat_groc_bread',         'Bread',                'Sliced, unsliced and rolls',       '🍞', '#D97706', 'grocery', 'domain_grocery_bakery',       NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_pastries',      'Pastries & Buns',      'Buns, doughnuts and croissants',   '🥐', '#F59E0B', 'grocery', 'domain_grocery_bakery',       NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_cakes',         'Cakes & Biscuits',     'Cakes, biscuits and cookies',      '🍰', '#FBBF24', 'grocery', 'domain_grocery_bakery',       NULL, true, false, 3,  NOW(), NOW()),

  -- Beverages (domain_grocery_beverages)
  ('cat_groc_soft_drinks',   'Soft Drinks',          'Carbonated, juice and energy',     '🥤', '#60A5FA', 'grocery', 'domain_grocery_beverages',    NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_water',         'Water',                'Still, sparkling and flavoured',    '💧', '#93C5FD', 'grocery', 'domain_grocery_beverages',    NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_hot_drinks',    'Hot Drinks',           'Coffee, tea and cocoa',             '☕', '#92400E', 'grocery', 'domain_grocery_beverages',    NULL, true, false, 3,  NOW(), NOW()),

  -- Alcohol (domain_grocery_alcohol)
  ('cat_groc_alcohol_beer',  'Beer & Cider',         'Lager, ale, stout and cider',      '🍺', '#818CF8', 'grocery', 'domain_grocery_alcohol',      NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_alcohol_wine',  'Wine',                 'Red, white, rosé and sparkling',   '🍷', '#6366F1', 'grocery', 'domain_grocery_alcohol',      NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_spirits',       'Spirits & Liqueur',    'Whisky, vodka, gin, rum, brandy',  '🥃', '#7C3AED', 'grocery', 'domain_grocery_alcohol',      NULL, true, false, 3,  NOW(), NOW()),

  -- Snacks (domain_grocery_snacks)
  ('cat_groc_crisps',        'Crisps & Chips',       'Potato crisps and corn chips',     '🧆', '#FCD34D', 'grocery', 'domain_grocery_snacks',       NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_chocolates',    'Chocolates & Sweets',  'Bars, lollipops and gum',           '🍫', '#A16207', 'grocery', 'domain_grocery_snacks',       NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_nuts',          'Nuts & Dried Fruit',   'Mixed nuts, peanuts, raisins',      '🥜', '#92400E', 'grocery', 'domain_grocery_snacks',       NULL, true, false, 3,  NOW(), NOW()),

  -- Grains (domain_grocery_grains)
  ('cat_groc_grains',        'Grains & Cereals',     'Rice, maize meal, oats, flour',    '🌾', '#CA8A04', 'grocery', 'domain_grocery_grains',       NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_pasta',         'Pasta & Noodles',      'Spaghetti, macaroni, noodles',     '🍝', '#EAB308', 'grocery', 'domain_grocery_grains',       NULL, true, false, 2,  NOW(), NOW()),

  -- Cooking Oils (domain_grocery_oils)
  ('cat_groc_oils',          'Cooking Oils',         'Sunflower, vegetable, olive',      '🫙', '#84CC16', 'grocery', 'domain_grocery_oils',         NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_sauces',        'Sauces & Condiments',  'Tomato sauce, mayo, mustard',      '🥫', '#16A34A', 'grocery', 'domain_grocery_oils',         NULL, true, false, 2,  NOW(), NOW()),

  -- Canned Goods (domain_grocery_canned)
  ('cat_groc_canned_goods',  'Canned Goods',         'Tomatoes, beans, sardines',        '🥫', '#15803D', 'grocery', 'domain_grocery_canned',       NULL, true, false, 1,  NOW(), NOW()),

  -- Spices (domain_grocery_spices)
  ('cat_groc_spices',        'Spices & Seasoning',   'Pepper, mixed spice, curry powder','🌶️', '#B45309', 'grocery', 'domain_grocery_spices',       NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_sugar_salt',    'Sugar & Salt',         'White, brown, icing sugar; salt',  '🧂', '#A16207', 'grocery', 'domain_grocery_spices',       NULL, true, false, 2,  NOW(), NOW()),

  -- Cleaning (domain_grocery_cleaning)
  ('cat_groc_laundry',       'Laundry',              'Detergent, softener, bleach',      '🫧', '#6366F1', 'grocery', 'domain_grocery_cleaning',     NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_dishwash',      'Dishwashing',          'Liquid, powder, tablets',           '🍽️', '#8B5CF6', 'grocery', 'domain_grocery_cleaning',     NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_surface',       'Surface Cleaners',     'Multi-surface, floor, toilet',     '🧽', '#7C3AED', 'grocery', 'domain_grocery_cleaning',     NULL, true, false, 3,  NOW(), NOW()),
  ('cat_groc_air_fresh',     'Air Fresheners',       'Sprays, plug-ins and gels',        '🌸', '#9333EA', 'grocery', 'domain_grocery_cleaning',     NULL, true, false, 4,  NOW(), NOW()),

  -- Personal Care (domain_grocery_personalcare)
  ('cat_groc_body_care',     'Body Care',            'Soap, lotion and deodorant',       '🧴', '#EC4899', 'grocery', 'domain_grocery_personalcare', NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_hair_care',     'Hair Care',            'Shampoo, conditioner, hair oil',   '💆', '#F472B6', 'grocery', 'domain_grocery_personalcare', NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_oral_care',     'Oral Care',            'Toothpaste, toothbrush, mouthwash','🦷', '#FB7185', 'grocery', 'domain_grocery_personalcare', NULL, true, false, 3,  NOW(), NOW()),
  ('cat_groc_feminine',      'Feminine Care',        'Pads, tampons and hygiene',        '🌸', '#F43F5E', 'grocery', 'domain_grocery_personalcare', NULL, true, false, 4,  NOW(), NOW()),

  -- Stationery (domain_grocery_stationery)
  ('cat_groc_writing',       'Writing Instruments',  'Pens, pencils and markers',        '✏️', '#3B82F6', 'grocery', 'domain_grocery_stationery',   NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_paper',         'Paper Products',       'Exercise books, A4 paper, notebooks','📄', '#2563EB', 'grocery', 'domain_grocery_stationery',   NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_desk_acc',      'Desk Accessories',     'Staplers, scissors, tape, rulers', '📎', '#1D4ED8', 'grocery', 'domain_grocery_stationery',   NULL, true, false, 3,  NOW(), NOW()),

  -- Pet Food (domain_grocery_petfood)
  ('cat_groc_pet_food',      'Pet Food',             'Dog food, cat food, bird seed',    '🐶', '#78716C', 'grocery', 'domain_grocery_petfood',      NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_pet_acc',       'Pet Accessories',      'Collars, toys, grooming',          '🐾', '#57534E', 'grocery', 'domain_grocery_petfood',      NULL, true, false, 2,  NOW(), NOW()),

  -- Baby (domain_grocery_baby)
  ('cat_groc_nappies',       'Nappies & Wipes',      'Disposable nappies and baby wipes','🍼', '#FCA5A5', 'grocery', 'domain_grocery_baby',         NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_baby_food',     'Baby Food',            'Purees, cereals and formula',      '🥣', '#FDBA74', 'grocery', 'domain_grocery_baby',         NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_baby_care',     'Baby Care',            'Powder, lotion, shampoo',          '🛁', '#FDE68A', 'grocery', 'domain_grocery_baby',         NULL, true, false, 3,  NOW(), NOW()),

  -- Frozen (domain_grocery_frozen)
  ('cat_groc_frozen_meals',  'Frozen Meals',         'Ready meals and convenience food', '🍱', '#BAE6FD', 'grocery', 'domain_grocery_frozen',       NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_frozen_veg',    'Frozen Vegetables',    'Frozen peas, spinach, mixed veg',  '🥦', '#A5F3FC', 'grocery', 'domain_grocery_frozen',       NULL, true, false, 2,  NOW(), NOW()),
  ('cat_groc_ice_cream',     'Ice Cream & Desserts', 'Ice cream, sorbet, frozen desserts','🍦', '#C7D2FE', 'grocery', 'domain_grocery_frozen',       NULL, true, false, 3,  NOW(), NOW()),

  -- Breakfast (domain_grocery_breakfast)
  ('cat_groc_oats',          'Oats & Cereals',       'Oats, cornflakes, muesli, granola','🥣', '#FDE68A', 'grocery', 'domain_grocery_breakfast',    NULL, true, false, 1,  NOW(), NOW()),
  ('cat_groc_spreads',       'Spreads & Jams',       'Peanut butter, jam, honey, Marmite','🍯', '#FCD34D', 'grocery', 'domain_grocery_breakfast',    NULL, true, false, 2,  NOW(), NOW())

ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- =============================================================================
-- Step 3: GROCERY subcategories
-- =============================================================================
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Vegetables
  ('subcat_groc_leafy',        'cat_groc_vegetables',   'Leafy Greens',          '🥬', 'Spinach, lettuce, cabbage, kale',           false, false, 1, NOW()),
  ('subcat_groc_root',         'cat_groc_vegetables',   'Root Vegetables',       '🥕', 'Carrots, potatoes, beetroot, sweet potato', false, false, 2, NOW()),
  ('subcat_groc_gourds',       'cat_groc_vegetables',   'Gourds & Squash',       '🎃', 'Butternut, pumpkin, marrow, courgette',     false, false, 3, NOW()),
  ('subcat_groc_onions',       'cat_groc_vegetables',   'Onions & Garlic',       '🧅', 'Onions, garlic, leeks, spring onions',      false, false, 4, NOW()),
  ('subcat_groc_tomatoes',     'cat_groc_vegetables',   'Tomatoes & Peppers',    '🍅', 'Tomatoes, peppers, chillies',               false, false, 5, NOW()),

  -- Fruits
  ('subcat_groc_citrus',       'cat_groc_fruits',       'Citrus',                '🍊', 'Oranges, lemons, limes, grapefruit',        false, false, 1, NOW()),
  ('subcat_groc_tropical',     'cat_groc_fruits',       'Tropical Fruits',       '🍍', 'Mangoes, pineapples, bananas, pawpaw',      false, false, 2, NOW()),
  ('subcat_groc_stone_fruit',  'cat_groc_fruits',       'Stone Fruits',          '🍑', 'Avocados, peaches, apricots, plums',        false, false, 3, NOW()),
  ('subcat_groc_melons',       'cat_groc_fruits',       'Melons & Grapes',       '🍇', 'Watermelon, cantaloupe, grapes',            false, false, 4, NOW()),

  -- Milk
  ('subcat_groc_fresh_milk',   'cat_groc_milk',         'Fresh Milk',            '🥛', 'Full cream, low fat, skimmed',              false, false, 1, NOW()),
  ('subcat_groc_uht_milk',     'cat_groc_milk',         'UHT Milk',              '📦', 'Long-life milk, flavoured milk',            false, false, 2, NOW()),
  ('subcat_groc_cream',        'cat_groc_milk',         'Cream & Condensed',     '🍦', 'Whipping cream, condensed milk',            false, false, 3, NOW()),

  -- Eggs & Butter
  ('subcat_groc_eggs',         'cat_groc_eggs_butter',  'Eggs',                  '🥚', 'Tray eggs, half dozen, dozen',              false, false, 1, NOW()),
  ('subcat_groc_butter',       'cat_groc_eggs_butter',  'Butter & Margarine',    '🧈', 'Butter, margarine, spreads',                false, false, 2, NOW()),

  -- Beef
  ('subcat_groc_beef_cuts',    'cat_groc_beef',         'Beef Cuts',             '🥩', 'Steak, roast, brisket, ribs',               false, false, 1, NOW()),
  ('subcat_groc_beef_mince',   'cat_groc_beef',         'Beef Mince',            '🫙', 'Lean, regular and extra lean mince',        false, false, 2, NOW()),
  ('subcat_groc_offal',        'cat_groc_beef',         'Offal',                 '🍖', 'Liver, tripe, kidneys, oxtail',             false, false, 3, NOW()),

  -- Chicken
  ('subcat_groc_whole_chick',  'cat_groc_chicken',      'Whole Chicken',         '🐔', 'Fresh and frozen whole chicken',            false, false, 1, NOW()),
  ('subcat_groc_chick_parts',  'cat_groc_chicken',      'Chicken Portions',      '🍗', 'Thighs, breasts, wings, drumsticks',        false, false, 2, NOW()),
  ('subcat_groc_chick_proc',   'cat_groc_chicken',      'Processed Chicken',     '🌭', 'Chicken sausages, polony, nuggets',         false, false, 3, NOW()),

  -- Fresh Fish
  ('subcat_groc_tilapia',      'cat_groc_fresh_fish',   'Tilapia',               '🐟', 'Fresh and chilled tilapia',                 false, false, 1, NOW()),
  ('subcat_groc_kapenta',      'cat_groc_fresh_fish',   'Kapenta',               '🐠', 'Fresh kapenta / matemba',                   false, false, 2, NOW()),
  ('subcat_groc_other_fish',   'cat_groc_fresh_fish',   'Other Fish',            '🐡', 'Bream, catfish, local varieties',           false, false, 3, NOW()),

  -- Dried Fish
  ('subcat_groc_kap_dried',    'cat_groc_dried_fish',   'Dried Kapenta',         '🐟', 'Sun-dried kapenta, matemba',                false, false, 1, NOW()),
  ('subcat_groc_salt_fish',    'cat_groc_dried_fish',   'Salted Fish',           '🧂', 'Salted and smoked fish varieties',          false, false, 2, NOW()),

  -- Bread
  ('subcat_groc_sliced_br',    'cat_groc_bread',        'Sliced Bread',          '🍞', 'White and brown sliced loaves',             false, false, 1, NOW()),
  ('subcat_groc_rolls',        'cat_groc_bread',        'Rolls & Buns',          '🥖', 'Dinner rolls, hotdog buns, sub rolls',      false, false, 2, NOW()),
  ('subcat_groc_spec_bread',   'cat_groc_bread',        'Specialty Bread',       '🥐', 'Whole wheat, rye, seeded, gluten-free',     false, false, 3, NOW()),

  -- Soft Drinks
  ('subcat_groc_carbonated',   'cat_groc_soft_drinks',  'Carbonated Drinks',     '🥤', 'Cola, Fanta, Sprite and carbonated drinks', false, false, 1, NOW()),
  ('subcat_groc_juice',        'cat_groc_soft_drinks',  'Juice & Nectar',        '🧃', 'Fruit juice, nectar, squash',               false, false, 2, NOW()),
  ('subcat_groc_energy',       'cat_groc_soft_drinks',  'Energy Drinks',         '⚡', 'Red Bull, Monster and energy drinks',       false, false, 3, NOW()),

  -- Water
  ('subcat_groc_still_w',      'cat_groc_water',        'Still Water',           '💧', 'Natural mineral and table water',           false, false, 1, NOW()),
  ('subcat_groc_sparkling_w',  'cat_groc_water',        'Sparkling Water',       '💦', 'Sparkling and carbonated water',            false, false, 2, NOW()),

  -- Hot Drinks
  ('subcat_groc_coffee',       'cat_groc_hot_drinks',   'Coffee',                '☕', 'Ground, instant and coffee pods',           false, false, 1, NOW()),
  ('subcat_groc_tea',          'cat_groc_hot_drinks',   'Tea',                   '🍵', 'Rooibos, black, green and herbal tea',      false, false, 2, NOW()),
  ('subcat_groc_cocoa',        'cat_groc_hot_drinks',   'Cocoa & Milo',          '🍫', 'Hot chocolate, Milo, drinking cocoa',       false, false, 3, NOW()),

  -- Alcohol
  ('subcat_groc_beer',         'cat_groc_alcohol_beer', 'Beer',                  '🍺', 'Lager, ale and stout',                      false, false, 1, NOW()),
  ('subcat_groc_cider',        'cat_groc_alcohol_beer', 'Cider',                 '🍻', 'Apple and pear cider',                      false, false, 2, NOW()),
  ('subcat_groc_red_wine',     'cat_groc_alcohol_wine', 'Red Wine',              '🍷', 'Cabernet, Shiraz, Merlot',                  false, false, 1, NOW()),
  ('subcat_groc_white_wine',   'cat_groc_alcohol_wine', 'White Wine',            '🥂', 'Chardonnay, Sauvignon Blanc',               false, false, 2, NOW()),
  ('subcat_groc_whisky',       'cat_groc_spirits',      'Whisky & Brandy',       '🥃', 'Scotch whisky, bourbon, brandy',            false, false, 1, NOW()),
  ('subcat_groc_vodka_gin',    'cat_groc_spirits',      'Vodka & Gin',           '🍸', 'Vodka and gin varieties',                   false, false, 2, NOW()),
  ('subcat_groc_rum',          'cat_groc_spirits',      'Rum & Other Spirits',   '🥃', 'Rum, amarula, cane spirit',                 false, false, 3, NOW()),

  -- Snacks
  ('subcat_groc_pot_crisps',   'cat_groc_crisps',       'Potato Crisps',         '🥔', 'Salted, flavoured and baked crisps',        false, false, 1, NOW()),
  ('subcat_groc_popcorn',      'cat_groc_crisps',       'Popcorn',               '🍿', 'Plain, butter and flavoured popcorn',       false, false, 2, NOW()),
  ('subcat_groc_corn_chips',   'cat_groc_crisps',       'Corn & Puffed Snacks',  '🌽', 'Corn chips, cheese puffs',                  false, false, 3, NOW()),
  ('subcat_groc_choc_bars',    'cat_groc_chocolates',   'Chocolate Bars',        '🍫', 'Cadbury, Kit Kat and chocolate blocks',     false, false, 1, NOW()),
  ('subcat_groc_sweets',       'cat_groc_chocolates',   'Sweets & Candy',        '🍬', 'Lollipops, gummies, hard candy',            false, false, 2, NOW()),
  ('subcat_groc_gum',          'cat_groc_chocolates',   'Chewing Gum',           '🫧', 'Mint, fruit and bubble gum',                false, false, 3, NOW()),
  ('subcat_groc_peanuts',      'cat_groc_nuts',         'Peanuts',               '🥜', 'Roasted, salted and plain peanuts',         false, false, 1, NOW()),
  ('subcat_groc_mixed_nuts',   'cat_groc_nuts',         'Mixed Nuts',            '🌰', 'Cashews, almonds, walnuts',                 false, false, 2, NOW()),
  ('subcat_groc_dried_fruit',  'cat_groc_nuts',         'Dried Fruit',           '🍇', 'Raisins, sultanas, cranberries, dates',     false, false, 3, NOW()),

  -- Grains
  ('subcat_groc_rice',         'cat_groc_grains',       'Rice',                  '🍚', 'Long grain, parboiled, brown rice',         false, false, 1, NOW()),
  ('subcat_groc_maize_meal',   'cat_groc_grains',       'Maize Meal & Sadza',    '🌽', 'Fine, coarse and roller meal',              false, false, 2, NOW()),
  ('subcat_groc_flour',        'cat_groc_grains',       'Flour & Baking',        '🫙', 'Plain flour, self-raising, baking powder',  false, false, 3, NOW()),
  ('subcat_groc_oats_cereal',  'cat_groc_grains',       'Oats & Breakfast Cereals','🥣','Oats, cornflakes, muesli',                 false, false, 4, NOW()),
  ('subcat_groc_spaghetti',    'cat_groc_pasta',        'Spaghetti & Macaroni',  '🍝', 'Spaghetti, penne, macaroni',                false, false, 1, NOW()),
  ('subcat_groc_noodles',      'cat_groc_pasta',        'Noodles',               '🍜', 'Instant and dried noodles',                 false, false, 2, NOW()),

  -- Oils & Sauces
  ('subcat_groc_sunfl_oil',    'cat_groc_oils',         'Sunflower Oil',         '🌻', 'Sunflower cooking oil',                     false, false, 1, NOW()),
  ('subcat_groc_veg_oil',      'cat_groc_oils',         'Vegetable & Blended Oil','🫙', 'Blended vegetable cooking oil',            false, false, 2, NOW()),
  ('subcat_groc_olive_oil',    'cat_groc_oils',         'Olive Oil',             '🫒', 'Extra virgin and light olive oil',          false, false, 3, NOW()),
  ('subcat_groc_tomato_sc',    'cat_groc_sauces',       'Tomato Sauce & Paste',  '🍅', 'Tomato sauce, ketchup, paste, puree',       false, false, 1, NOW()),
  ('subcat_groc_mayo',         'cat_groc_sauces',       'Mayonnaise & Dressings','🥗', 'Mayo, salad dressing, vinaigrette',         false, false, 2, NOW()),
  ('subcat_groc_stock',        'cat_groc_sauces',       'Stock & Gravy',         '🍲', 'Stock cubes, gravy powder, bouillon',       false, false, 3, NOW()),

  -- Canned Goods
  ('subcat_groc_can_tomatoes', 'cat_groc_canned_goods', 'Canned Tomatoes',       '🍅', 'Chopped, whole and crushed tomatoes',       false, false, 1, NOW()),
  ('subcat_groc_can_beans',    'cat_groc_canned_goods', 'Canned Beans & Lentils','🫘', 'Baked beans, chickpeas, lentils',           false, false, 2, NOW()),
  ('subcat_groc_can_fish',     'cat_groc_canned_goods', 'Canned Fish',           '🐟', 'Sardines, tuna, pilchards, salmon',         false, false, 3, NOW()),
  ('subcat_groc_can_meat',     'cat_groc_canned_goods', 'Canned Meat',           '🥫', 'Corned beef, spam, canned chicken',         false, false, 4, NOW()),

  -- Spices & Sugar
  ('subcat_groc_spices_mix',   'cat_groc_spices',       'Spices & Seasoning',    '🌶️', 'Pepper, mixed spice, curry powder',         false, false, 1, NOW()),
  ('subcat_groc_white_sugar',  'cat_groc_sugar_salt',   'Sugar',                 '🍬', 'White, brown, icing and castor sugar',      false, false, 1, NOW()),
  ('subcat_groc_salt_fine',    'cat_groc_sugar_salt',   'Salt',                  '🧂', 'Table salt, rock salt, sea salt',           false, false, 2, NOW()),

  -- Cleaning
  ('subcat_groc_laundry_pwd',  'cat_groc_laundry',      'Laundry Powder',        '🫧', 'Washing powder, detergent powder',          false, false, 1, NOW()),
  ('subcat_groc_laundry_liq',  'cat_groc_laundry',      'Laundry Liquid',        '🧴', 'Liquid detergent and hand-wash liquid',     false, false, 2, NOW()),
  ('subcat_groc_fabric_soft',  'cat_groc_laundry',      'Fabric Softener',       '🌸', 'Fabric conditioner and softener',           false, false, 3, NOW()),
  ('subcat_groc_bleach',       'cat_groc_laundry',      'Bleach & Stain Remover','💧', 'Chlorine bleach, colour-safe bleach',       false, false, 4, NOW()),
  ('subcat_groc_multi_surf',   'cat_groc_surface',      'Multi-Surface Cleaner', '🧹', 'All-purpose spray and wipes',               false, false, 1, NOW()),
  ('subcat_groc_toilet_cl',    'cat_groc_surface',      'Toilet Cleaner',        '🚽', 'Toilet duck, rim blocks, disinfectant',     false, false, 2, NOW()),
  ('subcat_groc_floor_cl',     'cat_groc_surface',      'Floor Cleaner',         '🫧', 'Mop liquid, floor polish, tile cleaner',    false, false, 3, NOW()),

  -- Personal Care
  ('subcat_groc_bar_soap',     'cat_groc_body_care',    'Bar Soap',              '🧼', 'Bathing soap bars',                         false, false, 1, NOW()),
  ('subcat_groc_body_wash',    'cat_groc_body_care',    'Body Wash & Shower Gel','🚿', 'Shower gel and liquid body wash',           false, false, 2, NOW()),
  ('subcat_groc_lotion',       'cat_groc_body_care',    'Body Lotion',           '🧴', 'Moisturisers, body lotion, cocoa butter',   false, false, 3, NOW()),
  ('subcat_groc_deodorant',    'cat_groc_body_care',    'Deodorant',             '🌬️', 'Roll-on, spray and stick deodorant',        false, false, 4, NOW()),
  ('subcat_groc_shampoo',      'cat_groc_hair_care',    'Shampoo',               '🧴', 'All hair types shampoo',                    false, false, 1, NOW()),
  ('subcat_groc_conditioner',  'cat_groc_hair_care',    'Conditioner',           '💆', 'Hair conditioner and treatments',           false, false, 2, NOW()),
  ('subcat_groc_hair_oil',     'cat_groc_hair_care',    'Hair Oil & Relaxers',   '🫙', 'Hair oil, relaxers, hair food',             false, false, 3, NOW()),
  ('subcat_groc_toothpaste',   'cat_groc_oral_care',    'Toothpaste',            '🦷', 'Fluoride, whitening and kids toothpaste',   false, false, 1, NOW()),
  ('subcat_groc_toothbrush',   'cat_groc_oral_care',    'Toothbrush',            '🪥', 'Manual and electric toothbrushes',          false, false, 2, NOW()),
  ('subcat_groc_mouthwash',    'cat_groc_oral_care',    'Mouthwash & Floss',     '🌊', 'Antiseptic mouthwash and dental floss',     false, false, 3, NOW()),

  -- Writing Instruments (Key item for user's use case)
  ('subcat_groc_ballpoint',    'cat_groc_writing',      'Ballpoint Pens',        '🖊️', 'Biro, ballpoint and retractable pens',      false, false, 1, NOW()),
  ('subcat_groc_perm_mark',    'cat_groc_writing',      'Permanent Markers',     '🖊️', 'Permanent markers, Sharpie, Edding',        false, false, 2, NOW()),
  ('subcat_groc_pencils',      'cat_groc_writing',      'Pencils',               '✏️', 'HB, 2B pencils and mechanical pencils',     false, false, 3, NOW()),
  ('subcat_groc_highlighters', 'cat_groc_writing',      'Highlighters',          '🖍️', 'Fluorescent and pastel highlighters',       false, false, 4, NOW()),
  ('subcat_groc_fine_tip',     'cat_groc_writing',      'Fine Tip & Felt Pens',  '✒️', 'Fine liners, felt pens, fibre tips',        false, false, 5, NOW()),

  -- Paper Products
  ('subcat_groc_ex_books',     'cat_groc_paper',        'Exercise Books',        '📓', 'Ruled, blank and graph exercise books',     false, false, 1, NOW()),
  ('subcat_groc_a4_paper',     'cat_groc_paper',        'A4 Printing Paper',     '📄', 'Reams of A4, A3 paper',                     false, false, 2, NOW()),
  ('subcat_groc_notebooks',    'cat_groc_paper',        'Notebooks & Jotters',   '📔', 'Spiral, hardcover and softcover notebooks', false, false, 3, NOW()),

  -- Desk Accessories
  ('subcat_groc_staplers',     'cat_groc_desk_acc',     'Staplers & Punches',    '📎', 'Staplers, hole punchers and staples',       false, false, 1, NOW()),
  ('subcat_groc_tape_glue',    'cat_groc_desk_acc',     'Tape & Glue',           '🔧', 'Sellotape, masking tape, Pritt stick',      false, false, 2, NOW()),
  ('subcat_groc_rulers',       'cat_groc_desk_acc',     'Rulers & Scissors',     '✂️', 'Plastic rulers, stainless scissors',        false, false, 3, NOW()),

  -- Pet Food
  ('subcat_groc_dog_food',     'cat_groc_pet_food',     'Dog Food',              '🐶', 'Dry kibble, wet food and treats',           false, false, 1, NOW()),
  ('subcat_groc_cat_food',     'cat_groc_pet_food',     'Cat Food',              '🐱', 'Dry and wet cat food',                      false, false, 2, NOW()),
  ('subcat_groc_bird_food',    'cat_groc_pet_food',     'Bird & Small Pet Food', '🐦', 'Bird seed, pellets, hamster food',          false, false, 3, NOW()),

  -- Baby
  ('subcat_groc_nappies_d',    'cat_groc_nappies',      'Disposable Nappies',    '🍼', 'Newborn to toddler nappy sizes',            false, false, 1, NOW()),
  ('subcat_groc_baby_wipes',   'cat_groc_nappies',      'Baby Wipes',            '🧻', 'Sensitive, unscented and fragrant wipes',   false, false, 2, NOW()),
  ('subcat_groc_formula',      'cat_groc_baby_food',    'Baby Formula & Milk',   '🍼', 'Infant formula, follow-on milk',            false, false, 1, NOW()),
  ('subcat_groc_baby_cereal',  'cat_groc_baby_food',    'Baby Cereal & Puree',   '🥣', 'Baby porridge, purees and first foods',     false, false, 2, NOW())

ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- Step 4: HARDWARE — add categories to existing domains
-- (domains already exist: domain_hardware_power_tools, domain_hardware_hand_tools, etc.)
-- =============================================================================
INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  -- Power Tools (domain_hardware_power_tools)
  ('cat_hw_drills',          'Drills & Drivers',     'Hammer drills, impact drivers, rotary hammers', '🔨', '#DC2626', 'hardware', 'domain_hardware_power_tools', NULL, true, false, 1, NOW(), NOW()),
  ('cat_hw_saws',            'Saws & Cutters',       'Circular saws, jigsaws, reciprocating saws',    '🪚', '#EF4444', 'hardware', 'domain_hardware_power_tools', NULL, true, false, 2, NOW(), NOW()),
  ('cat_hw_grinders',        'Grinders & Sanders',   'Angle grinders, belt sanders, orbital sanders', '⚙️', '#F87171', 'hardware', 'domain_hardware_power_tools', NULL, true, false, 3, NOW(), NOW()),

  -- Hand Tools (domain_hardware_hand_tools)
  ('cat_hw_striking',        'Striking Tools',       'Hammers, mallets, chisels, cold chisels',       '🔨', '#7C3AED', 'hardware', 'domain_hardware_hand_tools',  NULL, true, false, 1, NOW(), NOW()),
  ('cat_hw_measuring',       'Measuring & Marking',  'Tape measures, levels, squares, spirit levels', '📏', '#8B5CF6', 'hardware', 'domain_hardware_hand_tools',  NULL, true, false, 2, NOW(), NOW()),
  ('cat_hw_cutting',         'Cutting Tools',        'Knives, hacksaws, tin snips',                   '✂️', '#A78BFA', 'hardware', 'domain_hardware_hand_tools',  NULL, true, false, 3, NOW(), NOW()),
  ('cat_hw_wrenches',        'Wrenches & Spanners',  'Open-end, ring, socket sets, adjustable',       '🔧', '#C4B5FD', 'hardware', 'domain_hardware_hand_tools',  NULL, true, false, 4, NOW(), NOW()),

  -- Building Materials (domain_hardware_building)
  ('cat_hw_cement',          'Cement & Aggregates',  'Portland cement, sand, gravel, premix',         '🏗️', '#78716C', 'hardware', 'domain_hardware_building',    NULL, true, false, 1, NOW(), NOW()),
  ('cat_hw_bricks',          'Bricks & Blocks',      'Face bricks, hollow blocks, pavers',            '🧱', '#57534E', 'hardware', 'domain_hardware_building',    NULL, true, false, 2, NOW(), NOW()),

  -- Roofing (domain_hardware_roofing)
  ('cat_hw_roofing',         'Roofing Sheets',       'IBR sheets, tiles, gutters, ridge caps',        '🏠', '#44403C', 'hardware', 'domain_hardware_roofing',     NULL, true, false, 1, NOW(), NOW()),

  -- Timber (domain_hardware_timber)
  ('cat_hw_timber',          'Timber & Board',       'Planks, ply, MDF, chipboard, cane poles',       '🪵', '#92400E', 'hardware', 'domain_hardware_timber',      NULL, true, false, 1, NOW(), NOW()),

  -- Plumbing (domain_hardware_plumbing)
  ('cat_hw_pipes',           'Pipes & Fittings',     'PVC, CPVC, galvanised and copper fittings',     '🔧', '#0F766E', 'hardware', 'domain_hardware_plumbing',    NULL, true, false, 1, NOW(), NOW()),
  ('cat_hw_taps',            'Taps & Valves',        'Basin taps, ball valves, gate valves',          '🚿', '#0D9488', 'hardware', 'domain_hardware_plumbing',    NULL, true, false, 2, NOW(), NOW()),

  -- Irrigation (domain_hardware_irrigation)
  ('cat_hw_irrig',           'Irrigation',           'Hosepipes, sprinklers, drip lines',             '💦', '#15803D', 'hardware', 'domain_hardware_irrigation',  NULL, true, false, 1, NOW(), NOW()),

  -- Electrical (domain_hardware_electrical)
  ('cat_hw_cables',          'Cables & Wiring',      'Single core, twin & earth, conduit, trunking',  '🔌', '#CA8A04', 'hardware', 'domain_hardware_electrical',  NULL, true, false, 1, NOW(), NOW()),
  ('cat_hw_switches',        'Switches & Sockets',   'Single, double, isolators, plugs',              '🔲', '#EAB308', 'hardware', 'domain_hardware_electrical',  NULL, true, false, 2, NOW(), NOW()),
  ('cat_hw_lighting',        'Lighting',             'LED bulbs, fluorescent tubes, battens',         '💡', '#FACC15', 'hardware', 'domain_hardware_electrical',  NULL, true, false, 3, NOW(), NOW()),
  ('cat_hw_distribution',    'Distribution Boards',  'DB boards, MCBs, RCDs, isolators',              '⚡', '#FDE047', 'hardware', 'domain_hardware_electrical',  NULL, true, false, 4, NOW(), NOW()),

  -- Paint (domain_hardware_paint)
  ('cat_hw_int_paint',       'Interior Paint',       'Matt, satin, eggshell and silk finishes',       '🖌️', '#7C3AED', 'hardware', 'domain_hardware_paint',       NULL, true, false, 1, NOW(), NOW()),
  ('cat_hw_ext_paint',       'Exterior Paint',       'Masonry paint, roof paint, weathershield',      '🏠', '#6D28D9', 'hardware', 'domain_hardware_paint',       NULL, true, false, 2, NOW(), NOW()),
  ('cat_hw_primers',         'Primers & Undercoats', 'Wood, metal and masonry primers',               '🪣', '#5B21B6', 'hardware', 'domain_hardware_paint',       NULL, true, false, 3, NOW(), NOW()),

  -- Garden (domain_hardware_garden)
  ('cat_hw_garden_care',     'Lawn & Garden Care',   'Seeds, fertiliser, pesticides, herbicides',     '🌱', '#16A34A', 'hardware', 'domain_hardware_garden',      NULL, true, false, 1, NOW(), NOW()),

  -- Safety (domain_hardware_safety)
  ('cat_hw_ppe',             'Personal Protective Equipment','Hard hats, gloves, safety boots, vests','🦺', '#DC2626', 'hardware', 'domain_hardware_safety',      NULL, true, false, 1, NOW(), NOW()),

  -- Locks (domain_hardware_locks)
  ('cat_hw_locks',           'Locks & Access',       'Padlocks, deadbolts, gate locks, chains',       '🔒', '#B91C1C', 'hardware', 'domain_hardware_locks',       NULL, true, false, 1, NOW(), NOW()),

  -- Fasteners (domain_hardware_fasteners)
  ('cat_hw_bolts_nuts',      'Bolts & Nuts',         'Hex bolts, stud bolts, coach bolts, nuts',      '🔩', '#92400E', 'hardware', 'domain_hardware_fasteners',   NULL, true, false, 1, NOW(), NOW()),
  ('cat_hw_screws_nails',    'Screws & Nails',       'Wood screws, drywall screws, nails, tacks',     '📌', '#A16207', 'hardware', 'domain_hardware_fasteners',   NULL, true, false, 2, NOW(), NOW()),
  ('cat_hw_anchors',         'Anchors & Adhesives',  'Wall plugs, rawl bolts, construction adhesive', '🔗', '#B45309', 'hardware', 'domain_hardware_fasteners',   NULL, true, false, 3, NOW(), NOW())

ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- =============================================================================
-- Step 5: HARDWARE subcategories
-- =============================================================================
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  ('subcat_hw_hammer_drills',  'cat_hw_drills',      'Hammer Drills',           '🔨', 'Rotary hammer and combi drills',             false, false, 1, NOW()),
  ('subcat_hw_impact_drv',     'cat_hw_drills',      'Impact Drivers',          '🔧', 'Cordless and corded impact drivers',         false, false, 2, NOW()),
  ('subcat_hw_drill_bits',     'cat_hw_drills',      'Drill Bits & Accessories','🔩', 'Masonry, wood, metal and multi-purpose bits',false, false, 3, NOW()),
  ('subcat_hw_circ_saws',      'cat_hw_saws',        'Circular Saws',           '🪚', 'Corded and cordless circular saws',          false, false, 1, NOW()),
  ('subcat_hw_jigsaws',        'cat_hw_saws',        'Jigsaws',                 '🪚', 'Jigsaws and reciprocating saws',             false, false, 2, NOW()),
  ('subcat_hw_ang_grinders',   'cat_hw_grinders',    'Angle Grinders',          '⚙️', '4.5 inch, 5 inch, 9 inch angle grinders',   false, false, 1, NOW()),
  ('subcat_hw_sanders',        'cat_hw_grinders',    'Sanders',                 '🪚', 'Belt, orbital and detail sanders',           false, false, 2, NOW()),
  ('subcat_hw_grind_discs',    'cat_hw_grinders',    'Grinding & Cutting Discs','💿', 'Cutting, grinding and flap discs',           false, false, 3, NOW()),
  ('subcat_hw_claw_hammers',   'cat_hw_striking',    'Claw Hammers',            '🔨', 'General purpose claw hammers',               false, false, 1, NOW()),
  ('subcat_hw_sledge',         'cat_hw_striking',    'Sledge & Club Hammers',   '🔨', 'Demolition and heavy-duty hammers',          false, false, 2, NOW()),
  ('subcat_hw_chisels',        'cat_hw_striking',    'Chisels & Cold Chisels',  '🔧', 'Wood and masonry chisels',                   false, false, 3, NOW()),
  ('subcat_hw_tape_meas',      'cat_hw_measuring',   'Tape Measures',           '📏', '3m, 5m, 8m retractable tape measures',       false, false, 1, NOW()),
  ('subcat_hw_levels',         'cat_hw_measuring',   'Spirit Levels',           '📐', '600mm, 1200mm and 1800mm levels',            false, false, 2, NOW()),
  ('subcat_hw_squares',        'cat_hw_measuring',   'Squares & Marking',       '📐', 'Try squares, combination squares',           false, false, 3, NOW()),
  ('subcat_hw_open_span',      'cat_hw_wrenches',    'Open-End Spanners',       '🔧', 'Single and combination spanners',            false, false, 1, NOW()),
  ('subcat_hw_socket_sets',    'cat_hw_wrenches',    'Socket Sets',             '🔧', '1/4" and 1/2" socket sets',                  false, false, 2, NOW()),
  ('subcat_hw_screwdrivers',   'cat_hw_wrenches',    'Screwdrivers',            '🪛', 'Flat, Phillips and Torx screwdrivers',       false, false, 3, NOW()),
  ('subcat_hw_portland',       'cat_hw_cement',      'Portland Cement',         '🏗️', '25kg, 50kg bags of cement',                  false, false, 1, NOW()),
  ('subcat_hw_sand',           'cat_hw_cement',      'River Sand & Plaster Sand','🏖️','Building and plaster sand',                  false, false, 2, NOW()),
  ('subcat_hw_premix',         'cat_hw_cement',      'Premix & Mortar',         '🫙', 'Ready-mix concrete, floor leveller',         false, false, 3, NOW()),
  ('subcat_hw_face_bricks',    'cat_hw_bricks',      'Face Bricks',             '🧱', 'Red and buff face bricks',                   false, false, 1, NOW()),
  ('subcat_hw_hollow_blks',    'cat_hw_bricks',      'Hollow Blocks',           '🧱', '140mm and 190mm hollow blocks',              false, false, 2, NOW()),
  ('subcat_hw_ibr_sheets',     'cat_hw_roofing',     'IBR Roofing Sheets',      '🏠', 'Corrugated and IBR iron sheets',             false, false, 1, NOW()),
  ('subcat_hw_gutters',        'cat_hw_roofing',     'Gutters & Fascia',        '🏠', 'PVC and aluminium gutters',                  false, false, 2, NOW()),
  ('subcat_hw_ply',            'cat_hw_timber',      'Plywood',                 '🪵', '6mm, 9mm, 12mm and 18mm ply sheets',         false, false, 1, NOW()),
  ('subcat_hw_mdf',            'cat_hw_timber',      'MDF & Chipboard',         '🪵', 'MDF and chipboard sheets',                   false, false, 2, NOW()),
  ('subcat_hw_planks',         'cat_hw_timber',      'Timber Planks',           '🪵', 'PAR and rough sawn timber planks',           false, false, 3, NOW()),
  ('subcat_hw_pvc_pipes',      'cat_hw_pipes',       'PVC Pipes & Fittings',    '🔧', 'Class 6 and Class 10 PVC pipes',             false, false, 1, NOW()),
  ('subcat_hw_gal_pipes',      'cat_hw_pipes',       'Galvanised Pipes',        '🔧', 'Galvanised steel pipes and fittings',        false, false, 2, NOW()),
  ('subcat_hw_basin_taps',     'cat_hw_taps',        'Basin & Sink Taps',       '🚿', 'Pillar taps, mixer taps',                    false, false, 1, NOW()),
  ('subcat_hw_ball_valves',    'cat_hw_taps',        'Ball & Gate Valves',      '🔧', 'Float valves, ball valves, gate valves',     false, false, 2, NOW()),
  ('subcat_hw_single_core',    'cat_hw_cables',      'Single Core Cable',       '🔌', '1.5mm, 2.5mm, 4mm, 6mm single core',        false, false, 1, NOW()),
  ('subcat_hw_twin_earth',     'cat_hw_cables',      'Twin & Earth Cable',      '🔌', '1.5mm and 2.5mm twin and earth',             false, false, 2, NOW()),
  ('subcat_hw_conduit',        'cat_hw_cables',      'Conduit & Trunking',      '📦', 'PVC conduit, surface and flush trunking',    false, false, 3, NOW()),
  ('subcat_hw_mcbs',           'cat_hw_distribution','MCBs & RCDs',             '⚡', 'Miniature circuit breakers, RCDs',           false, false, 1, NOW()),
  ('subcat_hw_db_boards',      'cat_hw_distribution','DB Boards & Enclosures',  '📦', 'Distribution boards and enclosures',         false, false, 2, NOW()),
  ('subcat_hw_led_bulbs',      'cat_hw_lighting',    'LED Bulbs',               '💡', 'GU10, E27, B22 LED bulbs',                   false, false, 1, NOW()),
  ('subcat_hw_fluorescent',    'cat_hw_lighting',    'Fluorescent & Tubes',     '💡', 'T8, T5 tubes, battens and fittings',         false, false, 2, NOW()),
  ('subcat_hw_emulsion',       'cat_hw_int_paint',   'Emulsion & Matt Paint',   '🖌️', 'PVA and emulsion wall paint',                false, false, 1, NOW()),
  ('subcat_hw_enamel',         'cat_hw_int_paint',   'Enamel & Gloss',          '🖌️', 'High gloss and semi-gloss enamel',           false, false, 2, NOW()),
  ('subcat_hw_masonry_pnt',    'cat_hw_ext_paint',   'Masonry Paint',           '🏠', 'Exterior masonry and plaster paint',         false, false, 1, NOW()),
  ('subcat_hw_roof_paint',     'cat_hw_ext_paint',   'Roof Paint',              '🏠', 'Acrylic and bitumen roof paint',             false, false, 2, NOW()),
  ('subcat_hw_hard_hats',      'cat_hw_ppe',         'Hard Hats & Helmets',     '⛑️', 'Construction hard hats',                     false, false, 1, NOW()),
  ('subcat_hw_gloves',         'cat_hw_ppe',         'Gloves',                  '🧤', 'Safety, gardening and welding gloves',       false, false, 2, NOW()),
  ('subcat_hw_safety_boots',   'cat_hw_ppe',         'Safety Boots',            '🥾', 'Steel toe cap safety boots',                 false, false, 3, NOW()),
  ('subcat_hw_padlocks',       'cat_hw_locks',       'Padlocks',                '🔒', 'Brass and steel padlocks',                   false, false, 1, NOW()),
  ('subcat_hw_deadbolts',      'cat_hw_locks',       'Door Locks & Deadbolts',  '🚪', 'Mortice locks, deadbolts, door handles',     false, false, 2, NOW()),
  ('subcat_hw_hex_bolts',      'cat_hw_bolts_nuts',  'Hex Bolts & Nuts',        '🔩', 'M6, M8, M10, M12 hex bolts and nuts',       false, false, 1, NOW()),
  ('subcat_hw_coach_bolts',    'cat_hw_bolts_nuts',  'Coach Bolts & Washers',   '🔩', 'Coach screws, carriage bolts, flat washers', false, false, 2, NOW()),
  ('subcat_hw_wood_screws',    'cat_hw_screws_nails','Wood Screws',             '📌', 'Self-tapping and countersunk wood screws',   false, false, 1, NOW()),
  ('subcat_hw_drywall_sc',     'cat_hw_screws_nails','Drywall Screws',          '📌', 'Fine and coarse thread drywall screws',      false, false, 2, NOW()),
  ('subcat_hw_nails',          'cat_hw_screws_nails','Nails',                   '📌', 'Round wire, clout, brad and masonry nails',  false, false, 3, NOW()),
  ('subcat_hw_wall_plugs',     'cat_hw_anchors',     'Wall Plugs & Rawl Bolts', '🔧', 'Plastic plugs, wedge anchors, rawl bolts',   false, false, 1, NOW()),
  ('subcat_hw_adhesive',       'cat_hw_anchors',     'Construction Adhesive',   '🫙', 'PVA, contact, epoxy and silicone sealant',   false, false, 2, NOW())

ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- Step 6: RESTAURANT — add categories to existing domains
-- (many domains exist: domain_restaurant_mains, domain_restaurant_beverages, etc.)
-- =============================================================================
INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  ('cat_rest_starters',     'Starters & Appetizers','Soups, salads, finger foods',                '🥗', '#F97316', 'restaurant', 'domain_restaurant_soups',      NULL, true, false, 1, NOW(), NOW()),
  ('cat_rest_sides',        'Sides & Salads',       'Chips, salads, bread and veg sides',         '🍟', '#16A34A', 'restaurant', 'domain_restaurant_sides',      NULL, true, false, 1, NOW(), NOW()),
  ('cat_rest_breakfast',    'Breakfast',            'Eggs, cereals, pastries, full breakfast',    '🍳', '#F59E0B', 'restaurant', 'domain_restaurant_breakfast',  NULL, true, false, 1, NOW(), NOW()),
  ('cat_rest_soft_drinks',  'Soft Drinks',          'Carbonated, juice and energy drinks',        '🥤', '#3B82F6', 'restaurant', 'domain_restaurant_softdrinks', NULL, true, false, 1, NOW(), NOW()),
  ('cat_rest_hot_drinks',   'Hot Drinks',           'Coffee, tea and hot chocolate',              '☕', '#92400E', 'restaurant', 'domain_restaurant_hot',        NULL, true, false, 1, NOW(), NOW()),
  ('cat_rest_alcohol',      'Alcohol',              'Beer, wine, spirits and cocktails',          '🍺', '#7C3AED', 'restaurant', 'domain_restaurant_alcohol',    NULL, true, false, 1, NOW(), NOW()),
  ('cat_rest_grills',       'Grills & BBQ',         'Braai, rotisserie and grilled items',        '🔥', '#DC2626', 'restaurant', 'domain_restaurant_grills',     NULL, true, false, 1, NOW(), NOW()),
  ('cat_rest_seafood',      'Seafood',              'Fish, prawns, calamari and shellfish',       '🐟', '#0EA5E9', 'restaurant', 'domain_restaurant_seafood',    NULL, true, false, 1, NOW(), NOW()),
  ('cat_rest_vegetarian',   'Vegetarian & Vegan',   'Plant-based dishes and salads',              '🌱', '#22C55E', 'restaurant', 'domain_restaurant_vegetarian', NULL, true, false, 1, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- Restaurant subcategories
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  ('subcat_rest_soups',        'cat_rest_starters',  'Soups',               '🍲', 'Hot and cold soups',                          false, false, 1, NOW()),
  ('subcat_rest_salads',       'cat_rest_starters',  'Salads',              '🥗', 'Green and mixed salads',                      false, false, 2, NOW()),
  ('subcat_rest_finger',       'cat_rest_starters',  'Finger Foods',        '🍢', 'Wings, spring rolls, pies, samosas',          false, false, 3, NOW()),
  ('subcat_rest_chips',        'cat_rest_sides',     'Chips & Fries',       '🍟', 'Regular, wedges, sweet potato fries',         false, false, 1, NOW()),
  ('subcat_rest_veg_sides',    'cat_rest_sides',     'Vegetable Sides',     '🥦', 'Steamed veg, coleslaw, roasted vegetables',   false, false, 2, NOW()),
  ('subcat_rest_cola',         'cat_rest_soft_drinks','Cola & Carbonated',  '🥤', 'Coca-Cola, Fanta, Sprite',                   false, false, 1, NOW()),
  ('subcat_rest_juice',        'cat_rest_soft_drinks','Fruit Juice',        '🧃', 'Orange, apple, mango juice',                  false, false, 2, NOW()),
  ('subcat_rest_coffee',       'cat_rest_hot_drinks', 'Coffee',             '☕', 'Espresso, cappuccino, latte, Americano',       false, false, 1, NOW()),
  ('subcat_rest_tea',          'cat_rest_hot_drinks', 'Tea',                '🍵', 'English breakfast, green, herbal teas',       false, false, 2, NOW()),
  ('subcat_rest_beer',         'cat_rest_alcohol',   'Beer & Cider',        '🍺', 'Draft and bottled beer, cider',               false, false, 1, NOW()),
  ('subcat_rest_wine',         'cat_rest_alcohol',   'Wine',                '🍷', 'Red, white and rosé wine',                    false, false, 2, NOW()),
  ('subcat_rest_spirits',      'cat_rest_alcohol',   'Spirits & Shots',     '🥃', 'Whisky, vodka, gin, rum',                     false, false, 3, NOW()),
  ('subcat_rest_braai',        'cat_rest_grills',    'Braai & BBQ',         '🔥', 'Braaied meats and BBQ platters',              false, false, 1, NOW()),
  ('subcat_rest_rotisserie',   'cat_rest_grills',    'Rotisserie & Roast',  '🍗', 'Rotisserie chicken and roast meats',          false, false, 2, NOW()),
  ('subcat_rest_fish',         'cat_rest_seafood',   'Fish',                '🐟', 'Grilled, fried and baked fish',               false, false, 1, NOW()),
  ('subcat_rest_prawns',       'cat_rest_seafood',   'Prawns & Calamari',   '🦐', 'Grilled, peri-peri and garlic prawns',        false, false, 2, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- Step 7: RETAIL — insert new domains + categories + subcategories
-- =============================================================================
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_rtl_electronics',  'Electronics',         '📱', 'Phones, audio, computing and accessories',    'retail', true, true, NOW()),
  ('domain_rtl_home',         'Home & Living',       '🏠', 'Kitchenware, bedding and home décor',          'retail', true, true, NOW()),
  ('domain_rtl_clothing',     'Clothing & Footwear', '👟', 'Apparel and footwear for all ages',            'retail', true, true, NOW()),
  ('domain_rtl_beauty',       'Health & Beauty',     '💄', 'Skincare, makeup and fragrances',              'retail', true, true, NOW()),
  ('domain_rtl_toys',         'Toys & Games',        '🎮', 'Toys, board games and puzzles',                'retail', true, true, NOW()),
  ('domain_rtl_stationery',   'Office & Stationery', '🖊️', 'Writing instruments, paper and office supplies','retail', true, true, NOW()),
  ('domain_rtl_sport',        'Sport & Outdoor',     '⚽', 'Sporting goods and outdoor equipment',         'retail', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  ('cat_rtl_phones',        'Phones & Accessories','Smartphones, chargers, cases',                  '📱', '#3B82F6', 'retail', 'domain_rtl_electronics', NULL, true, false, 1, NOW(), NOW()),
  ('cat_rtl_audio',         'Audio & Visual',      'Headphones, speakers, TVs, soundbars',          '🎧', '#2563EB', 'retail', 'domain_rtl_electronics', NULL, true, false, 2, NOW(), NOW()),
  ('cat_rtl_computing',     'Computing',           'Laptops, tablets, USB drives, accessories',     '💻', '#1D4ED8', 'retail', 'domain_rtl_electronics', NULL, true, false, 3, NOW(), NOW()),
  ('cat_rtl_kitchen',       'Kitchenware',         'Pots, pans, crockery, utensils',               '🍳', '#D97706', 'retail', 'domain_rtl_home',        NULL, true, false, 1, NOW(), NOW()),
  ('cat_rtl_bedding',       'Bedding & Linen',     'Sheets, pillows, duvets, towels',               '🛏️', '#92400E', 'retail', 'domain_rtl_home',        NULL, true, false, 2, NOW(), NOW()),
  ('cat_rtl_decor',         'Home Décor',          'Picture frames, vases, candles, cushions',      '🪴', '#78716C', 'retail', 'domain_rtl_home',        NULL, true, false, 3, NOW(), NOW()),
  ('cat_rtl_mens',          'Men''s Clothing',     'Shirts, trousers, jackets, suits',              '👔', '#1D4ED8', 'retail', 'domain_rtl_clothing',    NULL, true, false, 1, NOW(), NOW()),
  ('cat_rtl_womens',        'Women''s Clothing',   'Dresses, tops, skirts, pants',                  '👗', '#EC4899', 'retail', 'domain_rtl_clothing',    NULL, true, false, 2, NOW(), NOW()),
  ('cat_rtl_footwear',      'Footwear',            'Shoes and sandals for all ages',                '👟', '#7C3AED', 'retail', 'domain_rtl_clothing',    NULL, true, false, 3, NOW(), NOW()),
  ('cat_rtl_skincare',      'Skincare',            'Moisturisers, serums, sunscreen, cleaners',     '🧴', '#F472B6', 'retail', 'domain_rtl_beauty',      NULL, true, false, 1, NOW(), NOW()),
  ('cat_rtl_makeup',        'Makeup & Cosmetics',  'Foundation, lipstick, eye shadow, blush',       '💄', '#EC4899', 'retail', 'domain_rtl_beauty',      NULL, true, false, 2, NOW(), NOW()),
  ('cat_rtl_fragrances',    'Fragrances',          'Perfume, cologne, body mist',                   '🌸', '#DB2777', 'retail', 'domain_rtl_beauty',      NULL, true, false, 3, NOW(), NOW()),
  ('cat_rtl_toys',          'Toys',                'Action figures, dolls, building sets',          '🧸', '#F59E0B', 'retail', 'domain_rtl_toys',        NULL, true, false, 1, NOW(), NOW()),
  ('cat_rtl_games',         'Games & Puzzles',     'Board games, card games, puzzles',              '🎮', '#EAB308', 'retail', 'domain_rtl_toys',        NULL, true, false, 2, NOW(), NOW()),
  ('cat_rtl_writing',       'Writing Instruments', 'Pens, pencils and markers',                     '✏️', '#6366F1', 'retail', 'domain_rtl_stationery',  NULL, true, false, 1, NOW(), NOW()),
  ('cat_rtl_paper',         'Paper Products',      'Notebooks, A4 paper, journals',                 '📄', '#8B5CF6', 'retail', 'domain_rtl_stationery',  NULL, true, false, 2, NOW(), NOW()),
  ('cat_rtl_desk_acc',      'Desk Accessories',    'Staplers, scissors, tape, rulers',              '📎', '#7C3AED', 'retail', 'domain_rtl_stationery',  NULL, true, false, 3, NOW(), NOW()),
  ('cat_rtl_sport_equip',   'Sporting Equipment',  'Balls, rackets, gym equipment',                 '⚽', '#16A34A', 'retail', 'domain_rtl_sport',       NULL, true, false, 1, NOW(), NOW()),
  ('cat_rtl_outdoor',       'Outdoor & Camping',   'Tents, torches, hiking gear',                   '⛺', '#15803D', 'retail', 'domain_rtl_sport',       NULL, true, false, 2, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  ('subcat_rtl_smartphones',  'cat_rtl_phones',   'Smartphones',                 '📱', 'Android and iOS smartphones',                false, false, 1, NOW()),
  ('subcat_rtl_ph_cases',     'cat_rtl_phones',   'Cases & Screen Protectors',   '📱', 'Protective cases and screen guards',         false, false, 2, NOW()),
  ('subcat_rtl_chargers',     'cat_rtl_phones',   'Chargers & Cables',           '🔌', 'USB-C, Lightning and charging cables',        false, false, 3, NOW()),
  ('subcat_rtl_headphones',   'cat_rtl_audio',    'Headphones & Earphones',      '🎧', 'Wired and wireless audio',                    false, false, 1, NOW()),
  ('subcat_rtl_speakers',     'cat_rtl_audio',    'Bluetooth Speakers',          '🔊', 'Portable and home bluetooth speakers',        false, false, 2, NOW()),
  ('subcat_rtl_laptops',      'cat_rtl_computing','Laptops & Notebooks',         '💻', 'Windows and Chromebook laptops',              false, false, 1, NOW()),
  ('subcat_rtl_usb',          'cat_rtl_computing','USB Drives & Memory',         '💾', 'USB flash drives and memory cards',           false, false, 2, NOW()),
  ('subcat_rtl_pots',         'cat_rtl_kitchen',  'Pots & Pans',                 '🍳', 'Cookware sets, frying pans, casserole dishes',false, false, 1, NOW()),
  ('subcat_rtl_crockery',     'cat_rtl_kitchen',  'Crockery & Cutlery',          '🍽️', 'Plates, bowls, cups, spoons, forks',          false, false, 2, NOW()),
  ('subcat_rtl_sheets',       'cat_rtl_bedding',  'Bed Sheets & Pillowcases',    '🛏️', 'Cotton and microfibre bedding',               false, false, 1, NOW()),
  ('subcat_rtl_pillows',      'cat_rtl_bedding',  'Pillows & Duvets',            '🛌', 'Synthetic and feather pillows, duvets',       false, false, 2, NOW()),
  ('subcat_rtl_moistur',      'cat_rtl_skincare', 'Moisturisers & Creams',       '🧴', 'Face and body moisturisers',                 false, false, 1, NOW()),
  ('subcat_rtl_sunscreen',    'cat_rtl_skincare', 'Sunscreen & SPF',             '☀️', 'SPF 15, 30, 50 sunscreen',                    false, false, 2, NOW()),
  ('subcat_rtl_foundation',   'cat_rtl_makeup',   'Foundation & Concealer',      '💄', 'Full coverage and tinted foundations',        false, false, 1, NOW()),
  ('subcat_rtl_lipstick',     'cat_rtl_makeup',   'Lipstick & Lip Gloss',        '💋', 'Matte, satin and gloss lip colour',           false, false, 2, NOW()),
  ('subcat_rtl_perfume',      'cat_rtl_fragrances','Perfume & Eau de Parfum',    '🌸', 'Women''s fragrances',                         false, false, 1, NOW()),
  ('subcat_rtl_cologne',      'cat_rtl_fragrances','Cologne & Eau de Toilette',  '💨', 'Men''s fragrances',                           false, false, 2, NOW()),
  ('subcat_rtl_rtl_pens',     'cat_rtl_writing',  'Pens & Markers',              '🖊️', 'Ballpoint, gel, permanent markers',            false, false, 1, NOW()),
  ('subcat_rtl_rtl_pencils',  'cat_rtl_writing',  'Pencils',                     '✏️', 'HB, coloured and mechanical pencils',         false, false, 2, NOW()),
  ('subcat_rtl_notebooks',    'cat_rtl_paper',    'Notebooks & Journals',        '📔', 'Spiral, hardcover and softcover notebooks',   false, false, 1, NOW()),
  ('subcat_rtl_a4',           'cat_rtl_paper',    'A4 Printing Paper',           '📄', 'Reams and packs of A4 paper',                 false, false, 2, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- Step 8: SERVICES & CONSULTING — insert new domains + categories + subcategories
-- =============================================================================
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_svc_professional',  'Professional Services','🛠️', 'Consulting, technical and advisory services',  'services',   true, true, NOW()),
  ('domain_svc_admin',         'Administrative',       '💼', 'Office and administrative services',           'services',   true, true, NOW()),
  ('domain_svc_subscriptions', 'Subscriptions & Plans','📋', 'Software, memberships and recurring services', 'services',   true, true, NOW()),
  ('domain_cst_professional',  'Professional Services','🛠️', 'Consulting, advisory and project services',    'consulting', true, true, NOW()),
  ('domain_cst_training',      'Training & Workshops', '📚', 'Workshops, courses and training programmes',   'consulting', true, true, NOW()),
  ('domain_cst_admin',         'Administrative',       '💼', 'Office support and administrative services',   'consulting', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  ('cat_svc_it',             'IT Consulting',        'Software, networking and IT support services',  '💻', '#3B82F6', 'services',   'domain_svc_professional', NULL, true, false, 1, NOW(), NOW()),
  ('cat_svc_biz',            'Business Consulting',  'Strategy, operations and management',           '📊', '#2563EB', 'services',   'domain_svc_professional', NULL, true, false, 2, NOW(), NOW()),
  ('cat_svc_technical',      'Technical Services',   'Repairs, installation and maintenance',         '🔧', '#1D4ED8', 'services',   'domain_svc_professional', NULL, true, false, 3, NOW(), NOW()),
  ('cat_svc_office',         'Office Services',      'Printing, scanning, photocopying',              '🖨️', '#6366F1', 'services',   'domain_svc_admin',        NULL, true, false, 1, NOW(), NOW()),
  ('cat_svc_comms',          'Communications',       'Courier, postage, airtime, data bundles',       '📬', '#7C3AED', 'services',   'domain_svc_admin',        NULL, true, false, 2, NOW(), NOW()),
  ('cat_svc_software',       'Software & Licenses',  'SaaS, software licenses, app subscriptions',   '💿', '#8B5CF6', 'services',   'domain_svc_subscriptions',NULL, true, false, 1, NOW(), NOW()),
  ('cat_cst_strategy',       'Strategy & Advisory',  'Strategic planning and business advisory',      '📈', '#0F766E', 'consulting', 'domain_cst_professional', NULL, true, false, 1, NOW(), NOW()),
  ('cat_cst_project_mgmt',   'Project Management',   'Project planning, delivery and oversight',      '📋', '#0D9488', 'consulting', 'domain_cst_professional', NULL, true, false, 2, NOW(), NOW()),
  ('cat_cst_training',       'Training Programmes',  'Workshops, courses and coaching sessions',      '📚', '#14B8A6', 'consulting', 'domain_cst_training',     NULL, true, false, 1, NOW(), NOW()),
  ('cat_cst_online',         'Online Courses',        'E-learning and digital course delivery',       '🖥️', '#06B6D4', 'consulting', 'domain_cst_training',     NULL, true, false, 2, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  ('subcat_svc_network',     'cat_svc_it',        'Networking & Infrastructure','🌐', 'LAN, WAN, WiFi setup and management',         false, false, 1, NOW()),
  ('subcat_svc_sw_dev',      'cat_svc_it',        'Software Development',       '💻', 'Custom software and web development',         false, false, 2, NOW()),
  ('subcat_svc_it_support',  'cat_svc_it',        'IT Support & Helpdesk',      '🛠️', 'Remote and on-site IT support',               false, false, 3, NOW()),
  ('subcat_svc_printing',    'cat_svc_office',    'Printing & Copying',         '🖨️', 'Black & white and colour printing',            false, false, 1, NOW()),
  ('subcat_svc_scanning',    'cat_svc_office',    'Scanning & Laminating',      '📄', 'Document scanning and lamination',             false, false, 2, NOW()),
  ('subcat_svc_airtime',     'cat_svc_comms',     'Airtime & Data Bundles',     '📱', 'Mobile airtime and data recharge',             false, false, 1, NOW()),
  ('subcat_svc_courier',     'cat_svc_comms',     'Courier & Delivery',         '📦', 'Local and national courier services',          false, false, 2, NOW()),
  ('subcat_cst_workshops',   'cat_cst_training',  'Workshops',                  '🏫', 'Half-day, full-day and multi-day workshops',   false, false, 1, NOW()),
  ('subcat_cst_coaching',    'cat_cst_training',  'One-on-One Coaching',        '🎯', 'Individual coaching and mentoring sessions',   false, false, 2, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
