-- AlterTable: Change unique constraint from [businessId, name] to [businessType, name]
-- This enables category sharing across all businesses of the same type

-- Drop old unique constraint
ALTER TABLE "business_categories" DROP CONSTRAINT IF EXISTS "business_categories_businessId_name_key";

-- Add new unique constraint
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_businessType_name_key" UNIQUE ("businessType", "name");
