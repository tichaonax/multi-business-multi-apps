-- Add description and entryType to payroll_entry_benefits
-- description: manager's reason for the deduction (shown on payslip)
-- entry_type: 'benefit' (default) or 'deduction'

ALTER TABLE "payroll_entry_benefits" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "payroll_entry_benefits" ADD COLUMN IF NOT EXISTS "entryType" TEXT NOT NULL DEFAULT 'benefit';
