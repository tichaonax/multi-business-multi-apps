-- Add work schedule fields to employee_contracts
ALTER TABLE "employee_contracts"
  ADD COLUMN IF NOT EXISTS "workDaysPerWeek"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dailyStartTime"     TEXT,
  ADD COLUMN IF NOT EXISTS "dailyEndTime"       TEXT,
  ADD COLUMN IF NOT EXISTS "annualVacationDays" INTEGER;

-- Add schedule fields to employees
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "scheduledDaysPerWeek" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "annualVacationDays"   INTEGER;
