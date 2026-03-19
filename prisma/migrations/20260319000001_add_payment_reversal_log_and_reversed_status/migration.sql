-- MBM-153: Reverse Expense Payments to Petty Cash
-- Adds reversal tracking fields to expense_account_payments
-- and a new payment_reversal_logs table for audit trail

-- Add reversal fields to expense_account_payments
ALTER TABLE "expense_account_payments"
  ADD COLUMN IF NOT EXISTS "reversed_at"             TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reversed_by"             TEXT,
  ADD COLUMN IF NOT EXISTS "reversal_note"            TEXT,
  ADD COLUMN IF NOT EXISTS "reversal_petty_cash_id"  TEXT;

-- Create payment_reversal_logs table
CREATE TABLE IF NOT EXISTS "payment_reversal_logs" (
  "id"                   TEXT NOT NULL,
  "businessId"           TEXT NOT NULL,
  "reversedBy"           TEXT NOT NULL,
  "reversalNote"         TEXT NOT NULL,
  "pettyCashRequestId"   TEXT NOT NULL,
  "totalAmount"          DECIMAL(12,2) NOT NULL,
  "paymentIds"           TEXT NOT NULL,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_reversal_logs_pkey" PRIMARY KEY ("id")
);

-- Unique: one reversal log per petty cash request
CREATE UNIQUE INDEX IF NOT EXISTS "payment_reversal_logs_pettyCashRequestId_key"
  ON "payment_reversal_logs"("pettyCashRequestId");

-- Indexes
CREATE INDEX IF NOT EXISTS "payment_reversal_logs_businessId_idx"
  ON "payment_reversal_logs"("businessId");

CREATE INDEX IF NOT EXISTS "payment_reversal_logs_reversedBy_idx"
  ON "payment_reversal_logs"("reversedBy");

-- Foreign keys
ALTER TABLE "payment_reversal_logs"
  ADD CONSTRAINT "payment_reversal_logs_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_reversal_logs"
  ADD CONSTRAINT "payment_reversal_logs_reversedBy_fkey"
    FOREIGN KEY ("reversedBy") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_reversal_logs"
  ADD CONSTRAINT "payment_reversal_logs_pettyCashRequestId_fkey"
    FOREIGN KEY ("pettyCashRequestId") REFERENCES "petty_cash_requests"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
