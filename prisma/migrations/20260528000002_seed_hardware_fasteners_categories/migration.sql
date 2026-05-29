-- Seed Hardware: Fasteners & Building Supplies Categories
-- Source: 🛠️ Hardware & Building Supplies.md
--
-- IDEMPOTENT: ON CONFLICT DO NOTHING — safe to rerun
--
-- Adds:
--   1. inventory_domain: Fasteners & Fixings (hardware)
--   2. business_categories: 5 categories under Fasteners domain
--   3. business_category: Wall Fixings under existing building domain
--   4. inventory_subcategories: detailed items under each new category
--   5. Fills out existing Hand Tools, Power Tools, Building Materials,
--      Plumbing, and Electrical subcategories for completeness

-- ============================================================================
-- 1. NEW INVENTORY DOMAIN: Fasteners & Fixings
-- ============================================================================

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_hardware_fasteners',
  'Fasteners & Fixings',
  '🔩',
  'Screws, nails, bolts, anchors, plugs and wall fixings',
  'hardware',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. BUSINESS CATEGORIES — under domain_hardware_fasteners
-- ============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_fasteners_masonry',
  'Masonry & Wall Fasteners',
  '🧱',
  'Screws for masonry, concrete, hollow walls, and heavy-duty applications',
  '#6B7280', 1, 'domain_hardware_fasteners', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_fasteners_nails',
  'Nails',
  '🔨',
  'Common, masonry, roofing, galvanized, and specialty nails',
  '#6B7280', 2, 'domain_hardware_fasteners', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_fasteners_screws',
  'Screws',
  '🪛',
  'Wood, machine, self-tapping, drywall and general-purpose screws',
  '#6B7280', 3, 'domain_hardware_fasteners', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_fasteners_anchors',
  'Anchors & Plugs',
  '🧰',
  'Wall plugs, hollow wall anchors, expansion anchors and toggle bolts',
  '#6B7280', 4, 'domain_hardware_fasteners', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_fasteners_bolts',
  'Bolts, Nuts & Washers',
  '🔩',
  'Hex bolts, carriage bolts, nuts, washers, and threaded hardware',
  '#6B7280', 5, 'domain_hardware_fasteners', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. BUSINESS CATEGORY — Wall Fixings under domain_hardware_building
