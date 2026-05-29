ALTER TABLE "warehouse_items"
  ADD COLUMN "cbm"           DECIMAL(10, 4),
  ADD COLUMN "weightKg"      DECIMAL(10, 2),
  ADD COLUMN "invoiceName"   TEXT,
  ADD COLUMN "containerDate" DATE,
  ADD COLUMN "manifestQty"   INTEGER,
  ADD COLUMN "variantSpec"   TEXT;
