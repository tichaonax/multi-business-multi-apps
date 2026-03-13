-- Add paid_at column to expense_account_payments
-- Stamped when a requester marks a payment as physically collected/paid.
-- NULL means the payment has not yet been marked as paid.
ALTER TABLE "expense_account_payments" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

-- Data migration: all pre-existing SUBMITTED payments were processed under the old system
-- (old system used SUBMITTED as the terminal state). Mark them all PAID with paidAt = updatedAt.
UPDATE "expense_account_payments"
SET status = 'PAID', paid_at = "updatedAt"
WHERE status = 'SUBMITTED';