-- ============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_wall_fixings',
  'Wall Fixings',
  '🏗️',
  'Application-specific fixing solutions: plasterboard, hollow cement, concrete, mounting kits',
  '#6B7280', 6, 'domain_hardware_building', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. INVENTORY SUBCATEGORIES — Masonry & Wall Fasteners
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_masonry_001', 'cat_hw_fasteners_masonry', 'Masonry screws', 'Screws for masonry surfaces', '🧱', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_masonry_002', 'cat_hw_fasteners_masonry', 'Self-tapping screws', 'Self-tapping screws for masonry and metal', '🪛', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_masonry_003', 'cat_hw_fasteners_masonry', 'Hollow wall screws', 'Screws designed for hollow cement and plasterboard walls', '🏚️', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_masonry_004', 'cat_hw_fasteners_masonry', 'Concrete screws', 'Screws for concrete and lightweight block walls', '🪨', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_masonry_005', 'cat_hw_fasteners_masonry', 'Heavy-duty wall screws', 'High-load masonry and bracket fixing screws', '🛠️', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_masonry_006', 'cat_hw_fasteners_masonry', 'Corrosion-resistant masonry screws', 'Galvanized or coated screws for outdoor/wet use', '🛡️', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_masonry_007', 'cat_hw_fasteners_masonry', 'Expansion screws', 'Screw anchors that expand on insertion', '🪝', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_masonry_008', 'cat_hw_fasteners_masonry', 'Multi-material screws', 'Universal screws for wood, metal and masonry', '🪵', 8, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INVENTORY SUBCATEGORIES — Nails
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_001', 'cat_hw_fasteners_nails', 'Common nails', 'Standard steel common nails', '🪙', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_002', 'cat_hw_fasteners_nails', 'Masonry nails', 'Hardened nails for concrete and masonry', '🧱', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_003', 'cat_hw_fasteners_nails', 'Galvanized nails', 'Corrosion-resistant coated nails', '🛡️', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_004', 'cat_hw_fasteners_nails', 'Finishing nails', 'Small-head nails for trim and finish work', '✂️', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_005', 'cat_hw_fasteners_nails', 'Roofing nails', 'Large-head nails for roofing materials', '🏠', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_006', 'cat_hw_fasteners_nails', 'Brad nails', 'Thin gauge nails for fine woodwork', '📌', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_007', 'cat_hw_fasteners_nails', 'Ring shank nails', 'Annular ring nails for high-hold applications', '📎', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_008', 'cat_hw_fasteners_nails', 'Stainless steel nails', 'Rust-proof nails for marine and outdoor use', '🛡️', 8, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INVENTORY SUBCATEGORIES — Screws
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_001', 'cat_hw_fasteners_screws', 'Phillips head screws', 'Cross-drive screws for general use', '🔩', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_002', 'cat_hw_fasteners_screws', 'Hex head screws', 'Six-sided head screws driven by wrench or socket', '🧿', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_003', 'cat_hw_fasteners_screws', 'Countersunk screws', 'Flat-head screws that sit flush when driven', '🔻', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_004', 'cat_hw_fasteners_screws', 'Drywall screws', 'Fine-thread screws for gypsum board and plasterboard', '🪵', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_005', 'cat_hw_fasteners_screws', 'Wood screws', 'Coarse-thread screws for timber and wood', '🪵', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_006', 'cat_hw_fasteners_screws', 'Self-drilling screws', 'Tek screws that drill their own pilot hole', '⚙️', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_007', 'cat_hw_fasteners_screws', 'Torx screws', 'Star-drive screws for high-torque applications', '⭐', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_008', 'cat_hw_fasteners_screws', 'Machine screws', 'Uniform-thread screws for tapped holes and nuts', '⚙️', 8, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INVENTORY SUBCATEGORIES — Anchors & Plugs
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_001', 'cat_hw_fasteners_anchors', 'Wall plugs', 'Plastic or nylon plugs for screw anchoring', '🔘', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_002', 'cat_hw_fasteners_anchors', 'Hollow wall anchors', 'Toggle or spring-wing anchors for hollow walls', '🧱', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_003', 'cat_hw_fasteners_anchors', 'Expansion anchors', 'Anchors that expand in the hole for grip', '🪝', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_004', 'cat_hw_fasteners_anchors', 'Toggle anchors', 'Spring-wing bolts for hollow wall loads', '🧲', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_005', 'cat_hw_fasteners_anchors', 'Wedge anchors', 'Heavy-duty anchors for concrete and solid masonry', '🪨', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_006', 'cat_hw_fasteners_anchors', 'Sleeve anchors', 'Expanding sleeve anchors for concrete and block', '🧰', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_007', 'cat_hw_fasteners_anchors', 'Drywall anchors', 'Self-drilling anchors for plasterboard without studs', '🧱', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_008', 'cat_hw_fasteners_anchors', 'Anchor kits', 'Assorted anchor and plug kit packs', '🧰', 8, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INVENTORY SUBCATEGORIES — Bolts, Nuts & Washers
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_bolts_001', 'cat_hw_fasteners_bolts', 'Hex bolts', 'Standard hexagonal head bolts', '🔩', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_bolts_002', 'cat_hw_fasteners_bolts', 'Carriage bolts', 'Rounded-head bolts with square shank for wood', '🔩', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_bolts_003', 'cat_hw_fasteners_bolts', 'Hex nuts', 'Standard hexagonal nuts', '🔩', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_bolts_004', 'cat_hw_fasteners_bolts', 'Washers', 'Flat, spring, and lock washers', '🧷', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_bolts_005', 'cat_hw_fasteners_bolts', 'Rivets', 'Pop rivets and solid rivets for sheet metal joining', '🧲', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_bolts_006', 'cat_hw_fasteners_bolts', 'Eye bolts', 'Looped-head bolts for hanging and lifting', '🪝', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INVENTORY SUBCATEGORIES — Wall Fixings
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_001', 'cat_hw_wall_fixings', 'Hollow cement wall fixings', 'Fixings designed for hollow cement block walls', '🏚️', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_002', 'cat_hw_wall_fixings', 'Plasterboard & drywall fixings', 'Fixings for plasterboard and lightweight drywall', '🪵', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_003', 'cat_hw_wall_fixings', 'Concrete wall fixings', 'Fixings for poured concrete and solid masonry', '🪨', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_004', 'cat_hw_wall_fixings', 'TV mounting fasteners', 'Wall anchors and screws for TV bracket mounting', '📺', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_005', 'cat_hw_wall_fixings', 'Shelf mounting fasteners', 'Fasteners and brackets for shelf installation', '🪵', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_006', 'cat_hw_wall_fixings', 'Cabinet mounting hardware', 'Screws and anchors for kitchen and bathroom cabinets', '🧰', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_007', 'cat_hw_wall_fixings', 'Fixture mounting kits', 'Complete fixing kits for light fixtures and fittings', '💡', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. FILL OUT EXISTING HARDWARE CATEGORY SUBCATEGORIES
--    Uses gen_random_uuid() since we cannot know the category UUIDs ahead of time.
--    ON CONFLICT ("categoryId", name) ensures idempotency.
-- ============================================================================

