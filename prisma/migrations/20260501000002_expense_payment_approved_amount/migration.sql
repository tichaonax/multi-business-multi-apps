-- Add approved_amount and amount_change_note to expense_account_payments
-- for audit trail when approver changes the paid amount from the requested amount

ALTER TABLE expense_account_payments
  ADD COLUMN approved_amount DECIMAL(12, 2) NULL,
  ADD COLUMN amount_change_note VARCHAR(500) NULL;
