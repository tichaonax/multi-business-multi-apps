-- Migration: paye_tax_brackets_and_payroll_fields
-- Adds: paye_tax_brackets table, payroll_tax_constants table,
--        new columns on payroll_entries and payroll_periods

-- New table: paye_tax_brackets
CREATE TABLE "paye_tax_brackets" (
    "id"           TEXT NOT NULL,
    "year"         INTEGER NOT NULL,
    "tableType"    TEXT NOT NULL DEFAULT 'MONTHLY',
    "lowerBound"   DECIMAL(12,2) NOT NULL,
    "upperBound"   DECIMAL(12,2),
    "rate"         DECIMAL(5,4) NOT NULL,
    "deductAmount" DECIMAL(12,2) NOT NULL,
    "sortOrder"    INTEGER NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paye_tax_brackets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paye_tax_brackets_year_tableType_sortOrder_key"
    ON "paye_tax_brackets"("year", "tableType", "sortOrder");

-- New table: payroll_tax_constants
CREATE TABLE "payroll_tax_constants" (
    "id"               TEXT NOT NULL,
    "year"             INTEGER NOT NULL,
    "aidsLevyRate"     DECIMAL(5,4) NOT NULL,
    "nssaEmployeeRate" DECIMAL(5,4) NOT NULL,
    "nssaEmployerRate" DECIMAL(5,4) NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_tax_constants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_tax_constants_year_key"
    ON "payroll_tax_constants"("year");

-- New columns on payroll_entries
ALTER TABLE "payroll_entries"
    ADD COLUMN "payeAmount"          DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "aidsLevy"            DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "nssaEmployee"        DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "standardOvertimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "doubleOvertimePay"   DECIMAL(12,2) NOT NULL DEFAULT 0;

-- New column on payroll_periods
ALTER TABLE "payroll_periods"
    ADD COLUMN "nssaEmployerTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
