-- ============================================================
-- MBM-169 Construction domain full upsert
-- Safe to re-run: updates emojis on seeded rows, skips user-created
-- Structure: expense_domain "Construction"
--   → expense_categories (11 categories = ## headings in md)
--     → expense_subcategories (33 subcategories = - items in md)
-- ============================================================

-- Ensure Construction domain exists
INSERT INTO expense_domains (id, name, emoji, "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Construction', '🏗️', true, NOW())
ON CONFLICT (name) DO UPDATE SET emoji = '🏗️';

-- ============================================================
-- CATEGORIES (11) — upsert with correct emoji
-- ============================================================

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'General Construction', '🏗️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Structural Work', '🧱', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Plumbing and HVAC', '🚿', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Electrical Work', '⚡', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Finish Work', '🚪', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Civil Construction', '🛣️', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Equipment and Machinery', '🧰', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Safety and Compliance', '🧯', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Roofing and Exterior', '🪟', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Project Management and Estimating', '🏢', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

INSERT INTO expense_categories (id, name, emoji, color, "domainId", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Specialty Construction', '🏠', '#3B82F6', d.id, false, false, NOW(), NOW()
FROM expense_domains d WHERE d.name = 'Construction'
ON CONFLICT ("domainId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_categories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — General Construction (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Building Construction', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'General Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Renovation and Remodeling', '🔨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'General Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Site Preparation', '🧹', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'General Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Structural Work (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Foundations', '🏛️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Structural Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Framing', '🪵', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Structural Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Masonry', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Structural Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Plumbing and HVAC (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Plumbing', '🚰', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Plumbing and HVAC'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'HVAC', '❄️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Plumbing and HVAC'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Mechanical', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Plumbing and HVAC'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Electrical Work (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Rough-In', '🔌', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Electrical Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Fixtures', '💡', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Electrical Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Electrical Service', '🛡️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Electrical Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Finish Work (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Carpentry', '🪚', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Finish Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Painting', '🎨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Finish Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Drywall', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Finish Work'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Civil Construction (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Roadwork', '🚧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Civil Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Infrastructure', '🌉', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Civil Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Drainage and Utilities', '💧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Civil Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Equipment and Machinery (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Heavy Equipment', '🚜', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Equipment and Machinery'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Equipment Services', '🔧', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Equipment and Machinery'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Tooling', '📦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Equipment and Machinery'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Safety and Compliance (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Jobsite Safety', '🦺', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Safety and Compliance'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Compliance', '📋', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Safety and Compliance'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Risk Control', '🚨', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Safety and Compliance'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Roofing and Exterior (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Roofing', '🏠', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Roofing and Exterior'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Exterior Finishes', '🧱', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Roofing and Exterior'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Waterproofing', '🌧️', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Roofing and Exterior'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Project Management and Estimating (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pre-Construction', '📋', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Project Management and Estimating'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Project Control', '📅', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Project Management and Estimating'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Procurement', '📦', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Project Management and Estimating'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

-- ============================================================
-- SUBCATEGORIES — Specialty Construction (3)
-- ============================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Pools and Outdoor Living', '🏊', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Specialty Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Industrial Builds', '🏭', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Specialty Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "createdAt")
SELECT gen_random_uuid(), c.id, 'Institutional Work', '🏥', false, false, NOW()
FROM expense_categories c JOIN expense_domains d ON c."domainId" = d.id
WHERE d.name = 'Construction' AND c.name = 'Specialty Construction'
ON CONFLICT ("categoryId", name) DO UPDATE SET emoji = EXCLUDED.emoji WHERE expense_subcategories."isUserCreated" = false;
