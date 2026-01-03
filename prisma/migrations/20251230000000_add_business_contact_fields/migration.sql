-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "address" TEXT;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "receiptReturnPolicy" TEXT;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "taxIncludedInPrice" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "taxLabel" TEXT;
