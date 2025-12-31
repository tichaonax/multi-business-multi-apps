-- Migration 2: Product Multi-Barcode Support - Enhanced Existing Table
-- The product_barcodes table already exists with camelCase columns
-- This migration adds new columns we need for barcode template integration

-- Add source column to track how barcode was created
ALTER TABLE product_barcodes
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'MANUAL';

-- Add created_by column to track user who created the barcode
ALTER TABLE product_barcodes
ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Add foreign key constraint for createdBy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_product_barcodes_created_by'
  ) THEN
    ALTER TABLE product_barcodes
    ADD CONSTRAINT fk_product_barcodes_created_by
      FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create additional indexes for fast lookups
-- Note: Using existing camelCase column names (productId, not product_id)
CREATE INDEX IF NOT EXISTS idx_product_barcodes_code ON product_barcodes(code);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_type ON product_barcodes(type);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_product_primary ON product_barcodes("productId", "isPrimary") WHERE "isPrimary" = true;

-- Set source to 'EXISTING' for all current barcodes
UPDATE product_barcodes
SET source = 'EXISTING'
WHERE source IS NULL;

-- Add template linkage to business_products
-- This allows tracking which barcode template was used to create a product
ALTER TABLE business_products
ADD COLUMN IF NOT EXISTS "createdFromTemplateId" TEXT;

ALTER TABLE business_products
ADD COLUMN IF NOT EXISTS "templateLinkedAt" TIMESTAMPTZ;

-- Add foreign key constraint for template linkage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_business_products_template'
  ) THEN
    ALTER TABLE business_products
    ADD CONSTRAINT fk_business_products_template
      FOREIGN KEY ("createdFromTemplateId") REFERENCES barcode_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for template linkage queries
CREATE INDEX IF NOT EXISTS idx_business_products_template_link ON business_products("createdFromTemplateId");

-- Add comments for documentation
COMMENT ON TABLE product_barcodes IS 'Stores multiple barcodes per product with different symbologies';
COMMENT ON COLUMN product_barcodes.code IS 'The barcode value/number';
COMMENT ON COLUMN product_barcodes.type IS 'Barcode type: CODE128, EAN13, UPC-A, QR, etc.';
COMMENT ON COLUMN product_barcodes."isPrimary" IS 'Whether this is the primary barcode shown in POS';
COMMENT ON COLUMN product_barcodes.source IS 'How barcode was created: MANUAL, BARCODE_TEMPLATE, EXISTING, IMPORTED';
COMMENT ON COLUMN business_products."createdFromTemplateId" IS 'Reference to barcode template used to create this product (if applicable)';
