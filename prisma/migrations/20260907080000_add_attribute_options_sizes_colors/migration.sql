-- CreateTable
CREATE TABLE "attribute_options" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "businessType" TEXT,
    "attributeKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attribute_options_businessId_attributeKey_value_key" ON "attribute_options"("businessId", "attributeKey", "value");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_options_businessType_attributeKey_value_key" ON "attribute_options"("businessType", "attributeKey", "value");

-- AddForeignKey
ALTER TABLE "attribute_options" ADD CONSTRAINT "attribute_options_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_options" ADD CONSTRAINT "attribute_options_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed shared clothing presets (MBM follow-up: "most common" sizes/colors,
-- with room for each business to add its own custom values later via the
-- app). businessId is left NULL so these act as shared defaults for every
-- clothing business, matching Tags' own global/business-owned split.
INSERT INTO "attribute_options" ("id", "businessType", "attributeKey", "value")
VALUES
  (gen_random_uuid()::text, 'clothing', 'sizes', 'XS'),
  (gen_random_uuid()::text, 'clothing', 'sizes', 'S'),
  (gen_random_uuid()::text, 'clothing', 'sizes', 'M'),
  (gen_random_uuid()::text, 'clothing', 'sizes', 'L'),
  (gen_random_uuid()::text, 'clothing', 'sizes', 'XL'),
  (gen_random_uuid()::text, 'clothing', 'sizes', 'XXL'),
  (gen_random_uuid()::text, 'clothing', 'sizes', '3XL'),
  (gen_random_uuid()::text, 'clothing', 'sizes', 'One Size')
ON CONFLICT ("businessType", "attributeKey", "value") DO NOTHING;

INSERT INTO "attribute_options" ("id", "businessType", "attributeKey", "value")
VALUES
  (gen_random_uuid()::text, 'clothing', 'colors', 'Black'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'White'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Grey'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Navy'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Blue'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Red'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Green'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Yellow'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Orange'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Pink'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Purple'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Brown'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Beige'),
  (gen_random_uuid()::text, 'clothing', 'colors', 'Multicolor')
ON CONFLICT ("businessType", "attributeKey", "value") DO NOTHING;
