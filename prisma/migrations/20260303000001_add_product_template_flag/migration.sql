-- Migration: add_product_template_flag
-- Ticket: MBM-133
-- Date: 2026-03-03
-- Description: Add isProductTemplate boolean flag to business_products table.
--              When true, this product is a pre-seeded product template definition
--              (e.g. the 1,067 seeded clothing items) that has never been sold or
--              stocked as live inventory. The "Link Existing" tab in QuickStockFromScanModal
--              surfaces ONLY records where isProductTemplate = true, ensuring sold-out
--              live products are not confused with genuine templates.
--              Defaults to false so all existing products are unaffected.

ALTER TABLE "business_products" ADD COLUMN "isProductTemplate" BOOLEAN NOT NULL DEFAULT false;

-- One-time data patch: mark existing pre-seeded clothing product definitions as templates.
-- Criteria: clothing business type, basePrice = 0, no variants with stock > 0,
-- and no order items referencing this product (i.e. never sold).
UPDATE "business_products" bp
SET "isProductTemplate" = true
WHERE bp."businessType" = 'clothing'
  AND bp."basePrice" = 0
  AND NOT EXISTS (
    SELECT 1 FROM "product_variants" pv
    WHERE pv."productId" = bp.id AND pv."stockQuantity" > 0
  )
  AND NOT EXISTS (
    SELECT 1 FROM "business_order_items" boi
    JOIN "product_variants" pv2 ON boi."productVariantId" = pv2.id
    WHERE pv2."productId" = bp.id
  );
