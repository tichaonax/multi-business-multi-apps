-- Data Migration: Seed Home Appliance Inventory Categories (MBM-174)
-- Adds appliance inventory domains, categories and subcategories for
-- hardware, retail and clothing business types.
--
-- Structure:
--   inventory_domains       → 1 domain per business type (3 total)
--   business_categories     → 6 categories per business type (18 total)
--   inventory_subcategories → subcategories per category (2-4 per category)
--
-- Idempotent: all inserts guarded with WHERE NOT EXISTS or ON CONFLICT.
-- IDs: gen_random_uuid() used explicitly (no DB-level default on these tables).

-- =============================================================================
-- STEP 1 — Inventory Domains
-- =============================================================================

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
SELECT 'domain_hardware_appliances', 'Home Appliances', '🧊', 'Home and commercial appliances for hardware stores', 'hardware', true, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM inventory_domains WHERE id = 'domain_hardware_appliances');

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
SELECT 'domain_retail_appliances', 'Home Appliances', '🧊', 'Home and commercial appliances for retail stores', 'retail', true, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM inventory_domains WHERE id = 'domain_retail_appliances');

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
SELECT 'domain_clothing_appliances', 'Home Appliances', '🧊', 'Home and commercial appliances for clothing stores', 'clothing', true, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM inventory_domains WHERE id = 'domain_clothing_appliances');

-- =============================================================================
-- STEP 2 — Helper: insert a subcategory only if it doesn't already exist
-- =============================================================================

CREATE OR REPLACE FUNCTION _insert_appl_sub(
  p_cat_id TEXT, p_name TEXT, p_emoji TEXT, p_desc TEXT, p_order INT
) RETURNS void LANGUAGE sql AS $$
  INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, description, "displayOrder", "isDefault", "isUserCreated", "createdAt")
  SELECT gen_random_uuid(), p_cat_id, p_name, p_emoji, p_desc, p_order, true, false, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM inventory_subcategories WHERE "categoryId" = p_cat_id AND name = p_name);
$$;

-- =============================================================================
-- STEP 3 — Categories + Subcategories per business type
-- =============================================================================

DO $$
DECLARE
  -- Category ID holders
  v_hw_refrig TEXT; v_hw_cooking TEXT; v_hw_laundry TEXT;
  v_hw_climate TEXT; v_hw_cleaning TEXT; v_hw_entertain TEXT;
  v_rt_refrig TEXT; v_rt_cooking TEXT; v_rt_laundry TEXT;
  v_rt_climate TEXT; v_rt_cleaning TEXT; v_rt_entertain TEXT;
  v_cl_refrig TEXT; v_cl_cooking TEXT; v_cl_laundry TEXT;
  v_cl_climate TEXT; v_cl_cleaning TEXT; v_cl_entertain TEXT;
