-- =============================================================================
-- Migration: Expense Payment Vouchers (MBM-165)
-- =============================================================================
-- Creates the expense_payment_vouchers table to store collector details and
-- signatures for formal payment receipts.
-- =============================================================================

CREATE TABLE "expense_payment_vouchers" (
  "id"                   TEXT NOT NULL,
  "payment_id"           TEXT NOT NULL,
  "business_id"          TEXT NOT NULL,
  "voucher_number"       TEXT NOT NULL,
  "collector_name"       TEXT NOT NULL,
  "collector_phone"      TEXT,
  "collector_id_number"  TEXT,
  "collector_dl_number"  TEXT,
  "collector_signature"  TEXT,
  "notes"                TEXT,
  "created_by_id"        TEXT NOT NULL,
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "expense_payment_vouchers_pkey" PRIMARY KEY ("id")
);

-- Unique: one voucher per payment
CREATE UNIQUE INDEX "expense_payment_vouchers_payment_id_key"
  ON "expense_payment_vouchers"("payment_id");

-- Unique: voucher number per business
CREATE UNIQUE INDEX "expense_payment_vouchers_business_id_voucher_number_key"
  ON "expense_payment_vouchers"("business_id", "voucher_number");

-- Index for listing vouchers by business
CREATE INDEX "expense_payment_vouchers_business_id_idx"
  ON "expense_payment_vouchers"("business_id");

-- FK → expense_account_payments
ALTER TABLE "expense_payment_vouchers"
  ADD CONSTRAINT "expense_payment_vouchers_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "expense_account_payments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK → businesses
ALTER TABLE "expense_payment_vouchers"
  ADD CONSTRAINT "expense_payment_vouchers_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK → employees
ALTER TABLE "expense_payment_vouchers"
  ADD CONSTRAINT "expense_payment_vouchers_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "employees"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
