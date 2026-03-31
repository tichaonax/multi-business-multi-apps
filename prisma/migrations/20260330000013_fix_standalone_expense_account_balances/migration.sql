-- Fix balances for standalone expense accounts (businessId IS NULL) that were
-- affected by the direct-approve balance recalculation bug.
--
-- Previously, direct-approve transitioned payments SUBMITTED → APPROVED without
-- calling updateExpenseAccountBalance. Since APPROVED is not counted in the balance
-- formula (only PAID + SUBMITTED are), the stored balance was stale — it still
-- reflected the SUBMITTED deduction even after the payment moved to APPROVED.
-- When the requester then marked the payment as PAID, the recalculation yielded
-- the same number (PAID replaced SUBMITTED), so the balance never visibly changed.
--
-- This migration recalculates the correct balance for all standalone accounts:
--   balance = total_deposits - sum_of(PAID + SUBMITTED payments)

UPDATE expense_accounts ea
SET
  balance = (
    SELECT COALESCE(SUM(d.amount), 0)
    FROM expense_account_deposits d
    WHERE d."expenseAccountId" = ea.id
  ) - (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM expense_account_payments p
    WHERE p."expenseAccountId" = ea.id
      AND p.status IN ('PAID', 'SUBMITTED')
  ),
  "updatedAt" = NOW()
WHERE ea."businessId" IS NULL;
