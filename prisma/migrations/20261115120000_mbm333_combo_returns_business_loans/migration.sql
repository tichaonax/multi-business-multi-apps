-- MBM-333: combo return history + business-loan combos

-- Business-loan combo fields
ALTER TABLE "combo_payment_requests" ADD COLUMN "isBusinessLoan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "loanBusinessId" TEXT,
ADD COLUMN "loanExpenseAccountId" TEXT,
ADD COLUMN "outgoingLoanId" TEXT;

ALTER TABLE "combo_payment_request_items" ADD COLUMN "generatedPaymentId" TEXT;

CREATE UNIQUE INDEX "combo_payment_requests_outgoingLoanId_key" ON "combo_payment_requests"("outgoingLoanId");
CREATE UNIQUE INDEX "combo_payment_request_items_generatedPaymentId_key" ON "combo_payment_request_items"("generatedPaymentId");

ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_loanBusinessId_fkey" FOREIGN KEY ("loanBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_loanExpenseAccountId_fkey" FOREIGN KEY ("loanExpenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_outgoingLoanId_fkey" FOREIGN KEY ("outgoingLoanId") REFERENCES "account_outgoing_loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_generatedPaymentId_fkey" FOREIGN KEY ("generatedPaymentId") REFERENCES "expense_account_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Return history
CREATE TABLE "combo_payment_request_returns" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "returnedBy" TEXT NOT NULL,
    "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "combo_payment_request_returns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "combo_payment_request_returns_requestId_idx" ON "combo_payment_request_returns"("requestId");
ALTER TABLE "combo_payment_request_returns" ADD CONSTRAINT "combo_payment_request_returns_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "combo_payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "combo_payment_request_returns" ADD CONSTRAINT "combo_payment_request_returns_returnedBy_fkey" FOREIGN KEY ("returnedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Carry over the latest return already saved on each request (MBM-201 columns)
INSERT INTO "combo_payment_request_returns" ("id", "requestId", "note", "returnedBy", "returnedAt", "resubmittedAt", "createdAt")
SELECT gen_random_uuid()::text, r."id", r."returnNote", r."returnedBy", r."returnedAt",
       CASE WHEN r."submittedAt" IS NOT NULL AND r."submittedAt" > r."returnedAt" THEN r."submittedAt" ELSE NULL END,
       r."returnedAt"
FROM "combo_payment_requests" r
WHERE r."returnNote" IS NOT NULL AND r."returnedBy" IS NOT NULL AND r."returnedAt" IS NOT NULL;
