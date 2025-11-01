-- Seed Default Business Categories and Subcategories
-- This migration provides default inventory categories for each business type
-- Categories are shared by businessType (not businessId)

-- NOTE: This migration is intentionally EMPTY (placeholder only)
-- Run: npm run seed:categories OR node scripts/seed-type-categories.js

-- This file serves as documentation of the default category structure
-- The actual seeding is done via the seed-type-categories.js script

-- =============================================================================
-- PLACEHOLDER - Actual seeding done via script
-- =============================================================================

-- This migration is intentionally empty to maintain migration order
-- The seed-type-categories.js script will handle the actual data insertion
-- after ensuring businesses exist for each type

-- To seed categories after deployment:
--   1. Ensure migrations are applied: npm run db:deploy
--   2. Run seed script: npm run seed:categories
--   3. Verify: SELECT businessType, COUNT(*) FROM business_categories GROUP BY businessType;
