-- AlterTable: Add description and isActive to fund_sources
ALTER TABLE "fund_sources" ADD COLUMN "description" TEXT;
ALTER TABLE "fund_sources" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "fund_sources" ALTER COLUMN "emoji" SET DEFAULT '👤';
ALTER TABLE "fund_sources" ALTER COLUMN "emoji" SET NOT NULL;

-- Index on userId for fund_sources
CREATE INDEX IF NOT EXISTS "fund_sources_userId_idx" ON "fund_sources"("userId");

-- AlterTable: Add fund source tracking fields to expense_account_deposits
ALTER TABLE "expense_account_deposits" ADD COLUMN "fundSourceId" TEXT;
ALTER TABLE "expense_account_deposits" ADD COLUMN "subSourceId" TEXT;
ALTER TABLE "expense_account_deposits" ADD COLUMN "fundSourceNote" TEXT;

-- AddForeignKey: fundSource (primary)
ALTER TABLE "expense_account_deposits" ADD CONSTRAINT "expense_account_deposits_fundSourceId_fkey"
  FOREIGN KEY ("fundSourceId") REFERENCES "fund_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: subSource (intermediary)
ALTER TABLE "expense_account_deposits" ADD CONSTRAINT "expense_account_deposits_subSourceId_fkey"
  FOREIGN KEY ("subSourceId") REFERENCES "fund_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
