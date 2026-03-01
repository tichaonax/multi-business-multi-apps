-- Migration: add_inventory_tracked_flag
-- Ticket: MBM-132
-- Date: 2026-03-01
-- Description: Add isInventoryTracked boolean flag to business_products table.
--              When true, the product's stock is tracked via ProductVariants.stockQuantity
--              and a live badge is shown on the POS menu card.
--              Defaults to false so all existing products are unaffected.

ALTER TABLE "business_products" ADD COLUMN "isInventoryTracked" BOOLEAN NOT NULL DEFAULT false;
