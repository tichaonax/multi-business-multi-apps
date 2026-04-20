-- Migration: Self-healing generate_next_sku()
--
-- Problem: when a backup from another server is restored, sku_sequences is restored
-- with the source server's counter values. If the target server already has products
-- with higher SKU numbers (or vice versa), the next generated SKU collides with an
-- existing one.
--
-- Fix: before incrementing, check the actual max sequence number in business_products
-- for the prefix being generated. Always advance the sequence past the real max.
-- This makes the function safe after any restore from any server.

CREATE OR REPLACE FUNCTION generate_next_sku(
  p_business_id TEXT,
  p_category_name VARCHAR DEFAULT NULL,
  p_department_name VARCHAR DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
  v_sequence   INTEGER;
  v_sku        VARCHAR;
  v_format     VARCHAR;
  v_prefix     VARCHAR;
  v_digits     INTEGER;
  v_final_prefix VARCHAR;
  v_actual_max INTEGER;
BEGIN
  -- Get business SKU settings
  SELECT sku_format, sku_prefix, sku_digits
  INTO v_format, v_prefix, v_digits
  FROM businesses
  WHERE id = p_business_id;

  -- Defaults when no settings are configured
  IF v_prefix IS NULL THEN
    v_prefix  := 'GEN';
    v_format  := '{BUSINESS}-{SEQ}';
    v_digits  := 5;
  END IF;

  -- Determine final prefix based on format template
  CASE v_format
    WHEN '{BUSINESS}-{SEQ}' THEN
      v_final_prefix := v_prefix;

    WHEN '{CATEGORY}-{SEQ}' THEN
      IF p_category_name IS NOT NULL THEN
        v_final_prefix := UPPER(LEFT(REGEXP_REPLACE(p_category_name, '[^A-Za-z]', '', 'g'), 10));
      ELSE
        v_final_prefix := v_prefix;
      END IF;

    WHEN '{DEPARTMENT}-{SEQ}' THEN
      IF p_department_name IS NOT NULL THEN
        v_final_prefix := UPPER(LEFT(REGEXP_REPLACE(p_department_name, '[^A-Za-z]', '', 'g'), 10));
      ELSE
        v_final_prefix := v_prefix;
      END IF;

    WHEN '{BUSINESS}-{CATEGORY}-{SEQ}' THEN
      IF p_category_name IS NOT NULL THEN
        v_final_prefix := v_prefix || '-' || UPPER(LEFT(REGEXP_REPLACE(p_category_name, '[^A-Za-z]', '', 'g'), 6));
      ELSE
        v_final_prefix := v_prefix || '-GEN';
      END IF;

    ELSE
      v_final_prefix := v_prefix;
  END CASE;

  -- Find the actual highest sequence number already used in business_products for
  -- this prefix. This self-heals after a cross-server restore where sku_sequences
  -- may be behind the products that already exist on this machine.
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(sku, '^' || v_final_prefix || '-0*', '')
        AS INTEGER
      )
    ),
    0
  )
  INTO v_actual_max
  FROM business_products
  WHERE "businessId" = p_business_id
    AND sku ~ ('^' || v_final_prefix || '-[0-9]+$');

  -- Upsert the sequence, advancing it to at least (actual_max + 1).
  -- GREATEST() ensures we never go backwards even when the sequence table
  -- is already ahead of the products table.
  INSERT INTO sku_sequences ("businessId", prefix, "currentSequence", "updatedAt")
  VALUES (p_business_id, v_final_prefix, GREATEST(1, v_actual_max + 1), NOW())
  ON CONFLICT ("businessId", prefix)
  DO UPDATE SET
    "currentSequence" = GREATEST(sku_sequences."currentSequence" + 1, v_actual_max + 1),
    "updatedAt"       = NOW()
  RETURNING "currentSequence" INTO v_sequence;

  -- Format SKU with zero-padded sequence number
  v_sku := v_final_prefix || '-' || LPAD(v_sequence::TEXT, v_digits, '0');

  RETURN v_sku;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_next_sku(TEXT, VARCHAR, VARCHAR) IS
  'Generates the next unique SKU for a business. Self-healing: always checks the actual '
  'max sequence in business_products so it stays correct after cross-server backup restores.';
