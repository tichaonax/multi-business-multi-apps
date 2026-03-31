-- Seed all sub-subcategories for Construction Business domain
-- Source: Business-Domains-Continous.md
-- Structure: domain → expense_categories → expense_subcategories → expense_sub_subcategories (this file)
-- 11 categories × 3 subcategories × 5 items = 165 sub-subcategories

DO $$
DECLARE
  d_id TEXT;
  cat_general TEXT; cat_structural TEXT; cat_plumbing TEXT; cat_electrical TEXT;
  cat_finish TEXT; cat_civil TEXT; cat_equipment TEXT; cat_safety TEXT;
  cat_roofing TEXT; cat_project TEXT; cat_specialty TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Construction';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_general    FROM expense_categories WHERE "domainId" = d_id AND name = 'General Construction';
  SELECT id INTO cat_structural FROM expense_categories WHERE "domainId" = d_id AND name = 'Structural Work';
  SELECT id INTO cat_plumbing   FROM expense_categories WHERE "domainId" = d_id AND name = 'Plumbing and HVAC';
  SELECT id INTO cat_electrical FROM expense_categories WHERE "domainId" = d_id AND name = 'Electrical Work';
  SELECT id INTO cat_finish     FROM expense_categories WHERE "domainId" = d_id AND name = 'Finish Work';
  SELECT id INTO cat_civil      FROM expense_categories WHERE "domainId" = d_id AND name = 'Civil Construction';
  SELECT id INTO cat_equipment  FROM expense_categories WHERE "domainId" = d_id AND name = 'Equipment and Machinery';
  SELECT id INTO cat_safety     FROM expense_categories WHERE "domainId" = d_id AND name = 'Safety and Compliance';
  SELECT id INTO cat_roofing    FROM expense_categories WHERE "domainId" = d_id AND name = 'Roofing and Exterior';
  SELECT id INTO cat_project    FROM expense_categories WHERE "domainId" = d_id AND name = 'Project Management and Estimating';
  SELECT id INTO cat_specialty  FROM expense_categories WHERE "domainId" = d_id AND name = 'Specialty Construction';

  -- ── General Construction ─────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_general AND name = 'Building Construction';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Residential construction', '🏠', false),
      (s_id, 'Commercial construction',  '🏢', false),
      (s_id, 'Industrial construction',  '🏭', false),
      (s_id, 'Mixed-use construction',   '🏬', false),
      (s_id, 'New builds',               '🏗️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_general AND name = 'Renovation and Remodeling';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Remodeling',         '🛠️', false),
      (s_id, 'Additions',          '🧱', false),
      (s_id, 'Interior renovation','🏠', false),
      (s_id, 'Exterior renovation','🚪', false),
      (s_id, 'Tenant improvements','🪟', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_general AND name = 'Site Preparation';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Clearing',         '🪏', false),
      (s_id, 'Grading',          '🧱', false),
      (s_id, 'Excavation',       '🚜', false),
      (s_id, 'Backfill',         '🪨', false),
      (s_id, 'Layout and staking','🧭', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Structural Work ──────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_structural AND name = 'Foundations';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Slab foundations',    '🧱', false),
      (s_id, 'Footings',            '🪨', false),
      (s_id, 'Crawl spaces',        '🧱', false),
      (s_id, 'Basement foundations','🏗️', false),
      (s_id, 'Foundation repair',   '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_structural AND name = 'Framing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Wood framing', '🪵', false),
      (s_id, 'Steel framing','🧱', false),
      (s_id, 'Wall framing', '🏠', false),
      (s_id, 'Roof framing', '🏚️', false),
      (s_id, 'Floor framing','🪟', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_structural AND name = 'Masonry';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Brickwork',           '🧱', false),
      (s_id, 'Blockwork',           '🪨', false),
      (s_id, 'Stonework',           '🧱', false),
      (s_id, 'Concrete block walls','🧱', false),
      (s_id, 'Retaining walls',     '🧱', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Plumbing and HVAC ────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_plumbing AND name = 'Plumbing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Pipe installation', '🚰', false),
      (s_id, 'Fixtures',          '🚽', false),
      (s_id, 'Showers and tubs',  '🚿', false),
      (s_id, 'Drainage systems',  '🧼', false),
      (s_id, 'Water supply lines','💧', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_plumbing AND name = 'HVAC';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Air conditioning',  '❄️', false),
      (s_id, 'Heating systems',   '🔥', false),
      (s_id, 'Ventilation',       '🌬️', false),
      (s_id, 'Ductwork',          '🧰', false),
      (s_id, 'System testing',    '🧪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_plumbing AND name = 'Mechanical';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Equipment installation',    '🛠️', false),
      (s_id, 'Pump systems',              '⚙️', false),
      (s_id, 'Fire suppression support',  '🧯', false),
      (s_id, 'Pressure testing',          '🧪', false),
      (s_id, 'Maintenance',               '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Electrical Work ──────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_electrical AND name = 'Rough-In';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Wiring',               '🔌', false),
      (s_id, 'Conduit installation', '🧰', false),
      (s_id, 'Boxes and fittings',   '🧷', false),
      (s_id, 'Panel setup',          '⚡', false),
      (s_id, 'Circuit prep',         '🧪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_electrical AND name = 'Fixtures';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Lighting installation','💡', false),
      (s_id, 'Exterior lighting',    '🔦', false),
      (s_id, 'Decorative lighting',  '🛋️', false),
      (s_id, 'Emergency lighting',   '🚨', false),
      (s_id, 'Sensor systems',       '🧭', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_electrical AND name = 'Electrical Service';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Service upgrades',       '⚡', false),
      (s_id, 'Backup power',           '🔋', false),
      (s_id, 'Surge protection',       '🧯', false),
      (s_id, 'Repairs',                '🧰', false),
      (s_id, 'Testing and inspection', '🧪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Finish Work ──────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_finish AND name = 'Carpentry';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Trim work','🪵', false),
      (s_id, 'Doors',    '🚪', false),
      (s_id, 'Windows',  '🪟', false),
      (s_id, 'Stairs',   '🪜', false),
      (s_id, 'Cabinets', '🧱', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_finish AND name = 'Painting';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Interior painting',  '🎨', false),
      (s_id, 'Exterior painting',  '🎨', false),
      (s_id, 'Trim painting',      '🪟', false),
      (s_id, 'Surface preparation','🧽', false),
      (s_id, 'Coating and sealing','🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_finish AND name = 'Drywall';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Hanging drywall',  '🧱', false),
      (s_id, 'Taping and mudding','🧽', false),
      (s_id, 'Wall finishing',   '🎨', false),
      (s_id, 'Repairs',          '🪚', false),
      (s_id, 'Texture matching', '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Civil Construction ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_civil AND name = 'Roadwork';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Road paving',   '🛣️', false),
      (s_id, 'Road grading',  '🚜', false),
      (s_id, 'Asphalt work',  '🧱', false),
      (s_id, 'Lane striping', '🚧', false),
      (s_id, 'Road base work','🪨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_civil AND name = 'Infrastructure';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Bridges',           '🌉', false),
      (s_id, 'Utility tunnels',   '🚇', false),
      (s_id, 'Culverts',          '🧱', false),
      (s_id, 'Sidewalks',         '🛣️', false),
      (s_id, 'Traffic structures','🚦', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_civil AND name = 'Drainage and Utilities';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Storm drainage', '🌊', false),
      (s_id, 'Water lines',    '🚰', false),
      (s_id, 'Sewer lines',    '🚽', false),
      (s_id, 'Utility trenches','⚡', false),
      (s_id, 'Site drainage',  '🧭', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Equipment and Machinery ──────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_equipment AND name = 'Heavy Equipment';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Excavators',  '🚜', false),
      (s_id, 'Dump trucks', '🚚', false),
      (s_id, 'Cranes',      '🏗️', false),
      (s_id, 'Loaders',     '🛞', false),
      (s_id, 'Bulldozers',  '🪨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_equipment AND name = 'Equipment Services';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Repairs',         '🛠️', false),
      (s_id, 'Fueling',         '⛽', false),
      (s_id, 'Lubrication',     '🧴', false),
      (s_id, 'Battery service', '🔋', false),
      (s_id, 'Inspections',     '🧪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_equipment AND name = 'Tooling';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Hand tools',   '🧰', false),
      (s_id, 'Power tools',  '⚡', false),
      (s_id, 'Fasteners',    '🪛', false),
      (s_id, 'Accessories',  '🧷', false),
      (s_id, 'Consumables',  '🧾', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Safety and Compliance ────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_safety AND name = 'Jobsite Safety';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Hard hats',       '🪖', false),
      (s_id, 'Safety glasses',  '🥽', false),
      (s_id, 'Gloves',          '🧤', false),
      (s_id, 'Steel-toe boots', '👢', false),
      (s_id, 'Vests',           '🦺', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_safety AND name = 'Compliance';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Permits',           '📑', false),
      (s_id, 'Inspections',       '🧾', false),
      (s_id, 'Code compliance',   '🏛️', false),
      (s_id, 'Testing reports',   '🧪', false),
      (s_id, 'Documentation',     '🧭', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_safety AND name = 'Risk Control';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fire prevention',  '🧯', false),
      (s_id, 'Hazard control',   '🛑', false),
      (s_id, 'Warning signage',  '📣', false),
      (s_id, 'Site monitoring',  '🧭', false),
      (s_id, 'Emergency kits',   '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Roofing and Exterior ─────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_roofing AND name = 'Roofing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Roof installation','🧱', false),
      (s_id, 'Roof framing',     '🪵', false),
      (s_id, 'Waterproofing',    '🧴', false),
      (s_id, 'Repairs',          '🧰', false),
      (s_id, 'Gutters',          '🪟', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_roofing AND name = 'Exterior Finishes';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Siding',          '🧱', false),
      (s_id, 'Exterior coating','🎨', false),
      (s_id, 'Windows',         '🪟', false),
      (s_id, 'Doors',           '🚪', false),
      (s_id, 'Fascia and soffit','🪵', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_roofing AND name = 'Waterproofing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Sealants',        '🧴', false),
      (s_id, 'Membranes',       '🧱', false),
      (s_id, 'Drainage',        '🌊', false),
      (s_id, 'Leak repair',     '🪚', false),
      (s_id, 'Moisture control','🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Project Management and Estimating ────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_project AND name = 'Pre-Construction';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Estimating',         '🧾', false),
      (s_id, 'Takeoffs',           '📐', false),
      (s_id, 'Planning',           '🗺️', false),
      (s_id, 'Subcontractor bids', '🧑‍🤝‍🧑', false),
      (s_id, 'Permitting',         '🪪', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_project AND name = 'Project Control';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Scheduling',       '🗓️', false),
      (s_id, 'Budget tracking',  '🧮', false),
      (s_id, 'Change orders',    '🧾', false),
      (s_id, 'Progress reporting','📊', false),
      (s_id, 'Labor tracking',   '👷', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_project AND name = 'Procurement';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Material ordering',     '🚚', false),
      (s_id, 'Vendor management',     '🧾', false),
      (s_id, 'Delivery coordination', '📦', false),
      (s_id, 'Cost control',          '🪙', false),
      (s_id, 'Inventory tracking',    '🔄', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Specialty Construction ───────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_specialty AND name = 'Pools and Outdoor Living';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Pool construction',   '🏊', false),
      (s_id, 'Decks',               '🪵', false),
      (s_id, 'Patios',              '⛱️', false),
      (s_id, 'Outdoor kitchens',    '🔥', false),
      (s_id, 'Landscaping support', '🌿', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_specialty AND name = 'Industrial Builds';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Plant construction',  '⚙️', false),
      (s_id, 'Facility upgrades',   '🧯', false),
      (s_id, 'Steel structures',    '🏗️', false),
      (s_id, 'Utility installation','🚧', false),
      (s_id, 'Maintenance projects','🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_specialty AND name = 'Institutional Work';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Schools',            '🏫', false),
      (s_id, 'Hospitals',          '🏥', false),
      (s_id, 'Government buildings','🏛️', false),
      (s_id, 'Libraries',          '📚', false),
      (s_id, 'Public facilities',  '🏟️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END $$;
