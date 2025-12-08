-- Fix hardware categories to be type-based (businessId = null)
-- This migration corrects hardware categories to be shared across all hardware businesses
-- instead of being tied to a specific business

UPDATE business_categories 
SET "businessId" = NULL, "updatedAt" = NOW()
WHERE "businessType" = 'hardware' AND "businessId" IS NOT NULL;
