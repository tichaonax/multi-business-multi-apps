-- Backfill canViewPOSSoldCount and canViewPOSStockCount on all business_memberships rows.
-- This is a safe re-application of migrations 20260423000004-006 for environments
-- where those migrations were not applied (e.g. production).
-- Uses jsonb_set so the operation is idempotent regardless of current state.

-- Ensure no NULL permissions columns first
UPDATE business_memberships
SET permissions = '{}'::jsonb
WHERE permissions IS NULL;

-- Roles that SHOULD see POS badge counts → true (unless overridden below)
UPDATE business_memberships
SET permissions = jsonb_set(
      jsonb_set(permissions, '{canViewPOSSoldCount}',  'true'::jsonb, true),
                             '{canViewPOSStockCount}', 'true'::jsonb, true)
WHERE role IN (
  'business-owner',
  'business-manager',
  'employee',
  'restaurant-associate',
  'grocery-associate',
  'clothing-associate',
  'system-admin',
  'user'
);

-- Roles that should NOT see POS badge counts → false
UPDATE business_memberships
SET permissions = jsonb_set(
      jsonb_set(permissions, '{canViewPOSSoldCount}',  'false'::jsonb, true),
                             '{canViewPOSStockCount}', 'false'::jsonb, true)
WHERE role IN (
  'read-only',
  'delivery-driver',
  'salesperson'
);

-- Individual override: Patience Chimedza (patience@hxi.com) must not see either badge.
-- Her role is grocery-associate (set to true above) but she is a salesperson-level user.
UPDATE business_memberships
SET permissions = jsonb_set(
      jsonb_set(permissions, '{canViewPOSSoldCount}',  'false'::jsonb, true),
                             '{canViewPOSStockCount}', 'false'::jsonb, true)
WHERE "userId" = (SELECT id FROM users WHERE email = 'patience@hxi.com');
