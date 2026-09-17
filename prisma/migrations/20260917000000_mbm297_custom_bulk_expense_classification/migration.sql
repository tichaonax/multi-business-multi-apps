-- MBM-297 follow-up: absorb Custom Bulk Products registration into
-- BarcodeInventoryItems. Carries forward the Expense Domain/Category/
-- Subcategory classification that previously only existed on
-- CustomBulkProducts — plain nullable columns, no FK relation, matching
-- how CustomBulkProducts already stores them (resolved client-side via the
-- existing /api/expense-categories/* endpoints).

ALTER TABLE "barcode_inventory_items" ADD COLUMN "expenseDomainId" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "expenseCategoryId" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "expenseSubcategoryId" TEXT;
