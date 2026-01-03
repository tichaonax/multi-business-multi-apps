-- Migration 5: Product Price Change Audit Log
-- This migration creates an audit trail for all product price changes
-- Tracks who changed prices, when, why, and links to barcode print jobs if applicable

-- Create price change audit table
CREATE TABLE IF NOT EXISTS product_price_changes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "oldPrice" DECIMAL(10,2),
  "newPrice" DECIMAL(10,2) NOT NULL,
  "changedBy" TEXT,
  "changedAt" TIMESTAMPTZ DEFAULT NOW(),
  "changeReason" VARCHAR(100) DEFAULT 'MANUAL_EDIT',
  "barcodeJobId" TEXT,
  notes TEXT,

  -- Foreign key constraints
  CONSTRAINT fk_price_changes_product
    FOREIGN KEY ("productId") REFERENCES business_products(id) ON DELETE CASCADE,

  CONSTRAINT fk_price_changes_user
    FOREIGN KEY ("changedBy") REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT fk_price_changes_barcode_job
    FOREIGN KEY ("barcodeJobId") REFERENCES barcode_print_jobs(id) ON DELETE SET NULL
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_price_changes_product ON product_price_changes("productId");
CREATE INDEX IF NOT EXISTS idx_price_changes_date ON product_price_changes("changedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_price_changes_user ON product_price_changes("changedBy");
CREATE INDEX IF NOT EXISTS idx_price_changes_variant ON product_price_changes("variantId") WHERE "variantId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_changes_reason ON product_price_changes("changeReason");

-- Add helpful comments
COMMENT ON TABLE product_price_changes IS 'Audit log of all product price changes with timestamp, user, and reason';
COMMENT ON COLUMN product_price_changes."productId" IS 'Reference to the product whose price changed';
COMMENT ON COLUMN product_price_changes."variantId" IS 'Reference to specific variant if price change was for a variant (NULL if base product)';
COMMENT ON COLUMN product_price_changes."oldPrice" IS 'Previous price before change (NULL for initial price setting)';
COMMENT ON COLUMN product_price_changes."newPrice" IS 'New price after change';
COMMENT ON COLUMN product_price_changes."changedBy" IS 'User who made the price change';
COMMENT ON COLUMN product_price_changes."changeReason" IS 'Reason code: MANUAL_EDIT, BARCODE_LABEL_PRINT, BULK_UPDATE, IMPORT, etc.';
COMMENT ON COLUMN product_price_changes."barcodeJobId" IS 'Link to barcode print job if price was changed during label creation';
COMMENT ON COLUMN product_price_changes.notes IS 'Optional notes about why price was changed';

-- Common change_reason values:
-- 'MANUAL_EDIT'           - User manually updated price in product form
-- 'BARCODE_LABEL_PRINT'   - Price updated during barcode label creation
-- 'BULK_UPDATE'           - Part of bulk price update operation
-- 'IMPORT'                - Price set during product import
-- 'PROMOTIONAL'           - Promotional pricing
-- 'SUPPLIER_UPDATE'       - Supplier changed wholesale cost
