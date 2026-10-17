-- MBM-319: restaurants record most purchases as direct expense-account
-- payments (item name in `notes`), not combo requests — the production backup
-- has no restaurant combo items at all. Seed the item catalogue from that
-- payment history too, so the POS dropdown is ranked and classified from day
-- one. Only descriptions used at least twice (filters one-off notes such as
-- "received balance"); meal-program and petty-cash-return payments excluded.
-- Merges into rows the previous backfill created.
WITH past AS (
  SELECT ea."businessId"            AS business_id,
         lower(btrim(p.notes))       AS name_key,
         btrim(p.notes)              AS name,
         p."categoryId"              AS category_id,
         p."subcategoryId"           AS subcategory_id,
         p."paymentDate"             AS used_at
  FROM expense_account_payments p
  JOIN expense_accounts ea ON ea.id = p."expenseAccountId"
  JOIN businesses b ON b.id = ea."businessId"
  WHERE b.type = 'restaurant'
    AND p."paymentType" IN ('REGULAR', 'PETTY_CASH_SPEND')
    AND p.status NOT IN ('CANCELLED', 'REJECTED')
    AND btrim(coalesce(p.notes, '')) <> ''
    AND length(btrim(p.notes)) <= 60
    AND p.notes NOT ILIKE 'petty cash return%'
),
usage AS (
  SELECT business_id, name_key, count(*) AS use_count, max(used_at) AS last_used,
         (array_agg(name ORDER BY used_at DESC))[1] AS name
  FROM past
  GROUP BY business_id, name_key
  HAVING count(*) >= 2
),
classification AS (
  SELECT DISTINCT ON (business_id, name_key)
         business_id, name_key, category_id, subcategory_id
  FROM (
    SELECT business_id, name_key, category_id, subcategory_id, count(*) AS n, max(used_at) AS latest
    FROM past
    WHERE category_id IS NOT NULL
    GROUP BY business_id, name_key, category_id, subcategory_id
  ) c
  ORDER BY business_id, name_key, n DESC, latest DESC
)
INSERT INTO restaurant_expense_items
  ("id", "businessId", "name", "nameKey", "categoryId", "subcategoryId", "useCount", "lastUsedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u.business_id, u.name, u.name_key,
       c.category_id, c.subcategory_id, u.use_count, u.last_used, now(), now()
FROM usage u
LEFT JOIN classification c ON c.business_id = u.business_id AND c.name_key = u.name_key
ON CONFLICT ("businessId", "nameKey") DO UPDATE SET
  "useCount"      = restaurant_expense_items."useCount" + EXCLUDED."useCount",
  "lastUsedAt"    = GREATEST(restaurant_expense_items."lastUsedAt", EXCLUDED."lastUsedAt"),
  "categoryId"    = COALESCE(restaurant_expense_items."categoryId", EXCLUDED."categoryId"),
  "subcategoryId" = CASE WHEN restaurant_expense_items."categoryId" IS NULL
                         THEN EXCLUDED."subcategoryId" ELSE restaurant_expense_items."subcategoryId" END;
