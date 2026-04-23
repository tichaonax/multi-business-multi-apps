-- MBM-188: Backfill canViewPOSSoldCount and canViewPOSStockCount on all
-- existing business_memberships rows based on their role.
--
-- Uses jsonb_set to explicitly write each key so NULL permissions columns
-- are handled safely and the operation is idempotent.

-- Step 1: Ensure permissions column is never NULL before merging
UPDATE business_memberships
SET permissions = '{}'::jsonb
WHERE permissions IS NULL;

-- Step 2: TRUE for roles that should see POS badges
UPDATE business_memberships
SET permissions = jsonb_set(
      jsonb_set(permissions, '{canViewPOSSoldCount}',  'true'::jsonb, true),
                             '{canViewPOSStockCount}', 'true'::jsonb, true)
WHERE role IN (
  'business-owner',
  'business-manager',
  'employee',
  'salesperson',
  'restaurant-associate',
  'grocery-associate',
  'clothing-associate',
  'system-admin'
);

-- Step 3: FALSE for roles that should NOT see POS badges
UPDATE business_memberships
SET permissions = jsonb_set(
      jsonb_set(permissions, '{canViewPOSSoldCount}',  'false'::jsonb, true),
                             '{canViewPOSStockCount}', 'false'::jsonb, true)
WHERE role IN (
  'read-only',
  'delivery-driver'
);
