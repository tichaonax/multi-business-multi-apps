-- AlterTable: Change BusinessSuppliers unique constraint
-- From: [businessId, supplierNumber] 
-- To: [businessType, supplierNumber]
-- This enables supplier sharing across businesses of the same type

-- Step 1: Drop the old unique constraint
ALTER TABLE "business_suppliers" DROP CONSTRAINT IF EXISTS "business_suppliers_businessId_supplierNumber_key";

-- Step 2: Add the new unique constraint
ALTER TABLE "business_suppliers" ADD CONSTRAINT "business_suppliers_businessType_supplierNumber_key" UNIQUE ("businessType", "supplierNumber");
