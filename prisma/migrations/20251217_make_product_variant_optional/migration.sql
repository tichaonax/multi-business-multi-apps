-- Make productVariantId optional in business_order_items to support virtual items (WiFi tokens, etc.)
ALTER TABLE business_order_items ALTER COLUMN "productVariantId" DROP NOT NULL;
