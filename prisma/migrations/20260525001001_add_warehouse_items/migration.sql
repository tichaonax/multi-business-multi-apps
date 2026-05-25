-- CreateTable: warehouse_items
CREATE TABLE "public"."warehouse_items" (
    "id"                        TEXT NOT NULL,
    "batchId"                   TEXT NOT NULL,
    "rowNumber"                 INTEGER,
    "orderNumber"               TEXT NOT NULL,
    "trackingNumber"            TEXT,
    "additionalTrackingNumbers" JSONB,
    "productName"               TEXT NOT NULL,
    "shortName"                 TEXT,
    "quantity"                  INTEGER,
    "priceYuan"                 DECIMAL(12,2),
    "costUsd"                   DECIMAL(10,2),
    "exchangeRate"              DECIMAL(8,4),
    "orderDate"                 DATE,
    "stage"                     TEXT,
    "shipment"                  TEXT,
    "location"                  TEXT,
    "courierName"               TEXT,
    "courierStatus"             TEXT,
    "courierTime"               DATE,
    "imageId"                   TEXT,
    "isPersonal"                BOOLEAN NOT NULL DEFAULT false,
    "status"                    TEXT NOT NULL DEFAULT 'IN_WAREHOUSE',
    "businessProductId"         TEXT,
    "personalExpenseId"         TEXT,
    "movedAt"                   TIMESTAMP(3),
    "movedBy"                   TEXT,
    "notes"                     TEXT,
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_items_pkey" PRIMARY KEY ("id")
);

-- Indexes for common queries
CREATE INDEX "warehouse_items_batchId_idx" ON "public"."warehouse_items"("batchId");
CREATE INDEX "warehouse_items_orderNumber_idx" ON "public"."warehouse_items"("orderNumber");
CREATE INDEX "warehouse_items_status_idx" ON "public"."warehouse_items"("status");

-- FK: batch
ALTER TABLE "public"."warehouse_items"
    ADD CONSTRAINT "warehouse_items_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "public"."warehouse_batches"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: image (optional)
ALTER TABLE "public"."warehouse_items"
    ADD CONSTRAINT "warehouse_items_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "public"."images"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: movedBy user (optional)
ALTER TABLE "public"."warehouse_items"
    ADD CONSTRAINT "warehouse_items_movedBy_fkey"
    FOREIGN KEY ("movedBy") REFERENCES "public"."users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
