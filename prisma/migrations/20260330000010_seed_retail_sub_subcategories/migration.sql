-- Seed all sub-subcategories for Retail business domain
-- Safe to re-run: ON CONFLICT DO UPDATE

DO $$
DECLARE
  d_id TEXT;
  cat_general TEXT; cat_apparel TEXT; cat_hb TEXT; cat_hardware TEXT;
  cat_furniture TEXT; cat_electronics TEXT; cat_toys TEXT;
  cat_kitchen TEXT; cat_auto TEXT; cat_pet TEXT;
  cat_baby TEXT; cat_seasonal TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Retail';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_general     FROM expense_categories WHERE "domainId" = d_id AND name = 'General Retail';
  SELECT id INTO cat_apparel     FROM expense_categories WHERE "domainId" = d_id AND name = 'Apparel Retail';
  SELECT id INTO cat_hb          FROM expense_categories WHERE "domainId" = d_id AND name = 'Health and Beauty Retail';
  SELECT id INTO cat_hardware    FROM expense_categories WHERE "domainId" = d_id AND name = 'Hardware and Home Improvement Retail';
  SELECT id INTO cat_furniture   FROM expense_categories WHERE "domainId" = d_id AND name = 'Furniture and Home Goods';
  SELECT id INTO cat_electronics FROM expense_categories WHERE "domainId" = d_id AND name = 'Electronics Retail';
  SELECT id INTO cat_toys        FROM expense_categories WHERE "domainId" = d_id AND name = 'Toy and Hobby Retail';
  SELECT id INTO cat_kitchen     FROM expense_categories WHERE "domainId" = d_id AND name = 'Kitchen and Housewares';
  SELECT id INTO cat_auto        FROM expense_categories WHERE "domainId" = d_id AND name = 'Auto Retail';
  SELECT id INTO cat_pet         FROM expense_categories WHERE "domainId" = d_id AND name = 'Pet Retail';
  SELECT id INTO cat_baby        FROM expense_categories WHERE "domainId" = d_id AND name = 'Baby Retail';
  SELECT id INTO cat_seasonal    FROM expense_categories WHERE "domainId" = d_id AND name = 'Seasonal and Specialty Retail';

  -- ── General Retail ────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_general AND name = 'Storefront Goods';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Toys',                '🧸', false),
      (s_id, 'Books',               '📚', false),
      (s_id, 'Gifts',               '🎁', false),
      (s_id, 'Home decor',          '🖼️', false),
      (s_id, 'Candles',             '🕯️', false),
      (s_id, 'Storage items',       '🧺', false),
      (s_id, 'Small household items','🪴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_general AND name = 'Impulse Items';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Candy',              '🍬', false),
      (s_id, 'Chocolates',         '🍫', false),
      (s_id, 'Snacks',             '🥤', false),
      (s_id, 'Batteries',          '🔋', false),
      (s_id, 'Travel tissue',      '🧻', false),
      (s_id, 'Small health items', '🩹', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Apparel Retail ────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_apparel AND name = 'Clothing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'T-shirts',  '👕', false),
      (s_id, 'Shirts',    '👔', false),
      (s_id, 'Pants',     '👖', false),
      (s_id, 'Dresses',   '👗', false),
      (s_id, 'Shorts',    '🩳', false),
      (s_id, 'Jackets',   '🧥', false),
      (s_id, 'Socks',     '🧦', false),
      (s_id, 'Hats',      '🧢', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_apparel AND name = 'Footwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Sneakers',   '👟', false),
      (s_id, 'Dress shoes','👞', false),
      (s_id, 'Boots',      '🥾', false),
      (s_id, 'Flats',      '🥿', false),
      (s_id, 'Sandals',    '🩴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_apparel AND name = 'Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Scarves',    '🧣', false),
      (s_id, 'Gloves',     '🧤', false),
      (s_id, 'Handbags',   '👜', false),
      (s_id, 'Belts',      '🪢', false),
      (s_id, 'Jewelry',    '💍', false),
      (s_id, 'Watches',    '⌚', false),
      (s_id, 'Sunglasses', '👓', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Health and Beauty Retail ──────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hb AND name = 'Cosmetics';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Lipstick',     '💋', false),
      (s_id, 'Makeup kits',  '🪞', false),
      (s_id, 'Foundation',   '🧴', false),
      (s_id, 'Eyeliner',     '👁️', false),
      (s_id, 'Nail products','💅', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hb AND name = 'Personal Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Oral care',        '🪥', false),
      (s_id, 'Hair care',        '🧴', false),
      (s_id, 'Skin care',        '🧼', false),
      (s_id, 'Shaving products', '🪒', false),
      (s_id, 'Hygiene products', '🧻', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hb AND name = 'Wellness';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Vitamins',              '💊', false),
      (s_id, 'Supplements',           '🧪', false),
      (s_id, 'Herbal care',           '🌿', false),
      (s_id, 'First aid',             '🩹', false),
      (s_id, 'Protective health items','😷', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Hardware and Home Improvement Retail ──────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hardware AND name = 'Tools';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Hand tools',       '🛠️', false),
      (s_id, 'Power tools',      '⚡', false),
      (s_id, 'Tool accessories', '🧰', false),
      (s_id, 'Fastening tools',  '🪛', false),
      (s_id, 'Cutting tools',    '🪚', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hardware AND name = 'Hardware';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Screws',  '🔩', false),
      (s_id, 'Nails',   '🪙', false),
      (s_id, 'Bolts',   '🪛', false),
      (s_id, 'Anchors', '🧷', false),
      (s_id, 'Locks',   '🔒', false),
      (s_id, 'Hinges',  '🚪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_hardware AND name = 'Home Improvement';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Lumber',              '🪵', false),
      (s_id, 'Cement',              '🧱', false),
      (s_id, 'Paint',               '🎨', false),
      (s_id, 'Sealants',            '🧴', false),
      (s_id, 'Lighting',            '💡', false),
      (s_id, 'Electrical supplies', '🔌', false),
      (s_id, 'Plumbing supplies',   '🚿', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Furniture and Home Goods ──────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_furniture AND name = 'Furniture';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Beds',     '🛏️', false),
      (s_id, 'Chairs',   '🪑', false),
      (s_id, 'Sofas',    '🛋️', false),
      (s_id, 'Cabinets', '🗄️', false),
      (s_id, 'Tables',   '🪞', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_furniture AND name = 'Home Decor';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Clocks',            '🕰️', false),
      (s_id, 'Wall art',          '🖼️', false),
      (s_id, 'Decorative candles','🕯️', false),
      (s_id, 'Vases',             '🪴', false),
      (s_id, 'Curtains',          '🪟', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_furniture AND name = 'Storage';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Bins',               '📦', false),
      (s_id, 'Hampers',            '🧺', false),
      (s_id, 'Organizers',         '🗂️', false),
      (s_id, 'Hooks',              '🪝', false),
      (s_id, 'Closet accessories', '🧳', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Electronics Retail ────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_electronics AND name = 'Consumer Electronics';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Phones',       '📱', false),
      (s_id, 'Laptops',      '💻', false),
      (s_id, 'TVs',          '📺', false),
      (s_id, 'Headphones',   '🎧', false),
      (s_id, 'Speakers',     '🔊', false),
      (s_id, 'Smartwatches', '⌚', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_electronics AND name = 'Computer Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Mice',           '🖱️', false),
      (s_id, 'Keyboards',      '⌨️', false),
      (s_id, 'Printers',       '🖨️', false),
      (s_id, 'Cables',         '🔌', false),
      (s_id, 'Storage devices','💽', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_electronics AND name = 'Power and Charging';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Batteries',      '🔋', false),
      (s_id, 'Chargers',       '🔌', false),
      (s_id, 'Power banks',    '🔋', false),
      (s_id, 'Adapters',       '🔌', false),
      (s_id, 'Extension cords','⚡', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Toy and Hobby Retail ──────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_toys AND name = 'Toys';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Plush toys',  '🧸', false),
      (s_id, 'Puzzles',     '🧩', false),
      (s_id, 'Games',       '🪀', false),
      (s_id, 'RC toys',     '🚗', false),
      (s_id, 'Board games', '🎲', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_toys AND name = 'Crafts and Hobbies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Art supplies',     '🖍️', false),
      (s_id, 'Sewing supplies',  '🧵', false),
      (s_id, 'Craft tools',      '✂️', false),
      (s_id, 'DIY kits',         '🪡', false),
      (s_id, 'Painting supplies','🎨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_toys AND name = 'Entertainment';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Video games',       '🎮', false),
      (s_id, 'Game accessories',  '🕹️', false),
      (s_id, 'Game media',        '📀', false),
      (s_id, 'Audio accessories', '🎧', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Kitchen and Housewares ────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_kitchen AND name = 'Kitchenware';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cookware',   '🍳', false),
      (s_id, 'Dinnerware', '🍽️', false),
      (s_id, 'Utensils',   '🥄', false),
      (s_id, 'Bowls',      '🥣', false),
      (s_id, 'Cutlery',    '🍴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_kitchen AND name = 'Cleaning Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Dish soap',     '🧼', false),
      (s_id, 'Sponges',       '🧽', false),
      (s_id, 'Trash bags',    '🗑️', false),
      (s_id, 'Cleaners',      '🧴', false),
      (s_id, 'Paper products','🧻', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_kitchen AND name = 'Drinkware';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Mugs',     '☕', false),
      (s_id, 'Cups',     '🥤', false),
      (s_id, 'Glasses',  '🥛', false),
      (s_id, 'Tumblers', '🧊', false),
      (s_id, 'Bottles',  '🍼', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Auto Retail ───────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_auto AND name = 'Car Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Tires',              '🛞', false),
      (s_id, 'Batteries',          '🔋', false),
      (s_id, 'Car care products',  '🧴', false),
      (s_id, 'Cleaning supplies',  '🧽', false),
      (s_id, 'Seat covers',        '🚘', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_auto AND name = 'Maintenance Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Motor oil',     '🛢️', false),
      (s_id, 'Fluids',        '🧴', false),
      (s_id, 'Tools',         '🧰', false),
      (s_id, 'Emergency kits','🧯', false),
      (s_id, 'Bulbs',         '💡', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Pet Retail ────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pet AND name = 'Dog Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Food',          '🐶', false),
      (s_id, 'Treats',        '🍖', false),
      (s_id, 'Grooming items','🧴', false),
      (s_id, 'Toys',          '🦴', false),
      (s_id, 'Beds',          '🛏️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pet AND name = 'Cat Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Food',          '🐈', false),
      (s_id, 'Litter',        '🪣', false),
      (s_id, 'Grooming items','🧴', false),
      (s_id, 'Toys',          '🧶', false),
      (s_id, 'Beds',          '🛏️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_pet AND name = 'Small Animal and Bird';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Small animal food','🐹', false),
      (s_id, 'Bird feed',        '🐦', false),
      (s_id, 'Cages',            '🏠', false),
      (s_id, 'Care items',       '🧴', false),
      (s_id, 'Toys',             '🎾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Baby Retail ───────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_baby AND name = 'Baby Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Formula',      '🍼', false),
      (s_id, 'Diapers',      '👶', false),
      (s_id, 'Wipes',        '🧻', false),
      (s_id, 'Creams',       '🧴', false),
      (s_id, 'Baby toys',    '🧸', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_baby AND name = 'Baby Clothing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Onesies',   '👕', false),
      (s_id, 'Socks',     '🧦', false),
      (s_id, 'Hats',      '🧢', false),
      (s_id, 'Sleepwear', '🩳', false),
      (s_id, 'Blankets',  '🧣', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Seasonal and Specialty Retail ─────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_seasonal AND name = 'Seasonal Goods';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Holiday items',        '🎁', false),
      (s_id, 'Summer items',         '☀️', false),
      (s_id, 'Winter items',         '❄️', false),
      (s_id, 'Back-to-school items', '🎒', false),
      (s_id, 'Spring items',         '🌸', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_seasonal AND name = 'Clearance and Value';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Clearance items', '🏷️', false),
      (s_id, 'Discount goods',  '💲', false),
      (s_id, 'Bulk items',      '📦', false),
      (s_id, 'Premium items',   '⭐', false),
      (s_id, 'Transfer items',  '🔄', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END;
$$;
