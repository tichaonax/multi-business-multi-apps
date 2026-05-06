-- Add sickDaysPerYear to employee_contracts
-- This allows each contract to override the organisation-level sick leave policy default.
ALTER TABLE "employee_contracts" ADD COLUMN IF NOT EXISTS "sickDaysPerYear" INTEGER;
