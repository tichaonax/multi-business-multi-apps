-- Migration: document_eod_cash_shortfalls_mbm252
--
-- Context (MBM-252): before this fix, EOD auto-deposits (rent transfer, expense/loan
-- auto-deposits, payroll EOD contribution) were gated on businessAccounts.balance — a
-- sales-revenue ledger credited for every payment method — instead of actual cash on hand.
-- This let those deposits get created, and the destination accounts credited, even when a
-- business's cash bucket didn't actually have enough real cash to cover them.
--
-- This migration does NOT touch any cash_bucket_entries, expense_account_deposits, or
-- payroll_account_deposits row — no historical deposit is shrunk or reversed, and no
-- fabricated inflow is added to paper over the shortfall. It only writes a documentation-only
-- audit_logs record, per business, for whichever businesses have a negative CashBucketEntry
-- balance — computed live against the database this migration runs against (dev, staging,
-- or production each have their own state; nothing here is hardcoded from any other
-- environment). The negative balance itself remains the record of the debt the business owes
-- back to its cash bucket, to be recovered from future cash surplus; the cash-allocation lock
-- endpoint (fixed in the same change) now surfaces it as a visible warning on that business's
-- future EOD closes until it clears.
--
-- Safety: idempotent — guarded with NOT EXISTS so re-running (or a migration reset) does not
-- create duplicate records. Read-only aside from the single audit_logs insert per affected
-- business.

DO $$
DECLARE
  v_user_id TEXT;
  v_biz     RECORD;
BEGIN
  -- Prefer the project admin account used elsewhere as the record creator; fall back to any admin.
  SELECT id INTO v_user_id FROM users WHERE email = 'tichaonax@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users WHERE role = 'admin' LIMIT 1;
  END IF;

  FOR v_biz IN
    SELECT b.id AS business_id, b.name AS business_name, bal.balance AS bucket_balance
    FROM businesses b
    JOIN (
      SELECT "businessId",
             COALESCE(SUM(CASE WHEN direction = 'INFLOW' THEN amount ELSE 0 END), 0)
             - COALESCE(SUM(CASE WHEN direction = 'OUTFLOW' THEN amount ELSE 0 END), 0) AS balance
      FROM cash_bucket_entries
      GROUP BY "businessId"
    ) bal ON bal."businessId" = b.id
    WHERE bal.balance < -0.01
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM audit_logs
      WHERE action = 'CASH_SHORTFALL_DOCUMENTED'
        AND "entityId" = v_biz.business_id
        AND (metadata->>'issue') = 'MBM-252'
    ) THEN
      INSERT INTO audit_logs (id, "userId", action, "entityType", "entityId", timestamp, metadata, "tableName", details)
      VALUES (
        gen_random_uuid()::text,
        v_user_id,
        'CASH_SHORTFALL_DOCUMENTED',
        'Business',
        v_biz.business_id,
        now(),
        jsonb_build_object(
          'issue', 'MBM-252',
          'businessName', v_biz.business_name,
          'cashBucketBalanceAtAudit', v_biz.bucket_balance,
          'rootCause', 'EOD auto-deposits (rent transfer, expense/loan auto-deposits, payroll EOD contribution) were gated on businessAccounts.balance (sales-ledger, credited for every payment method) instead of actual cash on hand, before the MBM-252 fix.',
          'resolution', 'Deliberately left as a negative CashBucketEntry balance (a recognized debt owed back to the cash bucket) rather than backdated with a fabricated inflow or corrected by shrinking historical deposit records. Recoverable from future cash surplus; the cash-allocation lock endpoint now surfaces this as a visible warning on future EOD closes for this business until it clears.'
        ),
        'cash_bucket_entries',
        jsonb_build_object('note', 'Documentation-only record. No cash_bucket_entries, expense_account_deposits, or payroll_account_deposits rows were modified by this migration.')
      );
      RAISE NOTICE 'Documented cash shortfall of % for business % (%)', v_biz.bucket_balance, v_biz.business_name, v_biz.business_id;
    END IF;
  END LOOP;
END $$;
