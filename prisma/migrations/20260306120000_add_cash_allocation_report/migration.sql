-- Migration: 20260306120000_add_cash_allocation_report
-- Creates the daily cash allocation report tables

-- ─── cash_allocation_reports ─────────────────────────────────────────────────

CREATE TABLE "cash_allocation_reports" (
  "id"         TEXT          NOT NULL,
  "businessId" TEXT          NOT NULL,
  "reportDate" DATE          NOT NULL,
  "status"     TEXT          NOT NULL DEFAULT 'DRAFT',
  "createdAt"  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"  TEXT          NOT NULL,
  "lockedAt"   TIMESTAMPTZ,
  "lockedBy"   TEXT,
  "notes"      TEXT,

  CONSTRAINT "cash_allocation_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cash_allocation_reports_businessId_reportDate_key" UNIQUE ("businessId", "reportDate")
);

ALTER TABLE "cash_allocation_reports"
  ADD CONSTRAINT "cash_allocation_reports_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "cash_allocation_reports_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cash_allocation_reports_lockedBy_fkey"
    FOREIGN KEY ("lockedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "cash_allocation_reports_businessId_reportDate_idx" ON "cash_allocation_reports"("businessId", "reportDate");
CREATE INDEX "cash_allocation_reports_reportDate_idx" ON "cash_allocation_reports"("reportDate");

-- ─── cash_allocation_line_items ──────────────────────────────────────────────

CREATE TABLE "cash_allocation_line_items" (
  "id"               TEXT            NOT NULL,
  "reportId"         TEXT            NOT NULL,
  "expenseAccountId" TEXT            NOT NULL,
  "accountName"      TEXT            NOT NULL,
  "sourceType"       TEXT            NOT NULL,
  "depositId"        TEXT            NOT NULL,
  "reportedAmount"   DECIMAL(12, 2)  NOT NULL,
  "actualAmount"     DECIMAL(12, 2),
  "isChecked"        BOOLEAN         NOT NULL DEFAULT FALSE,
  "checkedAt"        TIMESTAMPTZ,
  "checkedBy"        TEXT,
  "notes"            TEXT,
  "sortOrder"        INTEGER         NOT NULL DEFAULT 0,

  CONSTRAINT "cash_allocation_line_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cash_allocation_line_items_depositId_key" UNIQUE ("depositId")
);

ALTER TABLE "cash_allocation_line_items"
  ADD CONSTRAINT "cash_allocation_line_items_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "cash_allocation_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "cash_allocation_line_items_expenseAccountId_fkey"
    FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cash_allocation_line_items_depositId_fkey"
    FOREIGN KEY ("depositId") REFERENCES "expense_account_deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cash_allocation_line_items_checkedBy_fkey"
    FOREIGN KEY ("checkedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "cash_allocation_line_items_reportId_idx" ON "cash_allocation_line_items"("reportId");
CREATE INDEX "cash_allocation_line_items_expenseAccountId_idx" ON "cash_allocation_line_items"("expenseAccountId");
