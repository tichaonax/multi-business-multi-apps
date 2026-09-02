-- MBM-288 follow-up: manual overrides for the 3 minimum-target lines that
-- are normally computed live (rent, payroll, recurring commitments).
ALTER TABLE "business_target_configs"
  ADD COLUMN "rentMonthlyOverride" DECIMAL(12,2),
  ADD COLUMN "payrollMonthlyOverride" DECIMAL(12,2),
  ADD COLUMN "recurringCommitmentsMonthlyOverride" DECIMAL(12,2);
