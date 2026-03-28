-- MBM-167: Retroactive meal program batch consolidation
-- Idempotent: all steps use WHERE conditions that skip already-processed records.
--
-- Step 1: Mark stuck APPROVED individual meals as PAID
-- Step 2: Pull PENDING_APPROVAL individual meals out of EOD batches (reset to QUEUED)
-- Step 3: Create one MEAL_BATCH payment per (expense_account + day) and link individual meals

-- Step 1: APPROVED → PAID
UPDATE "expense_account_payments"
SET    "status" = 'PAID',
       "paid_at" = NOW()
WHERE  "paymentType" = 'MEAL_PROGRAM'
  AND  "status" = 'APPROVED';

-- Step 2: PENDING_APPROVAL → QUEUED (unlink from EOD batch)
UPDATE "expense_account_payments"
SET    "status"              = 'QUEUED',
       "eod_batch_id"        = NULL,
       "batch_submission_id" = NULL
WHERE  "paymentType"       = 'MEAL_PROGRAM'
  AND  "status"            = 'PENDING_APPROVAL'
  AND  "eod_meal_batch_id" IS NULL;

-- Step 3: Consolidate unbatched QUEUED individual meals into one MEAL_BATCH per (account + day)
DO $$
DECLARE
  v_group      RECORD;
  v_batch_id   TEXT;
  v_date_label TEXT;
BEGIN
  FOR v_group IN
    SELECT
      "expenseAccountId"                      AS account_id,
      DATE_TRUNC('day', "paymentDate")        AS day,
      SUM("amount")                           AS total,
      COUNT(*)                                AS cnt,
      MIN("createdBy")                        AS created_by,
      MIN("paymentDate")                      AS min_date
    FROM "expense_account_payments"
    WHERE "paymentType"       = 'MEAL_PROGRAM'
      AND "status"            = 'QUEUED'
      AND "eod_meal_batch_id" IS NULL
    GROUP BY "expenseAccountId", DATE_TRUNC('day', "paymentDate")
  LOOP
    v_date_label := TO_CHAR(v_group.day, 'YYYY-MM-DD');
    v_batch_id   := gen_random_uuid()::TEXT;

    INSERT INTO "expense_account_payments" (
      "id", "expenseAccountId", "payeeType", "amount", "paymentDate",
      "notes", "status", "paymentType", "isFullPayment",
      "createdBy", "createdAt", "updatedAt"
    ) VALUES (
      v_batch_id,
      v_group.account_id,
      'NONE',
      v_group.total,
      v_group.min_date,
      'Employee meal program EOD batch — ' ||
        v_group.cnt || ' meal' ||
        CASE WHEN v_group.cnt <> 1 THEN 's' ELSE '' END ||
        ' — ' || v_date_label,
      'QUEUED',
      'MEAL_BATCH',
      TRUE,
      v_group.created_by,
      NOW(),
      NOW()
    );

    UPDATE "expense_account_payments"
    SET    "eod_meal_batch_id" = v_batch_id
    WHERE  "paymentType"       = 'MEAL_PROGRAM'
      AND  "status"            = 'QUEUED'
      AND  "eod_meal_batch_id" IS NULL
      AND  "expenseAccountId"  = v_group.account_id
      AND  DATE_TRUNC('day', "paymentDate") = v_group.day;

  END LOOP;
END $$;
