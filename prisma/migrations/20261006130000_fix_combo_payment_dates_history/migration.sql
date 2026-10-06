-- Data fix: the combo-request approval route used to stamp the linked
-- ExpenseAccountPayments.paymentDate with the cashier's approval timestamp
-- instead of the request's actual submission date (ComboPaymentRequests
-- .submittedAt). The transaction history UI labels this field
-- "Requested {date}", so every combo-approved payment showed the approval
-- date as if it were the original request date. Fixed going forward in
-- src/app/api/expense-account/[accountId]/combo-requests/[requestId]/approve
-- /route.ts (paymentDate now uses comboRequest.submittedAt). This migration
-- corrects the historical rows.
--
-- Safety: only updates a payment when its paymentDate is an EXACT match to
-- its combo request's approvedAt. The bug set both fields from the same
-- `now` Date instance in one transaction, so an exact match is the
-- fingerprint of an untouched, still-bugged row. If paymentDate differs from
-- approvedAt, something (a manual edit, a different code path) already
-- changed it since approval — those rows are left alone. Idempotent: running
-- this twice is a no-op the second time.

UPDATE "expense_account_payments" AS ep
SET "paymentDate" = cpr."submittedAt"
FROM "combo_payment_requests" AS cpr
WHERE cpr."linked_payment_id" = ep."id"
  AND cpr."submittedAt" IS NOT NULL
  AND cpr."approvedAt" IS NOT NULL
  AND ep."paymentDate" = cpr."approvedAt";
