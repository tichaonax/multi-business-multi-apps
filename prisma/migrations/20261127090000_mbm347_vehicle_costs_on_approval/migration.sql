-- MBM-347: every vehicle cost request writes to Vehicle Management on approval.

-- The request line / payment that paid for a licence: its cost is already a
-- vehicle expense, so the vehicle cost report doesn't count it twice
ALTER TABLE "vehicle_licenses" ADD COLUMN "fundedSourceRef" TEXT;

-- A direct expense payment's vehicle cost, held until the payment is approved
ALTER TABLE "expense_account_payments" ADD COLUMN "vehicleCost" JSONB;

-- A supplier payment request line can be a vehicle cost
ALTER TABLE "supplier_payment_request_items" ADD COLUMN "vehicleId" TEXT, ADD COLUMN "vehicleExpenseType" TEXT,
  ADD COLUMN "vehicleLicenseType" TEXT, ADD COLUMN "vehicleLicenseExpiry" TIMESTAMP(3);
ALTER TABLE "supplier_payment_request_items" ADD CONSTRAINT "supplier_payment_request_items_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
