-- MBM-287: admin-configurable business colour for consistent identification
-- across the dashboard, Cash Bucket, and reports. Additive, nullable — no
-- backfill needed; unset businesses fall back to a deterministic
-- hash-of-id palette pick computed in application code.
ALTER TABLE "businesses" ADD COLUMN "displayColor" TEXT;
