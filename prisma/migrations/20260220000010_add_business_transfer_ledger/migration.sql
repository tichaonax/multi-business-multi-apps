-- Migration: add_business_transfer_ledger
-- Creates business_transfer_ledger table and adds transferLedgerId to expense_account_payments

-- 1. Create business_transfer_ledger table
CREATE TABLE IF NOT EXISTS "business_transfer_ledger" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "toAccountId"       TEXT NOT NULL,
    "fromBusinessId"    TEXT NOT NULL,
    "fromBusinessName"  TEXT NOT NULL,
    "toBusinessId"      TEXT,
    "depositId"         TEXT NOT NULL,
    "originalAmount"    DECIMAL(12,2) NOT NULL,
    "outstandingAmount" DECIMAL(12,2) NOT NULL,
    "transferDate"      TIMESTAMP(3) NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'OUTSTANDING',
    "createdBy"         TEXT NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_transfer_ledger_pkey" PRIMARY KEY ("id")
);

-- 2. Add FK constraint on toAccountId
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'business_transfer_ledger_toAccountId_fkey'
    ) THEN
        ALTER TABLE "business_transfer_ledger"
            ADD CONSTRAINT "business_transfer_ledger_toAccountId_fkey"
            FOREIGN KEY ("toAccountId") REFERENCES "expense_accounts"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Indexes on business_transfer_ledger
CREATE INDEX IF NOT EXISTS "business_transfer_ledger_toAccountId_status_idx"
    ON "business_transfer_ledger"("toAccountId", "status");

CREATE INDEX IF NOT EXISTS "business_transfer_ledger_status_idx"
    ON "business_transfer_ledger"("status");

-- 4. Add transferLedgerId to expense_account_payments
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expense_account_payments'
          AND column_name = 'transferLedgerId'
    ) THEN
        ALTER TABLE "expense_account_payments" ADD COLUMN "transferLedgerId" TEXT;
    END IF;
END $$;

-- 5. Add FK constraint on transferLedgerId
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'expense_account_payments_transferLedgerId_fkey'
    ) THEN
        ALTER TABLE "expense_account_payments"
            ADD CONSTRAINT "expense_account_payments_transferLedgerId_fkey"
            FOREIGN KEY ("transferLedgerId") REFERENCES "business_transfer_ledger"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
