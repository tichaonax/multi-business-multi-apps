-- Fix Invalid Business IDs by Replacing with Proper UUIDs
-- This script safely migrates string IDs to UUIDs while preserving all relationships

BEGIN;

-- Create temporary mapping table
CREATE TEMP TABLE business_id_mapping (
  old_id VARCHAR,
  new_id UUID
);

-- Generate new UUIDs for invalid business IDs
INSERT INTO business_id_mapping (old_id, new_id)
VALUES 
  ('clothing-demo-business', gen_random_uuid()),
  ('grocery-demo-business', gen_random_uuid()),
  ('hardware-demo-business', gen_random_uuid()),
  ('restaurant-demo', gen_random_uuid()),
  ('restaurant-demo-business', gen_random_uuid()),
  ('contractors-demo-business', gen_random_uuid());

-- Show the mapping
SELECT * FROM business_id_mapping;

-- IMPORTANT: Update businesses table FIRST (before FK references)
UPDATE businesses b
SET id = m.new_id
FROM business_id_mapping m
WHERE b.id::text = m.old_id;

-- Now update all tables with FK references to businessId
-- (Only updating tables that actually exist in the schema)

UPDATE business_categories SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_accounts SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_brands SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_customers SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_locations SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_memberships SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_orders SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_products SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_stock_movements SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_suppliers SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE business_transactions SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE customer_laybys SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE employee_business_assignments SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE menu_combos SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE menu_promotions SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE payroll_exports SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE payroll_periods SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE projects SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE vehicle_expenses SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE vehicle_reimbursements SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE vehicle_trips SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;
UPDATE vehicles SET "businessId" = m.new_id FROM business_id_mapping m WHERE "businessId"::text = m.old_id;

-- Verify the fix
SELECT 
  'Businesses with invalid IDs remaining' as check_type,
  COUNT(*) as count
FROM businesses 
WHERE id::text IN ('clothing-demo-business', 'grocery-demo-business', 'hardware-demo-business', 
                   'restaurant-demo', 'restaurant-demo-business', 'contractors-demo-business')
UNION ALL
SELECT 
  'Total businesses' as check_type,
  COUNT(*) as count
FROM businesses
UNION ALL
SELECT 
  'Total business_categories' as check_type,
  COUNT(*) as count
FROM business_categories;

COMMIT;

-- Show final state
SELECT id, name, type, "shortName" FROM businesses ORDER BY type, name;
