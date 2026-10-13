-- MBM-311 correction: the per-tier "Ceiling" concept was wrong — tier
-- thresholds are the WIDTH of each tier's sales band (progressive, like a
-- tax bracket), not a cumulative cutoff with a separate dollar cap. A set
-- Tier 3 threshold already acts as its own upper bound; there is no
-- separate ceiling column by design. Drop the 3 ceiling columns added in
-- the original MBM-311 migration — no data loss of consequence, since this
-- feature has not yet been used for a real payroll run.

ALTER TABLE "employees"
  DROP COLUMN "commissionTier1Ceiling",
  DROP COLUMN "commissionTier2Ceiling",
  DROP COLUMN "commissionTier3Ceiling";
