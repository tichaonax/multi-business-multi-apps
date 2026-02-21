-- Add levyRate and manualOverride to payroll_zimra_remittances
ALTER TABLE "payroll_zimra_remittances"
  ADD COLUMN "levyRate"       DECIMAL(5,4)  NOT NULL DEFAULT 0.03,
  ADD COLUMN "manualOverride" BOOLEAN       NOT NULL DEFAULT false;
