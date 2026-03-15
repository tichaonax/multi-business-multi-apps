-- CreateTable
CREATE TABLE "expense_account_auto_deposits" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "dailyAmount" DECIMAL(12,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_paused_by_cap" BOOLEAN NOT NULL DEFAULT FALSE,
    "start_date" DATE DEFAULT NULL,
    "end_date" DATE DEFAULT NULL,

    CONSTRAINT "expense_account_auto_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_account_auto_deposits_businessId_expenseAccountId_key" ON "expense_account_auto_deposits"("businessId", "expenseAccountId");

-- CreateIndex
CREATE INDEX "expense_account_auto_deposits_businessId_idx" ON "expense_account_auto_deposits"("businessId");

-- CreateIndex
CREATE INDEX "expense_account_auto_deposits_expenseAccountId_idx" ON "expense_account_auto_deposits"("expenseAccountId");

-- AddForeignKey
ALTER TABLE "expense_account_auto_deposits" ADD CONSTRAINT "expense_account_auto_deposits_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_account_auto_deposits" ADD CONSTRAINT "expense_account_auto_deposits_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_account_auto_deposits" ADD CONSTRAINT "expense_account_auto_deposits_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes for schedule + cap-pause fields (originally in 20260306000001)
CREATE INDEX "idx_auto_deposits_start_date" ON "expense_account_auto_deposits"("start_date");
CREATE INDEX "idx_auto_deposits_end_date"   ON "expense_account_auto_deposits"("end_date");
CREATE INDEX "idx_auto_deposits_paused_cap" ON "expense_account_auto_deposits"("is_paused_by_cap");
