-- MBM-158: Stock Take & Receive Workflow
-- Creates StockTakeDrafts, StockTakeDraftItems, StockTakeReports, StockTakeReportEmployees

-- Enums
CREATE TYPE "StockTakeDraftStatus" AS ENUM ('DRAFT', 'SUBMITTED');
CREATE TYPE "StockTakeReportStatus" AS ENUM ('PENDING_SIGNOFF', 'SIGNED_OFF', 'VOIDED');

-- StockTakeDrafts
CREATE TABLE "stock_take_drafts" (
    "id"           TEXT NOT NULL,
    "businessId"   TEXT NOT NULL,
    "createdById"  TEXT NOT NULL,
    "status"       "StockTakeDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "title"        TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_take_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_take_drafts_businessId_idx" ON "stock_take_drafts"("businessId");
CREATE INDEX "stock_take_drafts_createdById_idx" ON "stock_take_drafts"("createdById");
CREATE INDEX "stock_take_drafts_businessId_createdById_status_idx" ON "stock_take_drafts"("businessId", "createdById", "status");

ALTER TABLE "stock_take_drafts"
    ADD CONSTRAINT "stock_take_drafts_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_take_drafts"
    ADD CONSTRAINT "stock_take_drafts_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockTakeDraftItems
CREATE TABLE "stock_take_draft_items" (
    "id"             TEXT NOT NULL,
    "draftId"        TEXT NOT NULL,
    "barcode"        TEXT,
    "name"           TEXT NOT NULL,
    "categoryId"     TEXT,
    "supplierId"     TEXT,
    "description"    TEXT,
    "newQuantity"    INTEGER NOT NULL,
    "sellingPrice"   DECIMAL(12,2) NOT NULL,
    "costPrice"      DECIMAL(12,2),
    "sku"            TEXT,
    "isExistingItem" BOOLEAN NOT NULL DEFAULT false,
    "systemQuantity" INTEGER,
    "physicalCount"  INTEGER,
    "displayOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_take_draft_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_take_draft_items_draftId_idx" ON "stock_take_draft_items"("draftId");

ALTER TABLE "stock_take_draft_items"
    ADD CONSTRAINT "stock_take_draft_items_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "stock_take_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StockTakeReports
CREATE TABLE "stock_take_reports" (
    "id"                   TEXT NOT NULL,
    "businessId"           TEXT NOT NULL,
    "draftId"              TEXT,
    "submittedById"        TEXT NOT NULL,
    "status"               "StockTakeReportStatus" NOT NULL DEFAULT 'PENDING_SIGNOFF',
    "managerSignedAt"      TIMESTAMP(3),
    "managerSignedById"    TEXT,
    "fullySignedOffAt"     TIMESTAMP(3),
    "reportData"           JSONB NOT NULL,
    "totalShortfallQty"    INTEGER NOT NULL DEFAULT 0,
    "totalShortfallValue"  DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNewStockValue"   DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalStockValueAfter" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employeeCount"        INTEGER NOT NULL DEFAULT 1,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_take_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_take_reports_businessId_idx" ON "stock_take_reports"("businessId");
CREATE INDEX "stock_take_reports_submittedById_idx" ON "stock_take_reports"("submittedById");
CREATE INDEX "stock_take_reports_status_idx" ON "stock_take_reports"("status");
CREATE INDEX "stock_take_reports_fullySignedOffAt_idx" ON "stock_take_reports"("fullySignedOffAt");

ALTER TABLE "stock_take_reports"
    ADD CONSTRAINT "stock_take_reports_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_take_reports"
    ADD CONSTRAINT "stock_take_reports_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "stock_take_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_take_reports"
    ADD CONSTRAINT "stock_take_reports_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_take_reports"
    ADD CONSTRAINT "stock_take_reports_managerSignedById_fkey"
    FOREIGN KEY ("managerSignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- StockTakeReportEmployees
CREATE TABLE "stock_take_report_employees" (
    "id"             TEXT NOT NULL,
    "reportId"       TEXT NOT NULL,
    "employeeId"     TEXT NOT NULL,
    "signedAt"       TIMESTAMP(3),
    "signedByUserId" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_take_report_employees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_take_report_employees_reportId_employeeId_key"
    ON "stock_take_report_employees"("reportId", "employeeId");

CREATE INDEX "stock_take_report_employees_employeeId_idx"
    ON "stock_take_report_employees"("employeeId");

ALTER TABLE "stock_take_report_employees"
    ADD CONSTRAINT "stock_take_report_employees_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "stock_take_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_take_report_employees"
    ADD CONSTRAINT "stock_take_report_employees_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_take_report_employees"
    ADD CONSTRAINT "stock_take_report_employees_signedByUserId_fkey"
    FOREIGN KEY ("signedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
