-- Seed Hardware: Missing subcategories from 🛠️ Hardware & Building Supplies.md
--
-- IDEMPOTENT: ON CONFLICT (id) DO NOTHING — safe to rerun
--
-- Fills gaps left by migration 20260528000002:
--   1. Additional nails (serrated shank, construction, framing, concrete, etc.)
--   2. Additional screw head/drive types (flat, pozidriv, slotted, pan, truss, washer)
--   3. Additional anchors (nylon, plastic, drop-in, screw-in, self-drilling)
--   4. Additional wall fixings (brick, block, masonry, bracket mounting)
--   5. NEW CATEGORY: Material-Based Variants (carbon steel, stainless, zinc-plated, etc.)
--   6. NEW CATEGORY: Common Applications (wall mounting, shelf, cabinet, frame, etc.)

-- ============================================================================
-- 1. ADDITIONAL NAILS
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_009', 'cat_hw_fasteners_nails', 'Serrated shank nails', 'Serrated shank nails for high-grip holding', '🔨', 9, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_010', 'cat_hw_fasteners_nails', 'Construction nails', 'Heavy-gauge nails for structural framing and construction', '🏗️', 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_011', 'cat_hw_fasteners_nails', 'Framing nails', 'Nails used for timber frame construction', '🪵', 11, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_012', 'cat_hw_fasteners_nails', 'Concrete nails', 'Hardened nails for driving into concrete', '🪨', 12, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_013', 'cat_hw_fasteners_nails', 'Collated nails', 'Strip or coil nails for nail guns', '🧱', 13, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_014', 'cat_hw_fasteners_nails', 'Hardened steel nails', 'Heat-treated high-strength steel nails', '⚒️', 14, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_nails_015', 'cat_hw_fasteners_nails', 'Coated nails', 'Vinyl or resin-coated nails for easier driving', '🧪', 15, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ADDITIONAL SCREW HEAD / DRIVE TYPES
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_009', 'cat_hw_fasteners_screws', 'Flat head screws', 'Flat/slotted head screws for general use', '⬛', 9, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_010', 'cat_hw_fasteners_screws', 'Pozidriv screws', 'Cross-recess Pozidriv head screws', '🧰', 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_011', 'cat_hw_fasteners_screws', 'Slotted screws', 'Single-slot head screws', '➖', 11, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_012', 'cat_hw_fasteners_screws', 'Pan head screws', 'Rounded pan head screws for sheet metal and general use', '🪙', 12, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_013', 'cat_hw_fasteners_screws', 'Truss head screws', 'Low-profile wide-head screws for thin materials', '🪵', 13, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_screws_014', 'cat_hw_fasteners_screws', 'Washer head screws', 'Screws with built-in washer head for large bearing surface', '🧱', 14, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. ADDITIONAL ANCHORS & PLUGS
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_009', 'cat_hw_fasteners_anchors', 'Nylon anchors', 'Nylon wall plugs and anchors for light loads', '🧷', 9, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_010', 'cat_hw_fasteners_anchors', 'Plastic anchors', 'Plastic expansion plugs for brick and block', '🧴', 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_011', 'cat_hw_fasteners_anchors', 'Drop-in anchors', 'Set-with-tool drop-in anchors for concrete', '⬇️', 11, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_012', 'cat_hw_fasteners_anchors', 'Screw-in anchors', 'Self-threading screw-in wall anchors', '🪛', 12, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_anchors_013', 'cat_hw_fasteners_anchors', 'Self-drilling anchors', 'Anchors that drill and set in one operation', '⚙️', 13, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. ADDITIONAL WALL FIXINGS
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_008', 'cat_hw_wall_fixings', 'Brick wall fixings', 'Fixings for solid clay brick walls', '🧱', 8, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_009', 'cat_hw_wall_fixings', 'Block wall fixings', 'Fixings for concrete block and breeze block walls', '🧱', 9, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_010', 'cat_hw_wall_fixings', 'Masonry wall fixings', 'General masonry fixing solutions', '🪨', 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_011', 'cat_hw_wall_fixings', 'Wall mounting hardware', 'General-purpose wall mounting brackets and hardware', '🪛', 11, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_wallfx_012', 'cat_hw_wall_fixings', 'Bracket mounting fasteners', 'Screws and anchors for bracket installation', '🧱', 12, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. NEW CATEGORY: Material-Based Variants
-- ============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_fasteners_materials',
  'Fastener Materials',
  '🧪',
  'Screws and nails by material: carbon steel, stainless, zinc-plated, galvanized, brass',
  '#6B7280', 7, 'domain_hardware_fasteners', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_001', 'cat_hw_fasteners_materials', 'Carbon steel screws', 'Standard carbon steel screws for general use', '🪙', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_002', 'cat_hw_fasteners_materials', 'Stainless steel screws', 'Corrosion-resistant stainless steel screws', '🛡️', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_003', 'cat_hw_fasteners_materials', 'Zinc-plated screws', 'Zinc-plated screws for moderate corrosion resistance', '🧪', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_004', 'cat_hw_fasteners_materials', 'Galvanized screws', 'Hot-dip or electro-galvanized screws for outdoor use', '🛡️', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_005', 'cat_hw_fasteners_materials', 'Hardened steel screws', 'Heat-treated high-strength screws', '⚒️', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_006', 'cat_hw_fasteners_materials', 'Alloy steel screws', 'High-tensile alloy steel fasteners', '🔩', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_007', 'cat_hw_fasteners_materials', 'Brass screws', 'Decorative and corrosion-resistant brass screws', '🟡', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_008', 'cat_hw_fasteners_materials', 'Coated screws', 'Polymer, epoxy, or resin-coated screws', '🧪', 8, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_009', 'cat_hw_fasteners_materials', 'Steel nails', 'Standard mild steel nails', '⚒️', 9, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_010', 'cat_hw_fasteners_materials', 'Stainless steel nails', 'Rust-proof stainless steel nails for marine and outdoor', '🛡️', 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_011', 'cat_hw_fasteners_materials', 'Galvanized nails', 'Zinc-coated nails for weather-exposed applications', '🛡️', 11, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_mat_012', 'cat_hw_fasteners_materials', 'Hardened nails', 'Hardened steel nails for masonry and concrete', '⚒️', 12, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. NEW CATEGORY: Common Applications
