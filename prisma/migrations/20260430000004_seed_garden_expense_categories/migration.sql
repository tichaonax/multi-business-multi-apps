-- Seed Garden Expense Categories
-- Creates the Garden ExpenseDomain and adds categories and subcategories.
-- Source: ai-contexts/project-plans/review/Garden Expense Categories.md
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds:
--   1 expense_domain  (domain-garden)
--   9 expense_categories  under domain-garden
--   18 expense_subcategories

-- =============================================================================
-- EXPENSE DOMAIN
-- =============================================================================

INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-garden', 'Garden', '🌿', 'Expense categories for garden and landscaping costs', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-garden');

-- =============================================================================
-- EXPENSE CATEGORIES
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-plants', 'domain-garden', 'Plants and Seeds', '🌱', '#22C55E', 'Flowers, vegetables, fruit plants, herbs, trees, seeds and bulbs', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-soil', 'domain-garden', 'Soil and Ground Cover', '🧱', '#A16207', 'Potting soil, compost, mulch, gravel, fertilizers and soil treatments', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-watering', 'domain-garden', 'Watering and Irrigation', '💧', '#0EA5E9', 'Hoses, sprinklers, drip lines, timers, valves and irrigation fittings', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-tools', 'domain-garden', 'Garden Tools', '🛠️', '#F59E0B', 'Hand tools, powered tools, lawn mowers, trimmers and replacement blades', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-pest', 'domain-garden', 'Pest and Weed Control', '🐛', '#EF4444', 'Insecticides, herbicides, traps, baits, weed barriers and landscape fabric', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-structures', 'domain-garden', 'Structures and Supports', '🪵', '#8B5CF6', 'Stakes, trellises, greenhouses, raised beds, fencing, netting and shade covers', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-maintenance', 'domain-garden', 'Garden Maintenance', '🧹', '#06B6D4', 'Cleanup supplies, yard bags, debris removal, broken tool and fence repairs', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-operations', 'domain-garden', 'Garden Operations', '🚚', '#10B981', 'Delivery fees, bulk material transport, garden labor and landscaping services', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-gdn-lighting', 'domain-garden', 'Lighting and Decoration', '💡', '#FBBF24', 'Solar and pathway lights, string lights, pots, ornaments and garden decor', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — PLANTS AND SEEDS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-plants-purchases', 'cat-gdn-plants', 'Plant Purchases', '🌼', 'Flowers, vegetables, fruits, herbs, shrubs, trees, potted and seasonal plants', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-plants-seeds', 'cat-gdn-plants', 'Seeds and Bulbs', '🌾', 'Vegetable seeds, flower seeds, herb seeds, bulbs, tubers, seedlings and starter packs', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — SOIL AND GROUND COVER
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-soil-materials', 'cat-gdn-soil', 'Soil Materials', '🪨', 'Potting soil, garden soil, compost, mulch, topsoil, fill dirt, gravel and sand', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-soil-treatments', 'cat-gdn-soil', 'Soil Treatments', '🧴', 'Fertilizers, soil amendments, lime, pest control granules, fungicides and weed prevention', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — WATERING AND IRRIGATION
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-water-equipment', 'cat-gdn-watering', 'Watering Equipment', '🚿', 'Hoses, sprinklers, drip lines, watering cans, hose reels, nozzles and sprayer bottles', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-water-irrigation', 'cat-gdn-watering', 'Irrigation Parts', '⚙️', 'Timers, valves, fittings, filters, pumps, controllers, pressure regulators and emitters', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — GARDEN TOOLS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-tools-hand', 'cat-gdn-tools', 'Hand Tools', '🔧', 'Shovels, rakes, hoes, pruners, shears, trowels, brooms and garden forks', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-tools-powered', 'cat-gdn-tools', 'Powered Tools', '⚡', 'Lawn mowers, trimmers, leaf blowers, hedge cutters, chainsaws, battery packs and replacement blades', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — PEST AND WEED CONTROL
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-pest-control', 'cat-gdn-pest', 'Pest Control', '🐜', 'Insecticides, sprays, traps, baits, organic pest control, snail and rodent deterrents', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-pest-weed', 'cat-gdn-pest', 'Weed Control', '🌾', 'Herbicides, weed barriers, landscape fabric, pre-emergent treatments, edging and weed killers', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — STRUCTURES AND SUPPORTS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-struct-support', 'cat-gdn-structures', 'Plant Support', '🪜', 'Stakes, trellises, ties, plant cages, clips, hooks and arches', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-struct-outdoor', 'cat-gdn-structures', 'Outdoor Garden Structures', '🏡', 'Greenhouses, planter boxes, raised beds, shade covers, fencing, gates and netting', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — GARDEN MAINTENANCE
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-maint-cleanup', 'cat-gdn-maintenance', 'Cleanup and Upkeep', '🧺', 'Rakes, yard bags, trash bags, cleanup supplies, debris and branch disposal', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-maint-repair', 'cat-gdn-maintenance', 'Repair and Replacement', '🛠️', 'Broken tool replacement, bed and fence repairs, hose and sprinkler replacement, pot and tray replacements', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — GARDEN OPERATIONS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-ops-delivery', 'cat-gdn-operations', 'Delivery and Transport', '📦', 'Delivery fees, bulk material delivery, transport costs, fuel, hauling and disposal fees', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-ops-labor', 'cat-gdn-operations', 'Labor and Services', '👷', 'Garden labor, planting, trimming, cleanup, landscaping, installation and irrigation services', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — LIGHTING AND DECORATION
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-light-outdoor', 'cat-gdn-lighting', 'Outdoor Lighting', '💡', 'Solar lights, pathway lights, battery lights, string lights, spotlights and light fixtures', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-gdn-light-decor', 'cat-gdn-lighting', 'Decorative Items', '🎨', 'Pots, garden decor, stones, ornaments, lanterns, planter decorations, signs and wind chimes', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
