-- Add title book document fields to vehicles table
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "titleBookUrl" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "titleBookName" TEXT;

-- Add driver license document fields to vehicle_drivers table
ALTER TABLE "vehicle_drivers" ADD COLUMN IF NOT EXISTS "licenseDocUrl" TEXT;
ALTER TABLE "vehicle_drivers" ADD COLUMN IF NOT EXISTS "licenseDocName" TEXT;

-- Add national ID document fields to employees table
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "nationalIdDocUrl" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "nationalIdDocName" TEXT;
