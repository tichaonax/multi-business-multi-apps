-- MBM-229: Add weightPricingRuleId FK to business_products
-- Links a product to a sale pricing preset for dynamic price resolution at POS

ALTER TABLE "business_products"
  ADD COLUMN "weightPricingRuleId" TEXT;

ALTER TABLE "business_products"
  ADD CONSTRAINT "business_products_weightPricingRuleId_fkey"
  FOREIGN KEY ("weightPricingRuleId")
  REFERENCES "weight_pricing_rules"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
