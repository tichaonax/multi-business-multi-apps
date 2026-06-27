-- Migration: backfill_payroll_account_payment_records
--
-- Context: When a payroll period was approved, the code debited payrollAccounts.balance
-- by sum(entry.netPay + perDiem) in a single silent operation with no payrollAccountPayments
-- records created. This migration creates the missing per-employee SALARY records for all
-- previously approved periods so the transaction history is visible.
--
-- Also creates aggregate ZIMRA_PAYE, NSSA, and AIDS_LEVY records per period
-- using data from payroll_entries (payeAmount, nssaEmployee, aidsLevy fields).
--
-- Safety: All inserts are guarded with NOT EXISTS checks (idempotent).
-- After all inserts, the balance is recalculated from deposits - payments so
-- the stored balance remains consistent.

DO $$
DECLARE
  v_account_id  TEXT;
  v_user_id     TEXT;
  v_period      RECORD;
  v_period_label TEXT;
BEGIN
  -- Resolve the global payroll account (businessId IS NULL)
  SELECT id INTO v_account_id
  FROM payroll_accounts
  WHERE "businessId" IS NULL AND "isActive" = true
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE NOTICE 'No global payroll account found — skipping backfill';
    RETURN;
  END IF;

  -- Use the admin user as the record creator
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'tichaonax@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Fall back to any admin user
    SELECT id INTO v_user_id FROM users WHERE role = 'admin' LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No admin user found — skipping backfill';
    RETURN;
  END IF;

  -- Loop over each approved payroll period
  FOR v_period IN
    SELECT id, year, month, "approvedAt"
    FROM payroll_periods
    WHERE "approvedAt" IS NOT NULL
    ORDER BY year, month
  LOOP
    v_period_label := to_char(make_date(v_period.year::int, v_period.month::int, 1), 'Mon YYYY');

    -- ----------------------------------------------------------------
    -- 1. Per-employee SALARY records
    --    Amount = entry.netPay + approved per diem for the period
    --    Skipped if a SALARY record already exists for this entry
    -- ----------------------------------------------------------------
    INSERT INTO payroll_account_payments (
      id,
      "payrollAccountId",
      "employeeId",
      "payrollEntryId",
      "payrollPeriodId",
      amount,
      "paymentType",
      status,
      "isAdvance",
      "isLocked",
      notes,
      "paymentDate",
      "createdBy",
      "updatedAt",
      "createdAt"
    )
    SELECT
      gen_random_uuid(),
      v_account_id,
      pe."employeeId",
      pe.id,
      v_period.id,
      -- net pay + any approved per diem for this employee in this period
      pe."netPay" + COALESCE(
        (SELECT SUM(pde.amount)
         FROM per_diem_entries pde
         WHERE pde."employeeId" = pe."employeeId"
           AND pde."payrollYear" = v_period.year
           AND pde."payrollMonth" = v_period.month
           AND pde."approvalStatus" = 'approved'),
        0
      ),
      'SALARY',
      'COMPLETED',
      false,
      true,
      'Salary — ' ||
        COALESCE(e."fullName", pe."employeeName", 'Employee') ||
        ' (' || v_period_label || ')',
      v_period."approvedAt",
      v_user_id,
      now(),
      v_period."approvedAt"
    FROM payroll_entries pe
    LEFT JOIN employees e ON e.id = pe."employeeId"
    WHERE pe."payrollPeriodId" = v_period.id
      AND pe."employeeId" IS NOT NULL
      AND pe."netPay" > 0
      AND NOT EXISTS (
        SELECT 1
        FROM payroll_account_payments pap
        WHERE pap."payrollEntryId" = pe.id
          AND pap."paymentType" = 'SALARY'
      );

    -- ----------------------------------------------------------------
    -- 2. Aggregate ZIMRA_PAYE record for the period
    --    Uses zimraPaye override if set, otherwise payeAmount
    --    Skipped if a ZIMRA_PAYE record already exists for this period
    -- ----------------------------------------------------------------
    INSERT INTO payroll_account_payments (
      id, "payrollAccountId", "employeeId", "payrollEntryId", "payrollPeriodId",
      amount, "paymentType", status, "isAdvance", "isLocked", notes,
      "paymentDate", "createdBy", "updatedAt", "createdAt"
    )
    SELECT
      gen_random_uuid(),
      v_account_id,
      NULL,  -- aggregate — no single employee
      NULL,
      v_period.id,
      total_paye,
      'ZIMRA_PAYE',
      'COMPLETED',
      false,
      true,
      'ZIMRA PAYE — ' || v_period_label,
      v_period."approvedAt",
      v_user_id,
      now(),
      v_period."approvedAt"
    FROM (
      SELECT SUM(COALESCE(pe."zimraPaye", pe."payeAmount", 0)) AS total_paye
      FROM payroll_entries pe
      WHERE pe."payrollPeriodId" = v_period.id
    ) totals
    WHERE total_paye > 0
      AND NOT EXISTS (
        SELECT 1 FROM payroll_account_payments pap
        WHERE pap."payrollPeriodId" = v_period.id
          AND pap."paymentType" = 'ZIMRA_PAYE'
      );

    -- ----------------------------------------------------------------
    -- 3. Aggregate NSSA record for the period
    --    Uses zimraNssa override if set, otherwise nssaEmployee
    -- ----------------------------------------------------------------
    INSERT INTO payroll_account_payments (
      id, "payrollAccountId", "employeeId", "payrollEntryId", "payrollPeriodId",
      amount, "paymentType", status, "isAdvance", "isLocked", notes,
      "paymentDate", "createdBy", "updatedAt", "createdAt"
    )
    SELECT
      gen_random_uuid(),
      v_account_id,
      NULL,
      NULL,
      v_period.id,
      total_nssa,
      'NSSA',
      'COMPLETED',
      false,
      true,
      'NSSA Employee Contribution — ' || v_period_label,
      v_period."approvedAt",
      v_user_id,
      now(),
      v_period."approvedAt"
    FROM (
      SELECT SUM(COALESCE(pe."zimraNssa", pe."nssaEmployee", 0)) AS total_nssa
      FROM payroll_entries pe
      WHERE pe."payrollPeriodId" = v_period.id
    ) totals
    WHERE total_nssa > 0
      AND NOT EXISTS (
        SELECT 1 FROM payroll_account_payments pap
        WHERE pap."payrollPeriodId" = v_period.id
          AND pap."paymentType" = 'NSSA'
      );

    -- ----------------------------------------------------------------
    -- 4. Aggregate AIDS_LEVY record for the period
    --    Uses zimraAidsLevy override if set, otherwise aidsLevy
    -- ----------------------------------------------------------------
    INSERT INTO payroll_account_payments (
      id, "payrollAccountId", "employeeId", "payrollEntryId", "payrollPeriodId",
      amount, "paymentType", status, "isAdvance", "isLocked", notes,
      "paymentDate", "createdBy", "updatedAt", "createdAt"
    )
    SELECT
      gen_random_uuid(),
      v_account_id,
      NULL,
      NULL,
      v_period.id,
      total_aids,
      'AIDS_LEVY',
      'COMPLETED',
      false,
      true,
      'AIDS Levy — ' || v_period_label,
      v_period."approvedAt",
      v_user_id,
      now(),
      v_period."approvedAt"
    FROM (
      SELECT SUM(COALESCE(pe."zimraAidsLevy", pe."aidsLevy", 0)) AS total_aids
      FROM payroll_entries pe
      WHERE pe."payrollPeriodId" = v_period.id
    ) totals
    WHERE total_aids > 0
      AND NOT EXISTS (
        SELECT 1 FROM payroll_account_payments pap
        WHERE pap."payrollPeriodId" = v_period.id
          AND pap."paymentType" = 'AIDS_LEVY'
      );

    RAISE NOTICE 'Processed period % (%)', v_period.id, v_period_label;
  END LOOP;

  -- ----------------------------------------------------------------
  -- 5. Recalculate stored balance = totalDeposits - totalPayments
  --    The previous approval code only decremented balance by netPay.
  --    Now that proper payment records exist, recalculate from source
  --    of truth so the stored balance stays consistent.
  -- ----------------------------------------------------------------
  UPDATE payroll_accounts
  SET
    balance = (
      SELECT COALESCE(SUM(amount), 0)
      FROM payroll_account_deposits
      WHERE "payrollAccountId" = v_account_id
    ) - (
      SELECT COALESCE(SUM(amount), 0)
      FROM payroll_account_payments
      WHERE "payrollAccountId" = v_account_id
    ),
    "updatedAt" = now()
  WHERE id = v_account_id;

  RAISE NOTICE 'Balance recalculated for payroll account %', v_account_id;
END $$;
