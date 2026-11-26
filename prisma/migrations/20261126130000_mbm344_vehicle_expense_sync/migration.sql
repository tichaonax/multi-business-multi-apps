-- MBM-344: vehicle costs on request lines sync to Fleet Management.

-- Licensing as a vehicle expense type
ALTER TYPE "ExpenseType" ADD VALUE IF NOT EXISTS 'LICENSING';

-- The request line a Fleet record came from ("combo-item:<id>",
-- "petty-cash-tx:<id>"): at most one record per line, so approving or
-- editing again updates it instead of adding another.
ALTER TABLE "vehicle_expenses" ADD COLUMN "sourceRef" TEXT;
CREATE UNIQUE INDEX "vehicle_expenses_sourceRef_key" ON "vehicle_expenses"("sourceRef");

ALTER TABLE "vehicle_maintenance_records" ADD COLUMN "sourceRef" TEXT;
CREATE UNIQUE INDEX "vehicle_maintenance_records_sourceRef_key" ON "vehicle_maintenance_records"("sourceRef");

-- A combo request line can be a vehicle cost
ALTER TABLE "combo_payment_request_items" ADD COLUMN "vehicleId" TEXT, ADD COLUMN "vehicleExpenseType" TEXT,
  ADD COLUMN "vehicleLicenseType" TEXT, ADD COLUMN "vehicleLicenseExpiry" TIMESTAMP(3);
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- So can a petty cash spending line
ALTER TABLE "petty_cash_transactions" ADD COLUMN "vehicleId" TEXT, ADD COLUMN "vehicleExpenseType" TEXT,
  ADD COLUMN "vehicleLicenseType" TEXT, ADD COLUMN "vehicleLicenseExpiry" TIMESTAMP(3);
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
