-- Add full set of grocery inventory departments

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_grocery_bakery',       'Bakery & Bread',             '🍞', 'Bread, pastries and baked goods',               'grocery', true, false, NOW()),
  ('domain_grocery_beverages',    'Beverages & Drinks',         '🥤', 'Soft drinks, juices, water and hot beverages',  'grocery', true, false, NOW()),
  ('domain_grocery_frozen',       'Frozen Foods',               '🧊', 'Frozen meals, vegetables and frozen products',  'grocery', true, false, NOW()),
  ('domain_grocery_canned',       'Canned & Tinned Goods',      '🥫', 'Canned food, tinned goods and preserved foods', 'grocery', true, false, NOW()),
  ('domain_grocery_grains',       'Grains, Rice & Pasta',       '🌾', 'Rice, pasta, flour, grains and cereals',        'grocery', true, false, NOW()),
  ('domain_grocery_oils',         'Cooking Oils & Condiments',  '🫙', 'Cooking oils, sauces, condiments and spreads',  'grocery', true, false, NOW()),
  ('domain_grocery_snacks',       'Snacks & Confectionery',     '🍬', 'Snacks, sweets, chocolates and confectionery',  'grocery', true, false, NOW()),
  ('domain_grocery_breakfast',    'Breakfast & Cereals',        '🥣', 'Breakfast cereals, oats and morning foods',     'grocery', true, false, NOW()),
  ('domain_grocery_spices',       'Spices & Seasonings',        '🧂', 'Spices, herbs, seasonings and flavourings',     'grocery', true, false, NOW()),
  ('domain_grocery_baby',         'Baby & Infant Food',         '🍼', 'Baby food, formula and infant nutrition',        'grocery', true, false, NOW()),
  ('domain_grocery_health',       'Health & Nutrition',         '💊', 'Vitamins, supplements and health foods',        'grocery', true, false, NOW()),
  ('domain_grocery_cleaning',     'Cleaning & Household',       '🧹', 'Cleaning products, detergents and household supplies', 'grocery', true, false, NOW()),
  ('domain_grocery_personalcare', 'Personal Care & Hygiene',    '🧴', 'Personal care, hygiene and grooming products',  'grocery', true, false, NOW()),
  ('domain_grocery_toiletries',   'Toiletries',                 '🪥', 'Soap, toothpaste, shampoo and toiletries',      'grocery', true, false, NOW()),
  ('domain_grocery_petfood',      'Pet Food & Supplies',        '🐾', 'Pet food, treats and animal supplies',          'grocery', true, false, NOW()),
  ('domain_grocery_alcohol',      'Alcohol & Spirits',          '🍷', 'Beer, wine, spirits and alcoholic beverages',   'grocery', true, false, NOW()),
  ('domain_grocery_tobacco',      'Tobacco',                    '🚬', 'Cigarettes, tobacco and smoking products',      'grocery', true, false, NOW()),
  ('domain_grocery_stationery',   'Stationery & Magazines',     '📎', 'Stationery, magazines, newspapers and books',   'grocery', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
