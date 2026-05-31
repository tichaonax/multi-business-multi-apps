-- MBM-227: Livestock Vendor Profiles + emoji on WeightPricingRules

-- Add emoji to weight_pricing_rules
ALTER TABLE "weight_pricing_rules" ADD COLUMN "emoji" TEXT NOT NULL DEFAULT '📦';

-- New table: livestock_vendor_profiles
CREATE TABLE "livestock_vendor_profiles" (
  "id"         TEXT         NOT NULL,
  "businessId" TEXT         NOT NULL,
  "vendorId"   TEXT         NOT NULL,
  "name"       TEXT         NOT NULL,
  "emoji"      TEXT         NOT NULL DEFAULT '📦',
  "pricePerKg" DECIMAL(10,2) NOT NULL,
  "sortOrder"  INTEGER      NOT NULL DEFAULT 0,
  "isActive"   BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "livestock_vendor_profiles_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "livestock_vendor_profiles"
  ADD CONSTRAINT "livestock_vendor_profiles_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "livestock_vendor_profiles"
  ADD CONSTRAINT "livestock_vendor_profiles_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "business_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index
CREATE INDEX "livestock_vendor_profiles_businessId_vendorId_idx"
  ON "livestock_vendor_profiles"("businessId", "vendorId");
