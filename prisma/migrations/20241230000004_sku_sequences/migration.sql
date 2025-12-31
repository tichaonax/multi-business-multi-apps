-- Migration 4: SKU Auto-Generation Sequences
-- This migration creates the infrastructure for auto-generating human-readable SKUs
-- based on business-specific configuration (format, prefix, sequence)

-- Create SKU sequence tracking table
-- Each business can have multiple sequences for different prefixes
-- (e.g., one for "HXI", one for "QUILTS", one for "HXI-QUILTS")
CREATE TABLE IF NOT EXISTS sku_sequences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "businessId" TEXT NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  "currentSequence" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign key constraint
  CONSTRAINT fk_sku_sequences_business
    FOREIGN KEY ("businessId") REFERENCES businesses(id) ON DELETE CASCADE,

  -- Ensure one sequence per business+prefix combination
  CONSTRAINT unique_business_prefix UNIQUE("businessId", prefix)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sku_sequences_business ON sku_sequences("businessId");
CREATE INDEX IF NOT EXISTS idx_sku_sequences_prefix ON sku_sequences("businessId", prefix);

-- Create function to generate next SKU based on business settings
-- This function respects the business's sku_format configuration
CREATE OR REPLACE FUNCTION generate_next_sku(
  p_business_id TEXT,
  p_category_name VARCHAR DEFAULT NULL,
  p_department_name VARCHAR DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
  v_sequence INTEGER;
  v_sku VARCHAR;
  v_format VARCHAR;
  v_prefix VARCHAR;
  v_digits INTEGER;
  v_final_prefix VARCHAR;
BEGIN
  -- Get business SKU settings
  SELECT sku_format, sku_prefix, sku_digits
  INTO v_format, v_prefix, v_digits
  FROM businesses
  WHERE id = p_business_id;

  -- If no settings found, use defaults
  IF v_prefix IS NULL THEN
    v_prefix := 'GEN';
    v_format := '{BUSINESS}-{SEQ}';
    v_digits := 5;
  END IF;

  -- Determine final prefix based on format template
  CASE v_format
    WHEN '{BUSINESS}-{SEQ}' THEN
      -- Simple business prefix: HXI-00001
      v_final_prefix := v_prefix;

    WHEN '{CATEGORY}-{SEQ}' THEN
      -- Category-based: QUILTS-00001
      IF p_category_name IS NOT NULL THEN
        v_final_prefix := UPPER(LEFT(REGEXP_REPLACE(p_category_name, '[^A-Za-z]', '', 'g'), 10));
      ELSE
        v_final_prefix := v_prefix; -- Fallback to business prefix
      END IF;

    WHEN '{DEPARTMENT}-{SEQ}' THEN
      -- Department-based: HOMEBEAUTY-00001
      IF p_department_name IS NOT NULL THEN
        v_final_prefix := UPPER(LEFT(REGEXP_REPLACE(p_department_name, '[^A-Za-z]', '', 'g'), 10));
      ELSE
        v_final_prefix := v_prefix; -- Fallback to business prefix
      END IF;

    WHEN '{BUSINESS}-{CATEGORY}-{SEQ}' THEN
      -- Hybrid: HXI-QUILTS-00001
      IF p_category_name IS NOT NULL THEN
        v_final_prefix := v_prefix || '-' || UPPER(LEFT(REGEXP_REPLACE(p_category_name, '[^A-Za-z]', '', 'g'), 6));
      ELSE
        v_final_prefix := v_prefix || '-GEN';
      END IF;

    ELSE
      -- Unknown format, use business prefix
      v_final_prefix := v_prefix;
  END CASE;

  -- Increment sequence for this prefix
  -- Uses UPSERT pattern (INSERT ... ON CONFLICT DO UPDATE)
  INSERT INTO sku_sequences ("businessId", prefix, "currentSequence")
  VALUES (p_business_id, v_final_prefix, 1)
  ON CONFLICT ("businessId", prefix)
  DO UPDATE SET
    "currentSequence" = sku_sequences."currentSequence" + 1,
    "updatedAt" = NOW()
  RETURNING "currentSequence" INTO v_sequence;

  -- Format SKU with zero-padded sequence number
  v_sku := v_final_prefix || '-' || LPAD(v_sequence::TEXT, v_digits, '0');

  RETURN v_sku;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE sku_sequences IS 'Tracks auto-increment sequences for SKU generation per business and prefix';
COMMENT ON COLUMN sku_sequences.prefix IS 'The SKU prefix for this sequence (e.g., HXI, QUILTS, HXI-QUILTS)';
COMMENT ON COLUMN sku_sequences."currentSequence" IS 'Current sequence number (increments with each SKU generated)';

COMMENT ON FUNCTION generate_next_sku(TEXT, VARCHAR, VARCHAR) IS 'Generates next SKU based on business sku_format setting. Examples: generate_next_sku(business_id) → HXI-00001, generate_next_sku(business_id, ''Quilts'') → QUILTS-00001';

-- Example usage:
-- SELECT generate_next_sku('business-uuid-here');
--   → Returns: 'HXI-00001' (if format = {BUSINESS}-{SEQ})
--
-- SELECT generate_next_sku('business-uuid-here', 'Quilts', NULL);
--   → Returns: 'QUILTS-00001' (if format = {CATEGORY}-{SEQ})
--
-- SELECT generate_next_sku('business-uuid-here', 'Quilts', 'Home & Beauty');
--   → Returns: 'HXI-QUILTS-00001' (if format = {BUSINESS}-{CATEGORY}-{SEQ})
