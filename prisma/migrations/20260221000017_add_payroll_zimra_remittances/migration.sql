-- CreateTable: payroll_zimra_remittances
-- One record per payroll period tracking the ZIMRA P2 PAYE remittance.
-- grossPaye = sum of employees' PAYE tax (employee-funded, already in payslips).
-- aidsLevy  = employer cost (3% of grossPaye), debited from payroll account at processing.

CREATE TABLE "payroll_zimra_remittances" (
  "id"                TEXT        NOT NULL PRIMARY KEY,
  "payrollPeriodId"   TEXT        NOT NULL UNIQUE,
  "totalRemuneration" DECIMAL(12,2) NOT NULL,
  "employeeCount"     INTEGER     NOT NULL,
  "grossPaye"         DECIMAL(12,2) NOT NULL,
  "aidsLevy"          DECIMAL(12,2) NOT NULL,
  "totalTaxDue"       DECIMAL(12,2) NOT NULL,
  "status"            TEXT        NOT NULL DEFAULT 'PENDING',
  "levyProcessedAt"   TIMESTAMP(3),
  "levyProcessedBy"   TEXT,
  "submittedAt"       TIMESTAMP(3),
  "submittedBy"       TEXT,
  "paymentReference"  TEXT,
  "notes"             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_zimra_remittances_payrollPeriodId_fkey"
    FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE,
  CONSTRAINT "payroll_zimra_remittances_levyProcessedBy_fkey"
    FOREIGN KEY ("levyProcessedBy") REFERENCES "users"("id"),
  CONSTRAINT "payroll_zimra_remittances_submittedBy_fkey"
    FOREIGN KEY ("submittedBy") REFERENCES "users"("id")
);

CREATE INDEX "payroll_zimra_remittances_payrollPeriodId_idx"
  ON "payroll_zimra_remittances"("payrollPeriodId");
