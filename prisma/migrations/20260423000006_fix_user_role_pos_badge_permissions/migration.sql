-- MBM-188: Set canViewPOSSoldCount and canViewPOSStockCount for legacy 'user' role rows.
-- These rows were not covered by 20260423000005 which only handled known role names.
-- Legacy 'user' role is treated as equivalent to 'employee' → both badges = true.

UPDATE business_memberships
SET permissions = jsonb_set(
      jsonb_set(COALESCE(permissions, '{}'::jsonb), '{canViewPOSSoldCount}',  'true'::jsonb, true),
                                                    '{canViewPOSStockCount}', 'true'::jsonb, true)
WHERE role = 'user';
