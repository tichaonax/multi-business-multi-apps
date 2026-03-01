-- Add unique constraint for businessType + supplierNumber on business_suppliers
-- Required by all seed scripts that upsert suppliers by businessType_supplierNumber
CREATE UNIQUE INDEX IF NOT EXISTS "business_suppliers_businessType_supplierNumber_key"
ON "business_suppliers"("businessType", "supplierNumber");
