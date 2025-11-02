-- Migration: Make businessId optional in BusinessCategories
-- Categories are shared by businessType, not tied to specific business instances

-- Step 1: Make businessId column nullable
ALTER TABLE "business_categories" ALTER COLUMN "businessId" DROP NOT NULL;

-- Step 2: Add index on businessType for improved query performance
CREATE INDEX IF NOT EXISTS "business_categories_businessType_idx" ON "business_categories"("businessType");

-- Step 3: Update existing system categories to have NULL businessId
-- System categories (isUserCreated = false) should not be tied to specific businesses
UPDATE "business_categories" 
SET "businessId" = NULL 
WHERE "isUserCreated" = false;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN "business_categories"."businessId" IS 'Optional reference to specific business. NULL for system categories shared across all businesses of the same type.';
