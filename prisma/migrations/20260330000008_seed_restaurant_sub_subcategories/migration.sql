-- Seed all sub-subcategories for Restaurant business domain
-- Domain: Restaurant | 11 categories, 36 subcategories
-- Safe to re-run: ON CONFLICT DO UPDATE

DO $$
DECLARE
  d_id TEXT;
  cat_food TEXT; cat_bev TEXT; cat_bakery TEXT; cat_breakfast TEXT;
  cat_fast TEXT; cat_sides TEXT; cat_pizza TEXT; cat_mexican TEXT;
  cat_asian TEXT; cat_italian TEXT; cat_grill TEXT; cat_takeout TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Restaurant';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_food      FROM expense_categories WHERE "domainId" = d_id AND name = 'Food Service';
  SELECT id INTO cat_bev       FROM expense_categories WHERE "domainId" = d_id AND name = 'Beverages';
  SELECT id INTO cat_bakery    FROM expense_categories WHERE "domainId" = d_id AND name = 'Bakery and Pastry';
  SELECT id INTO cat_breakfast FROM expense_categories WHERE "domainId" = d_id AND name = 'Breakfast and Brunch';
  SELECT id INTO cat_fast      FROM expense_categories WHERE "domainId" = d_id AND name = 'Fast Food and Quick Service';
  SELECT id INTO cat_sides     FROM expense_categories WHERE "domainId" = d_id AND name = 'Sides and Extras';
  SELECT id INTO cat_pizza     FROM expense_categories WHERE "domainId" = d_id AND name = 'Pizza Shop';
  SELECT id INTO cat_mexican   FROM expense_categories WHERE "domainId" = d_id AND name = 'Mexican and Latin';
  SELECT id INTO cat_asian     FROM expense_categories WHERE "domainId" = d_id AND name = 'Asian Cuisine';
  SELECT id INTO cat_italian   FROM expense_categories WHERE "domainId" = d_id AND name = 'Italian Cuisine';
  SELECT id INTO cat_grill     FROM expense_categories WHERE "domainId" = d_id AND name = 'Grill and Steakhouse';
  SELECT id INTO cat_takeout   FROM expense_categories WHERE "domainId" = d_id AND name = 'Takeout and Delivery';

  -- ── Food Service ──────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_food AND name = 'Appetizers';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Salads',            '🥗', false),
      (s_id, 'Fries',             '🍟', false),
      (s_id, 'Onion rings',       '🧅', false),
      (s_id, 'Cheese bites',      '🧀', false),
      (s_id, 'Nachos',            '🌮', false),
      (s_id, 'Dumplings',         '🥟', false),
      (s_id, 'Shrimp appetizers', '🍤', false),
      (s_id, 'Wings',             '🍗', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_food AND name = 'Main Courses';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Burgers',      '🍔', false),
      (s_id, 'Chicken dishes','🍗', false),
      (s_id, 'Beef dishes',  '🥩', false),
      (s_id, 'Fish dishes',  '🐟', false),
      (s_id, 'Pasta',        '🍝', false),
      (s_id, 'Rice dishes',  '🍚', false),
      (s_id, 'Tacos',        '🌮', false),
      (s_id, 'Pizza',        '🍕', false),
      (s_id, 'Sandwiches',   '🥪', false),
      (s_id, 'Rice bowls',   '🍛', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_food AND name = 'Soups and Stews';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Soups',        '🍲', false),
      (s_id, 'Stews',        '🥘', false),
      (s_id, 'Noodle soups', '🍜', false),
      (s_id, 'Bean soups',   '🫘', false),
      (s_id, 'Tomato soups', '🍅', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_food AND name = 'Salads';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Garden salad',   '🥗', false),
      (s_id, 'Caesar salad',   '🥙', false),
      (s_id, 'Chicken salad',  '🍗', false),
      (s_id, 'Avocado salad',  '🥑', false),
      (s_id, 'Seafood salad',  '🍤', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_food AND name = 'Desserts';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cakes',    '🍰', false),
      (s_id, 'Pies',     '🥧', false),
      (s_id, 'Puddings', '🍮', false),
      (s_id, 'Ice cream','🍨', false),
      (s_id, 'Cookies',  '🍪', false),
      (s_id, 'Donuts',   '🍩', false),
      (s_id, 'Brownies', '🍫', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Beverages ─────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Soft Drinks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Soda',            '🥤', false),
      (s_id, 'Juice',           '🧃', false),
      (s_id, 'Water',           '💧', false),
      (s_id, 'Sparkling water', '🫧', false),
      (s_id, 'Lemonade',        '🍋', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Hot Drinks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Coffee',        '☕', false),
      (s_id, 'Tea',           '🍵', false),
      (s_id, 'Herbal tea',    '🫖', false),
      (s_id, 'Hot chocolate', '🥛', false),
      (s_id, 'Espresso',      '☕', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Specialty Drinks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Mocktails',              '🍹', false),
      (s_id, 'Non-alcoholic cocktails','🍸', false),
      (s_id, 'Bubble tea',             '🧋', false),
      (s_id, 'Fresh juice blends',     '🧃', false),
      (s_id, 'Smoothies',              '🥤', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Alcoholic Drinks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Beer',         '🍺', false),
      (s_id, 'Wine',         '🍷', false),
      (s_id, 'Cocktails',    '🍸', false),
      (s_id, 'Whiskey',      '🥃', false),
      (s_id, 'Champagne',    '🥂', false),
      (s_id, 'Mixed drinks', '🍹', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Bakery and Pastry ─────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bakery AND name = 'Breads';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Dinner rolls',    '🍞', false),
      (s_id, 'Baguettes',       '🥖', false),
      (s_id, 'Sandwich bread',  '🍞', false),
      (s_id, 'Flatbread',       '🫓', false),
      (s_id, 'Bagels',          '🥯', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bakery AND name = 'Pastries';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Croissants',    '🥐', false),
      (s_id, 'Turnovers',     '🥧', false),
      (s_id, 'Donuts',        '🍩', false),
      (s_id, 'Danish pastries','🥮', false),
      (s_id, 'Cookies',       '🍪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bakery AND name = 'Cakes and Sweets';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cakes',        '🎂', false),
      (s_id, 'Cupcakes',     '🍰', false),
      (s_id, 'Custards',     '🍮', false),
      (s_id, 'Brownies',     '🍫', false),
      (s_id, 'Sweet treats', '🍬', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Breakfast and Brunch ──────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_breakfast AND name = 'Breakfast Plates';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Pancakes', '🥞', false),
      (s_id, 'Waffles',  '🧇', false),
      (s_id, 'Eggs',     '🍳', false),
      (s_id, 'Bacon',    '🥓', false),
      (s_id, 'Sausage',  '🌭', false),
      (s_id, 'Toast',    '🍞', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_breakfast AND name = 'Brunch Items';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Omelets',              '🥚', false),
      (s_id, 'Avocado toast',        '🥑', false),
      (s_id, 'Breakfast sandwiches', '🥪', false),
      (s_id, 'Breakfast bowls',      '🍚', false),
      (s_id, 'Light breakfast salads','🥗', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_breakfast AND name = 'Cereals and Grains';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Oatmeal',          '🥣', false),
      (s_id, 'Granola',          '🌾', false),
      (s_id, 'Cereal',           '🥣', false),
      (s_id, 'Grits',            '🍚', false),
      (s_id, 'Breakfast muffins','🍞', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Fast Food and Quick Service ───────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fast AND name = 'Burgers and Sandwiches';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Burgers',    '🍔', false),
      (s_id, 'Sandwiches', '🥪', false),
      (s_id, 'Hot dogs',   '🌭', false),
      (s_id, 'Wraps',      '🥙', false),
      (s_id, 'Subs',       '🌮', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fast AND name = 'Fried Foods';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fried chicken', '🍗', false),
      (s_id, 'Fries',         '🍟', false),
      (s_id, 'Onion rings',   '🧅', false),
      (s_id, 'Fried fish',    '🐟', false),
      (s_id, 'Fried shrimp',  '🍤', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fast AND name = 'Quick Bites';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Tacos',         '🌮', false),
      (s_id, 'Dumplings',     '🥟', false),
      (s_id, 'Pretzels',      '🥨', false),
      (s_id, 'Cheese sticks', '🧀', false),
      (s_id, 'Burritos',      '🌯', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Sides and Extras ──────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_sides AND name = 'Side Items';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fries',            '🍟', false),
      (s_id, 'Mashed potatoes',  '🥔', false),
      (s_id, 'Rice',             '🍚', false),
      (s_id, 'Beans',            '🫘', false),
      (s_id, 'Side salad',       '🥗', false),
      (s_id, 'Garlic bread',     '🍞', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_sides AND name = 'Extras and Add-ons';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Extra cheese',  '🧀', false),
      (s_id, 'Extra bacon',   '🥓', false),
      (s_id, 'Hot sauce',     '🌶️', false),
      (s_id, 'Dipping sauce', '🥫', false),
      (s_id, 'Garlic butter', '🧄', false),
      (s_id, 'Butter',        '🧈', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Pizza Shop ────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pizza AND name = 'Pizza Types';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cheese pizza',     '🍕', false),
      (s_id, 'Pepperoni pizza',  '🍕', false),
      (s_id, 'Vegetarian pizza', '🍕', false),
      (s_id, 'Meat lovers pizza','🍕', false),
      (s_id, 'Supreme pizza',    '🍕', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pizza AND name = 'Pizza Add-ons';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Extra cheese', '🧀', false),
      (s_id, 'Mushrooms',    '🍄', false),
      (s_id, 'Peppers',      '🫑', false),
      (s_id, 'Onions',       '🧅', false),
      (s_id, 'Olives',       '🫒', false),
      (s_id, 'Sausage',      '🍖', false),
      (s_id, 'Pineapple',    '🍍', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pizza AND name = 'Pizza Sides';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Breadsticks',    '🥖', false),
      (s_id, 'Garlic knots',   '🧄', false),
      (s_id, 'Salad',          '🥗', false),
      (s_id, 'Wings',          '🍗', false),
      (s_id, 'Fountain drinks','🥤', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Mexican and Latin ─────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mexican AND name = 'Main Dishes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Tacos',        '🌮', false),
      (s_id, 'Burritos',     '🌯', false),
      (s_id, 'Tamales',      '🫔', false),
      (s_id, 'Quesadillas',  '🥙', false),
      (s_id, 'Burrito bowls','🍚', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mexican AND name = 'Add-ons';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cheese',     '🧀', false),
      (s_id, 'Beans',      '🫘', false),
      (s_id, 'Rice',       '🍚', false),
      (s_id, 'Guacamole',  '🥑', false),
      (s_id, 'Onions',     '🧅', false),
      (s_id, 'Salsa',      '🌶️', false),
      (s_id, 'Lettuce',    '🥬', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mexican AND name = 'Drinks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Soda',          '🥤', false),
      (s_id, 'Horchata',      '🧃', false),
      (s_id, 'Lime drinks',   '🍋', false),
      (s_id, 'Aguas frescas', '🫗', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Asian Cuisine ─────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_asian AND name = 'Noodle Dishes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Ramen',                '🍜', false),
      (s_id, 'Lo mein',              '🍝', false),
      (s_id, 'Udon',                 '🍜', false),
      (s_id, 'Pho',                  '🍜', false),
      (s_id, 'Stir-fried noodles',   '🥢', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_asian AND name = 'Rice Dishes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fried rice', '🍚', false),
      (s_id, 'Curry rice', '🍛', false),
      (s_id, 'Bento rice', '🍱', false),
      (s_id, 'Rice bowls', '🍱', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_asian AND name = 'Appetizers';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Dumplings',   '🥟', false),
      (s_id, 'Spring rolls','🥟', false),
      (s_id, 'Tempura',     '🍤', false),
      (s_id, 'Egg rolls',   '🥠', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_asian AND name = 'Sauces and Extras';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Soy sauce',   '🥢', false),
      (s_id, 'Chili sauce', '🌶️', false),
      (s_id, 'Ginger sauce','🧄', false),
      (s_id, 'Sweet sauce', '🍯', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Italian Cuisine ───────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_italian AND name = 'Pasta Dishes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Spaghetti',            '🍝', false),
      (s_id, 'Lasagna',              '🍝', false),
      (s_id, 'Fettuccine',           '🍝', false),
      (s_id, 'Macaroni and cheese',  '🍝', false),
      (s_id, 'Ravioli',              '🍝', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_italian AND name = 'Italian Specialties';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Pizza',          '🍕', false),
      (s_id, 'Calzones',       '🥖', false),
      (s_id, 'Caprese salad',  '🥗', false),
      (s_id, 'Arancini',       '🧀', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_italian AND name = 'Sides';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Breadsticks', '🥖', false),
      (s_id, 'Side salad',  '🥗', false),
      (s_id, 'Garlic bread','🧄', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Grill and Steakhouse ──────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_grill AND name = 'Steaks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Ribeye',       '🥩', false),
      (s_id, 'Sirloin',      '🥩', false),
      (s_id, 'T-bone',       '🥩', false),
      (s_id, 'Filet mignon', '🥩', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_grill AND name = 'Grilled Meats';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Chicken breast', '🍗', false),
      (s_id, 'Ribs',           '🍖', false),
      (s_id, 'Burgers',        '🍔', false),
      (s_id, 'Grilled fish',   '🐟', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_grill AND name = 'Sides';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Baked potato', '🥔', false),
      (s_id, 'Salad',        '🥗', false),
      (s_id, 'Corn',         '🌽', false),
      (s_id, 'Rice',         '🍚', false),
      (s_id, 'Beans',        '🫘', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Takeout and Delivery ──────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_takeout AND name = 'Combo Meals';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Burger combo',  '🍔', false),
      (s_id, 'Chicken combo', '🍗', false),
      (s_id, 'Taco combo',    '🌮', false),
      (s_id, 'Pizza combo',   '🍕', false),
      (s_id, 'Pasta combo',   '🍝', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_takeout AND name = 'Family Meals';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Family chicken meal', '🍗', false),
      (s_id, 'Family pizza meal',   '🍕', false),
      (s_id, 'Large rice trays',    '🍚', false),
      (s_id, 'Party salad trays',   '🥗', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_takeout AND name = 'Packaging';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Containers',   '🥡', false),
      (s_id, 'Bags',         '🛍️', false),
      (s_id, 'Napkins',      '🧻', false),
      (s_id, 'Cutlery sets', '🍴', false),
      (s_id, 'Drink carriers','🥤', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END;
$$;
