-- =========================================================================
-- BARCODE TEMPLATES TABLE UPDATES
-- =========================================================================

-- Add new fields to barcode_templates
ALTER TABLE "barcode_templates" ADD COLUMN "name" TEXT;
ALTER TABLE "barcode_templates" ADD COLUMN "width" SMALLINT;
ALTER TABLE "barcode_templates" ADD COLUMN "height" SMALLINT;
ALTER TABLE "barcode_templates" ADD COLUMN "margin" SMALLINT;
ALTER TABLE "barcode_templates" ADD COLUMN "displayValue" BOOLEAN DEFAULT true;
ALTER TABLE "barcode_templates" ADD COLUMN "fontSize" SMALLINT;
ALTER TABLE "barcode_templates" ADD COLUMN "backgroundColor" TEXT;
ALTER TABLE "barcode_templates" ADD COLUMN "lineColor" TEXT;
ALTER TABLE "barcode_templates" ADD COLUMN "createdById" TEXT;

-- Set default values for existing records
UPDATE "barcode_templates" SET "name" = 'Legacy Template - ' || "id" WHERE "name" IS NULL;
UPDATE "barcode_templates" SET "createdById" = "createdBy" WHERE "createdById" IS NULL;

-- Make name required
ALTER TABLE "barcode_templates" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "barcode_templates" ALTER COLUMN "createdById" SET NOT NULL;

-- Drop old unique constraint on barcodeValue
ALTER TABLE "barcode_templates" DROP CONSTRAINT IF EXISTS "barcode_templates_barcodeValue_key";

-- Add composite unique constraint
ALTER TABLE "barcode_templates" ADD CONSTRAINT "barcode_templates_business_value_unique" UNIQUE ("businessId", "barcodeValue");

-- Add foreign key for createdById
ALTER TABLE "barcode_templates" ADD CONSTRAINT "barcode_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================================================
-- BARCODE PRINT JOBS TABLE UPDATES
-- =========================================================================

-- Add new fields to barcode_print_jobs
ALTER TABLE "barcode_print_jobs" ADD COLUMN "itemId" TEXT;
ALTER TABLE "barcode_print_jobs" ADD COLUMN "itemType" TEXT;
ALTER TABLE "barcode_print_jobs" ADD COLUMN "barcodeData" TEXT;
ALTER TABLE "barcode_print_jobs" ADD COLUMN "itemName" TEXT;
ALTER TABLE "barcode_print_jobs" ADD COLUMN "customData" JSONB;
ALTER TABLE "barcode_print_jobs" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "barcode_print_jobs" ADD COLUMN "inventoryItemId" TEXT;
ALTER TABLE "barcode_print_jobs" ADD COLUMN "createdById" TEXT;

-- Set default values for existing records
UPDATE "barcode_print_jobs" SET "createdById" = "createdBy" WHERE "createdById" IS NULL;

-- Make createdById required
ALTER TABLE "barcode_print_jobs" ALTER COLUMN "createdById" SET NOT NULL;

-- Add foreign keys
ALTER TABLE "barcode_print_jobs" ADD CONSTRAINT "barcode_print_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "barcode_print_jobs" ADD CONSTRAINT "barcode_print_jobs_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "barcode_inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =========================================================================
-- BARCODE INVENTORY ITEMS TABLE UPDATES
-- =========================================================================

-- Add new fields to barcode_inventory_items
ALTER TABLE "barcode_inventory_items" ADD COLUMN "inventoryItemId" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "barcodeData" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "customLabel" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "batchNumber" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "expiryDate" TIMESTAMP(3);
ALTER TABLE "barcode_inventory_items" ADD COLUMN "quantity" INTEGER DEFAULT 1;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "createdById" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Copy itemId to inventoryItemId for existing records
UPDATE "barcode_inventory_items" SET "inventoryItemId" = "itemId" WHERE "inventoryItemId" IS NULL;

-- Set default values for existing records
UPDATE "barcode_inventory_items" SET "createdAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL;
UPDATE "barcode_inventory_items" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- For createdById, we'll set it to a system user or first admin (need to handle this carefully)
-- Using the first user in the system as fallback
UPDATE "barcode_inventory_items"
SET "createdById" = (SELECT "id" FROM "users" LIMIT 1)
WHERE "createdById" IS NULL;

-- Make required fields NOT NULL
ALTER TABLE "barcode_inventory_items" ALTER COLUMN "inventoryItemId" SET NOT NULL;
ALTER TABLE "barcode_inventory_items" ALTER COLUMN "createdById" SET NOT NULL;
ALTER TABLE "barcode_inventory_items" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "barcode_inventory_items" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "barcode_inventory_items" ALTER COLUMN "quantity" SET NOT NULL;
ALTER TABLE "barcode_inventory_items" ALTER COLUMN "isActive" SET NOT NULL;

-- Add foreign key for createdById
ALTER TABLE "barcode_inventory_items" ADD CONSTRAINT "barcode_inventory_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old itemId column (after copying to inventoryItemId)
ALTER TABLE "barcode_inventory_items" DROP COLUMN "itemId";
