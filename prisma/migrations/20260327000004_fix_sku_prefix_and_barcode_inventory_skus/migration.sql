-- =============================================================================
-- Migration: Fix SKU prefix and assign unique SKUs to barcode_inventory_items
-- =============================================================================
-- Problem: All businesses have sku_prefix = NULL, causing the SKU generator
-- to fall back to prefix 'SKU', producing 'SKU-00001' for every item.
-- Additionally, 110 barcode_inventory_items records have sku = NULL, which
-- causes the edit form to auto-fill 'SKU-00001' for all of them.
-- =============================================================================

-- Step 1: Set sku_prefix for all businesses that don't have one yet.
-- Derives a 3-letter prefix from the business type.
UPDATE businesses
SET sku_prefix = CASE type
  WHEN 'grocery'      THEN 'GRC'
  WHEN 'clothing'     THEN 'CLO'
  WHEN 'restaurant'   THEN 'RES'
  WHEN 'hardware'     THEN 'HRD'
  WHEN 'construction' THEN 'CON'
  WHEN 'vehicles'     THEN 'VEH'
  WHEN 'consulting'   THEN 'CST'
  WHEN 'retail'       THEN 'RTL'
  WHEN 'services'     THEN 'SVC'
  ELSE                     'BUS'
END
WHERE sku_prefix IS NULL OR sku_prefix = '';

-- Step 2: Assign unique SKUs to barcode_inventory_items records with NULL SKU.
-- Format: {TYPE_PREFIX}-INV-{NNNNN} (e.g. CLO-INV-00001, GRC-INV-00001)
-- ROW_NUMBER() partitioned by businessId guarantees uniqueness per business.
WITH ranked AS (
  SELECT
    bi.id,
    UPPER(LEFT(b.type, 3)) AS prefix,
    ROW_NUMBER() OVER (
      PARTITION BY bi."businessId"
      ORDER BY bi."createdAt", bi.id
    ) AS rn
  FROM barcode_inventory_items bi
  JOIN businesses b ON bi."businessId" = b.id
  WHERE bi.sku IS NULL OR bi.sku = ''
)
UPDATE barcode_inventory_items
SET sku = r.prefix || '-INV-' || LPAD(r.rn::TEXT, 5, '0')
FROM ranked r
WHERE barcode_inventory_items.id = r.id;

-- Step 3: Fix duplicate SKUs within the same business in barcode_inventory_items.
-- Keeps the oldest record's SKU; re-assigns newer duplicates to unique values.
-- Uses the highest existing -INV- sequence per business as a base to avoid conflicts.
WITH dupes AS (
  SELECT
    id,
    "businessId",
    sku,
    ROW_NUMBER() OVER (PARTITION BY "businessId", sku ORDER BY "createdAt", id) AS rn
  FROM barcode_inventory_items
  WHERE sku IS NOT NULL AND sku != ''
),
dupes_to_fix AS (
  SELECT d.id, d."businessId"
  FROM dupes d
  WHERE d.rn > 1   -- keep the first; re-assign all others
),
max_inv_seq AS (
  -- find the highest INV sequence already assigned per business
  SELECT
    "businessId",
    MAX(
      CAST(REGEXP_REPLACE(sku, '^[A-Z]+-INV-', '') AS INTEGER)
    ) AS max_seq
  FROM barcode_inventory_items
  WHERE sku ~ '^[A-Z]+-INV-[0-9]+$'
  GROUP BY "businessId"
),
ranked_dupes AS (
  SELECT
    dtf.id,
    UPPER(LEFT(b.type, 3)) AS prefix,
    COALESCE(ms.max_seq, 0) +
      ROW_NUMBER() OVER (PARTITION BY dtf."businessId" ORDER BY bi."createdAt", dtf.id) AS new_seq
  FROM dupes_to_fix dtf
  JOIN barcode_inventory_items bi ON dtf.id = bi.id
  JOIN businesses b ON dtf."businessId" = b.id
  LEFT JOIN max_inv_seq ms ON ms."businessId" = dtf."businessId"
)
UPDATE barcode_inventory_items bi
SET sku = rd.prefix || '-INV-' || LPAD(rd.new_seq::TEXT, 5, '0')
FROM ranked_dupes rd
WHERE bi.id = rd.id;
