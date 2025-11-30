-- AlterTable
ALTER TABLE "expense_accounts" ADD COLUMN     "parentAccountId" TEXT,
ADD COLUMN     "siblingNumber" INTEGER,
ADD COLUMN     "isSibling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canMerge" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "idx_expense_accounts_parent" ON "expense_accounts"("parentAccountId");

-- CreateIndex
CREATE INDEX "idx_expense_accounts_sibling" ON "expense_accounts"("isSibling");