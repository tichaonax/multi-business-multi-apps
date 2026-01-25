-- AlterTable
ALTER TABLE "r710_business_integrations" ADD COLUMN "expense_account_id" TEXT;

-- CreateIndex
CREATE INDEX "r710_business_integrations_expense_account_id_idx" ON "r710_business_integrations"("expense_account_id");

-- AddForeignKey
ALTER TABLE "r710_business_integrations" ADD CONSTRAINT "r710_business_integrations_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "expense_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
