-- Migration: Fix POS role expense permissions snapshot
--
-- The restaurant-associate (and equivalent grocery/clothing-associate) preset
-- previously had canViewExpenseReports: true and canMakeExpensePayments: true.
-- When memberships were created, a full permission snapshot was saved to the DB.
-- The preset has since been corrected, but the DB snapshot overrides the preset
-- because mergeWithBusinessPermissions applies stored true values on top.
--
-- This migration corrects all existing snapshots so the sidebar Finance & Operations
-- section is properly hidden for POS-role users.

UPDATE business_memberships
SET permissions = jsonb_set(permissions, '{canViewExpenseReports}', 'false')
WHERE role IN ('restaurant-associate', 'grocery-associate', 'clothing-associate')
  AND permissions ? 'canViewExpenseReports'
  AND (permissions->>'canViewExpenseReports')::boolean = true;
