-- MBM-286: Combo Pay receipt reconciliation — additive columns on
-- expense_payment_receipts. Every existing row is valid with all of these
-- NULL; no backfill needed, no existing behavior changes.
--   category_id / subcategory_id — expense/payment type per receipt,
--     reusing the existing expense_categories / expense_subcategories
--     taxonomy already used by combo_payment_request_items.
--   combo_item_id — optional link to which planned combo-pay line item this
--     receipt settles (informational only, never a per-item amount cap).
--   over_limit_reason / override_by / override_at — only ever set together,
--     only when a cashier/admin deliberately saves a receipt that pushes a
--     payment's total over its expected amount.

ALTER TABLE "expense_payment_receipts"
  ADD COLUMN "category_id" TEXT,
  ADD COLUMN "subcategory_id" TEXT,
  ADD COLUMN "combo_item_id" TEXT,
  ADD COLUMN "over_limit_reason" TEXT,
  ADD COLUMN "override_by" TEXT,
  ADD COLUMN "override_at" TIMESTAMP(3);

ALTER TABLE "expense_payment_receipts"
  ADD CONSTRAINT "expense_payment_receipts_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "expense_payment_receipts_subcategory_id_fkey"
    FOREIGN KEY ("subcategory_id") REFERENCES "expense_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "expense_payment_receipts_combo_item_id_fkey"
    FOREIGN KEY ("combo_item_id") REFERENCES "combo_payment_request_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "expense_payment_receipts_override_by_fkey"
    FOREIGN KEY ("override_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_expense_payment_receipts_category_id" ON "expense_payment_receipts"("category_id");
CREATE INDEX "idx_expense_payment_receipts_combo_item_id" ON "expense_payment_receipts"("combo_item_id");
