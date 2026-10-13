-- MBM-311: Employee Commission-Based Pay
-- Additive only — new nullable/defaulted columns, no backfill needed.

ALTER TABLE "employees"
  ADD COLUMN "commissionEligible"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "commissionTier1Enabled"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "commissionTier1Threshold"  DECIMAL(12,2),
  ADD COLUMN "commissionTier1Rate"       DECIMAL(5,2),
  ADD COLUMN "commissionTier1Ceiling"    DECIMAL(12,2),
  ADD COLUMN "commissionTier2Enabled"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "commissionTier2Threshold"  DECIMAL(12,2),
  ADD COLUMN "commissionTier2Rate"       DECIMAL(5,2),
  ADD COLUMN "commissionTier2Ceiling"    DECIMAL(12,2),
  ADD COLUMN "commissionTier3Enabled"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "commissionTier3Threshold"  DECIMAL(12,2),
  ADD COLUMN "commissionTier3Rate"       DECIMAL(5,2),
  ADD COLUMN "commissionTier3Ceiling"    DECIMAL(12,2);

ALTER TABLE "payroll_entries"
  ADD COLUMN "commissionBreakdown" JSONB;
