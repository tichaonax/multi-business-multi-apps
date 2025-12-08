-- AlterTable: Fix business_categories unique constraint to include domainId
-- Categories should be unique per businessType + domainId + name
-- This allows same category names in different domains (e.g., "T-Shirts" in Men's and Women's)

-- Drop old constraint (businessType, name)
ALTER TABLE "business_categories" DROP CONSTRAINT IF EXISTS "business_categories_businessType_name_key";

-- Add new constraint (businessType, domainId, name)
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_businessType_domainId_name_key"
  UNIQUE ("businessType", "domainId", "name");
