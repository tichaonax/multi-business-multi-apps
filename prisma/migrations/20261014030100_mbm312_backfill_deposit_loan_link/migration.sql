-- MBM-312: backfill sourceOutgoingLoanId for LOAN_RECEIVED deposits created
-- before this link existed (just the handful from this feature's own
-- testing) — matched by recipient business + exact principal/deposit
-- amount, picking the closest-in-time loan per deposit in the rare case of
-- more than one candidate.

WITH matches AS (
  SELECT
    d.id AS deposit_id,
    l.id AS loan_id,
    ROW_NUMBER() OVER (
      PARTITION BY d.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (d."depositDate" - l."disbursementDate")))
    ) AS rn
  FROM expense_account_deposits d
  JOIN expense_accounts ea ON ea.id = d."expenseAccountId"
  JOIN account_outgoing_loans l
    ON l."loanType" = 'BUSINESS'
   AND l."recipientBusinessId" = ea."businessId"
   AND l."principalAmount" = d.amount
  WHERE d."sourceType" = 'LOAN_RECEIVED'
    AND d."sourceOutgoingLoanId" IS NULL
)
UPDATE expense_account_deposits d
SET "sourceOutgoingLoanId" = m.loan_id
FROM matches m
WHERE m.deposit_id = d.id AND m.rn = 1;
