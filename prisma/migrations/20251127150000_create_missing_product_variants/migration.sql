-- Create Missing Product Variants
-- This migration ensures all products have at least one variant for stock tracking
--
-- IDEMPOTENT: Only creates variants for products without any
-- AUTOMATIC: Runs as part of prisma migrate deploy

-- Create default variants for all products that don't have any
INSERT INTO product_variants (id, "productId", name, sku, "stockQuantity", "reorderLevel", price, "isActive", "updatedAt")
SELECT
  gen_random_uuid(),
  bp.id,
  'Default',
  COALESCE(bp.sku, 'SKU-' || substring(bp.id::text, 1, 8)),
  0,
  5,
  COALESCE(bp."basePrice", 0.00),
  true,
  NOW()
FROM business_products bp
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants pv WHERE pv."productId" = bp.id
);

-- Log results
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO created_count
  FROM product_variants
  WHERE "createdAt" >= NOW() - INTERVAL '1 second';

  IF created_count > 0 THEN
    RAISE NOTICE 'Created % default variants for products without variants', created_count;
  ELSE
    RAISE NOTICE 'All products already have variants';
  END IF;
END $$;
