CREATE TABLE "payroll_slips" (
  "id"                  TEXT NOT NULL PRIMARY KEY,
  "payrollPeriodId"     TEXT NOT NULL,
  "payrollEntryId"      TEXT NOT NULL UNIQUE,
  "employeeId"          TEXT NOT NULL,
  "normalHours"         DECIMAL(8,2),
  "leaveDaysDue"        DECIMAL(8,2),
  "payPoint"            TEXT,
  "costCode"            TEXT,
  "totalEarnings"       DECIMAL(12,2),
  "payeTax"             DECIMAL(12,2),
  "aidsLevy"            DECIMAL(12,2),
  "nssaEmployee"        DECIMAL(12,2),
  "necEmployee"         DECIMAL(12,2),
  "netPayRound"         DECIMAL(12,2),
  "loanDeductions"      DECIMAL(12,2),
  "advanceDeductions"   DECIMAL(12,2),
  "miscDeductions"      DECIMAL(12,2),
  "otherDeductions"     JSONB,
  "totalDeductions"     DECIMAL(12,2),
  "wcif"                DECIMAL(12,2),
  "necCompanyContrib"   DECIMAL(12,2),
  "otherContributions"  JSONB,
  "nettPay"             DECIMAL(12,2),
  "status"              TEXT NOT NULL DEFAULT 'PENDING',
  "capturedAt"          TIMESTAMP(3),
  "capturedBy"          TEXT,
  "distributedAt"       TIMESTAMP(3),
  "distributedBy"       TEXT,
  "notes"               TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_slips_payrollPeriodId_fkey"
    FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE,
  CONSTRAINT "payroll_slips_payrollEntryId_fkey"
    FOREIGN KEY ("payrollEntryId") REFERENCES "payroll_entries"("id") ON DELETE CASCADE,
  CONSTRAINT "payroll_slips_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id"),
  CONSTRAINT "payroll_slips_capturedBy_fkey"
    FOREIGN KEY ("capturedBy") REFERENCES "users"("id"),
  CONSTRAINT "payroll_slips_distributedBy_fkey"
    FOREIGN KEY ("distributedBy") REFERENCES "users"("id")
);

CREATE INDEX "payroll_slips_payrollPeriodId_idx" ON "payroll_slips"("payrollPeriodId");
CREATE INDEX "payroll_slips_employeeId_idx" ON "payroll_slips"("employeeId");
