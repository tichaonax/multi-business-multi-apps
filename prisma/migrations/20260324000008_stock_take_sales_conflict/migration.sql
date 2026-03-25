-- MBM-164: Stock Take Sales Conflict Handling
-- Adds tracking fields for sales that occur during an active stock take

-- StockTakeDrafts: track when sales occurred and how many
ALTER TABLE "stock_take_drafts"
  ADD COLUMN IF NOT EXISTS "salesOccurredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "salesCount" INTEGER NOT NULL DEFAULT 0;

-- StockTakeDraftItems: flag items that need review due to a sale occurring
ALTER TABLE "stock_take_draft_items"
  ADD COLUMN IF NOT EXISTS "needsReview" BOOLEAN NOT NULL DEFAULT false;