BEGIN

  -- ─── HARDWARE ────────────────────────────────────────────────────────────

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'hardware', 'domain_hardware_appliances', 'Refrigeration Appliances', 'Fridges, freezers and beverage coolers', '❄️', '#06B6D4', 1, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Refrigeration Appliances');
  SELECT id INTO v_hw_refrig FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Refrigeration Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'hardware', 'domain_hardware_appliances', 'Cooking Appliances', 'Stoves, ovens, microwaves and small cooking appliances', '🍳', '#F97316', 2, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Cooking Appliances');
  SELECT id INTO v_hw_cooking FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Cooking Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'hardware', 'domain_hardware_appliances', 'Laundry Appliances', 'Washing machines, dryers and laundry parts', '🧺', '#3B82F6', 3, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Laundry Appliances');
  SELECT id INTO v_hw_laundry FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Laundry Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'hardware', 'domain_hardware_appliances', 'Climate Control', 'AC units, fans, heaters and climate control parts', '🌬️', '#10B981', 4, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Climate Control');
  SELECT id INTO v_hw_climate FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Climate Control';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'hardware', 'domain_hardware_appliances', 'Cleaning Appliances', 'Vacuums, steam mops and floor care equipment', '🧹', '#8B5CF6', 5, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Cleaning Appliances');
  SELECT id INTO v_hw_cleaning FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Cleaning Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'hardware', 'domain_hardware_appliances', 'Entertainment Appliances', 'TVs, sound systems, game consoles and accessories', '📺', '#EC4899', 6, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Entertainment Appliances');
  SELECT id INTO v_hw_entertain FROM business_categories WHERE "businessType" = 'hardware' AND "domainId" = 'domain_hardware_appliances' AND name = 'Entertainment Appliances';

  -- Hardware subcategories
  PERFORM _insert_appl_sub(v_hw_refrig,   'Fridges',                   '🚪', 'Single-door, double-door, French door, side-by-side, mini and commercial fridges', 1);
  PERFORM _insert_appl_sub(v_hw_refrig,   'Deep Freezers',             '🧊', 'Chest and upright deep freezers', 2);
  PERFORM _insert_appl_sub(v_hw_refrig,   'Beverage Coolers',          '🥤', 'Countertop and commercial beverage coolers', 3);
  PERFORM _insert_appl_sub(v_hw_refrig,   'Fridge Parts',              '🧩', 'Shelves, drawers, door bins, compressors, thermostats, door seals, water filters', 4);
  PERFORM _insert_appl_sub(v_hw_cooking,  'Large Cooking Appliances',  '🔥', 'Stoves, ovens, ranges, cooktops and microwaves', 1);
  PERFORM _insert_appl_sub(v_hw_cooking,  'Small Cooking Appliances',  '🍟', 'Air fryers, toaster ovens, rice cookers, slow cookers, hot plates, electric grills', 2);
  PERFORM _insert_appl_sub(v_hw_cooking,  'Cooking Parts',             '🧩', 'Knobs, heating elements, trays, racks, burner caps, power cords', 3);
  PERFORM _insert_appl_sub(v_hw_laundry,  'Washing Machines',          '🧼', 'Top-load, front-load, portable and combo washer-dryers', 1);
  PERFORM _insert_appl_sub(v_hw_laundry,  'Dryers',                    '🌬️', 'Electric, gas, stackable and compact dryers', 2);
  PERFORM _insert_appl_sub(v_hw_laundry,  'Laundry Parts',             '🧩', 'Hoses, belts, pumps, filters, drums and control panels', 3);
  PERFORM _insert_appl_sub(v_hw_climate,  'Cooling Units',             '❄️', 'Window AC, split AC, portable AC, ceiling fans, box fans, tower fans', 1);
  PERFORM _insert_appl_sub(v_hw_climate,  'Heating Units',             '🔥', 'Space heaters, wall heaters, portable heaters and radiators', 2);
  PERFORM _insert_appl_sub(v_hw_climate,  'Climate Parts',             '🧩', 'Filters, thermostats, fan blades, motors, remote controls, vent covers', 3);
  PERFORM _insert_appl_sub(v_hw_cleaning, 'Vacuum Equipment',          '🧹', 'Upright, canister, handheld and robot vacuums', 1);
  PERFORM _insert_appl_sub(v_hw_cleaning, 'Floor Care Equipment',      '🧽', 'Steam mops, carpet cleaners, floor polishers and scrubbers', 2);
  PERFORM _insert_appl_sub(v_hw_cleaning, 'Cleaning Parts',            '🧩', 'Bags, brushes, filters, belts, pads and attachments', 3);
  PERFORM _insert_appl_sub(v_hw_entertain,'Entertainment Devices',     '🎥', 'TVs, monitors, soundbars, DVD players, streaming devices, game consoles', 1);
  PERFORM _insert_appl_sub(v_hw_entertain,'Entertainment Accessories', '🧩', 'Remote controls, HDMI cables, power adapters, mounts, stands, controllers', 2);

  -- ─── RETAIL ──────────────────────────────────────────────────────────────

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'retail', 'domain_retail_appliances', 'Refrigeration Appliances', 'Fridges, freezers and beverage coolers', '❄️', '#06B6D4', 1, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Refrigeration Appliances');
  SELECT id INTO v_rt_refrig FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Refrigeration Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'retail', 'domain_retail_appliances', 'Cooking Appliances', 'Stoves, ovens, microwaves and small cooking appliances', '🍳', '#F97316', 2, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Cooking Appliances');
  SELECT id INTO v_rt_cooking FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Cooking Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'retail', 'domain_retail_appliances', 'Laundry Appliances', 'Washing machines, dryers and laundry parts', '🧺', '#3B82F6', 3, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Laundry Appliances');
  SELECT id INTO v_rt_laundry FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Laundry Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'retail', 'domain_retail_appliances', 'Climate Control', 'AC units, fans, heaters and climate control parts', '🌬️', '#10B981', 4, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Climate Control');
  SELECT id INTO v_rt_climate FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Climate Control';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'retail', 'domain_retail_appliances', 'Cleaning Appliances', 'Vacuums, steam mops and floor care equipment', '🧹', '#8B5CF6', 5, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Cleaning Appliances');
  SELECT id INTO v_rt_cleaning FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Cleaning Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'retail', 'domain_retail_appliances', 'Entertainment Appliances', 'TVs, sound systems, game consoles and accessories', '📺', '#EC4899', 6, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Entertainment Appliances');
  SELECT id INTO v_rt_entertain FROM business_categories WHERE "businessType" = 'retail' AND "domainId" = 'domain_retail_appliances' AND name = 'Entertainment Appliances';

  -- Retail subcategories
  PERFORM _insert_appl_sub(v_rt_refrig,   'Fridges',                   '🚪', 'Single-door, double-door, French door, side-by-side, mini and commercial fridges', 1);
  PERFORM _insert_appl_sub(v_rt_refrig,   'Deep Freezers',             '🧊', 'Chest and upright deep freezers', 2);
  PERFORM _insert_appl_sub(v_rt_refrig,   'Beverage Coolers',          '🥤', 'Countertop and commercial beverage coolers', 3);
  PERFORM _insert_appl_sub(v_rt_refrig,   'Fridge Parts',              '🧩', 'Shelves, drawers, door bins, compressors, thermostats, door seals, water filters', 4);
  PERFORM _insert_appl_sub(v_rt_cooking,  'Large Cooking Appliances',  '🔥', 'Stoves, ovens, ranges, cooktops and microwaves', 1);
  PERFORM _insert_appl_sub(v_rt_cooking,  'Small Cooking Appliances',  '🍟', 'Air fryers, toaster ovens, rice cookers, slow cookers, hot plates, electric grills', 2);
  PERFORM _insert_appl_sub(v_rt_cooking,  'Cooking Parts',             '🧩', 'Knobs, heating elements, trays, racks, burner caps, power cords', 3);
  PERFORM _insert_appl_sub(v_rt_laundry,  'Washing Machines',          '🧼', 'Top-load, front-load, portable and combo washer-dryers', 1);
  PERFORM _insert_appl_sub(v_rt_laundry,  'Dryers',                    '🌬️', 'Electric, gas, stackable and compact dryers', 2);
  PERFORM _insert_appl_sub(v_rt_laundry,  'Laundry Parts',             '🧩', 'Hoses, belts, pumps, filters, drums and control panels', 3);
  PERFORM _insert_appl_sub(v_rt_climate,  'Cooling Units',             '❄️', 'Window AC, split AC, portable AC, ceiling fans, box fans, tower fans', 1);
  PERFORM _insert_appl_sub(v_rt_climate,  'Heating Units',             '🔥', 'Space heaters, wall heaters, portable heaters and radiators', 2);
  PERFORM _insert_appl_sub(v_rt_climate,  'Climate Parts',             '🧩', 'Filters, thermostats, fan blades, motors, remote controls, vent covers', 3);
  PERFORM _insert_appl_sub(v_rt_cleaning, 'Vacuum Equipment',          '🧹', 'Upright, canister, handheld and robot vacuums', 1);
  PERFORM _insert_appl_sub(v_rt_cleaning, 'Floor Care Equipment',      '🧽', 'Steam mops, carpet cleaners, floor polishers and scrubbers', 2);
  PERFORM _insert_appl_sub(v_rt_cleaning, 'Cleaning Parts',            '🧩', 'Bags, brushes, filters, belts, pads and attachments', 3);
  PERFORM _insert_appl_sub(v_rt_entertain,'Entertainment Devices',     '🎥', 'TVs, monitors, soundbars, DVD players, streaming devices, game consoles', 1);
  PERFORM _insert_appl_sub(v_rt_entertain,'Entertainment Accessories', '🧩', 'Remote controls, HDMI cables, power adapters, mounts, stands, controllers', 2);

  -- ─── CLOTHING ────────────────────────────────────────────────────────────

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'clothing', 'domain_clothing_appliances', 'Refrigeration Appliances', 'Fridges, freezers and beverage coolers', '❄️', '#06B6D4', 1, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Refrigeration Appliances');
  SELECT id INTO v_cl_refrig FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Refrigeration Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'clothing', 'domain_clothing_appliances', 'Cooking Appliances', 'Stoves, ovens, microwaves and small cooking appliances', '🍳', '#F97316', 2, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Cooking Appliances');
  SELECT id INTO v_cl_cooking FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Cooking Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'clothing', 'domain_clothing_appliances', 'Laundry Appliances', 'Washing machines, dryers and laundry parts', '🧺', '#3B82F6', 3, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Laundry Appliances');
  SELECT id INTO v_cl_laundry FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Laundry Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'clothing', 'domain_clothing_appliances', 'Climate Control', 'AC units, fans, heaters and climate control parts', '🌬️', '#10B981', 4, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Climate Control');
  SELECT id INTO v_cl_climate FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Climate Control';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'clothing', 'domain_clothing_appliances', 'Cleaning Appliances', 'Vacuums, steam mops and floor care equipment', '🧹', '#8B5CF6', 5, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Cleaning Appliances');
  SELECT id INTO v_cl_cleaning FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Cleaning Appliances';

  INSERT INTO business_categories (id, "businessType", "domainId", name, description, emoji, color, "displayOrder", "businessId", "isUserCreated", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'clothing', 'domain_clothing_appliances', 'Entertainment Appliances', 'TVs, sound systems, game consoles and accessories', '📺', '#EC4899', 6, NULL, false, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Entertainment Appliances');
  SELECT id INTO v_cl_entertain FROM business_categories WHERE "businessType" = 'clothing' AND "domainId" = 'domain_clothing_appliances' AND name = 'Entertainment Appliances';

  -- Clothing subcategories
  PERFORM _insert_appl_sub(v_cl_refrig,   'Fridges',                   '🚪', 'Single-door, double-door, French door, side-by-side, mini and commercial fridges', 1);
  PERFORM _insert_appl_sub(v_cl_refrig,   'Deep Freezers',             '🧊', 'Chest and upright deep freezers', 2);
  PERFORM _insert_appl_sub(v_cl_refrig,   'Beverage Coolers',          '🥤', 'Countertop and commercial beverage coolers', 3);
  PERFORM _insert_appl_sub(v_cl_refrig,   'Fridge Parts',              '🧩', 'Shelves, drawers, door bins, compressors, thermostats, door seals, water filters', 4);
  PERFORM _insert_appl_sub(v_cl_cooking,  'Large Cooking Appliances',  '🔥', 'Stoves, ovens, ranges, cooktops and microwaves', 1);
  PERFORM _insert_appl_sub(v_cl_cooking,  'Small Cooking Appliances',  '🍟', 'Air fryers, toaster ovens, rice cookers, slow cookers, hot plates, electric grills', 2);
  PERFORM _insert_appl_sub(v_cl_cooking,  'Cooking Parts',             '🧩', 'Knobs, heating elements, trays, racks, burner caps, power cords', 3);
  PERFORM _insert_appl_sub(v_cl_laundry,  'Washing Machines',          '🧼', 'Top-load, front-load, portable and combo washer-dryers', 1);
  PERFORM _insert_appl_sub(v_cl_laundry,  'Dryers',                    '🌬️', 'Electric, gas, stackable and compact dryers', 2);
  PERFORM _insert_appl_sub(v_cl_laundry,  'Laundry Parts',             '🧩', 'Hoses, belts, pumps, filters, drums and control panels', 3);
  PERFORM _insert_appl_sub(v_cl_climate,  'Cooling Units',             '❄️', 'Window AC, split AC, portable AC, ceiling fans, box fans, tower fans', 1);
  PERFORM _insert_appl_sub(v_cl_climate,  'Heating Units',             '🔥', 'Space heaters, wall heaters, portable heaters and radiators', 2);
  PERFORM _insert_appl_sub(v_cl_climate,  'Climate Parts',             '🧩', 'Filters, thermostats, fan blades, motors, remote controls, vent covers', 3);
  PERFORM _insert_appl_sub(v_cl_cleaning, 'Vacuum Equipment',          '🧹', 'Upright, canister, handheld and robot vacuums', 1);
  PERFORM _insert_appl_sub(v_cl_cleaning, 'Floor Care Equipment',      '🧽', 'Steam mops, carpet cleaners, floor polishers and scrubbers', 2);
  PERFORM _insert_appl_sub(v_cl_cleaning, 'Cleaning Parts',            '🧩', 'Bags, brushes, filters, belts, pads and attachments', 3);
  PERFORM _insert_appl_sub(v_cl_entertain,'Entertainment Devices',     '🎥', 'TVs, monitors, soundbars, DVD players, streaming devices, game consoles', 1);
  PERFORM _insert_appl_sub(v_cl_entertain,'Entertainment Accessories', '🧩', 'Remote controls, HDMI cables, power adapters, mounts, stands, controllers', 2);

END $$;

-- Clean up helper function (no longer needed after migration)
DROP FUNCTION IF EXISTS _insert_appl_sub(TEXT, TEXT, TEXT, TEXT, INT);
