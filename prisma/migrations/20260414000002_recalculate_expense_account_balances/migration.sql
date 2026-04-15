-- Recalculate all expense account balances using the corrected formula:
--   balance = SUM(deposits) - SUM(payments WHERE status IN ('PAID','SUBMITTED','APPROVED'))
--
-- Root causes fixed by accompanying code changes:
--   1. Deposits route used SUBMITTED-only formula — ignored PAID payments after each new deposit
--   2. Balance checks in payments/supplier routes ignored PAID — allowed overspending
--   3. APPROVED (EOD-batch) payments were not counted — balance inflated until marked PAID
--
-- This migration brings all stored balances in line with the corrected formula.

UPDATE "expense_accounts" ea
SET
  balance = COALESCE(
    (SELECT SUM(d.amount) FROM "expense_account_deposits" d WHERE d."expenseAccountId" = ea.id),
    0
  ) - COALESCE(
    (SELECT SUM(p.amount) FROM "expense_account_payments" p
     WHERE p."expenseAccountId" = ea.id
       AND p.status IN ('PAID', 'SUBMITTED', 'APPROVED')),
    0
  ),
  "updatedAt" = NOW();
