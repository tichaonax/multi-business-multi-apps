-- Seed all sub-subcategories for Groceries business domain
-- Domain: Groceries | 12 categories, 40 subcategories
-- Safe to re-run: ON CONFLICT DO UPDATE

DO $$
DECLARE
  d_id TEXT;
  cat_fresh TEXT; cat_dairy TEXT; cat_frozen TEXT; cat_packaged TEXT;
  cat_bev TEXT; cat_hb TEXT; cat_hc TEXT; cat_gm TEXT;
  cat_pet TEXT; cat_baby TEXT; cat_tobacco TEXT; cat_pharma TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Groceries';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_fresh    FROM expense_categories WHERE "domainId" = d_id AND name = 'Fresh Foods';
  SELECT id INTO cat_dairy    FROM expense_categories WHERE "domainId" = d_id AND name = 'Dairy and Refrigerated';
  SELECT id INTO cat_frozen   FROM expense_categories WHERE "domainId" = d_id AND name = 'Frozen Foods';
  SELECT id INTO cat_packaged FROM expense_categories WHERE "domainId" = d_id AND name = 'Packaged Foods';
  SELECT id INTO cat_bev      FROM expense_categories WHERE "domainId" = d_id AND name = 'Beverages';
  SELECT id INTO cat_hb       FROM expense_categories WHERE "domainId" = d_id AND name = 'Health and Beauty';
  SELECT id INTO cat_hc       FROM expense_categories WHERE "domainId" = d_id AND name = 'Household and Cleaning';
  SELECT id INTO cat_gm       FROM expense_categories WHERE "domainId" = d_id AND name = 'General Merchandise';
  SELECT id INTO cat_pet      FROM expense_categories WHERE "domainId" = d_id AND name = 'Pet Supplies';
  SELECT id INTO cat_baby     FROM expense_categories WHERE "domainId" = d_id AND name = 'Baby Care';
  SELECT id INTO cat_tobacco  FROM expense_categories WHERE "domainId" = d_id AND name = 'Tobacco and Lottery';
  SELECT id INTO cat_pharma   FROM expense_categories WHERE "domainId" = d_id AND name = 'Pharmacy and Wellness';

  -- ── Fresh Foods ───────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fresh AND name = 'Produce';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fruits',           '🍓', false),
      (s_id, 'Vegetables',       '🥕', false),
      (s_id, 'Herbs',            '🌿', false),
      (s_id, 'Salads',           '🥗', false),
      (s_id, 'Packaged produce', '📦', false),
      (s_id, 'Organic produce',  '🌱', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fresh AND name = 'Meat';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Beef',           '🐄', false),
      (s_id, 'Chicken',        '🍗', false),
      (s_id, 'Pork',           '🐖', false),
      (s_id, 'Lamb',           '🐐', false),
      (s_id, 'Goat',           '🐑', false),
      (s_id, 'Marinated meat', '🧂', false),
      (s_id, 'Ground meat',    '🍖', false),
      (s_id, 'Sausage',        '🌭', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fresh AND name = 'Seafood';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fish',           '🐟', false),
      (s_id, 'Shrimp',         '🍤', false),
      (s_id, 'Crab',           '🦀', false),
      (s_id, 'Shellfish',      '🦪', false),
      (s_id, 'Frozen seafood', '🧊', false),
      (s_id, 'Smoked seafood', '🐠', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fresh AND name = 'Deli';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Sliced meats',   '🥓', false),
      (s_id, 'Cheeses',        '🧀', false),
      (s_id, 'Prepared meats', '🍖', false),
      (s_id, 'Salads',         '🥗', false),
      (s_id, 'Hot foods',      '🍲', false),
      (s_id, 'Sandwiches',     '🥪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fresh AND name = 'Bakery';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Bread',     '🍞', false),
      (s_id, 'Rolls',     '🥯', false),
      (s_id, 'Cakes',     '🎂', false),
      (s_id, 'Pastries',  '🥐', false),
      (s_id, 'Cookies',   '🍪', false),
      (s_id, 'Donuts',    '🍩', false),
      (s_id, 'Tortillas', '🌮', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Dairy and Refrigerated ────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_dairy AND name = 'Dairy';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Milk',           '🥛', false),
      (s_id, 'Cream',          '🧴', false),
      (s_id, 'Yogurt',         '🍦', false),
      (s_id, 'Butter',         '🧈', false),
      (s_id, 'Sour cream',     '🥣', false),
      (s_id, 'Cottage cheese', '🧀', false),
      (s_id, 'Eggs',           '🥚', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_dairy AND name = 'Refrigerated Foods';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Chilled meals',      '🍱', false),
      (s_id, 'Cheese',             '🧀', false),
      (s_id, 'Dips',               '🥣', false),
      (s_id, 'Desserts',           '🍮', false),
      (s_id, 'Tofu',               '🥬', false),
      (s_id, 'Refrigerated juice', '🧃', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Frozen Foods ──────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_frozen AND name = 'Frozen Meals';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'TV dinners',        '🍕', false),
      (s_id, 'Pizza',             '🍕', false),
      (s_id, 'Pasta',             '🍝', false),
      (s_id, 'Ethnic meals',      '🌮', false),
      (s_id, 'Single-serve meals','🍱', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_frozen AND name = 'Frozen Snacks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Nuggets',         '🍗', false),
      (s_id, 'Fries',           '🍟', false),
      (s_id, 'Onion rings',     '🧅', false),
      (s_id, 'Breakfast items', '🥞', false),
      (s_id, 'Appetizers',      '🥟', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_frozen AND name = 'Frozen Desserts';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Ice cream',    '🍦', false),
      (s_id, 'Novelties',    '🍫', false),
      (s_id, 'Pies',         '🥧', false),
      (s_id, 'Frozen yogurt','🍧', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Packaged Foods ────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_packaged AND name = 'Canned Goods';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Vegetables', '🌽', false),
      (s_id, 'Fruit',      '🍑', false),
      (s_id, 'Soup',       '🍜', false),
      (s_id, 'Beans',      '🫘', false),
      (s_id, 'Meat',       '🍖', false),
      (s_id, 'Fish',       '🐟', false),
      (s_id, 'Sauces',     '🍅', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_packaged AND name = 'Dry Grocery';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Rice',   '🍚', false),
      (s_id, 'Pasta',  '🍝', false),
      (s_id, 'Flour',  '🌾', false),
      (s_id, 'Sugar',  '🍬', false),
      (s_id, 'Salt',   '🧂', false),
      (s_id, 'Grains', '🌾', false),
      (s_id, 'Cereal', '🥣', false),
      (s_id, 'Beans',  '🫘', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_packaged AND name = 'Condiments';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Ketchup',         '🍅', false),
      (s_id, 'Mustard',         '🟡', false),
      (s_id, 'Mayo',            '🥪', false),
      (s_id, 'Salad dressing',  '🥗', false),
      (s_id, 'Vinegar',         '🍾', false),
      (s_id, 'Hot sauce',       '🌶️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_packaged AND name = 'Spices and Seasonings';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Herbs',            '🌿', false),
      (s_id, 'Spice blends',     '🧂', false),
      (s_id, 'Marinades',        '🍲', false),
      (s_id, 'Bouillon',         '🧊', false),
      (s_id, 'Seasoning mixes',  '🧂', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_packaged AND name = 'Snacks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Chips',     '🥔', false),
      (s_id, 'Crackers',  '🍘', false),
      (s_id, 'Nuts',      '🥜', false),
      (s_id, 'Popcorn',   '🍿', false),
      (s_id, 'Pretzels',  '🥨', false),
      (s_id, 'Trail mix', '🥜', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_packaged AND name = 'Breakfast Foods';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cereal',       '🥣', false),
      (s_id, 'Oats',         '🌾', false),
      (s_id, 'Pancake mix',  '🥞', false),
      (s_id, 'Syrup',        '🍯', false),
      (s_id, 'Breakfast bars','🍫', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Beverages ─────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Soft Drinks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cola',          '🥤', false),
      (s_id, 'Lemon-lime',    '🫗', false),
      (s_id, 'Root beer',     '🟤', false),
      (s_id, 'Flavored soda', '🍒', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Juice';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fruit juice',     '🍊', false),
      (s_id, 'Vegetable juice', '🥕', false),
      (s_id, 'Juice blends',    '🍹', false),
      (s_id, 'Smoothies',       '🥤', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Water';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Still water',    '💧', false),
      (s_id, 'Sparkling water','🫧', false),
      (s_id, 'Flavored water', '🍋', false),
      (s_id, 'Purified water', '🚰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Tea and Coffee';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Ground coffee',  '☕', false),
      (s_id, 'Instant coffee', '⚪', false),
      (s_id, 'Tea bags',       '🍵', false),
      (s_id, 'Bottled tea',    '🧊', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_bev AND name = 'Energy Drinks';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Energy cans',          '⚡', false),
      (s_id, 'Energy shots',         '🧃', false),
      (s_id, 'Sports energy drinks', '🏃', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Health and Beauty ─────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hb AND name = 'Oral Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Toothpaste',   '🪥', false),
      (s_id, 'Toothbrushes', '🪥', false),
      (s_id, 'Mouthwash',    '🧴', false),
      (s_id, 'Floss',        '🧵', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hb AND name = 'Skin Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Lotion',     '🧼', false),
      (s_id, 'Soap',       '🧼', false),
      (s_id, 'Body wash',  '🚿', false),
      (s_id, 'Face wash',  '🧴', false),
      (s_id, 'Sunscreen',  '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hb AND name = 'Hair Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Shampoo',          '🧴', false),
      (s_id, 'Conditioner',      '🧴', false),
      (s_id, 'Styling products', '💆', false),
      (s_id, 'Hair treatment',   '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hb AND name = 'Personal Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Deodorant',        '🧴', false),
      (s_id, 'Shaving products', '🪒', false),
      (s_id, 'Feminine care',    '🩸', false),
      (s_id, 'Razors',           '🪒', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Household and Cleaning ────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hc AND name = 'Laundry';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Detergent',       '🧼', false),
      (s_id, 'Fabric softener', '🌸', false),
      (s_id, 'Stain remover',   '🧽', false),
      (s_id, 'Bleach',          '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hc AND name = 'Cleaning Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'All-purpose cleaner', '🧽', false),
      (s_id, 'Disinfectant',        '🦠', false),
      (s_id, 'Glass cleaner',       '🪟', false),
      (s_id, 'Sponges',             '🧽', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hc AND name = 'Paper Products';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Toilet tissue',  '🧻', false),
      (s_id, 'Paper towels',   '🧻', false),
      (s_id, 'Napkins',        '🧻', false),
      (s_id, 'Tissues',        '🧻', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hc AND name = 'Kitchen Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Foil',         '🧻', false),
      (s_id, 'Plastic wrap', '🧴', false),
      (s_id, 'Trash bags',   '🗑️', false),
      (s_id, 'Storage bags', '🫙', false),
      (s_id, 'Dish soap',    '🧼', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── General Merchandise ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_gm AND name = 'Household Goods';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Light bulbs',  '💡', false),
      (s_id, 'Batteries',    '🔋', false),
      (s_id, 'Storage bins', '📦', false),
      (s_id, 'Hangers',      '🧺', false),
      (s_id, 'Candles',      '🕯️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_gm AND name = 'Seasonal';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Holiday items',   '🎁', false),
      (s_id, 'School supplies', '🎒', false),
      (s_id, 'Summer items',    '☀️', false),
      (s_id, 'Winter items',    '❄️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_gm AND name = 'Small Appliances';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fans',      '🪭', false),
      (s_id, 'Kettles',   '☕', false),
      (s_id, 'Microwaves','🍲', false),
      (s_id, 'Blenders',  '🥤', false),
      (s_id, 'Air fryers','🍟', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_gm AND name = 'Hardware';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Tools',           '🛠️', false),
      (s_id, 'Tape',            '🩹', false),
      (s_id, 'Extension cords', '🔌', false),
      (s_id, 'Locks',           '🔒', false),
      (s_id, 'Fasteners',       '📎', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Pet Supplies ──────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pet AND name = 'Dog Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Dog food',    '🐶', false),
      (s_id, 'Treats',      '🍖', false),
      (s_id, 'Pads',        '🩹', false),
      (s_id, 'Shampoo',     '🧴', false),
      (s_id, 'Accessories', '🦴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pet AND name = 'Cat Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cat food',      '🐈', false),
      (s_id, 'Litter',        '🪣', false),
      (s_id, 'Treats',        '🍪', false),
      (s_id, 'Toys',          '🧶', false),
      (s_id, 'Grooming items','🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Baby Care ─────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_baby AND name = 'Infant Formula';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Formula',          '🍼', false),
      (s_id, 'Baby milk',        '🥛', false),
      (s_id, 'Feeding supplies', '🥣', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_baby AND name = 'Diapers and Wipes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Diapers',        '🧷', false),
      (s_id, 'Training pants', '👖', false),
      (s_id, 'Wipes',          '🧻', false),
      (s_id, 'Rash cream',     '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_baby AND name = 'Baby Food';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Purees',  '🍎', false),
      (s_id, 'Cereals', '🌾', false),
      (s_id, 'Snacks',  '🍪', false),
      (s_id, 'Drinks',  '🧃', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Tobacco and Lottery ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_tobacco AND name = 'Tobacco';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cigarettes',                 '🚬', false),
      (s_id, 'Cigars',                     '🌿', false),
      (s_id, 'Rolling tobacco',            '🌀', false),
      (s_id, 'Vape products where allowed','💨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_tobacco AND name = 'Lottery';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Tickets',       '🎫', false),
      (s_id, 'Scratch cards', '🧾', false),
      (s_id, 'Terminal sales','🖥️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Pharmacy and Wellness ─────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pharma AND name = 'Vitamins';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Multivitamins', '💊', false),
      (s_id, 'Supplements',   '🧪', false),
      (s_id, 'Minerals',      '⚪', false),
      (s_id, 'Protein',       '🥤', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pharma AND name = 'OTC Medicine';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Pain relief',    '💊', false),
      (s_id, 'Cold and flu',   '🤧', false),
      (s_id, 'Allergy',        '🌼', false),
      (s_id, 'Digestive care', '🍽️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pharma AND name = 'First Aid';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Bandages',    '🩹', false),
      (s_id, 'Ointment',    '🧴', false),
      (s_id, 'Antiseptics', '🧴', false),
      (s_id, 'Thermometers','🌡️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END;
$$;
