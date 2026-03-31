-- Seed all sub-subcategories for Hardware business domain
-- Domain: Hardware | 11 categories, 34 subcategories
-- Safe to re-run: ON CONFLICT DO UPDATE

DO $$
DECLARE
  d_id TEXT;
  cat_tools TEXT; cat_fast TEXT; cat_build TEXT; cat_elec TEXT;
  cat_plumb TEXT; cat_paint TEXT; cat_doors TEXT; cat_clean TEXT;
  cat_auto TEXT; cat_home TEXT; cat_garden TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO d_id FROM expense_domains WHERE name = 'Hardware';
  IF d_id IS NULL THEN RETURN; END IF;

  SELECT id INTO cat_tools  FROM expense_categories WHERE "domainId" = d_id AND name = 'Tools and Equipment';
  SELECT id INTO cat_fast   FROM expense_categories WHERE "domainId" = d_id AND name = 'Fasteners and Fixings';
  SELECT id INTO cat_build  FROM expense_categories WHERE "domainId" = d_id AND name = 'Building Materials';
  SELECT id INTO cat_elec   FROM expense_categories WHERE "domainId" = d_id AND name = 'Electrical';
  SELECT id INTO cat_plumb  FROM expense_categories WHERE "domainId" = d_id AND name = 'Plumbing';
  SELECT id INTO cat_paint  FROM expense_categories WHERE "domainId" = d_id AND name = 'Paint and Finishing';
  SELECT id INTO cat_doors  FROM expense_categories WHERE "domainId" = d_id AND name = 'Doors and Windows';
  SELECT id INTO cat_clean  FROM expense_categories WHERE "domainId" = d_id AND name = 'Cleaning and Maintenance';
  SELECT id INTO cat_auto   FROM expense_categories WHERE "domainId" = d_id AND name = 'Automotive Hardware';
  SELECT id INTO cat_home   FROM expense_categories WHERE "domainId" = d_id AND name = 'Home and Storage';
  SELECT id INTO cat_garden FROM expense_categories WHERE "domainId" = d_id AND name = 'Garden and Outdoor';

  -- ── Tools and Equipment ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_tools AND name = 'Hand Tools';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Hammers',          '🔨', false),
      (s_id, 'Screwdrivers',     '🪛', false),
      (s_id, 'Wrenches',         '🔧', false),
      (s_id, 'Saws',             '🪚', false),
      (s_id, 'Pliers',           '🗜️', false),
      (s_id, 'Measuring tools',  '📏', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_tools AND name = 'Power Tools';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Drills',          '🛠️', false),
      (s_id, 'Circular saws',   '🪚', false),
      (s_id, 'Impact drivers',  '🪛', false),
      (s_id, 'Grinders',        '🔩', false),
      (s_id, 'Sanders',         '🧰', false),
      (s_id, 'Rotary tools',    '🛠️', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_tools AND name = 'Tool Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Drill bits',       '🪛', false),
      (s_id, 'Saw blades',       '🔩', false),
      (s_id, 'Tool belts',       '🧷', false),
      (s_id, 'Magnetic holders', '🧲', false),
      (s_id, 'Storage cases',    '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Fasteners and Fixings ─────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fast AND name = 'Screws';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Wood screws',        '🔩', false),
      (s_id, 'Machine screws',     '🔩', false),
      (s_id, 'Sheet metal screws', '🔩', false),
      (s_id, 'Self-tapping screws','🔩', false),
      (s_id, 'Drywall screws',     '🔩', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fast AND name = 'Nails';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Common nails',   '🪙', false),
      (s_id, 'Finishing nails','🪙', false),
      (s_id, 'Roofing nails',  '🪙', false),
      (s_id, 'Brad nails',     '🪙', false),
      (s_id, 'Masonry nails',  '🪙', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fast AND name = 'Bolts and Nuts';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Bolts',   '🔩', false),
      (s_id, 'Nuts',    '🔩', false),
      (s_id, 'Washers', '🧷', false),
      (s_id, 'Anchors', '🔩', false),
      (s_id, 'Rivets',  '🧲', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_fast AND name = 'Anchoring Hardware';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Wall anchors',      '🧱', false),
      (s_id, 'Toggle bolts',      '🪵', false),
      (s_id, 'Expansion anchors', '🧱', false),
      (s_id, 'Concrete anchors',  '🧱', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Building Materials ────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_build AND name = 'Lumber';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Dimensional lumber', '🪵', false),
      (s_id, 'Plywood',            '🪵', false),
      (s_id, 'MDF',                '🪵', false),
      (s_id, 'Particle board',     '🪵', false),
      (s_id, 'Treated lumber',     '🪵', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_build AND name = 'Cement and Masonry';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cement',       '🧱', false),
      (s_id, 'Concrete mix', '🧱', false),
      (s_id, 'Bricks',       '🧱', false),
      (s_id, 'Blocks',       '🧱', false),
      (s_id, 'Gravel',       '🪨', false),
      (s_id, 'Sand',         '🪨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_build AND name = 'Sheet Goods';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Plywood sheets', '🪵', false),
      (s_id, 'OSB',            '🪵', false),
      (s_id, 'Drywall sheets', '🪵', false),
      (s_id, 'Backer board',   '🪵', false),
      (s_id, 'Panel boards',   '🪵', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_build AND name = 'Adhesives and Sealants';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Glue',                  '🧴', false),
      (s_id, 'Construction adhesive', '🧴', false),
      (s_id, 'Silicone sealant',      '🧴', false),
      (s_id, 'Caulk',                 '🧴', false),
      (s_id, 'Epoxy',                 '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Electrical ────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_elec AND name = 'Wiring and Cable';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Electrical wire',      '🔌', false),
      (s_id, 'Extension cords',      '🔌', false),
      (s_id, 'Cable reels',          '🔌', false),
      (s_id, 'Wire connectors',      '🔌', false),
      (s_id, 'Conduit accessories',  '🔌', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_elec AND name = 'Lighting';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'LED bulbs',        '💡', false),
      (s_id, 'Fluorescent bulbs','💡', false),
      (s_id, 'Floodlights',      '💡', false),
      (s_id, 'Work lights',      '💡', false),
      (s_id, 'Fixtures',         '💡', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_elec AND name = 'Electrical Components';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Batteries',        '🔋', false),
      (s_id, 'Switches',         '🧲', false),
      (s_id, 'Outlets',          '🔌', false),
      (s_id, 'Plug adapters',    '🔌', false),
      (s_id, 'Surge protectors', '🧯', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_elec AND name = 'Electrical Hardware';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Junction boxes',   '🪛', false),
      (s_id, 'Wire nuts',        '🔩', false),
      (s_id, 'Cable ties',       '🧷', false),
      (s_id, 'Circuit breakers', '🧲', false),
      (s_id, 'Panels',           '⚡', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Plumbing ──────────────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_plumb AND name = 'Pipes and Fittings';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'PVC pipes',    '🚰', false),
      (s_id, 'Copper pipes', '🚰', false),
      (s_id, 'PEX pipes',    '🚰', false),
      (s_id, 'Elbows',       '🚰', false),
      (s_id, 'Couplings',    '🚰', false),
      (s_id, 'Valves',       '🚰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_plumb AND name = 'Bathroom Plumbing';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Toilets',      '🚽', false),
      (s_id, 'Faucets',      '🚰', false),
      (s_id, 'Shower heads', '🚿', false),
      (s_id, 'Sink drains',  '🧼', false),
      (s_id, 'Flanges',      '🚰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_plumb AND name = 'Plumbing Tools';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Pipe wrenches',  '🔧', false),
      (s_id, 'Plumbers tape',  '🪛', false),
      (s_id, 'Plungers',       '🪠', false),
      (s_id, 'Drain snakes',   '🧰', false),
      (s_id, 'Seal tape',      '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_plumb AND name = 'Plumbing Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Pipe cement',    '🧴', false),
      (s_id, 'Thread sealant', '🧴', false),
      (s_id, 'Gaskets',        '🧽', false),
      (s_id, 'O-rings',        '🧲', false),
      (s_id, 'Repair kits',    '🧴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Paint and Finishing ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_paint AND name = 'Paint';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Interior paint', '🎨', false),
      (s_id, 'Exterior paint', '🎨', false),
      (s_id, 'Primer',         '🎨', false),
      (s_id, 'Spray paint',    '🎨', false),
      (s_id, 'Touch-up paint', '🎨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_paint AND name = 'Painting Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Brushes',       '🖌️', false),
      (s_id, 'Rollers',       '🧽', false),
      (s_id, 'Drop cloths',   '🧻', false),
      (s_id, 'Paint trays',   '🧪', false),
      (s_id, 'Painter''s tape','🩹', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_paint AND name = 'Finishing Products';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Varnish', '✨', false),
      (s_id, 'Stain',   '✨', false),
      (s_id, 'Lacquer', '✨', false),
      (s_id, 'Sealers', '✨', false),
      (s_id, 'Putty',   '✨', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Doors and Windows ─────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_doors AND name = 'Door Hardware';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Hinges',       '🚪', false),
      (s_id, 'Locks',        '🔒', false),
      (s_id, 'Handles',      '🚪', false),
      (s_id, 'Latches',      '🧷', false),
      (s_id, 'Door closers', '🪛', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_doors AND name = 'Window Hardware';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Locks',            '🪟', false),
      (s_id, 'Latches',          '🪟', false),
      (s_id, 'Screens',          '🪟', false),
      (s_id, 'Handles',          '🪟', false),
      (s_id, 'Weather stripping','🪟', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_doors AND name = 'Trim and Moulding';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Baseboards',    '🪵', false),
      (s_id, 'Crown moulding','🪵', false),
      (s_id, 'Corner trim',   '🪵', false),
      (s_id, 'Door trim',     '🪵', false),
      (s_id, 'Window trim',   '🪵', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Cleaning and Maintenance ──────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clean AND name = 'Cleaning Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Cleaners',    '🧽', false),
      (s_id, 'Degreasers',  '🧽', false),
      (s_id, 'Rags',        '🧽', false),
      (s_id, 'Brushes',     '🧽', false),
      (s_id, 'Mop heads',   '🧽', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clean AND name = 'Safety and PPE';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Safety glasses',   '🥽', false),
      (s_id, 'Gloves',           '🧤', false),
      (s_id, 'Masks',            '😷', false),
      (s_id, 'Reflective vests', '🦺', false),
      (s_id, 'Hard hats',        '🪖', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_clean AND name = 'Maintenance Items';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Lubricants',       '🧴', false),
      (s_id, 'Oils',             '🧴', false),
      (s_id, 'Grease',           '🧴', false),
      (s_id, 'Replacement parts','🧽', false),
      (s_id, 'Repair kits',      '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Automotive Hardware ───────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_auto AND name = 'Auto Accessories';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Wiper blades',   '🛞', false),
      (s_id, 'Car batteries',  '🔋', false),
      (s_id, 'Fluids',         '🪛', false),
      (s_id, 'Tire tools',     '🔧', false),
      (s_id, 'Jump starters',  '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_auto AND name = 'Garage Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Socket sets', '🪛', false),
      (s_id, 'Motor oil',   '🧴', false),
      (s_id, 'Coolant',     '🧴', false),
      (s_id, 'Brake fluid', '🧴', false),
      (s_id, 'Floor jacks', '🪑', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Home and Storage ──────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_home AND name = 'Home Organization';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Storage bins', '📦', false),
      (s_id, 'Shelves',      '🧺', false),
      (s_id, 'Hooks',        '🪝', false),
      (s_id, 'Hangers',      '🧷', false),
      (s_id, 'Baskets',      '🧺', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_home AND name = 'Household Fixtures';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Lamps',             '💡', false),
      (s_id, 'Curtain rods',      '🪟', false),
      (s_id, 'Mirrors',           '🪞', false),
      (s_id, 'Cabinet locks',     '🔒', false),
      (s_id, 'Furniture hardware','🪚', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  -- ── Garden and Outdoor ────────────────────────────────────────────────────

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_garden AND name = 'Gardening Tools';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Shovels',       '🪴', false),
      (s_id, 'Rakes',         '🪴', false),
      (s_id, 'Hoes',          '🪴', false),
      (s_id, 'Pruners',       '🪴', false),
      (s_id, 'Watering cans', '🪴', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_garden AND name = 'Outdoor Supplies';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Fertilizer',   '🧴', false),
      (s_id, 'Soil',         '🪣', false),
      (s_id, 'Mulch',        '🪵', false),
      (s_id, 'Garden stakes','🪵', false),
      (s_id, 'Plant ties',   '🧷', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

  SELECT id INTO s_id FROM expense_subcategories WHERE "categoryId" = cat_garden AND name = 'Outdoor Living';
  IF s_id IS NOT NULL THEN
    INSERT INTO expense_sub_subcategories ("subcategoryId", name, emoji, "isUserCreated") VALUES
      (s_id, 'Patio furniture',   '🪑', false),
      (s_id, 'Fire pits',         '🔥', false),
      (s_id, 'Umbrellas',         '⛱️', false),
      (s_id, 'Grills accessories','🛠️', false),
      (s_id, 'Outdoor storage',   '🧰', false)
    ON CONFLICT ("subcategoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji
    WHERE expense_sub_subcategories."isUserCreated" = false;
  END IF;

END;
$$;
