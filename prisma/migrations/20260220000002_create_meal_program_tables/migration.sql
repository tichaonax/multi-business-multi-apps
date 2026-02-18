-- CreateTable
CREATE TABLE IF NOT EXISTS "meal_program_participants" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "participantType" TEXT NOT NULL,
    "employeeId" TEXT,
    "personId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredBy" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_program_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "meal_program_eligible_items" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_program_eligible_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "meal_program_transactions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "expensePaymentId" TEXT,
    "soldByEmployeeId" TEXT,
    "soldByUserId" TEXT NOT NULL,
    "subsidyAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.50,
    "cashAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "subsidizedProductId" TEXT,
    "subsidizedProductName" TEXT,
    "subsidizedIsEligibleItem" BOOLEAN NOT NULL DEFAULT true,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemsSummary" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_program_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent with IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "meal_program_participants_employeeId_key" ON "meal_program_participants"("employeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "meal_program_participants_personId_key" ON "meal_program_participants"("personId");
CREATE UNIQUE INDEX IF NOT EXISTS "meal_program_participants_businessId_employeeId_key" ON "meal_program_participants"("businessId", "employeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "meal_program_participants_businessId_personId_key" ON "meal_program_participants"("businessId", "personId");
CREATE INDEX IF NOT EXISTS "meal_program_participants_businessId_isActive_idx" ON "meal_program_participants"("businessId", "isActive");
CREATE INDEX IF NOT EXISTS "meal_program_participants_employeeId_idx" ON "meal_program_participants"("employeeId");
CREATE INDEX IF NOT EXISTS "meal_program_participants_personId_idx" ON "meal_program_participants"("personId");

CREATE UNIQUE INDEX IF NOT EXISTS "meal_program_eligible_items_businessId_productId_key" ON "meal_program_eligible_items"("businessId", "productId");
CREATE INDEX IF NOT EXISTS "meal_program_eligible_items_businessId_isActive_idx" ON "meal_program_eligible_items"("businessId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "meal_program_transactions_orderId_key" ON "meal_program_transactions"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "meal_program_transactions_expensePaymentId_key" ON "meal_program_transactions"("expensePaymentId");
CREATE INDEX IF NOT EXISTS "meal_program_transactions_businessId_transactionDate_idx" ON "meal_program_transactions"("businessId", "transactionDate");
CREATE INDEX IF NOT EXISTS "meal_program_transactions_participantId_transactionDate_idx" ON "meal_program_transactions"("participantId", "transactionDate");
CREATE INDEX IF NOT EXISTS "meal_program_transactions_soldByEmployeeId_idx" ON "meal_program_transactions"("soldByEmployeeId");

-- AddForeignKey (use DO block to skip if already exists)
DO $$ BEGIN
    ALTER TABLE "meal_program_participants" ADD CONSTRAINT "meal_program_participants_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_participants" ADD CONSTRAINT "meal_program_participants_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_participants" ADD CONSTRAINT "meal_program_participants_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_participants" ADD CONSTRAINT "meal_program_participants_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_eligible_items" ADD CONSTRAINT "meal_program_eligible_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_eligible_items" ADD CONSTRAINT "meal_program_eligible_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_eligible_items" ADD CONSTRAINT "meal_program_eligible_items_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_transactions" ADD CONSTRAINT "meal_program_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_transactions" ADD CONSTRAINT "meal_program_transactions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "meal_program_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_transactions" ADD CONSTRAINT "meal_program_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "business_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_transactions" ADD CONSTRAINT "meal_program_transactions_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_transactions" ADD CONSTRAINT "meal_program_transactions_expensePaymentId_fkey" FOREIGN KEY ("expensePaymentId") REFERENCES "expense_account_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_transactions" ADD CONSTRAINT "meal_program_transactions_soldByEmployeeId_fkey" FOREIGN KEY ("soldByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "meal_program_transactions" ADD CONSTRAINT "meal_program_transactions_soldByUserId_fkey" FOREIGN KEY ("soldByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
