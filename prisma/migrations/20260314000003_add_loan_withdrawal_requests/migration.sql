-- CreateTable: loan_withdrawal_requests
-- Model existed in schema but migration file was missing

CREATE TABLE IF NOT EXISTS "loan_withdrawal_requests" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "requested_amount" DECIMAL(12,2) NOT NULL,
    "request_month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "approved_amount" DECIMAL(12,2),
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ,
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "paid_at" TIMESTAMPTZ,
    "paid_by" TEXT,
    "payment_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "loan_withdrawal_requests_request_number_key" ON "loan_withdrawal_requests"("request_number");
CREATE UNIQUE INDEX IF NOT EXISTS "loan_withdrawal_requests_payment_id_key" ON "loan_withdrawal_requests"("payment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "loan_withdrawal_requests_loan_id_request_month_key" ON "loan_withdrawal_requests"("loan_id", "request_month");
CREATE INDEX IF NOT EXISTS "loan_withdrawal_requests_loan_id_idx" ON "loan_withdrawal_requests"("loan_id");
CREATE INDEX IF NOT EXISTS "loan_withdrawal_requests_status_idx" ON "loan_withdrawal_requests"("status");

DO $$ BEGIN
  ALTER TABLE "loan_withdrawal_requests" ADD CONSTRAINT "loan_withdrawal_requests_loan_id_fkey"
    FOREIGN KEY ("loan_id") REFERENCES "business_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "loan_withdrawal_requests" ADD CONSTRAINT "loan_withdrawal_requests_approved_by_fkey"
    FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "loan_withdrawal_requests" ADD CONSTRAINT "loan_withdrawal_requests_rejected_by_fkey"
    FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "loan_withdrawal_requests" ADD CONSTRAINT "loan_withdrawal_requests_paid_by_fkey"
    FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "loan_withdrawal_requests" ADD CONSTRAINT "loan_withdrawal_requests_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "expense_account_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "loan_withdrawal_requests" ADD CONSTRAINT "loan_withdrawal_requests_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
