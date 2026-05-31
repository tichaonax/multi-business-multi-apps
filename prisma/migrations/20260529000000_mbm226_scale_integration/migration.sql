-- MBM-226: Scale Integration (Star Micronics MG-S8200)
-- Adds weight-based selling and livestock purchase workflow

-- AlterTable: add weight fields to business_products
ALTER TABLE "business_products" ADD COLUMN "isSoldByWeight" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_products" ADD COLUMN "pricePerKg" DECIMAL(10,2);

-- CreateTable: weight_pricing_rules
CREATE TABLE "weight_pricing_rules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL DEFAULT 'PURCHASE',
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weight_pricing_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "weight_pricing_rules_businessId_categoryName_ruleType_key" ON "weight_pricing_rules"("businessId", "categoryName", "ruleType");
CREATE INDEX "weight_pricing_rules_businessId_idx" ON "weight_pricing_rules"("businessId");

ALTER TABLE "weight_pricing_rules" ADD CONSTRAINT "weight_pricing_rules_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: livestock_purchase_sessions
CREATE TABLE "livestock_purchase_sessions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "totalWeightKg" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "expenseAccountId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livestock_purchase_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "livestock_purchase_sessions_businessId_idx" ON "livestock_purchase_sessions"("businessId");
CREATE INDEX "livestock_purchase_sessions_supplierId_idx" ON "livestock_purchase_sessions"("supplierId");
CREATE INDEX "livestock_purchase_sessions_status_idx" ON "livestock_purchase_sessions"("status");

ALTER TABLE "livestock_purchase_sessions" ADD CONSTRAINT "livestock_purchase_sessions_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "livestock_purchase_sessions" ADD CONSTRAINT "livestock_purchase_sessions_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "business_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: livestock_purchase_lines
CREATE TABLE "livestock_purchase_lines" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "weightKg" DECIMAL(10,3) NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livestock_purchase_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "livestock_purchase_lines_sessionId_idx" ON "livestock_purchase_lines"("sessionId");

ALTER TABLE "livestock_purchase_lines" ADD CONSTRAINT "livestock_purchase_lines_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "livestock_purchase_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
