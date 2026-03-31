-- Seed all sub-subcategories for Personal Expenses domain
-- Safe to re-run: ON CONFLICT DO UPDATE

DO $$
DECLARE
  d_id TEXT;
  cat_housing TEXT; cat_food TEXT; cat_transport TEXT; cat_health TEXT;
  cat_clothing TEXT; cat_edu TEXT; cat_leisure TEXT; cat_family TEXT;
  cat_financial TEXT; cat_tech TEXT; cat_gifts TEXT; cat_misc TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Personal Expenses';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_housing   FROM expense_categories WHERE "domainId" = d_id AND name = 'Housing';
  SELECT id INTO cat_food      FROM expense_categories WHERE "domainId" = d_id AND name = 'Food and Dining';
  SELECT id INTO cat_transport FROM expense_categories WHERE "domainId" = d_id AND name = 'Transportation';
  SELECT id INTO cat_health    FROM expense_categories WHERE "domainId" = d_id AND name = 'Health and Wellness';
  SELECT id INTO cat_clothing  FROM expense_categories WHERE "domainId" = d_id AND name = 'Clothing and Accessories';
  SELECT id INTO cat_edu       FROM expense_categories WHERE "domainId" = d_id AND name = 'Education';
  SELECT id INTO cat_leisure   FROM expense_categories WHERE "domainId" = d_id AND name = 'Personal and Leisure';
  SELECT id INTO cat_family    FROM expense_categories WHERE "domainId" = d_id AND name = 'Family and Dependents';
  SELECT id INTO cat_financial FROM expense_categories WHERE "domainId" = d_id AND name = 'Financial Obligations';
  SELECT id INTO cat_tech      FROM expense_categories WHERE "domainId" = d_id AND name = 'Technology and Subscriptions';
  SELECT id INTO cat_gifts     FROM expense_categories WHERE "domainId" = d_id AND name = 'Gifts and Donations';
  SELECT id INTO cat_misc      FROM expense_categories WHERE "domainId" = d_id AND name = 'Miscellaneous';

  -- ── Housing ───────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_housing AND name = 'Rent and Mortgage';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Rent',              '🏠', false),
      (s_id, 'Mortgage payment',  '🏦', false),
      (s_id, 'Property tax',      '📄', false),
      (s_id, 'Home insurance',    '🛡️', false),
      (s_id, 'HOA fees',          '🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_housing AND name = 'Home Maintenance';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Repairs',           '🪛', false),
      (s_id, 'Painting',          '🎨', false),
      (s_id, 'Cleaning supplies', '🧹', false),
      (s_id, 'Minor improvements','🛠️', false),
      (s_id, 'Home tools',        '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_housing AND name = 'Utilities';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Electricity',      '💡', false),
      (s_id, 'Water',            '💧', false),
      (s_id, 'Gas',              '🔥', false),
      (s_id, 'Internet',         '🌐', false),
      (s_id, 'Phone',            '📞', false),
      (s_id, 'Trash collection', '🗑️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Food and Dining ───────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_food AND name = 'Groceries';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Produce',          '🥦', false),
      (s_id, 'Meat',             '🥩', false),
      (s_id, 'Packaged foods',   '🥫', false),
      (s_id, 'Beverages',        '🧃', false),
      (s_id, 'Household items',  '🧼', false),
      (s_id, 'Paper products',   '🧻', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_food AND name = 'Dining Out';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fast food',     '🍕', false),
      (s_id, 'Casual dining', '🍽️', false),
      (s_id, 'Fine dining',   '🍷', false),
      (s_id, 'Coffee shops',  '☕', false),
      (s_id, 'Takeout',       '🥡', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_food AND name = 'Snacks and Treats';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Candy',      '🍫', false),
      (s_id, 'Cookies',    '🍪', false),
      (s_id, 'Chips',      '🍿', false),
      (s_id, 'Soft drinks','🥤', false),
      (s_id, 'Desserts',   '🍦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Transportation ────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_transport AND name = 'Vehicle Fuel';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Gasoline',          '⛽', false),
      (s_id, 'Electric charging', '🔋', false),
      (s_id, 'Oil',               '🛢️', false),
      (s_id, 'Fluids',            '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_transport AND name = 'Vehicle Maintenance';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Repairs',       '🔧', false),
      (s_id, 'Tires',         '🛞', false),
      (s_id, 'Parts',         '🧰', false),
      (s_id, 'Car wash',      '🧽', false),
      (s_id, 'Registration',  '🪪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_transport AND name = 'Public and Other Transport';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Bus fare',        '🚌', false),
      (s_id, 'Subway fare',     '🚇', false),
      (s_id, 'Rideshare',       '🚕', false),
      (s_id, 'Train fare',      '🚆', false),
      (s_id, 'Travel transport','✈️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Health and Wellness ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Medical';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Doctor visits',  '🧑‍⚕️', false),
      (s_id, 'Hospital visits','🏥', false),
      (s_id, 'Prescriptions',  '💊', false),
      (s_id, 'Lab tests',      '🧪', false),
      (s_id, 'Dental care',    '🦷', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Wellness';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Yoga',              '🧘', false),
      (s_id, 'Gym membership',    '🏋️', false),
      (s_id, 'Massage',           '💆', false),
      (s_id, 'Therapy',           '🧠', false),
      (s_id, 'Nutrition coaching','🍏', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Personal Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Oral care',  '🪥', false),
      (s_id, 'Skin care',  '🧴', false),
      (s_id, 'Hair care',  '💇', false),
      (s_id, 'Grooming',   '🪒', false),
      (s_id, 'Cosmetics',  '💄', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Clothing and Accessories ──────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clothing AND name = 'Apparel';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Shirts',  '👕', false),
      (s_id, 'Pants',   '👖', false),
      (s_id, 'Dresses', '👗', false),
      (s_id, 'Jackets', '🧥', false),
      (s_id, 'Shorts',  '🩳', false),
      (s_id, 'Socks',   '🧦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clothing AND name = 'Footwear';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Shoes',   '👟', false),
      (s_id, 'Boots',   '🥾', false),
      (s_id, 'Flats',   '🥿', false),
      (s_id, 'Sandals', '🩴', false),
      (s_id, 'Insoles', '🧦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clothing AND name = 'Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Hats',    '🧢', false),
      (s_id, 'Scarves', '🧣', false),
      (s_id, 'Gloves',  '🧤', false),
      (s_id, 'Bags',    '👜', false),
      (s_id, 'Watches', '⌚', false),
      (s_id, 'Jewelry', '💍', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Education ─────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_edu AND name = 'School and Courses';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Tuition',   '🏫', false),
      (s_id, 'Books',     '📖', false),
      (s_id, 'Supplies',  '📝', false),
      (s_id, 'Software',  '💻', false),
      (s_id, 'Exam fees', '🎓', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_edu AND name = 'Training';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Workshops',       '🧠', false),
      (s_id, 'Certifications',  '🧾', false),
      (s_id, 'Online courses',  '🧑‍💻', false),
      (s_id, 'Seminars',        '🎤', false),
      (s_id, 'Membership fees', '📋', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Personal and Leisure ──────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_leisure AND name = 'Entertainment';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Movies',             '🎥', false),
      (s_id, 'Music',              '🎵', false),
      (s_id, 'Games',              '🎮', false),
      (s_id, 'Streaming services', '📺', false),
      (s_id, 'Events',             '🎟️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_leisure AND name = 'Travel';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Flights',         '🛫', false),
      (s_id, 'Hotels',          '🏨', false),
      (s_id, 'Car rental',      '🚗', false),
      (s_id, 'Travel dining',   '🍴', false),
      (s_id, 'Travel supplies', '🧳', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_leisure AND name = 'Hobbies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Arts and crafts', '🖌️', false),
      (s_id, 'Photography',     '📷', false),
      (s_id, 'Gardening',       '🪴', false),
      (s_id, 'Puzzles',         '🧩', false),
      (s_id, 'Sewing',          '🧵', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Family and Dependents ─────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_family AND name = 'Baby Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Formula',      '🍼', false),
      (s_id, 'Diapers',      '👶', false),
      (s_id, 'Wipes',        '🧻', false),
      (s_id, 'Baby toys',    '🧸', false),
      (s_id, 'Baby products','🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_family AND name = 'Children''s Needs';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'School fees',     '🏫', false),
      (s_id, 'School supplies', '🎒', false),
      (s_id, 'Clothing',        '👕', false),
      (s_id, 'Lunch money',     '🍱', false),
      (s_id, 'Activities',      '🎨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_family AND name = 'Elder Care';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Medical support',  '🧑‍⚕️', false),
      (s_id, 'Care supplies',    '🧴', false),
      (s_id, 'Transport',        '🚕', false),
      (s_id, 'Home assistance',  '🏠', false),
      (s_id, 'Service fees',     '🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Financial Obligations ─────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_financial AND name = 'Debt Payments';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Credit cards',       '💳', false),
      (s_id, 'Personal loans',     '🏦', false),
      (s_id, 'Auto loans',         '🚗', false),
      (s_id, 'Mortgage principal', '🏠', false),
      (s_id, 'Student loans',      '🎓', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_financial AND name = 'Banking Fees';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Account fees',     '🧾', false),
      (s_id, 'Transfer fees',    '💸', false),
      (s_id, 'ATM fees',         '🏧', false),
      (s_id, 'Exchange fees',    '💱', false),
      (s_id, 'Overdraft charges','🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_financial AND name = 'Insurance';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Auto insurance',   '🚗', false),
      (s_id, 'Home insurance',   '🏠', false),
      (s_id, 'Health insurance', '🩺', false),
      (s_id, 'Life insurance',   '🧍', false),
      (s_id, 'Travel insurance', '✈️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Technology and Subscriptions ──────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_tech AND name = 'Devices';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Phone',       '📱', false),
      (s_id, 'Laptop',      '💻', false),
      (s_id, 'Desktop',     '🖥️', false),
      (s_id, 'Accessories', '🎧', false),
      (s_id, 'Chargers',    '🔋', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_tech AND name = 'Subscriptions';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Streaming',          '📺', false),
      (s_id, 'Music',              '🎵', false),
      (s_id, 'Cloud storage',      '☁️', false),
      (s_id, 'News apps',          '📰', false),
      (s_id, 'Gaming subscriptions','🎮', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_tech AND name = 'Software and Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Apps',                '🧑‍💻', false),
      (s_id, 'Security software',   '🔐', false),
      (s_id, 'Repairs',             '🛠️', false),
      (s_id, 'Domains and hosting', '🌐', false),
      (s_id, 'Licenses',            '🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Gifts and Donations ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_gifts AND name = 'Gifts';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Birthdays',   '🎂', false),
      (s_id, 'Holidays',    '🎄', false),
      (s_id, 'Celebrations','💐', false),
      (s_id, 'Graduation',  '🎓', false),
      (s_id, 'Weddings',    '💍', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_gifts AND name = 'Donations';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Charity',             '🫶', false),
      (s_id, 'Religious donations', '🕌', false),
      (s_id, 'School donations',    '🏫', false),
      (s_id, 'Animal support',      '🐾', false),
      (s_id, 'Community support',   '🏥', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Miscellaneous ─────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_misc AND name = 'Fees and Charges';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Late fees',           '🧾', false),
      (s_id, 'Service charges',     '💸', false),
      (s_id, 'Processing fees',     '🏦', false),
      (s_id, 'Permit fees',         '🪪', false),
      (s_id, 'Miscellaneous charges','🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_misc AND name = 'One-time Purchases';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Furniture',          '🪑', false),
      (s_id, 'Household items',    '🧺', false),
      (s_id, 'Supplies',           '🧴', false),
      (s_id, 'Replacement items',  '🛠️', false),
      (s_id, 'Unexpected expenses','🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END;
$$;
