-- MBM-312: support partial approval of loan repayment requests, with a
-- required explanation note, mirroring the existing combo-request partial
-- approval pattern. `amount` keeps meaning "what the borrower requested";
-- `approvedAmount` is null for a full approval (or any pre-existing/not-yet
-- partially-approved row) and only set when the cashier approved less than
-- what was asked for.
ALTER TABLE "account_outgoing_loan_payments"
  ADD COLUMN "approvedAmount" DECIMAL(12,2),
  ADD COLUMN "approvalNote" TEXT;
