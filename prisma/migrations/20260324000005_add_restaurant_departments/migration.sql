-- Add full set of restaurant inventory departments

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_restaurant_soups',       'Soups & Starters',        '🍜', 'Soups, broths and starter dishes',                  'restaurant', true, false, NOW()),
  ('domain_restaurant_salads',      'Salads',                  '🥗', 'Fresh salads and cold dishes',                      'restaurant', true, false, NOW()),
  ('domain_restaurant_grills',      'Grills & BBQ',            '🔥', 'Grilled meats, BBQ and flame-cooked dishes',        'restaurant', true, false, NOW()),
  ('domain_restaurant_chicken',     'Chicken & Poultry',       '🍗', 'Chicken, turkey and poultry dishes',                'restaurant', true, false, NOW()),
  ('domain_restaurant_seafood',     'Seafood',                 '🦐', 'Fish, prawns, calamari and seafood dishes',         'restaurant', true, false, NOW()),
  ('domain_restaurant_vegetarian',  'Vegetarian & Vegan',      '🥦', 'Vegetarian, vegan and plant-based dishes',          'restaurant', true, false, NOW()),
  ('domain_restaurant_sides',       'Sides & Accompaniments',  '🍟', 'Sides, chips, rice and accompaniments',             'restaurant', true, false, NOW()),
  ('domain_restaurant_desserts',    'Desserts & Sweets',       '🍰', 'Desserts, cakes, ice cream and sweet treats',       'restaurant', true, false, NOW()),
  ('domain_restaurant_kids',        'Kids Menu',               '👶', 'Childrens meals and kid-friendly dishes',           'restaurant', true, false, NOW()),
  ('domain_restaurant_breakfast',   'Breakfast & Brunch',      '🍳', 'Breakfast, brunch and morning meals',               'restaurant', true, false, NOW()),
  ('domain_restaurant_sandwiches',  'Sandwiches & Wraps',      '🥙', 'Sandwiches, wraps, rolls and light meals',          'restaurant', true, false, NOW()),
  ('domain_restaurant_pizza',       'Pizzas & Pastas',         '🍕', 'Pizzas, pastas and Italian dishes',                 'restaurant', true, false, NOW()),
  ('domain_restaurant_burgers',     'Burgers & Fast Food',     '🍔', 'Burgers, hot dogs and fast food items',             'restaurant', true, false, NOW()),
  ('domain_restaurant_rice',        'Rice & Noodles',          '🍚', 'Rice dishes, noodles and grain-based meals',        'restaurant', true, false, NOW()),
  ('domain_restaurant_sauces',      'Sauces & Dips',           '🫙', 'Sauces, dips, condiments and dressings',           'restaurant', true, false, NOW()),
  ('domain_restaurant_softdrinks',  'Soft Drinks',             '🥤', 'Sodas, carbonated drinks and non-alcoholic drinks', 'restaurant', true, false, NOW()),
  ('domain_restaurant_hot',         'Hot Beverages',           '☕', 'Tea, coffee, hot chocolate and hot drinks',         'restaurant', true, false, NOW()),
  ('domain_restaurant_juices',      'Juices & Smoothies',      '🍹', 'Fresh juices, smoothies and blended drinks',        'restaurant', true, false, NOW()),
  ('domain_restaurant_alcohol',     'Alcohol & Cocktails',     '🍷', 'Beer, wine, spirits and cocktails',                 'restaurant', true, false, NOW()),
  ('domain_restaurant_produce',     'Kitchen Fresh Produce',   '🥬', 'Fresh vegetables, fruits and raw ingredients',      'restaurant', true, false, NOW()),
  ('domain_restaurant_dairy',       'Dairy & Eggs',            '🥚', 'Milk, cheese, butter, cream and eggs',              'restaurant', true, false, NOW()),
  ('domain_restaurant_meat',        'Meat & Poultry',          '🥩', 'Raw meat, poultry and butchery supplies',           'restaurant', true, false, NOW()),
  ('domain_restaurant_spices',      'Spices & Herbs',          '🌿', 'Spices, herbs, seasonings and flavourings',         'restaurant', true, false, NOW()),
  ('domain_restaurant_drygoods',    'Dry Goods & Pantry',      '🫘', 'Flour, sugar, tinned goods and dry pantry items',  'restaurant', true, false, NOW()),
  ('domain_restaurant_packaging',   'Packaging & Disposables', '📦', 'Takeaway boxes, cups, straws and packaging',        'restaurant', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
