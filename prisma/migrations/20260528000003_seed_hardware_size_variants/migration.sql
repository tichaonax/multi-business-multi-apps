-- Seed Hardware: Size-Based Screw/Bolt Variants
-- Source: 🛠️ Hardware & Building Supplies.md — "📏 Size-Based Variants" section
--
-- IDEMPOTENT: ON CONFLICT DO NOTHING — safe to rerun
--
-- Adds:
--   1. business_category: "Screw & Bolt Sizes" under domain_hardware_fasteners
--   2. inventory_subcategories: M3–M12 metric sizes, length variants, thread types

-- ============================================================================
-- 1. CATEGORY: Screw & Bolt Sizes
-- ============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'cat_hw_fasteners_sizes',
  'Screw & Bolt Sizes',
  '📏',
  'Metric size variants: M3 through M12, short/medium/long, fine and coarse thread',
  '#6B7280', 6, 'domain_hardware_fasteners', 'hardware', false, true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. SUBCATEGORIES — Metric sizes (M3–M12)
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_m3', 'cat_hw_fasteners_sizes', 'M3 screw', 'Metric M3 diameter screw or bolt', '3️⃣', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_m4', 'cat_hw_fasteners_sizes', 'M4 screw', 'Metric M4 diameter screw or bolt', '4️⃣', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_m5', 'cat_hw_fasteners_sizes', 'M5 screw', 'Metric M5 diameter screw or bolt', '5️⃣', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_m6', 'cat_hw_fasteners_sizes', 'M6 screw', 'Metric M6 diameter screw or bolt', '6️⃣', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_m8', 'cat_hw_fasteners_sizes', 'M8 screw', 'Metric M8 diameter screw or bolt', '8️⃣', 5, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_m10', 'cat_hw_fasteners_sizes', 'M10 screw', 'Metric M10 diameter screw or bolt', '🔟', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_m12', 'cat_hw_fasteners_sizes', 'M12 screw', 'Metric M12 diameter screw or bolt', '🕛', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. SUBCATEGORIES — Length variants
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_short', 'cat_hw_fasteners_sizes', 'Short screw', 'Short length screws (typically under 25mm)', '📏', 8, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_medium', 'cat_hw_fasteners_sizes', 'Medium screw', 'Medium length screws (25–75mm range)', '📐', 9, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_long', 'cat_hw_fasteners_sizes', 'Long screw', 'Long length screws (over 75mm)', '📏', 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. SUBCATEGORIES — Thread types
-- ============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_fine', 'cat_hw_fasteners_sizes', 'Fine thread screw', 'Fine-pitch thread screws for precision applications', '🧵', 11, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
VALUES ('sub_hw_sizes_coarse', 'cat_hw_fasteners_sizes', 'Coarse thread screw', 'Coarse-pitch thread screws for general fastening', '🧵', 12, true, NOW())
ON CONFLICT (id) DO NOTHING;
