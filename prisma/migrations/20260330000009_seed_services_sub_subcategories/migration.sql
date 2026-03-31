-- Seed all sub-subcategories for Services business domain
-- Safe to re-run: ON CONFLICT DO UPDATE

DO $$
DECLARE
  d_id TEXT;
  cat_home TEXT; cat_personal TEXT; cat_auto TEXT; cat_edu TEXT;
  cat_biz TEXT; cat_health TEXT; cat_clean TEXT; cat_logistics TEXT;
  cat_creative TEXT; cat_retail TEXT; cat_security TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Services';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_home      FROM expense_categories WHERE "domainId" = d_id AND name = 'Home and Repair Services';
  SELECT id INTO cat_personal  FROM expense_categories WHERE "domainId" = d_id AND name = 'Personal Care Services';
  SELECT id INTO cat_auto      FROM expense_categories WHERE "domainId" = d_id AND name = 'Automotive Services';
  SELECT id INTO cat_edu       FROM expense_categories WHERE "domainId" = d_id AND name = 'Education and Training Services';
  SELECT id INTO cat_biz       FROM expense_categories WHERE "domainId" = d_id AND name = 'Business and Office Services';
  SELECT id INTO cat_health    FROM expense_categories WHERE "domainId" = d_id AND name = 'Health and Wellness Services';
  SELECT id INTO cat_clean     FROM expense_categories WHERE "domainId" = d_id AND name = 'Cleaning Services';
  SELECT id INTO cat_logistics FROM expense_categories WHERE "domainId" = d_id AND name = 'Logistics and Delivery Services';
  SELECT id INTO cat_creative  FROM expense_categories WHERE "domainId" = d_id AND name = 'Creative Services';
  SELECT id INTO cat_retail    FROM expense_categories WHERE "domainId" = d_id AND name = 'Retail Support Services';
  SELECT id INTO cat_security  FROM expense_categories WHERE "domainId" = d_id AND name = 'Security Services';

  -- ── Home and Repair Services ──────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_home AND name = 'General Repairs';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Door repair',          '🚪', false),
      (s_id, 'Window repair',        '🪟', false),
      (s_id, 'Minor fixes',          '🧰', false),
      (s_id, 'Hardware replacement', '🪛', false),
      (s_id, 'Assembly services',    '🔩', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_home AND name = 'Maintenance Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Routine maintenance', '🧼', false),
      (s_id, 'Cleaning and upkeep', '🧽', false),
      (s_id, 'Drain clearing',      '🪠', false),
      (s_id, 'Electrical checks',   '🔌', false),
      (s_id, 'Plumbing checks',     '🚰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_home AND name = 'HVAC Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'AC repair',          '❄️', false),
      (s_id, 'Heating repair',     '🔥', false),
      (s_id, 'Vent cleaning',      '🌬️', false),
      (s_id, 'System inspection',  '🧯', false),
      (s_id, 'Filter replacement', '🛠️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Personal Care Services ────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_personal AND name = 'Hair Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Haircuts',      '✂️', false),
      (s_id, 'Hair coloring', '🎨', false),
      (s_id, 'Styling',       '💈', false),
      (s_id, 'Treatments',    '🧴', false),
      (s_id, 'Beard trimming','🪮', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_personal AND name = 'Nail Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Manicures',      '💅', false),
      (s_id, 'Pedicures',      '💅', false),
      (s_id, 'Nail art',       '💅', false),
      (s_id, 'Nail treatment', '🧴', false),
      (s_id, 'Acrylic nails',  '✨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_personal AND name = 'Spa Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Facials',           '💆', false),
      (s_id, 'Massages',          '🧖', false),
      (s_id, 'Body treatments',   '🛁', false),
      (s_id, 'Aromatherapy',      '🌿', false),
      (s_id, 'Skin care sessions','🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_personal AND name = 'Grooming Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Shaving',           '🪒', false),
      (s_id, 'Eyebrow shaping',   '✂️', false),
      (s_id, 'Hair removal',      '💇', false),
      (s_id, 'Beard grooming',    '🧴', false),
      (s_id, 'Skin consultation', '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Automotive Services ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_auto AND name = 'Maintenance';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Oil change',     '🛢️', false),
      (s_id, 'Tune-up',        '🔧', false),
      (s_id, 'Tire rotation',  '🛞', false),
      (s_id, 'Fluid top-up',   '🚗', false),
      (s_id, 'Battery check',  '🔋', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_auto AND name = 'Repair Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Brake repair',        '🔩', false),
      (s_id, 'Engine repair',       '⚙️', false),
      (s_id, 'Transmission service','🚘', false),
      (s_id, 'Light replacement',   '💡', false),
      (s_id, 'Suspension repair',   '🛞', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_auto AND name = 'Detailing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Car wash',         '🧽', false),
      (s_id, 'Interior cleaning','✨', false),
      (s_id, 'Window cleaning',  '🪟', false),
      (s_id, 'Tire shine',       '🛞', false),
      (s_id, 'Waxing',           '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Education and Training Services ───────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_edu AND name = 'Tutoring';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Academic tutoring', '📝', false),
      (s_id, 'Reading support',   '📖', false),
      (s_id, 'Math tutoring',     '➗', false),
      (s_id, 'Science tutoring',  '🔬', false),
      (s_id, 'Computer tutoring', '💻', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_edu AND name = 'Professional Training';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Workshops',           '🧠', false),
      (s_id, 'Career coaching',     '🧑‍💼', false),
      (s_id, 'Business training',   '📈', false),
      (s_id, 'Technical training',  '🛠️', false),
      (s_id, 'Communication skills','🗣️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_edu AND name = 'Child Learning';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Early learning',   '🧮', false),
      (s_id, 'Creative classes', '🎨', false),
      (s_id, 'Homework help',    '📚', false),
      (s_id, 'Music lessons',    '🎼', false),
      (s_id, 'Activity classes', '🏃', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Business and Office Services ──────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_biz AND name = 'Administrative Support';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Document preparation',  '📄', false),
      (s_id, 'Printing services',     '🖨️', false),
      (s_id, 'Mail handling',         '📨', false),
      (s_id, 'Virtual receptionist',  '📞', false),
      (s_id, 'Filing support',        '🗃️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_biz AND name = 'Consulting';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Business consulting',  '📊', false),
      (s_id, 'Accounting support',   '🧾', false),
      (s_id, 'Strategy sessions',    '🧠', false),
      (s_id, 'IT consulting',        '💻', false),
      (s_id, 'Marketing consulting', '📈', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_biz AND name = 'Digital Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Website setup',   '🌐', false),
      (s_id, 'Software support','🧰', false),
      (s_id, 'Data entry',      '🖥️', false),
      (s_id, 'App management',  '📱', false),
      (s_id, 'Security setup',  '🔐', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Health and Wellness Services ──────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Medical Support';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Minor treatment',       '🩹', false),
      (s_id, 'Lab services',          '🧪', false),
      (s_id, 'Medication consultation','💊', false),
      (s_id, 'Health screening',      '🌡️', false),
      (s_id, 'Nurse visits',          '🧑‍⚕️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Wellness Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Yoga classes',      '🧘', false),
      (s_id, 'Massage therapy',   '💆', false),
      (s_id, 'Nutrition coaching','🍏', false),
      (s_id, 'Breathing sessions','🫁', false),
      (s_id, 'Holistic therapy',  '🌿', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_health AND name = 'Fitness Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Personal training',  '🏋️', false),
      (s_id, 'Group fitness',      '🚴', false),
      (s_id, 'Running coaching',   '🏃', false),
      (s_id, 'Stretching sessions','🤸', false),
      (s_id, 'Movement therapy',   '🧍', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Cleaning Services ─────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clean AND name = 'Residential Cleaning';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'House cleaning',   '🧼', false),
      (s_id, 'Bedroom cleaning', '🛏️', false),
      (s_id, 'Kitchen cleaning', '🍽️', false),
      (s_id, 'Bathroom cleaning','🛁', false),
      (s_id, 'Deep cleaning',    '🧽', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clean AND name = 'Commercial Cleaning';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Office cleaning', '🧹', false),
      (s_id, 'Window washing',  '🪟', false),
      (s_id, 'Trash removal',   '🗑️', false),
      (s_id, 'Sanitizing',      '🧴', false),
      (s_id, 'Floor care',      '🧼', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clean AND name = 'Specialty Cleaning';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Carpet cleaning',          '🧺', false),
      (s_id, 'Upholstery cleaning',      '🪑', false),
      (s_id, 'Upholstery treatment',     '🧴', false),
      (s_id, 'Glass polishing',          '🪟', false),
      (s_id, 'Post-construction cleanup','🧽', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Logistics and Delivery Services ──────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_logistics AND name = 'Delivery';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Package delivery',  '📦', false),
      (s_id, 'Food delivery',     '🥡', false),
      (s_id, 'Retail delivery',   '🛍️', false),
      (s_id, 'Same-day delivery', '🧾', false),
      (s_id, 'Bulk delivery',     '🚛', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_logistics AND name = 'Shipping';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Parcel shipping',       '📮', false),
      (s_id, 'Freight forwarding',    '📦', false),
      (s_id, 'Label services',        '📑', false),
      (s_id, 'Tracking services',     '🧭', false),
      (s_id, 'International shipping','🧳', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_logistics AND name = 'Moving Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'House moving',         '🏠', false),
      (s_id, 'Furniture moving',     '🪑', false),
      (s_id, 'Packing services',     '📦', false),
      (s_id, 'Unpacking services',   '🧹', false),
      (s_id, 'Loading and unloading','🚛', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Creative Services ─────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_creative AND name = 'Design';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Graphic design', '🖼️', false),
      (s_id, 'Sign design',    '🪧', false),
      (s_id, 'UI design',      '📱', false),
      (s_id, 'Print design',   '🧾', false),
      (s_id, 'Brand design',   '🧠', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_creative AND name = 'Media Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Photography',     '📷', false),
      (s_id, 'Videography',     '🎥', false),
      (s_id, 'Editing',         '🎬', false),
      (s_id, 'Audio recording', '🎙️', false),
      (s_id, 'Content creation','🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_creative AND name = 'Writing Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Copywriting',      '📝', false),
      (s_id, 'Editing',          '📄', false),
      (s_id, 'Proofreading',     '🧾', false),
      (s_id, 'Technical writing','📚', false),
      (s_id, 'Translation',      '🌐', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Retail Support Services ───────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_retail AND name = 'Merchandising';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Shelf setup',       '📦', false),
      (s_id, 'Product display',   '🛒', false),
      (s_id, 'Store arrangement', '🏬', false),
      (s_id, 'Product labeling',  '🧭', false),
      (s_id, 'Stock rotation',    '🔄', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_retail AND name = 'Sales Support';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Customer assistance',  '🤝', false),
      (s_id, 'Order processing',     '🧾', false),
      (s_id, 'Payment handling',     '💳', false),
      (s_id, 'Inventory assistance', '📦', false),
      (s_id, 'Sales reporting',      '📈', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_retail AND name = 'Equipment Support';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Printer setup',  '🖨️', false),
      (s_id, 'POS setup',      '💻', false),
      (s_id, 'Device repair',  '🪛', false),
      (s_id, 'Wiring support', '🔌', false),
      (s_id, 'Network setup',  '🔐', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Security Services ─────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_security AND name = 'Guard Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Site guarding',    '🏢', false),
      (s_id, 'Access control',   '🚪', false),
      (s_id, 'Crowd monitoring', '🧍', false),
      (s_id, 'Incident response','🚨', false),
      (s_id, 'Patrol services',  '📹', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_security AND name = 'Safety Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fire safety checks', '🧯', false),
      (s_id, 'Workplace safety',   '🪖', false),
      (s_id, 'Lock inspection',    '🚪', false),
      (s_id, 'Risk assessment',    '📋', false),
      (s_id, 'Compliance checks',  '🧪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END;
$$;