-- ============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_fasteners_applications',
  'Common Applications',
  '🛠️',
  'Fasteners grouped by use case: mounting, shelving, cabinets, fixtures, handrails',
  '#6B7280', 8, 'domain_hardware_fasteners', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_001', 'cat_hw_fasteners_applications', 'Wall mounting fastener', 'Fasteners for hanging items on walls', '🖼️', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_002', 'cat_hw_fasteners_applications', 'Shelf installation fastener', 'Screws and anchors for shelf brackets', '🪵', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_003', 'cat_hw_fasteners_applications', 'Cabinet fixing fastener', 'Hardware for kitchen and storage cabinet installation', '🧰', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_004', 'cat_hw_fasteners_applications', 'Frame mounting fastener', 'Fasteners for picture frames and wall art', '🖼️', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_005', 'cat_hw_fasteners_applications', 'Light fixture fastener', 'Screws and anchors for ceiling and wall light fittings', '💡', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_006', 'cat_hw_fasteners_applications', 'Handrail fastener', 'Fixings for stair and balcony handrails', '🪜', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_007', 'cat_hw_fasteners_applications', 'Curtain rail fastener', 'Screws and anchors for curtain rails and tracks', '🪟', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_008', 'cat_hw_fasteners_applications', 'Sign mounting fastener', 'Hardware for signage and notice boards', '🪧', 8, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_009', 'cat_hw_fasteners_applications', 'Fixture repair fastener', 'Replacement screws and fixings for repair jobs', '🔧', 9, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_app_010', 'cat_hw_fasteners_applications', 'General-purpose construction fastener', 'Multi-use fasteners for general building work', '🛠️', 10, true, NOW())
ON CONFLICT (id) DO NOTHING;
