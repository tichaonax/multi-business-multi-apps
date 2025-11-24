-- AlterTable: Add country of issuance, optional license expiry, and template ID to vehicle drivers
ALTER TABLE "vehicle_drivers"
ADD COLUMN IF NOT EXISTS "licenseCountryOfIssuance" TEXT,
ADD COLUMN IF NOT EXISTS "driverLicenseTemplateId" TEXT;

-- Update existing records to have a default country (Zimbabwe)
UPDATE "vehicle_drivers"
SET "licenseCountryOfIssuance" = 'ZW'
WHERE "licenseCountryOfIssuance" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "vehicle_drivers"
ALTER COLUMN "licenseCountryOfIssuance" SET NOT NULL;

-- Make license expiry optional
ALTER TABLE "vehicle_drivers"
ALTER COLUMN "licenseExpiry" DROP NOT NULL;

-- Add foreign key constraint for driver license template
ALTER TABLE "vehicle_drivers"
ADD CONSTRAINT "vehicle_drivers_driverLicenseTemplateId_fkey"
FOREIGN KEY ("driverLicenseTemplateId") REFERENCES "driver_license_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add relation on driver_license_templates side
-- (This is handled by Prisma schema, no SQL needed)

-- AlterEnum: Add new expense types
ALTER TYPE "ExpenseType" ADD VALUE IF NOT EXISTS 'FOOD';
ALTER TYPE "ExpenseType" ADD VALUE IF NOT EXISTS 'TIRE';
ALTER TYPE "ExpenseType" ADD VALUE IF NOT EXISTS 'OIL';
