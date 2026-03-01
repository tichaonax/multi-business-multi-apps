-- Add scanToken column to employees table
ALTER TABLE "employees" ADD COLUMN "scanToken" TEXT;

-- Backfill existing employees with unique random UUIDs
UPDATE "employees" SET "scanToken" = gen_random_uuid()::TEXT WHERE "scanToken" IS NULL;

-- Make it NOT NULL and add unique constraint
ALTER TABLE "employees" ALTER COLUMN "scanToken" SET NOT NULL;
ALTER TABLE "employees" ADD CONSTRAINT "employees_scanToken_key" UNIQUE ("scanToken");
