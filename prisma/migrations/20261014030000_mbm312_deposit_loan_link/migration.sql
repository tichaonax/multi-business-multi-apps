-- MBM-312: link a LOAN_RECEIVED deposit back to the AccountOutgoingLoans
-- record that created it, so the Deposit Details modal can show the real
-- loan source, status, and remaining balance instead of just a generic
-- "Loan Received" label.

ALTER TABLE "expense_account_deposits"
  ADD COLUMN "sourceOutgoingLoanId" TEXT;

ALTER TABLE "expense_account_deposits"
  ADD CONSTRAINT "expense_account_deposits_sourceOutgoingLoanId_fkey"
  FOREIGN KEY ("sourceOutgoingLoanId") REFERENCES "account_outgoing_loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "expense_account_deposits_sourceOutgoingLoanId_idx" ON "expense_account_deposits"("sourceOutgoingLoanId");
