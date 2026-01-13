-- Add defaultPage column to businesses table
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "defaultPage" VARCHAR(50);

-- Add comment explaining valid values
COMMENT ON COLUMN "businesses"."defaultPage" IS 'Default landing page for business (home, pos, reports, inventory, products, orders, menu, reservations)';

-- Set default value for restaurant businesses to 'pos'
UPDATE "businesses"
SET "defaultPage" = 'pos'
WHERE "type" = 'restaurant' AND ("defaultPage" IS NULL OR "defaultPage" = '');

-- Leave other business types as NULL (will default to 'home' in application logic)
