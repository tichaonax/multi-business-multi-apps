-- Add actualReturnDate to employee_leave_requests
-- Records the date the employee actually returned to work (may differ from planned endDate).
-- NULL means the employee has not yet returned.
ALTER TABLE "employee_leave_requests" ADD COLUMN IF NOT EXISTS "actualReturnDate" TIMESTAMPTZ;
