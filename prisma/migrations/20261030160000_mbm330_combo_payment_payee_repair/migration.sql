-- MBM-330: repair combo payments that a receipt relabelled to a single payee.
-- Adding a receipt with a different payee offered "Update the payment payee?";
-- answering Yes on a combo payment changed the WHOLE payment (e.g. "PAY Faneli
-- Investments −$147") although it paid several people. The new code never does
-- this for combo payments. Here every payment that is a combo request's linked
-- payment goes back to payeeType 'COMBO' (shown as "Multiple payees") with no
-- single-payee ids. Nothing is lost: each receipt keeps its own payee, which
-- is where Payee History credits the money. Idempotent.

UPDATE expense_account_payments p
SET "payeeType"       = 'COMBO',
    "payeeUserId"     = NULL,
    "payeeEmployeeId" = NULL,
    "payeePersonId"   = NULL,
    "payeeBusinessId" = NULL,
    "payeeSupplierId" = NULL
FROM combo_payment_requests r
WHERE r.linked_payment_id = p.id
  AND (p."payeeType" <> 'COMBO'
       OR p."payeeUserId" IS NOT NULL OR p."payeeEmployeeId" IS NOT NULL
       OR p."payeePersonId" IS NOT NULL OR p."payeeBusinessId" IS NOT NULL OR p."payeeSupplierId" IS NOT NULL);
