-- MBM-143: Grouped EOD Catch-Up
-- Creates GroupedEODRun + GroupedEODRunDate tables,
-- adds groupedRunId FK to SavedReports,
-- adds groupedRunId + isGrouped to CashAllocationReport,
-- makes CashAllocationReport.reportDate nullable,
-- replaces the unique index with a partial unique (non-null dates only).

-- 1. Create grouped_eod_runs
CREATE TABLE "grouped_eod_runs" (
  "id"          TEXT NOT NULL,
  "businessId"  TEXT NOT NULL,
  "managerName" TEXT NOT NULL,
  "notes"       TEXT,
  "runDate"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "grouped_eod_runs_pkey" PRIMARY KEY ("id")
);

-- 2. Create grouped_eod_run_dates
CREATE TABLE "grouped_eod_run_dates" (
  "id"                  TEXT NOT NULL,
  "groupedRunId"        TEXT NOT NULL,
  "date"                TEXT NOT NULL,
  "totalSales"          DOUBLE PRECISION NOT NULL,
  "cashCounted"         DOUBLE PRECISION NOT NULL,
  "allocationBreakdown" JSONB,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "grouped_eod_run_dates_pkey" PRIMARY KEY ("id")
);

-- 3. FK: grouped_eod_runs → businesses
ALTER TABLE "grouped_eod_runs"
  ADD CONSTRAINT "grouped_eod_runs_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. FK: grouped_eod_run_dates → grouped_eod_runs
ALTER TABLE "grouped_eod_run_dates"
  ADD CONSTRAINT "grouped_eod_run_dates_groupedRunId_fkey"
  FOREIGN KEY ("groupedRunId") REFERENCES "grouped_eod_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Add groupedRunId to SavedReports
ALTER TABLE "saved_reports" ADD COLUMN "groupedRunId" TEXT;
ALTER TABLE "saved_reports"
  ADD CONSTRAINT "saved_reports_groupedRunId_fkey"
  FOREIGN KEY ("groupedRunId") REFERENCES "grouped_eod_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Make CashAllocationReport.reportDate nullable
ALTER TABLE "cash_allocation_reports" ALTER COLUMN "reportDate" DROP NOT NULL;

-- 7. Drop existing unique constraint on (businessId, reportDate)
ALTER TABLE "cash_allocation_reports"
  DROP CONSTRAINT IF EXISTS "cash_allocation_reports_businessId_reportDate_key";

-- 8. Partial unique index: one report per business per day (only for non-grouped, i.e. reportDate IS NOT NULL)
CREATE UNIQUE INDEX "cash_allocation_reports_businessId_reportDate_unique"
  ON "cash_allocation_reports" ("businessId", "reportDate")
  WHERE "reportDate" IS NOT NULL;

-- 9. Add groupedRunId + isGrouped to CashAllocationReport
ALTER TABLE "cash_allocation_reports" ADD COLUMN "groupedRunId" TEXT;
ALTER TABLE "cash_allocation_reports" ADD COLUMN "isGrouped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "cash_allocation_reports"
  ADD CONSTRAINT "cash_allocation_reports_groupedRunId_fkey"
  FOREIGN KEY ("groupedRunId") REFERENCES "grouped_eod_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 10. Partial unique index: one grouped cash allocation per grouped run
CREATE UNIQUE INDEX "cash_allocation_reports_groupedRunId_unique"
  ON "cash_allocation_reports" ("groupedRunId")
  WHERE "groupedRunId" IS NOT NULL;

-- 11. Indexes
CREATE INDEX "grouped_eod_runs_businessId_idx" ON "grouped_eod_runs" ("businessId");
CREATE INDEX "grouped_eod_run_dates_groupedRunId_idx" ON "grouped_eod_run_dates" ("groupedRunId");
CREATE INDEX "cash_allocation_reports_groupedRunId_idx" ON "cash_allocation_reports" ("groupedRunId");
