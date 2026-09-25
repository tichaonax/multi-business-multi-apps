-- MBM-300 follow-up: Container Batch header block (exchange rate + batch-wide
-- summary totals), parsed from the file's own header rows.
ALTER TABLE "warehouse_batches"
  ADD COLUMN "exchangeRate" DECIMAL(10, 4),
  ADD COLUMN "totalLandedCost" DECIMAL(14, 2),
  ADD COLUMN "totalProjectedSelling" DECIMAL(14, 2),
  ADD COLUMN "totalProjectedProfit" DECIMAL(14, 2),
  ADD COLUMN "profitMarginPct" TEXT;
