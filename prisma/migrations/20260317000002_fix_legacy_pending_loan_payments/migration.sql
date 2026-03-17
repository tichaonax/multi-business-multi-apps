-- Fix legacy pending payments on loan reimbursement accounts (no businessId).
--
-- Background: Payments on "Reimbursed Loan" expense accounts were paid directly
-- under the old system before the cash-request workflow existed. When the request
-- workflow was introduced, some of these payments were left in QUEUED or REQUEST
-- status. The previous migration (20260313000001) only converted SUBMITTED → PAID,
-- leaving QUEUED and REQUEST records untouched. These stale records show up in the
-- cashier's Pending Actions but fail with "Cannot create batch — no business linked
-- to this account" because the expense account has no businessId.
--
-- Fix: mark all QUEUED and REQUEST payments on accounts with no businessId as PAID.
UPDATE "expense_account_payments"
SET status = 'PAID', paid_at = COALESCE(paid_at, "updatedAt")
WHERE status IN ('QUEUED', 'REQUEST')
  AND "expenseAccountId" IN (
    SELECT id FROM "expense_accounts" WHERE "businessId" IS NULL
  );
