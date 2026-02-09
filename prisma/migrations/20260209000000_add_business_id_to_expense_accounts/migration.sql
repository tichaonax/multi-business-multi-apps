-- AlterTable: Add businessId to expense_accounts
ALTER TABLE "expense_accounts" ADD COLUMN "businessId" TEXT;

-- AddForeignKey
ALTER TABLE "expense_accounts" ADD CONSTRAINT "expense_accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "idx_expense_accounts_business" ON "expense_accounts"("businessId");

-- Backfill: Link R710 expense accounts to businesses by name pattern
UPDATE "expense_accounts" ea
SET "businessId" = b.id
FROM "businesses" b
WHERE ea."accountName" LIKE b.name || ' - R710%'
  AND ea."businessId" IS NULL;

-- Backfill: Link regular expense accounts to businesses by name pattern
UPDATE "expense_accounts" ea
SET "businessId" = b.id
FROM "businesses" b
WHERE ea."accountName" LIKE b.name || ' Expense Account'
  AND ea."businessId" IS NULL;

-- Backfill: Link remaining unlinked accounts by checking if every word of the business name
-- appears in the account name (catches reversed word order like "Fashions HXI" → "HXI Fashions")
UPDATE "expense_accounts" ea
SET "businessId" = b.id
FROM "businesses" b
WHERE ea."businessId" IS NULL
  AND (ea."accountName" LIKE '% - R710%' OR ea."accountName" LIKE '% Expense Account')
  AND (
    SELECT COUNT(*) = array_length(string_to_array(b.name, ' '), 1)
    FROM unnest(string_to_array(b.name, ' ')) AS word
    WHERE ea."accountName" ILIKE '%' || word || '%'
  );

-- Fix Pride Makaranga's custom permissions: enable expense account access
UPDATE "business_memberships"
SET permissions = (permissions::jsonb
  || '{"canAccessExpenseAccount":true,"canMakeExpensePayments":true,"canViewExpenseReports":true,"canCreateIndividualPayees":true}'::jsonb
)::json
WHERE "userId" = (SELECT id FROM "users" WHERE name ILIKE '%Pride Makaranga%' LIMIT 1)
  AND "businessId" = 'b9a622a5-c3b9-47c9-88ec-9569f512dbdf';
