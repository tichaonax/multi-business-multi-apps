-- Migration 00013: Fill missing grocery subcategories
-- Source: Grocery Business Domains.md
-- Uses ON CONFLICT (categoryId, name) DO NOTHING to skip existing entries

INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Produce: Fruits (cat_groc_fruits) — existing: Citrus, Tropical Fruits, Stone Fruits, Melons & Grapes
  ('gsc_fr_1', 'cat_groc_fruits', 'Berries',       '🍓', false, false, 5, NOW()),
  ('gsc_fr_2', 'cat_groc_fruits', 'Avocados',      '🥑', false, false, 6, NOW()),
  -- Produce: Vegetables (cat_groc_vegetables) — existing: Leafy Greens, Root Vegetables, Gourds & Squash, Onions & Garlic, Tomatoes & Peppers
  ('gsc_vg_1', 'cat_groc_vegetables', 'Cabbages',    '🥬', false, false, 6, NOW()),
  ('gsc_vg_2', 'cat_groc_vegetables', 'Mushrooms',   '🍄', false, false, 7, NOW()),
  -- Produce: Fresh Herbs (cat_groc_herbs) — all missing
  ('gsc_hb_1', 'cat_groc_herbs', 'Basil',      '🌿', false, false, 1, NOW()),
  ('gsc_hb_2', 'cat_groc_herbs', 'Parsley',    '🌿', false, false, 2, NOW()),
  ('gsc_hb_3', 'cat_groc_herbs', 'Coriander',  '🌿', false, false, 3, NOW()),
  ('gsc_hb_4', 'cat_groc_herbs', 'Thyme',      '🌿', false, false, 4, NOW()),
  ('gsc_hb_5', 'cat_groc_herbs', 'Mint',       '🌿', false, false, 5, NOW()),
  ('gsc_hb_6', 'cat_groc_herbs', 'Organic produce','🌱', false, false, 6, NOW()),
  -- Meat: Pork (cat_groc_pork) — all missing
  ('gsc_pk_1', 'cat_groc_pork', 'Pork chops', '🐖', false, false, 1, NOW()),
  ('gsc_pk_2', 'cat_groc_pork', 'Bacon',       '🐖', false, false, 2, NOW()),
  ('gsc_pk_3', 'cat_groc_pork', 'Ham',         '🍖', false, false, 3, NOW()),
  ('gsc_pk_4', 'cat_groc_pork', 'Ribs',        '🍖', false, false, 4, NOW()),
  ('gsc_pk_5', 'cat_groc_pork', 'Sausage',     '🌭', false, false, 5, NOW()),
  -- Meat: Processed Meats (cat_groc_proc_meat) — all missing
  ('gsc_pm_1', 'cat_groc_proc_meat', 'Sliced meats',   '🥓', false, false, 1, NOW()),
  ('gsc_pm_2', 'cat_groc_proc_meat', 'Sausages',       '🌭', false, false, 2, NOW()),
  ('gsc_pm_3', 'cat_groc_proc_meat', 'Hot dogs',       '🌭', false, false, 3, NOW()),
  ('gsc_pm_4', 'cat_groc_proc_meat', 'Salami',         '🍖', false, false, 4, NOW()),
  ('gsc_pm_5', 'cat_groc_proc_meat', 'Marinated meat', '🧂', false, false, 5, NOW()),
  -- Dairy: Cheese (cat_groc_cheese) — all missing
  ('gsc_ch_1', 'cat_groc_cheese', 'Cheddar',         '🧀', false, false, 1, NOW()),
  ('gsc_ch_2', 'cat_groc_cheese', 'Gouda',           '🧀', false, false, 2, NOW()),
  ('gsc_ch_3', 'cat_groc_cheese', 'Mozzarella',      '🧀', false, false, 3, NOW()),
  ('gsc_ch_4', 'cat_groc_cheese', 'Processed cheese','🧀', false, false, 4, NOW()),
  ('gsc_ch_5', 'cat_groc_cheese', 'Cream cheese',    '🧀', false, false, 5, NOW()),
  -- Dairy: Yogurt & Desserts (cat_groc_yogurt) — all missing
  ('gsc_yg_1', 'cat_groc_yogurt', 'Plain yogurt',    '🍦', false, false, 1, NOW()),
  ('gsc_yg_2', 'cat_groc_yogurt', 'Flavored yogurt', '🍦', false, false, 2, NOW()),
  ('gsc_yg_3', 'cat_groc_yogurt', 'Greek yogurt',    '🍦', false, false, 3, NOW()),
  ('gsc_yg_4', 'cat_groc_yogurt', 'Desserts',        '🍮', false, false, 4, NOW()),
  ('gsc_yg_5', 'cat_groc_yogurt', 'Dips',            '🥣', false, false, 5, NOW()),
  -- Frozen: Frozen Meals (cat_groc_frozen_meals) — all missing
  ('gsc_fm_1', 'cat_groc_frozen_meals', 'TV dinners',       '🍕', false, false, 1, NOW()),
  ('gsc_fm_2', 'cat_groc_frozen_meals', 'Frozen pizza',     '🍕', false, false, 2, NOW()),
  ('gsc_fm_3', 'cat_groc_frozen_meals', 'Frozen pasta',     '🍝', false, false, 3, NOW()),
  ('gsc_fm_4', 'cat_groc_frozen_meals', 'Ethnic meals',     '🌮', false, false, 4, NOW()),
  ('gsc_fm_5', 'cat_groc_frozen_meals', 'Single-serve meals','🍱', false, false, 5, NOW()),
  -- Frozen: Frozen Vegetables (cat_groc_frozen_veg) — all missing
  ('gsc_fv_1', 'cat_groc_frozen_veg', 'Mixed vegetables', '🥦', false, false, 1, NOW()),
  ('gsc_fv_2', 'cat_groc_frozen_veg', 'Peas',             '🟢', false, false, 2, NOW()),
  ('gsc_fv_3', 'cat_groc_frozen_veg', 'Spinach',          '🥬', false, false, 3, NOW()),
  ('gsc_fv_4', 'cat_groc_frozen_veg', 'Corn',             '🌽', false, false, 4, NOW()),
  ('gsc_fv_5', 'cat_groc_frozen_veg', 'Frozen snacks',    '🍗', false, false, 5, NOW()),
  -- Frozen: Ice Cream & Desserts (cat_groc_ice_cream) — all missing
  ('gsc_ic_1', 'cat_groc_ice_cream', 'Ice cream',     '🍦', false, false, 1, NOW()),
  ('gsc_ic_2', 'cat_groc_ice_cream', 'Popsicles',     '🍫', false, false, 2, NOW()),
  ('gsc_ic_3', 'cat_groc_ice_cream', 'Frozen yogurt', '🍦', false, false, 3, NOW()),
  ('gsc_ic_4', 'cat_groc_ice_cream', 'Pies',          '🥧', false, false, 4, NOW()),
  -- Bakery: Cakes & Biscuits (cat_groc_cakes) — all missing
  ('gsc_ck_1', 'cat_groc_cakes', 'Cakes',    '🎂', false, false, 1, NOW()),
  ('gsc_ck_2', 'cat_groc_cakes', 'Cupcakes', '🍰', false, false, 2, NOW()),
  ('gsc_ck_3', 'cat_groc_cakes', 'Biscuits', '🍪', false, false, 3, NOW()),
  ('gsc_ck_4', 'cat_groc_cakes', 'Cookies',  '🍪', false, false, 4, NOW()),
  -- Bakery: Pastries & Buns (cat_groc_pastries) — all missing
  ('gsc_py_1', 'cat_groc_pastries', 'Croissants',  '🥐', false, false, 1, NOW()),
  ('gsc_py_2', 'cat_groc_pastries', 'Rolls',       '🥯', false, false, 2, NOW()),
  ('gsc_py_3', 'cat_groc_pastries', 'Buns',        '🍞', false, false, 3, NOW()),
  ('gsc_py_4', 'cat_groc_pastries', 'Donuts',      '🍩', false, false, 4, NOW()),
  ('gsc_py_5', 'cat_groc_pastries', 'Tortillas',   '🌮', false, false, 5, NOW()),
  -- Beverages: Water (cat_groc_water) — existing: Still Water, Sparkling Water
  ('gsc_wt_1', 'cat_groc_water', 'Flavored water','🍋', false, false, 3, NOW()),
  ('gsc_wt_2', 'cat_groc_water', 'Purified water','🚰', false, false, 4, NOW()),
  -- Beverages: Soft Drinks (cat_groc_soft_drinks) — existing: Carbonated Drinks, Juice & Nectar, Energy Drinks
  ('gsc_sd_1', 'cat_groc_soft_drinks', 'Smoothies',    '🥤', false, false, 4, NOW()),
  ('gsc_sd_2', 'cat_groc_soft_drinks', 'Sports drinks','⚡', false, false, 5, NOW()),
  -- Packaged: Canned Goods (cat_groc_canned_goods) — existing: Canned Tomatoes, Canned Beans & Lentils, Canned Fish, Canned Meat
  ('gsc_cg_1', 'cat_groc_canned_goods', 'Canned soup',  '🍜', false, false, 5, NOW()),
  ('gsc_cg_2', 'cat_groc_canned_goods', 'Canned fruit', '🍑', false, false, 6, NOW()),
  ('gsc_cg_3', 'cat_groc_canned_goods', 'Canned sauce', '🍅', false, false, 7, NOW()),
  -- Packaged: Grains & Cereals (cat_groc_grains) — existing: Rice, Maize Meal & Sadza, Flour & Baking, Oats & Breakfast Cereals
  ('gsc_gr_1', 'cat_groc_grains', 'Lentils & Beans','🫘', false, false, 5, NOW()),
  ('gsc_gr_2', 'cat_groc_grains', 'Semolina',       '🌾', false, false, 6, NOW()),
  -- Packaged: Oats & Cereals (cat_groc_oats) — all missing
  ('gsc_oa_1', 'cat_groc_oats', 'Oats',         '🥣', false, false, 1, NOW()),
  ('gsc_oa_2', 'cat_groc_oats', 'Cereal',       '🥣', false, false, 2, NOW()),
  ('gsc_oa_3', 'cat_groc_oats', 'Pancake mix',  '🥞', false, false, 3, NOW()),
  ('gsc_oa_4', 'cat_groc_oats', 'Syrup',        '🍯', false, false, 4, NOW()),
  ('gsc_oa_5', 'cat_groc_oats', 'Breakfast bars','🍫', false, false, 5, NOW()),
  -- Packaged: Spreads & Jams (cat_groc_spreads) — all missing
  ('gsc_sp_1', 'cat_groc_spreads', 'Jam',           '🍓', false, false, 1, NOW()),
  ('gsc_sp_2', 'cat_groc_spreads', 'Peanut butter', '🥜', false, false, 2, NOW()),
  ('gsc_sp_3', 'cat_groc_spreads', 'Honey',         '🍯', false, false, 3, NOW()),
  ('gsc_sp_4', 'cat_groc_spreads', 'Marmalade',     '🍊', false, false, 4, NOW()),
  ('gsc_sp_5', 'cat_groc_spreads', 'Chocolate spread','🍫', false, false, 5, NOW()),
  -- Packaged: Sauces & Condiments (cat_groc_sauces) — existing: Tomato Sauce & Paste, Mayonnaise & Dressings, Stock & Gravy
  ('gsc_sa_1', 'cat_groc_sauces', 'Hot sauce',  '🌶️', false, false, 4, NOW()),
  ('gsc_sa_2', 'cat_groc_sauces', 'Mustard',    '🟡', false, false, 5, NOW()),
  ('gsc_sa_3', 'cat_groc_sauces', 'Vinegar',    '🍾', false, false, 6, NOW()),
  -- Packaged: Spices & Seasoning (cat_groc_spices) — existing: Spices & Seasoning
  ('gsc_sz_1', 'cat_groc_spices', 'Herbs',          '🌿', false, false, 2, NOW()),
  ('gsc_sz_2', 'cat_groc_spices', 'Spice blends',   '🧂', false, false, 3, NOW()),
  ('gsc_sz_3', 'cat_groc_spices', 'Marinades',      '🍲', false, false, 4, NOW()),
  ('gsc_sz_4', 'cat_groc_spices', 'Bouillon',       '🧊', false, false, 5, NOW()),
  ('gsc_sz_5', 'cat_groc_spices', 'Seasoning mixes','🧂', false, false, 6, NOW()),
  -- Packaged: Nuts & Dried Fruit (cat_groc_nuts) — existing: Peanuts, Mixed Nuts, Dried Fruit
  ('gsc_nt_1', 'cat_groc_nuts', 'Trail mix',   '🥜', false, false, 4, NOW()),
  ('gsc_nt_2', 'cat_groc_nuts', 'Seeds',       '🌱', false, false, 5, NOW()),
  -- Cleaning: Dishwashing (cat_groc_dishwash) — all missing
  ('gsc_dw_1', 'cat_groc_dishwash', 'Dish soap',        '🧼', false, false, 1, NOW()),
  ('gsc_dw_2', 'cat_groc_dishwash', 'Dishwashing liquid','🧴', false, false, 2, NOW()),
  ('gsc_dw_3', 'cat_groc_dishwash', 'Dish cloths',      '🧽', false, false, 3, NOW()),
  ('gsc_dw_4', 'cat_groc_dishwash', 'Scrubbers',        '🧽', false, false, 4, NOW()),
  -- Cleaning: Air Fresheners (cat_groc_air_fresh) — all missing
  ('gsc_af_1', 'cat_groc_air_fresh', 'Spray fresheners', '🌸', false, false, 1, NOW()),
  ('gsc_af_2', 'cat_groc_air_fresh', 'Gel fresheners',   '🌸', false, false, 2, NOW()),
  ('gsc_af_3', 'cat_groc_air_fresh', 'Plug-in fresheners','🔌', false, false, 3, NOW()),
  ('gsc_af_4', 'cat_groc_air_fresh', 'Car fresheners',   '🚗', false, false, 4, NOW()),
  -- Cleaning: Laundry (cat_groc_laundry) — existing: Laundry Powder, Laundry Liquid, Fabric Softener, Bleach & Stain Remover
  ('gsc_lw_1', 'cat_groc_laundry', 'Stain remover', '🧽', false, false, 5, NOW()),
  -- Cleaning: Surface Cleaners (cat_groc_surface) — existing: Multi-Surface Cleaner, Toilet Cleaner, Floor Cleaner
  ('gsc_sc_1', 'cat_groc_surface', 'Glass cleaner',  '🪟', false, false, 4, NOW()),
  ('gsc_sc_2', 'cat_groc_surface', 'Disinfectant',   '🦠', false, false, 5, NOW()),
  ('gsc_sc_3', 'cat_groc_surface', 'Sponges',        '🧽', false, false, 6, NOW()),
  -- Personal Care: Feminine Care (cat_groc_feminine) — all missing
  ('gsc_fc_1', 'cat_groc_feminine', 'Pads',         '🩸', false, false, 1, NOW()),
  ('gsc_fc_2', 'cat_groc_feminine', 'Tampons',      '🩸', false, false, 2, NOW()),
  ('gsc_fc_3', 'cat_groc_feminine', 'Panty liners', '🩸', false, false, 3, NOW()),
  ('gsc_fc_4', 'cat_groc_feminine', 'Intimate wash','🧴', false, false, 4, NOW()),
  -- Personal Care: Hair Care (cat_groc_hair_care) — existing: Shampoo, Conditioner, Hair Oil & Relaxers
  ('gsc_hc_1', 'cat_groc_hair_care', 'Styling products', '💆', false, false, 4, NOW()),
  ('gsc_hc_2', 'cat_groc_hair_care', 'Hair treatment',   '🧴', false, false, 5, NOW()),
  -- Baby Care: Baby Care (cat_groc_baby_care) — all missing
  ('gsc_bc_1', 'cat_groc_baby_care', 'Baby lotion',    '🧴', false, false, 1, NOW()),
  ('gsc_bc_2', 'cat_groc_baby_care', 'Baby shampoo',   '🧴', false, false, 2, NOW()),
  ('gsc_bc_3', 'cat_groc_baby_care', 'Baby powder',    '🧴', false, false, 3, NOW()),
  ('gsc_bc_4', 'cat_groc_baby_care', 'Baby accessories','🍼', false, false, 4, NOW()),
  -- Baby Care: Baby Food (cat_groc_baby_food) — existing: Baby Formula & Milk, Baby Cereal & Puree
  ('gsc_bf_1', 'cat_groc_baby_food', 'Purees',  '🍎', false, false, 3, NOW()),
  ('gsc_bf_2', 'cat_groc_baby_food', 'Snacks',  '🍪', false, false, 4, NOW()),
  ('gsc_bf_3', 'cat_groc_baby_food', 'Drinks',  '🧃', false, false, 5, NOW()),
  -- Baby Care: Nappies & Wipes (cat_groc_nappies) — existing: Disposable Nappies, Baby Wipes
  ('gsc_np_1', 'cat_groc_nappies', 'Training pants', '👖', false, false, 3, NOW()),
  ('gsc_np_2', 'cat_groc_nappies', 'Rash cream',     '🧴', false, false, 4, NOW()),
  -- Pet Supplies: Pet Accessories (cat_groc_pet_acc) — all missing
  ('gsc_pa_1', 'cat_groc_pet_acc', 'Dog accessories', '🐕', false, false, 1, NOW()),
  ('gsc_pa_2', 'cat_groc_pet_acc', 'Cat toys',        '🐈', false, false, 2, NOW()),
  ('gsc_pa_3', 'cat_groc_pet_acc', 'Grooming items',  '🧴', false, false, 3, NOW()),
  ('gsc_pa_4', 'cat_groc_pet_acc', 'Pet bowls',       '🪣', false, false, 4, NOW()),
  ('gsc_pa_5', 'cat_groc_pet_acc', 'Litter',          '🪣', false, false, 5, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
