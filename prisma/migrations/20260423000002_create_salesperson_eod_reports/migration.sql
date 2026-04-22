-- Migration: create salesperson_eod_reports table (MBM-187)
CREATE TABLE "salesperson_eod_reports" (
  "id"               TEXT          NOT NULL,
  "businessId"       TEXT          NOT NULL,
  "salespersonId"    TEXT          NOT NULL,
  "reportDate"       DATE          NOT NULL,
  "cashAmount"       DECIMAL(12,2) NOT NULL DEFAULT 0,
  "ecocashAmount"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes"            TEXT,
  "status"           TEXT          NOT NULL DEFAULT 'PENDING',
  "submittedAt"      TIMESTAMP(3),
  "submittedById"    TEXT,
  "isManagerOverride" BOOLEAN      NOT NULL DEFAULT FALSE,
  "overrideReason"   TEXT,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "salesperson_eod_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "salesperson_eod_reports_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "salesperson_eod_reports_salespersonId_fkey"
    FOREIGN KEY ("salespersonId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "salesperson_eod_reports_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "salesperson_eod_reports_businessId_salespersonId_reportDate_key"
  ON "salesperson_eod_reports"("businessId", "salespersonId", "reportDate");

CREATE INDEX "salesperson_eod_reports_businessId_reportDate_idx"
  ON "salesperson_eod_reports"("businessId", "reportDate");

CREATE INDEX "salesperson_eod_reports_salespersonId_idx"
  ON "salesperson_eod_reports"("salespersonId");

CREATE INDEX "salesperson_eod_reports_status_idx"
  ON "salesperson_eod_reports"("status");
