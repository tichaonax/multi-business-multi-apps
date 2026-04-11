-- Data Migration: Seed Home Appliance Expense Categories (MBM-174)
-- Adds 5 global expense categories (domainId = NULL) visible across all business/personal contexts.
-- Uses INSERT ... WHERE NOT EXISTS to be safe on re-run.

-- ─── Parent Categories ───────────────────────────────────────────────────────

INSERT INTO "expense_categories" ("id", "name", "emoji", "color", "description", "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt")
SELECT 'cat-appl-purchase', 'Appliance Purchase & Replacement', '🛒', '#3B82F6',
       'New appliance purchases, replacement units, upgrades and bulk buys',
       true, true, false, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'cat-appl-purchase');

INSERT INTO "expense_categories" ("id", "name", "emoji", "color", "description", "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt")
SELECT 'cat-appl-repair', 'Appliance Repair & Maintenance', '🔧', '#F59E0B',
       'Service calls, labour, replacement parts, diagnostics and preventive maintenance',
       true, true, false, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'cat-appl-repair');

INSERT INTO "expense_categories" ("id", "name", "emoji", "color", "description", "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt")
SELECT 'cat-appl-operating', 'Appliance Operating Costs', '⚡', '#10B981',
       'Electricity, water, gas usage, warranty and insurance costs for appliances',
       false, true, false, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'cat-appl-operating');

INSERT INTO "expense_categories" ("id", "name", "emoji", "color", "description", "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt")
SELECT 'cat-appl-logistics', 'Appliance Logistics & Setup', '🚚', '#8B5CF6',
       'Delivery, installation, setup, disposal and relocation of appliances',
       false, true, false, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'cat-appl-logistics');

INSERT INTO "expense_categories" ("id", "name", "emoji", "color", "description", "requiresSubcategory", "isDefault", "isUserCreated", "domainId", "createdAt", "updatedAt")
SELECT 'cat-appl-loss', 'Appliance Stock & Loss', '📉', '#EF4444',
       'Damaged units, theft, returns, warranty replacements and write-offs',
       false, true, false, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'cat-appl-loss');

-- ─── Purchase Subcategories ──────────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-pur-refrigeration', 'cat-appl-purchase', 'Refrigeration', '❄️', 'Fridges, freezers, beverage coolers and their parts', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-pur-refrigeration');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-pur-cooking', 'cat-appl-purchase', 'Cooking', '🍳', 'Stoves, ovens, microwaves, air fryers and small cooking appliances', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-pur-cooking');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-pur-laundry', 'cat-appl-purchase', 'Laundry', '🧺', 'Washing machines, dryers and laundry parts', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-pur-laundry');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-pur-climate', 'cat-appl-purchase', 'Climate Control', '🌬️', 'AC units, fans, heaters and climate control parts', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-pur-climate');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-pur-cleaning', 'cat-appl-purchase', 'Cleaning', '🧹', 'Vacuums, steam mops, floor care equipment and parts', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-pur-cleaning');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-pur-entertainment', 'cat-appl-purchase', 'Entertainment', '📺', 'TVs, sound systems, game consoles and accessories', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-pur-entertainment');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-pur-general', 'cat-appl-purchase', 'General', '🏠', 'General or mixed appliance expenses', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-pur-general');

-- ─── Repair Subcategories ────────────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-rep-refrigeration', 'cat-appl-repair', 'Refrigeration', '❄️', 'Fridges, freezers, beverage coolers and their parts', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-rep-refrigeration');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-rep-cooking', 'cat-appl-repair', 'Cooking', '🍳', 'Stoves, ovens, microwaves, air fryers and small cooking appliances', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-rep-cooking');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-rep-laundry', 'cat-appl-repair', 'Laundry', '🧺', 'Washing machines, dryers and laundry parts', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-rep-laundry');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-rep-climate', 'cat-appl-repair', 'Climate Control', '🌬️', 'AC units, fans, heaters and climate control parts', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-rep-climate');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-rep-cleaning', 'cat-appl-repair', 'Cleaning', '🧹', 'Vacuums, steam mops, floor care equipment and parts', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-rep-cleaning');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-rep-entertainment', 'cat-appl-repair', 'Entertainment', '📺', 'TVs, sound systems, game consoles and accessories', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-rep-entertainment');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-rep-general', 'cat-appl-repair', 'General', '🏠', 'General or mixed appliance expenses', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-rep-general');

-- ─── Operating Costs Subcategories ──────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-op-electricity', 'cat-appl-operating', 'Electricity Usage', '⚡', 'Power consumption costs', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-op-electricity');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-op-water', 'cat-appl-operating', 'Water Usage', '💧', 'Water consumption costs', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-op-water');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-op-gas', 'cat-appl-operating', 'Gas Usage', '🔥', 'Gas consumption costs', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-op-gas');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-op-warranty', 'cat-appl-operating', 'Warranty & Insurance', '🛡️', 'Warranty fees and insurance premiums', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-op-warranty');

-- ─── Logistics Subcategories ─────────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-log-delivery', 'cat-appl-logistics', 'Delivery Fees', '🚚', 'Shipping and delivery charges', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-log-delivery');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-log-installation', 'cat-appl-logistics', 'Installation Fees', '🛠️', 'Professional installation charges', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-log-installation');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-log-disposal', 'cat-appl-logistics', 'Removal & Disposal', '🗑️', 'Old unit removal and disposal fees', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-log-disposal');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-log-relocation', 'cat-appl-logistics', 'Relocation Costs', '🔄', 'Costs to move appliances between locations', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-log-relocation');

-- ─── Stock & Loss Subcategories ──────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-loss-damaged', 'cat-appl-loss', 'Damaged Units', '💥', 'Appliances damaged beyond use', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-loss-damaged');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-loss-theft', 'cat-appl-loss', 'Theft & Loss', '🕵️', 'Stolen or lost appliances', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-loss-theft');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-loss-returns', 'cat-appl-loss', 'Returned Units', '↩️', 'Customer or supplier returns', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-loss-returns');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-loss-warranty', 'cat-appl-loss', 'Warranty Replacements', '🛡️', 'Units replaced under warranty', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-loss-warranty');

INSERT INTO "expense_subcategories" ("id", "categoryId", "name", "emoji", "description", "isDefault", "isUserCreated", "createdAt", "updatedAt")
SELECT 'sub-appl-loss-writeoff', 'cat-appl-loss', 'Write-offs', '🧾', 'Written-off appliance inventory', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id" = 'sub-appl-loss-writeoff');
