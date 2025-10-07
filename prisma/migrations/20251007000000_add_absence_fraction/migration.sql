-- Add absence_fraction to payroll_entries
ALTER TABLE payroll_entries
ADD COLUMN IF NOT EXISTS absence_fraction DECIMAL(4,2) NOT NULL DEFAULT 0;
