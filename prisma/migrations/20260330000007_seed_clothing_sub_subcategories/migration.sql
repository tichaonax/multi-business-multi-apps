-- Seed all sub-subcategories for Clothing business domain
-- Domain: Clothing | 10 categories, 32 subcategories
-- Safe to re-run: ON CONFLICT DO UPDATE

DO $$
DECLARE
  d_id TEXT;
  cat_apparel TEXT; cat_mens TEXT; cat_womens TEXT; cat_kids TEXT;
  cat_baby TEXT; cat_foot TEXT; cat_acc TEXT; cat_intimates TEXT;
  cat_active TEXT; cat_spec TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Clothing';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_apparel   FROM expense_categories WHERE "domainId" = d_id AND name = 'Apparel';
  SELECT id INTO cat_mens      FROM expense_categories WHERE "domainId" = d_id AND name = 'Men''s Clothing';
  SELECT id INTO cat_womens    FROM expense_categories WHERE "domainId" = d_id AND name = 'Women''s Clothing';
  SELECT id INTO cat_kids      FROM expense_categories WHERE "domainId" = d_id AND name = 'Kids Clothing';
  SELECT id INTO cat_baby      FROM expense_categories WHERE "domainId" = d_id AND name = 'Baby Wear';
  SELECT id INTO cat_foot      FROM expense_categories WHERE "domainId" = d_id AND name = 'Footwear';
  SELECT id INTO cat_acc       FROM expense_categories WHERE "domainId" = d_id AND name = 'Accessories';
  SELECT id INTO cat_intimates FROM expense_categories WHERE "domainId" = d_id AND name = 'Intimates and Sleepwear';
  SELECT id INTO cat_active    FROM expense_categories WHERE "domainId" = d_id AND name = 'Activewear';
  SELECT id INTO cat_spec      FROM expense_categories WHERE "domainId" = d_id AND name = 'Specialty Clothing';

  -- ── Apparel ───────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_apparel AND name = 'Tops';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'T-Shirts',          '👕', false),
      (s_id, 'Polo Shirts',       '👔', false),
      (s_id, 'Button-Down Shirts','👔', false),
      (s_id, 'Blouses',           '👚', false),
      (s_id, 'Hoodies',           '🧥', false),
      (s_id, 'Sweatshirts',       '🧥', false),
      (s_id, 'Jackets',           '🧥', false),
      (s_id, 'Sweaters',          '🧥', false),
      (s_id, 'Tunics',            '🧣', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_apparel AND name = 'Bottoms';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Jeans',       '👖', false),
      (s_id, 'Pants',       '👖', false),
      (s_id, 'Shorts',      '🩳', false),
      (s_id, 'Skirts',      '👗', false),
      (s_id, 'Leggings',    '👖', false),
      (s_id, 'Joggers',     '🩳', false),
      (s_id, 'Cargo Pants', '🩳', false),
      (s_id, 'Dress Pants', '👖', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_apparel AND name = 'Dresses and Sets';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Casual Dresses', '👗', false),
      (s_id, 'Formal Dresses', '👗', false),
      (s_id, 'Maxi Dresses',   '👗', false),
      (s_id, 'Midi Dresses',   '👗', false),
      (s_id, 'Mini Dresses',   '👗', false),
      (s_id, 'Matching Sets',  '👘', false),
      (s_id, 'Jumpsuits',      '👗', false),
      (s_id, 'Rompers',        '👗', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_apparel AND name = 'Outerwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Coats',       '🧥', false),
      (s_id, 'Jackets',     '🧥', false),
      (s_id, 'Blazers',     '🧥', false),
      (s_id, 'Parkas',      '🧥', false),
      (s_id, 'Vests',       '🧥', false),
      (s_id, 'Raincoats',   '🧥', false),
      (s_id, 'Windbreakers','🧥', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Men's Clothing ────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mens AND name = 'Men''s Tops';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'T-Shirts',     '👕', false),
      (s_id, 'Polo Shirts',  '👔', false),
      (s_id, 'Dress Shirts', '👔', false),
      (s_id, 'Hoodies',      '🧥', false),
      (s_id, 'Sweatshirts',  '🧥', false),
      (s_id, 'Sweaters',     '🧥', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mens AND name = 'Men''s Bottoms';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Jeans',        '👖', false),
      (s_id, 'Dress Pants',  '👖', false),
      (s_id, 'Shorts',       '🩳', false),
      (s_id, 'Joggers',      '🩳', false),
      (s_id, 'Casual Pants', '👖', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mens AND name = 'Men''s Outerwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Jackets', '🧥', false),
      (s_id, 'Coats',   '🧥', false),
      (s_id, 'Blazers', '🧥', false),
      (s_id, 'Vests',   '🧥', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_mens AND name = 'Men''s Footwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Sneakers',    '👟', false),
      (s_id, 'Dress Shoes', '👞', false),
      (s_id, 'Boots',       '🥾', false),
      (s_id, 'Sandals',     '🩴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Women's Clothing ──────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_womens AND name = 'Women''s Tops';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Blouses',        '👚', false),
      (s_id, 'T-Shirts',       '👕', false),
      (s_id, 'Button-Up Shirts','👔', false),
      (s_id, 'Sweaters',       '🧥', false),
      (s_id, 'Cardigans',      '🧥', false),
      (s_id, 'Hoodies',        '🧥', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_womens AND name = 'Women''s Bottoms';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Jeans',    '👖', false),
      (s_id, 'Pants',    '👖', false),
      (s_id, 'Shorts',   '🩳', false),
      (s_id, 'Skirts',   '👗', false),
      (s_id, 'Leggings', '👖', false),
      (s_id, 'Joggers',  '🩳', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_womens AND name = 'Women''s Dresses';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Casual Dresses', '👗', false),
      (s_id, 'Formal Dresses', '👗', false),
      (s_id, 'Maxi Dresses',   '👗', false),
      (s_id, 'Midi Dresses',   '👗', false),
      (s_id, 'Mini Dresses',   '👗', false),
      (s_id, 'Party Dresses',  '👗', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_womens AND name = 'Women''s Outerwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Coats',     '🧥', false),
      (s_id, 'Jackets',   '🧥', false),
      (s_id, 'Blazers',   '🧥', false),
      (s_id, 'Vests',     '🧥', false),
      (s_id, 'Raincoats', '🧥', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_womens AND name = 'Women''s Footwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Heels',   '👠', false),
      (s_id, 'Sneakers','👟', false),
      (s_id, 'Flats',   '🥿', false),
      (s_id, 'Boots',   '🥾', false),
      (s_id, 'Sandals', '🩴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Kids Clothing ─────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_kids AND name = 'Boys Clothing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'T-Shirts',          '👕', false),
      (s_id, 'Polo Shirts',       '👔', false),
      (s_id, 'Button-Down Shirts','👔', false),
      (s_id, 'Jeans',             '👖', false),
      (s_id, 'Shorts',            '🩳', false),
      (s_id, 'Hoodies',           '🧥', false),
      (s_id, 'Shoes',             '🥾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_kids AND name = 'Girls Clothing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Tops',    '👚', false),
      (s_id, 'Dresses', '👗', false),
      (s_id, 'Jeans',   '👖', false),
      (s_id, 'Skirts',  '👗', false),
      (s_id, 'Shorts',  '🩳', false),
      (s_id, 'Jackets', '🧥', false),
      (s_id, 'Shoes',   '🥿', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_kids AND name = 'Infant Clothing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Onesies',  '👕', false),
      (s_id, 'Bodysuits','🍼', false),
      (s_id, 'Sleepers', '🧦', false),
      (s_id, 'Hats',     '🧢', false),
      (s_id, 'Mittens',  '🧤', false),
      (s_id, 'Socks',    '🧦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Baby Wear ─────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_baby AND name = 'Newborn Essentials';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Onesies',  '👕', false),
      (s_id, 'Sleepers', '🧦', false),
      (s_id, 'Caps',     '🧢', false),
      (s_id, 'Mittens',  '🧤', false),
      (s_id, 'Socks',    '🧦', false),
      (s_id, 'Bibs',     '🍼', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_baby AND name = 'Baby Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Swaddles',    '🧷', false),
      (s_id, 'Blankets',    '🛏️', false),
      (s_id, 'Hats',        '🧢', false),
      (s_id, 'Booties',     '🧦', false),
      (s_id, 'Burp Cloths', '🍼', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Footwear ──────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_foot AND name = 'Casual Shoes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Sneakers', '👟', false),
      (s_id, 'Slip-ons', '🥿', false),
      (s_id, 'Sandals',  '🩴', false),
      (s_id, 'Boots',    '🥾', false),
      (s_id, 'Flats',    '🥿', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_foot AND name = 'Formal Shoes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Dress Shoes', '👞', false),
      (s_id, 'Heels',       '👠', false),
      (s_id, 'Loafers',     '🥿', false),
      (s_id, 'Oxfords',     '👞', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_foot AND name = 'Sports Shoes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Running Shoes',    '👟', false),
      (s_id, 'Basketball Shoes', '🏀', false),
      (s_id, 'Training Shoes',   '⚽', false),
      (s_id, 'Hiking Shoes',     '🥾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Accessories ───────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_acc AND name = 'Headwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Caps',        '🧢', false),
      (s_id, 'Hats',        '🎩', false),
      (s_id, 'Beanies',     '🪖', false),
      (s_id, 'Headscarves', '🧕', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_acc AND name = 'Wearable Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Gloves',  '🧤', false),
      (s_id, 'Scarves', '🧣', false),
      (s_id, 'Socks',   '🧦', false),
      (s_id, 'Shawls',  '🧣', false),
      (s_id, 'Tights',  '🧦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_acc AND name = 'Bags';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Handbags',    '👜', false),
      (s_id, 'Backpacks',   '🎒', false),
      (s_id, 'Travel Bags', '🧳', false),
      (s_id, 'Clutches',    '👝', false),
      (s_id, 'Tote Bags',   '🛍️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_acc AND name = 'Fashion Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Sunglasses', '👓', false),
      (s_id, 'Watches',    '⌚', false),
      (s_id, 'Jewelry',    '💍', false),
      (s_id, 'Belts',      '🪢', false),
      (s_id, 'Brooches',   '🧷', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Intimates and Sleepwear ───────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_intimates AND name = 'Underwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Briefs',      '🩲', false),
      (s_id, 'Boxers',      '🩳', false),
      (s_id, 'Bras',        '👙', false),
      (s_id, 'Undershirts', '🩱', false),
      (s_id, 'Socks',       '🧦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_intimates AND name = 'Sleepwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Pajamas',    '😴', false),
      (s_id, 'Nightgowns', '🛌', false),
      (s_id, 'Sleep socks','🧦', false),
      (s_id, 'Robes',      '🧥', false),
      (s_id, 'Lounge sets','🩳', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Activewear ────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_active AND name = 'Sportswear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Gym Shorts',     '🩳', false),
      (s_id, 'Training Shirts','👕', false),
      (s_id, 'Track Pants',    '👖', false),
      (s_id, 'Track Jackets',  '🧥', false),
      (s_id, 'Sports Socks',   '🧦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_active AND name = 'Athleisure';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Joggers',   '🩳', false),
      (s_id, 'Sweat Tees','👕', false),
      (s_id, 'Hoodies',   '🧥', false),
      (s_id, 'Leggings',  '👖', false),
      (s_id, 'Caps',      '🧢', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Specialty Clothing ────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_spec AND name = 'Cultural Wear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Hijabs',              '🧕', false),
      (s_id, 'Traditional garments','👘', false),
      (s_id, 'Embroidered wear',    '🪡', false),
      (s_id, 'Long tunics',         '🧥', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_spec AND name = 'Workwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Uniforms',       '🦺', false),
      (s_id, 'Aprons',         '👕', false),
      (s_id, 'Work pants',     '👖', false),
      (s_id, 'Safety boots',   '🥾', false),
      (s_id, 'Reflective wear','🦺', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_spec AND name = 'Formal and Event Wear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Suits',         '🤵', false),
      (s_id, 'Evening gowns', '👗', false),
      (s_id, 'Dress shirts',  '👔', false),
      (s_id, 'Formal shoes',  '👠', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END;
$$;
