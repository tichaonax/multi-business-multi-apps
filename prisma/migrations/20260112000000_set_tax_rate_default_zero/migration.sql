-- AlterTable: Set default tax rate to 0 for all businesses
-- This allows business admins to configure their own tax rates

-- Update existing NULL tax rates to 0
UPDATE businesses
SET "taxRate" = 0.00
WHERE "taxRate" IS NULL;

-- Set default tax label if NULL
UPDATE businesses
SET "taxLabel" = 'Tax'
WHERE "taxLabel" IS NULL OR "taxLabel" = '';
