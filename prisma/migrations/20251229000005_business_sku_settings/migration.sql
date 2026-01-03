-- Migration 3: Business SKU Configuration Settings
-- This migration adds SKU format configuration to businesses, allowing each business
-- to customize their auto-generated SKU format and prefix

-- Add SKU format configuration columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS sku_format VARCHAR(50) DEFAULT '{BUSINESS}-{SEQ}';

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS sku_prefix VARCHAR(20);

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS sku_digits INTEGER DEFAULT 5;

-- Create index for faster sku_prefix lookups
CREATE INDEX IF NOT EXISTS idx_businesses_sku_prefix ON businesses(sku_prefix);

-- Auto-populate sku_prefix for existing businesses
-- Extract first 3-4 uppercase letters from business shortName or name
-- Examples: "HXI Clothing" → "HXI", "ABC Store" → "ABC", "Multi-Business Manager" → "MBM"
UPDATE businesses
SET sku_prefix = UPPER(
  CASE
    -- Prefer shortName if it exists and is not empty
    WHEN "shortName" IS NOT NULL AND "shortName" != ''
      THEN LEFT(REGEXP_REPLACE("shortName", '[^A-Za-z]', '', 'g'), 4)
    -- Otherwise use name
    ELSE LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 4)
  END
)
WHERE sku_prefix IS NULL;

-- Add helpful comments for documentation
COMMENT ON COLUMN businesses.sku_format IS 'SKU format template: {BUSINESS}-{SEQ}, {CATEGORY}-{SEQ}, {DEPARTMENT}-{SEQ}, {BUSINESS}-{CATEGORY}-{SEQ}';
COMMENT ON COLUMN businesses.sku_prefix IS 'Prefix for auto-generated SKUs extracted from business name (e.g., HXI, ABC, MBM)';
COMMENT ON COLUMN businesses.sku_digits IS 'Number of digits in SKU sequence number (default 5 generates 00001, 00002, etc.)';

-- Example SKU formats based on sku_format setting:
-- {BUSINESS}-{SEQ}           → HXI-00001, HXI-00002
-- {CATEGORY}-{SEQ}           → QUILTS-00001, SHIRTS-00002
-- {DEPARTMENT}-{SEQ}         → HOMEBEAUTY-00001
-- {BUSINESS}-{CATEGORY}-{SEQ} → HXI-QUILTS-00001, HXI-SHIRTS-00002
