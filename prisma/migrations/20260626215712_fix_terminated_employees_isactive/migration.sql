-- Fix data inconsistency: employees with employmentStatus='terminated' must have isActive=false.
-- These employees were terminated via the HR flow but the isActive flag was not set to false.
UPDATE employees
SET "isActive" = false, "updatedAt" = NOW()
WHERE "employmentStatus" = 'terminated' AND "isActive" = true;
