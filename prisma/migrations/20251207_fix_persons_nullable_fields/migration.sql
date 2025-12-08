-- AlterTable: Make phone and nationalId nullable on persons table
-- These fields should be optional when creating individual payees

ALTER TABLE "persons" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "persons" ALTER COLUMN "nationalId" DROP NOT NULL;
