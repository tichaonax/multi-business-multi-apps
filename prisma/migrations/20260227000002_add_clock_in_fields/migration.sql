-- AlterTable: Add clock-in tracking fields to employee_attendance
ALTER TABLE "employee_attendance"
  ADD COLUMN "isAutoClockOut"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isApproved"             BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "autoClockOutApprovedBy" TEXT,
  ADD COLUMN "autoClockOutApprovedAt" TIMESTAMP(3),
  ADD COLUMN "clockInPhotoUrl"        TEXT,
  ADD COLUMN "clockOutPhotoUrl"       TEXT;

-- AlterTable: Add clock-in schedule and exemption fields to employees
ALTER TABLE "employees"
  ADD COLUMN "scheduledStartTime"      TEXT,
  ADD COLUMN "scheduledEndTime"        TEXT,
  ADD COLUMN "isClockInExempt"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "clockInExemptReason"     TEXT,
  ADD COLUMN "clockInExemptApprovedBy" TEXT;
