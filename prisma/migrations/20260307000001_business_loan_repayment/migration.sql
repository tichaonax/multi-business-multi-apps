-- Migration: 20260307000001_business_loan_repayment
-- Adds Business Loan Repayment Management System (MBM-137)
-- New tables: business_loans, business_loan_expenses,
--             business_loan_pre_lock_repayments, loan_withdrawal_requests
-- Modified: expense_accounts (is_loan_account), expense_account_payments (withdrawal_request_id)

-- ─── expense_accounts: loan account flag ──────────────────────────────────────

ALTER TABLE "expense_accounts"
  ADD COLUMN "is_loan_account" BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN "expense_accounts"."is_loan_account"
  IS 'When true: auto-deposits capped at $0; balance may never exceed $0';

-- ─── expense_account_payments: withdrawal request link ────────────────────────

ALTER TABLE "expense_account_payments"
  ADD COLUMN "withdrawal_request_id" TEXT DEFAULT NULL;

ALTER TABLE "expense_account_payments"
  ADD CONSTRAINT "expense_account_payments_withdrawal_request_id_key"
  UNIQUE ("withdrawal_request_id");

-- ─── business_loans ───────────────────────────────────────────────────────────

CREATE TABLE "business_loans" (
  "id"                  TEXT          NOT NULL,
  "loanNumber"          TEXT          NOT NULL,
  "description"         TEXT          NOT NULL,
  "totalAmount"         DECIMAL(12,2) NOT NULL,
  "lockedBalance"       DECIMAL(12,2) DEFAULT NULL,
  "lenderName"          TEXT          NOT NULL,
  "lenderContactInfo"   TEXT          DEFAULT NULL,
  "lender_user_id"      TEXT          DEFAULT NULL,
  "managed_by_user_id"  TEXT          NOT NULL,
  "expense_account_id"  TEXT          DEFAULT NULL,
  "status"              TEXT          NOT NULL DEFAULT 'RECORDING',
  "lock_requested_at"   TIMESTAMPTZ   DEFAULT NULL,
  "lock_requested_by"   TEXT          DEFAULT NULL,
  "locked_at"           TIMESTAMPTZ   DEFAULT NULL,
  "locked_by"           TEXT          DEFAULT NULL,
  "settled_at"          TIMESTAMPTZ   DEFAULT NULL,
  "notes"               TEXT          DEFAULT NULL,
  "created_by"          TEXT          NOT NULL,
  "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "business_loans_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "business_loans"
  ADD CONSTRAINT "business_loans_loanNumber_key" UNIQUE ("loanNumber");

ALTER TABLE "business_loans"
  ADD CONSTRAINT "business_loans_expense_account_id_key" UNIQUE ("expense_account_id");

-- FKs for business_loans
ALTER TABLE "business_loans"
  ADD CONSTRAINT "business_loans_expense_account_id_fkey"
  FOREIGN KEY ("expense_account_id") REFERENCES "expense_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_loans"
  ADD CONSTRAINT "business_loans_managed_by_user_id_fkey"
  FOREIGN KEY ("managed_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business_loans"
  ADD CONSTRAINT "business_loans_lender_user_id_fkey"
  FOREIGN KEY ("lender_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_loans"
  ADD CONSTRAINT "business_loans_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business_loans"
  ADD CONSTRAINT "business_loans_lock_requested_by_fkey"
  FOREIGN KEY ("lock_requested_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_loans"
  ADD CONSTRAINT "business_loans_locked_by_fkey"
  FOREIGN KEY ("locked_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "business_loans_managed_by_user_id_idx" ON "business_loans"("managed_by_user_id");
CREATE INDEX "business_loans_status_idx" ON "business_loans"("status");

-- ─── business_loan_expenses ───────────────────────────────────────────────────

CREATE TABLE "business_loan_expenses" (
  "id"           TEXT          NOT NULL,
  "loan_id"      TEXT          NOT NULL,
  "description"  TEXT          NOT NULL,
  "amount"       DECIMAL(12,2) NOT NULL,
  "expense_date" TIMESTAMPTZ   NOT NULL,
  "notes"        TEXT          DEFAULT NULL,
  "created_by"   TEXT          NOT NULL,
  "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "business_loan_expenses_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "business_loan_expenses"
  ADD CONSTRAINT "business_loan_expenses_loan_id_fkey"
  FOREIGN KEY ("loan_id") REFERENCES "business_loans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_loan_expenses"
  ADD CONSTRAINT "business_loan_expenses_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "business_loan_expenses_loan_id_idx" ON "business_loan_expenses"("loan_id");

-- ─── business_loan_pre_lock_repayments ────────────────────────────────────────

CREATE TABLE "business_loan_pre_lock_repayments" (
  "id"              TEXT          NOT NULL,
  "loan_id"         TEXT          NOT NULL,
  "description"     TEXT          NOT NULL,
  "amount"          DECIMAL(12,2) NOT NULL,
  "repayment_date"  TIMESTAMPTZ   NOT NULL,
  "notes"           TEXT          DEFAULT NULL,
  "created_by"      TEXT          NOT NULL,
  "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "business_loan_pre_lock_repayments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "business_loan_pre_lock_repayments"
  ADD CONSTRAINT "business_loan_pre_lock_repayments_loan_id_fkey"
  FOREIGN KEY ("loan_id") REFERENCES "business_loans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_loan_pre_lock_repayments"
  ADD CONSTRAINT "business_loan_pre_lock_repayments_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "business_loan_pre_lock_repayments_loan_id_idx" ON "business_loan_pre_lock_repayments"("loan_id");

-- ─── loan_withdrawal_requests ─────────────────────────────────────────────────

CREATE TABLE "loan_withdrawal_requests" (
  "id"               TEXT          NOT NULL,
  "loan_id"          TEXT          NOT NULL,
  "request_number"   TEXT          NOT NULL,
  "requested_amount" DECIMAL(12,2) NOT NULL,
  "request_month"    TEXT          NOT NULL,
  "status"           TEXT          NOT NULL DEFAULT 'PENDING',
  "notes"            TEXT          DEFAULT NULL,
  "approved_amount"  DECIMAL(12,2) DEFAULT NULL,
  "approved_by"      TEXT          DEFAULT NULL,
  "approved_at"      TIMESTAMPTZ   DEFAULT NULL,
  "rejected_by"      TEXT          DEFAULT NULL,
  "rejected_at"      TIMESTAMPTZ   DEFAULT NULL,
  "rejection_reason" TEXT          DEFAULT NULL,
  "paid_at"          TIMESTAMPTZ   DEFAULT NULL,
  "paid_by"          TEXT          DEFAULT NULL,
  "payment_id"       TEXT          DEFAULT NULL,
  "created_by"       TEXT          NOT NULL,
  "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "loan_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_request_number_key" UNIQUE ("request_number");

ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_payment_id_key" UNIQUE ("payment_id");

ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_loan_id_request_month_key"
  UNIQUE ("loan_id", "request_month");

-- FKs for loan_withdrawal_requests
ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_loan_id_fkey"
  FOREIGN KEY ("loan_id") REFERENCES "business_loans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_rejected_by_fkey"
  FOREIGN KEY ("rejected_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_paid_by_fkey"
  FOREIGN KEY ("paid_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "expense_account_payments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "loan_withdrawal_requests"
  ADD CONSTRAINT "loan_withdrawal_requests_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "loan_withdrawal_requests_loan_id_idx" ON "loan_withdrawal_requests"("loan_id");
CREATE INDEX "loan_withdrawal_requests_status_idx" ON "loan_withdrawal_requests"("status");

-- ─── Back-link FK: expense_account_payments → loan_withdrawal_requests ────────

ALTER TABLE "expense_account_payments"
  ADD CONSTRAINT "expense_account_payments_withdrawal_request_id_fkey"
  FOREIGN KEY ("withdrawal_request_id") REFERENCES "loan_withdrawal_requests"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
