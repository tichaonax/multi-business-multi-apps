-- CreateTable
CREATE TABLE "business_accounts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "business_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_transactions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "business_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_accounts_businessId_key" ON "business_accounts"("businessId");

-- CreateIndex
CREATE INDEX "business_transactions_businessId_idx" ON "business_transactions"("businessId");
CREATE INDEX "business_transactions_type_idx" ON "business_transactions"("type");
CREATE INDEX "business_transactions_reference_idx" ON "business_transactions"("referenceId", "referenceType");
CREATE INDEX "business_transactions_createdAt_idx" ON "business_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_transactions" ADD CONSTRAINT "business_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_transactions" ADD CONSTRAINT "business_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;