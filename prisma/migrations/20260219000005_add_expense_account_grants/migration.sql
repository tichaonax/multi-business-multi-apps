-- CreateTable
CREATE TABLE IF NOT EXISTS "expense_account_grants" (
    "id" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_account_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "expense_account_grants_expenseAccountId_userId_key" ON "expense_account_grants"("expenseAccountId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expense_account_grants_userId_idx" ON "expense_account_grants"("userId");

-- AddForeignKey
ALTER TABLE "expense_account_grants" ADD CONSTRAINT "expense_account_grants_expenseAccountId_fkey"
    FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_account_grants" ADD CONSTRAINT "expense_account_grants_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_account_grants" ADD CONSTRAINT "expense_account_grants_grantedBy_fkey"
    FOREIGN KEY ("grantedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