-- Hand Tools — additional subcategories
INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Wrenches', 'Adjustable, combination, and socket wrenches', '🔧', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Hand Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Saws', 'Hand saws, hacksaws, and bow saws', '🪚', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Hand Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Pliers', 'Combination, needle-nose, and locking pliers', '🗜️', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Hand Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Measuring tools', 'Tape measures, levels, and squares', '📏', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Hand Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Chisels & planes', 'Wood chisels, metal chisels, and hand planes', '🪚', 7, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Hand Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Power Tools — additional subcategories
INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Impact drivers', 'Cordless and pneumatic impact drivers', '🪛', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Power Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Grinders', 'Angle grinders and bench grinders', '🔩', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Power Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Sanders', 'Random orbital, belt, and palm sanders', '🧰', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Power Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Rotary tools', 'Rotary tools and accessories (e.g. Dremel)', '🛠️', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Power Tools' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Building Materials — additional subcategories
INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Cement', 'Portland cement, rapid-set cement, and concrete mix', '🧱', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Building Materials' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Bricks & blocks', 'Clay bricks, concrete blocks, and pavers', '🧱', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Building Materials' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Lumber & timber', 'Structural and treated timber, plywood, and MDF', '🪵', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Building Materials' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Sand & gravel', 'River sand, crusher run, gravel, and fill material', '🪨', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Building Materials' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Adhesives & sealants', 'Construction adhesive, silicone sealant, and caulk', '🧴', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Building Materials' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Steel & rebar', 'Steel bars, mesh, and structural steel', '🔩', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Building Materials' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Plumbing — subcategories
INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Pipes & tubes', 'PVC, copper, HDPE, and galvanized pipes', '🚰', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Plumbing' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Fittings & connectors', 'Elbows, tees, couplings, and valves', '🔧', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Plumbing' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Taps & faucets', 'Bathroom and kitchen taps and faucet sets', '🚰', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Plumbing' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Toilet fittings', 'Toilet seats, cistern parts, and wax seals', '🚽', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Plumbing' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Plumbing sealants', 'Thread tape, pipe cement, and joint compound', '🧴', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Plumbing' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

-- Electrical — subcategories
INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Cables & wire', 'Electrical cable, extension cords, and conduit', '🔌', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Electrical' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Switches & sockets', 'Light switches, power sockets, and face plates', '🧲', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Electrical' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Lighting', 'LED bulbs, fluorescent tubes, floodlights, and fixtures', '💡', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Electrical' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Circuit breakers & panels', 'MCBs, RCCBs, DB boards, and panel components', '⚡', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Electrical' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, id, 'Batteries & torches', 'AA/AAA batteries, lanterns, and work lights', '🔋', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'hardware' AND name = 'Electrical' AND "parentId" IS NULL
ON CONFLICT ("categoryId", name) DO NOTHING;
