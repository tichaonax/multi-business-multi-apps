-- AddColumn: statusChangedAt to employees
-- Tracks when the employment status was last changed (can be backdated for late entries)
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3);
