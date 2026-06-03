-- MBM-230: Vendor Purchase Price Calculator & Livestock/Goods Type Distinction
-- Adds purchaseType to weight_pricing_rules, livestock_purchase_sessions, livestock_vendor_profiles
-- Adds price-calculator audit columns to weight_pricing_rules

-- ── weight_pricing_rules ─────────────────────────────────────────────────────

ALTER TABLE weight_pricing_rules ADD COLUMN "purchaseType" TEXT NOT NULL DEFAULT 'LIVESTOCK';
ALTER TABLE weight_pricing_rules ADD COLUMN "derivedFromUnitPrice" DECIMAL(10,2);
ALTER TABLE weight_pricing_rules ADD COLUMN "derivedFromUnitCount" INTEGER;
ALTER TABLE weight_pricing_rules ADD COLUMN "derivedFromSampleWeightKg" DECIMAL(10,3);

-- Drop the old unique constraint and add the new one that includes purchaseType
ALTER TABLE weight_pricing_rules
  DROP CONSTRAINT IF EXISTS "weight_pricing_rules_businessId_categoryName_ruleType_key";

ALTER TABLE weight_pricing_rules
  ADD CONSTRAINT "weight_pricing_rules_businessId_categoryName_ruleType_purchaseType_key"
  UNIQUE ("businessId", "categoryName", "ruleType", "purchaseType");

-- ── livestock_purchase_sessions ──────────────────────────────────────────────

ALTER TABLE livestock_purchase_sessions ADD COLUMN "purchaseType" TEXT NOT NULL DEFAULT 'LIVESTOCK';

-- ── livestock_vendor_profiles ────────────────────────────────────────────────

ALTER TABLE livestock_vendor_profiles ADD COLUMN "purchaseType" TEXT NOT NULL DEFAULT 'LIVESTOCK';
