-- MBM-319: remember which recorded restaurant expense line a combo item was
-- raised for (kept after a partial payment releases the live link), so the
-- incurred-basis sales report can subtract payments that settled recorded
-- expenses instead of counting them twice.
ALTER TABLE "combo_payment_request_items" ADD COLUMN "restaurantExpenseLineId" TEXT;

-- Items already linked (phase 2 testing on dev; none in production yet)
UPDATE "combo_payment_request_items" ci
SET "restaurantExpenseLineId" = l.id
FROM "restaurant_expense_lines" l
WHERE l."comboItemId" = ci.id;
