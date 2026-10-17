-- MBM-324: repair combo requests whose payment was marked PAID from the
-- expense account ("✓ Mark as Paid" / EcoCash "Mark as Sent") while the
-- request itself stayed APPROVED / PARTIALLY_APPROVED / PARTIALLY_PAID with
-- unpaid items. Settles them exactly as the new code does at mark-paid time
-- (src/lib/expense-account/combo-request-settle.ts):
--   * every funded, unpaid item → paid at its approved (else estimated) amount
--   * the recorded restaurant expense line it pays → PAID (or, if the item
--     amount doesn't cover it, the paid part recorded and the line back to
--     UNPAID for the remainder — same rule as applyComboItemPaymentTx)
--   * receipt-review row ensured; request → PAID
-- Dated with the payment's paid date. Idempotent: once settled, a request is
-- no longer in the selected statuses.

CREATE TEMP TABLE mbm324_items AS
SELECT i.id AS item_id,
       COALESCE(i."approvedAmount", i."estimatedAmount", 0) AS amount,
       COALESCE(pay.paid_at, CURRENT_TIMESTAMP) AS paid_at
FROM combo_payment_request_items i
JOIN combo_payment_requests r ON r.id = i."requestId"
JOIN expense_account_payments pay ON pay.id = r.linked_payment_id
WHERE pay.status = 'PAID'
  AND r.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID')
  AND NOT i."isPaid"
  AND (i."approvedAmount" IS NULL OR i."approvedAmount" <> 0);

-- 1. Recorded restaurant expense lines paid by those items
UPDATE restaurant_expense_lines l
SET "paidAmount" = l."paidAmount" + t.amount,
    "paidAt"     = t.paid_at,
    "status"     = CASE WHEN l."paidAmount" + t.amount >= l.amount - 0.005 THEN 'PAID' ELSE 'UNPAID' END,
    "comboItemId" = CASE WHEN l."paidAmount" + t.amount >= l.amount - 0.005 THEN l."comboItemId" ELSE NULL END,
    "updatedAt"  = CURRENT_TIMESTAMP
FROM mbm324_items t
WHERE l."comboItemId" = t.item_id;

-- 2. The items
UPDATE combo_payment_request_items i
SET "isPaid" = true,
    "paidAt" = t.paid_at,
    "paidAmount" = t.amount,
    "updatedAt" = CURRENT_TIMESTAMP
FROM mbm324_items t
WHERE i.id = t.item_id;

-- 3. Receipt-review row (normally created at approval; no-op if present)
INSERT INTO expense_payment_receipt_reviews (id, expense_payment_id, status, expected_amount, created_at, updated_at)
SELECT gen_random_uuid()::text, pay.id, 'PENDING', COALESCE(r."approvedAmount", r."requestedAmount"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM combo_payment_requests r
JOIN expense_account_payments pay ON pay.id = r.linked_payment_id
WHERE pay.status = 'PAID'
  AND r.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID')
ON CONFLICT (expense_payment_id) DO NOTHING;

-- 4. The requests
UPDATE combo_payment_requests r
SET status = 'PAID',
    "paidAt" = COALESCE(pay.paid_at, CURRENT_TIMESTAMP),
    "updatedAt" = CURRENT_TIMESTAMP
FROM expense_account_payments pay
WHERE pay.id = r.linked_payment_id
  AND pay.status = 'PAID'
  AND r.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID');
