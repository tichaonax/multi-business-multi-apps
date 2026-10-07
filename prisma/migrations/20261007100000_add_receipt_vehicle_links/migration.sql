-- MBM-302: Receipt-to-Vehicle Integration
-- Links a receipt entry to a vehicle, and traces the vehicle records it
-- auto-creates (VehicleExpenses / VehicleMaintenanceRecords) back to the
-- receipt/payment that funded them and who was driving. All nullable,
-- all ON DELETE SET NULL — informational links only, same shape as the
-- existing combo_item_id link on expense_payment_receipts.

-- expense_payment_receipts.vehicle_id — marks a receipt entry as vehicle-related
ALTER TABLE "expense_payment_receipts" ADD COLUMN "vehicle_id" TEXT;
ALTER TABLE "expense_payment_receipts" ADD CONSTRAINT "expense_payment_receipts_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "idx_expense_payment_receipts_vehicle_id" ON "expense_payment_receipts"("vehicle_id");

-- vehicle_expenses — trace back to receipt/payment/driver (camelCase columns,
-- no @map, matching this table's existing column-naming convention)
ALTER TABLE "vehicle_expenses" ADD COLUMN "receiptId" TEXT;
ALTER TABLE "vehicle_expenses" ADD COLUMN "expensePaymentId" TEXT;
ALTER TABLE "vehicle_expenses" ADD COLUMN "driverId" TEXT;
ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "vehicle_expenses_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "expense_payment_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "vehicle_expenses_expensePaymentId_fkey"
  FOREIGN KEY ("expensePaymentId") REFERENCES "expense_account_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "vehicle_expenses_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "vehicle_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "vehicle_expenses_receiptId_idx" ON "vehicle_expenses"("receiptId");
CREATE INDEX "vehicle_expenses_expensePaymentId_idx" ON "vehicle_expenses"("expensePaymentId");
CREATE INDEX "vehicle_expenses_driverId_idx" ON "vehicle_expenses"("driverId");

-- vehicle_maintenance_records — same trace-back fields
ALTER TABLE "vehicle_maintenance_records" ADD COLUMN "receiptId" TEXT;
ALTER TABLE "vehicle_maintenance_records" ADD COLUMN "expensePaymentId" TEXT;
ALTER TABLE "vehicle_maintenance_records" ADD COLUMN "driverId" TEXT;
ALTER TABLE "vehicle_maintenance_records" ADD CONSTRAINT "vehicle_maintenance_records_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "expense_payment_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicle_maintenance_records" ADD CONSTRAINT "vehicle_maintenance_records_expensePaymentId_fkey"
  FOREIGN KEY ("expensePaymentId") REFERENCES "expense_account_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicle_maintenance_records" ADD CONSTRAINT "vehicle_maintenance_records_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "vehicle_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "vehicle_maintenance_records_receiptId_idx" ON "vehicle_maintenance_records"("receiptId");
CREATE INDEX "vehicle_maintenance_records_expensePaymentId_idx" ON "vehicle_maintenance_records"("expensePaymentId");
CREATE INDEX "vehicle_maintenance_records_driverId_idx" ON "vehicle_maintenance_records"("driverId");
