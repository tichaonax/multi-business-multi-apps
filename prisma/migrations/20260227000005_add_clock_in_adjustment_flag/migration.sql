-- AlterTable: PayrollAdjustments
-- Adds isClockInAdjustment flag so the sync-clock-in endpoint can identify
-- and replace auto-generated attendance deductions without affecting manual adjustments.

ALTER TABLE "payroll_adjustments"
  ADD COLUMN "isClockInAdjustment" BOOLEAN NOT NULL DEFAULT false;
