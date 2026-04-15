-- Re-run balance recalculation for all expense accounts.
--
-- The first recalculation (20260414000002) ran correctly, but a silent
-- auto-repair in GET /api/expense-account/[accountId]/route.ts was using
-- the old SUBMITTED-only formula and immediately overwrote the corrected
-- balances every time anyone loaded the account page.
--
-- That code path (and several others) have now been fixed to use the
-- correct formula: deposits - (PAID + SUBMITTED + APPROVED).
-- This migration re-applies the correct balances after those code fixes.

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
