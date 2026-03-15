-- CreateTable: business_rent_configs
-- Model was added to schema but migration file was missing (table existed only on local DB via db push)

CREATE TABLE IF NOT EXISTS "business_rent_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "landlordSupplierId" TEXT NOT NULL,
    "monthlyRentAmount" DECIMAL(12,2) NOT NULL,
    "dailyTransferAmount" DECIMAL(12,2) NOT NULL,
    "operatingDaysPerMonth" INTEGER NOT NULL DEFAULT 30,
    "rentDueDay" INTEGER NOT NULL DEFAULT 1,
    "autoTransferOnEOD" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_rent_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_rent_configs_businessId_key" ON "business_rent_configs"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "business_rent_configs_expenseAccountId_key" ON "business_rent_configs"("expenseAccountId");
CREATE INDEX IF NOT EXISTS "business_rent_configs_businessId_idx" ON "business_rent_configs"("businessId");
CREATE INDEX IF NOT EXISTS "business_rent_configs_landlordSupplierId_idx" ON "business_rent_configs"("landlordSupplierId");

DO $$ BEGIN
  ALTER TABLE "business_rent_configs" ADD CONSTRAINT "business_rent_configs_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "business_rent_configs" ADD CONSTRAINT "business_rent_configs_expenseAccountId_fkey"
    FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "business_rent_configs" ADD CONSTRAINT "business_rent_configs_landlordSupplierId_fkey"
    FOREIGN KEY ("landlordSupplierId") REFERENCES "business_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "business_rent_configs" ADD CONSTRAINT "business_rent_configs_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
