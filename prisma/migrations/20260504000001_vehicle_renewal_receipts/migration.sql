-- AlterTable: vehicles — add taxClass, vehicleUsage, isExempt
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "taxClass" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "vehicleUsage" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "isExempt" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: vehicle_renewal_receipts
CREATE TABLE IF NOT EXISTS "vehicle_renewal_receipts" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "vehicleId"             TEXT NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
  "receiptNumber"         TEXT,
  "transactionType"       TEXT,
  "datePaid"              TIMESTAMPTZ,
  "paymentReceivedBy"     TEXT,
  "officeOfIssue"         TEXT,
  "arrears"               DECIMAL(10,2),
  "penalties"             DECIMAL(10,2),
  "administrationFee"     DECIMAL(10,2),
  "transactionFee"        DECIMAL(10,2),
  "surcharge"             DECIMAL(10,2),
  "debtManagementAmount"  DECIMAL(10,2),
  "deposit"               DECIMAL(10,2),
  "totalPaid"             DECIMAL(10,2),
  "currency"              TEXT NOT NULL DEFAULT 'ZiG',
  "isExempt"              BOOLEAN NOT NULL DEFAULT false,
  "documentUrl"           TEXT,
  "documentName"          TEXT,
  "notes"                 TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "vehicle_renewal_receipts_vehicleId_idx" ON "vehicle_renewal_receipts"("vehicleId");

-- AlterTable: vehicle_licenses — add usage, lateFee, isExempt, renewalReceiptId
ALTER TABLE "vehicle_licenses" ADD COLUMN IF NOT EXISTS "usage" TEXT;
ALTER TABLE "vehicle_licenses" ADD COLUMN IF NOT EXISTS "lateFee" DECIMAL(10,2);
ALTER TABLE "vehicle_licenses" ADD COLUMN IF NOT EXISTS "isExempt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "vehicle_licenses" ADD COLUMN IF NOT EXISTS "renewalReceiptId" TEXT REFERENCES "vehicle_renewal_receipts"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "vehicle_licenses_renewalReceiptId_idx" ON "vehicle_licenses"("renewalReceiptId");

-- CreateTable: vehicle_exemptions
CREATE TABLE IF NOT EXISTS "vehicle_exemptions" (
  "id"                           TEXT NOT NULL PRIMARY KEY,
  "vehicleId"                    TEXT NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
  "exemptionType"                TEXT NOT NULL,
  "startDate"                    TIMESTAMPTZ,
  "endDate"                      TIMESTAMPTZ,
  "exemptionReason"              TEXT,
  "exemptionReasonDescription"   TEXT,
  "requestedByName"              TEXT,
  "requestedByEmail"             TEXT,
  "requestedByContact"           TEXT,
  "dataCapturingOfficialName"    TEXT,
  "loginUserId"                  TEXT,
  "issueOffice"                  TEXT,
  "issueDate"                    TIMESTAMPTZ,
  "documentUrl"                  TEXT,
  "documentName"                 TEXT,
  "notes"                        TEXT,
  "createdAt"                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "vehicle_exemptions_vehicleId_idx" ON "vehicle_exemptions"("vehicleId");
