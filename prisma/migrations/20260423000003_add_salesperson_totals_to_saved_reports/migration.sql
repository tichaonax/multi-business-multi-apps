-- Migration: add salesperson aggregate columns to saved_reports (MBM-187)
ALTER TABLE "saved_reports"
  ADD COLUMN "salespersonCashTotal"    DECIMAL(10,2),
  ADD COLUMN "salespersonEcocashTotal" DECIMAL(10,2);
