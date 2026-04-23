-- MBM-188: Set canViewPOSSoldCount and canViewPOSStockCount on all
-- business_memberships rows based on role.
-- Migration 20260423000004 used || operator which did not commit on some
-- environments. This migration uses jsonb_set and is idempotent.

-- Ensure no NULL permissions columns
UPDATE business_memberships
SET permissions = '{}'::jsonb
WHERE permissions IS NULL;

-- Roles that should see POS badges → true
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

-- Roles that should NOT see POS badges → false
UPDATE business_memberships
SET permissions = jsonb_set(
      jsonb_set(permissions, '{canViewPOSSoldCount}',  'false'::jsonb, true),
                             '{canViewPOSStockCount}', 'false'::jsonb, true)
WHERE role IN (
  'read-only',
  'delivery-driver'
);
