-- Add showTestData toggle to businesses table
ALTER TABLE "businesses" ADD COLUMN "showTestData" BOOLEAN NOT NULL DEFAULT false;
