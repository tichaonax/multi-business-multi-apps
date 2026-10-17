-- MBM-319 — restaurant expenses recorded at purchase time (even with no
-- funds) and paid later through combo payment requests.
--   restaurant_expense_items        per-restaurant catalogue + auto-classification
--   restaurant_expense_transactions one purchase (optional payee, purchase date)
--   restaurant_expense_lines        items in a purchase; comboItemId (unique)
--                                   links a line to the combo item paying it
-- CreateTable
CREATE TABLE "restaurant_expense_items" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_expense_transactions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "payeeType" TEXT,
    "payeePersonId" TEXT,
    "payeeUserId" TEXT,
    "payeeEmployeeId" TEXT,
    "payeeBusinessId" TEXT,
    "payeeSupplierId" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_expense_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_expense_lines" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "comboItemId" TEXT,
    "paidAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_expense_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_expense_items_businessId_useCount_idx" ON "restaurant_expense_items"("businessId", "useCount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_expense_items_businessId_nameKey_key" ON "restaurant_expense_items"("businessId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_expense_transactions_reference_key" ON "restaurant_expense_transactions"("reference");

-- CreateIndex
CREATE INDEX "restaurant_expense_transactions_businessId_purchasedAt_idx" ON "restaurant_expense_transactions"("businessId", "purchasedAt");

-- CreateIndex
CREATE INDEX "restaurant_expense_transactions_expenseAccountId_idx" ON "restaurant_expense_transactions"("expenseAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_expense_lines_comboItemId_key" ON "restaurant_expense_lines"("comboItemId");

-- CreateIndex
CREATE INDEX "restaurant_expense_lines_transactionId_idx" ON "restaurant_expense_lines"("transactionId");

-- CreateIndex
CREATE INDEX "restaurant_expense_lines_status_idx" ON "restaurant_expense_lines"("status");

-- AddForeignKey
ALTER TABLE "restaurant_expense_items" ADD CONSTRAINT "restaurant_expense_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_items" ADD CONSTRAINT "restaurant_expense_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_items" ADD CONSTRAINT "restaurant_expense_items_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "expense_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_items" ADD CONSTRAINT "restaurant_expense_items_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_transactions" ADD CONSTRAINT "restaurant_expense_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_transactions" ADD CONSTRAINT "restaurant_expense_transactions_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_transactions" ADD CONSTRAINT "restaurant_expense_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_transactions" ADD CONSTRAINT "restaurant_expense_transactions_voidedBy_fkey" FOREIGN KEY ("voidedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_lines" ADD CONSTRAINT "restaurant_expense_lines_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "restaurant_expense_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_lines" ADD CONSTRAINT "restaurant_expense_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "restaurant_expense_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_lines" ADD CONSTRAINT "restaurant_expense_lines_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_lines" ADD CONSTRAINT "restaurant_expense_lines_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "expense_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_expense_lines" ADD CONSTRAINT "restaurant_expense_lines_comboItemId_fkey" FOREIGN KEY ("comboItemId") REFERENCES "combo_payment_request_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill the item catalogue from what restaurants have already bought via
-- combo requests, so the POS dropdown is ranked (useCount) and auto-classified
-- from day one. One entry per (restaurant, normalised description); the
-- classification is the most-used category/subcategory pair for it.
WITH past AS (
  SELECT ea."businessId"                AS business_id,
         lower(btrim(ci.description))    AS name_key,
         btrim(ci.description)           AS name,
         ci."categoryId"                 AS category_id,
         ci."subcategoryId"              AS subcategory_id,
         ci."createdAt"                  AS created_at
  FROM combo_payment_request_items ci
  JOIN combo_payment_requests cr ON cr.id = ci."requestId"
  JOIN expense_accounts ea ON ea.id = cr."accountId"
  JOIN businesses b ON b.id = ea."businessId"
  WHERE b.type = 'restaurant'
    AND btrim(coalesce(ci.description, '')) <> ''
),
usage AS (
  SELECT business_id, name_key, count(*) AS use_count, max(created_at) AS last_used,
         (array_agg(name ORDER BY created_at DESC))[1] AS name
  FROM past
  GROUP BY business_id, name_key
),
classification AS (
  SELECT DISTINCT ON (business_id, name_key)
         business_id, name_key, category_id, subcategory_id
  FROM (
    SELECT business_id, name_key, category_id, subcategory_id, count(*) AS n, max(created_at) AS latest
    FROM past
    WHERE category_id IS NOT NULL
    GROUP BY business_id, name_key, category_id, subcategory_id
  ) c
  ORDER BY business_id, name_key, n DESC, latest DESC
)
INSERT INTO restaurant_expense_items
  ("id", "businessId", "name", "nameKey", "categoryId", "subcategoryId", "useCount", "lastUsedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u.business_id, u.name, u.name_key,
       c.category_id, c.subcategory_id, u.use_count, u.last_used, now(), now()
FROM usage u
LEFT JOIN classification c ON c.business_id = u.business_id AND c.name_key = u.name_key;
