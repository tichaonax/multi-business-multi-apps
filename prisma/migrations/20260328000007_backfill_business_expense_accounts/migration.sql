-- MBM-167: Backfill missing expense accounts for businesses
-- Fixes the bug where business creation omitted businessId on the expense account.
-- Idempotent: only creates accounts for active, non-umbrella businesses that have none.

DO $$
DECLARE
  v_biz     RECORD;
  v_seq     INT;
  v_acct_no TEXT;
  v_admin   TEXT;
BEGIN
  -- Use the system admin user as creator fallback
  SELECT id INTO v_admin FROM users WHERE id = 'admin-system-user-default' LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id INTO v_admin FROM users WHERE role = 'admin' ORDER BY "createdAt" LIMIT 1;
  END IF;

  FOR v_biz IN
    SELECT b.id, b.name
    FROM businesses b
    LEFT JOIN expense_accounts ea ON ea."businessId" = b.id
    WHERE b."isActive" = true
      AND b.type != 'umbrella'
      AND ea.id IS NULL
  LOOP
    -- Generate next sequential account number
    SELECT COUNT(*) + 1 INTO v_seq FROM expense_accounts;
    v_acct_no := 'EXP-' || LPAD(v_seq::TEXT, 4, '0');

    INSERT INTO expense_accounts (
      id, "accountNumber", "accountName", description,
      balance, "lowBalanceThreshold", "isActive",
      "businessId", "createdBy", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      v_acct_no,
      v_biz.name || ' Expense Account',
      'Default expense account for ' || v_biz.name,
      0,
      500,
      true,
      v_biz.id,
      v_admin,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created expense account % for business: %', v_acct_no, v_biz.name;
  END LOOP;
END $$;
