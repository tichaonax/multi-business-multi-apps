-- CreateTable: warehouse_batches
CREATE TABLE "public"."warehouse_batches" (
    "id"                   TEXT NOT NULL,
    "batchName"            TEXT NOT NULL,
    "batchNumber"          TEXT,
    "importedBy"           TEXT NOT NULL,
    "importedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"               TEXT NOT NULL DEFAULT 'ACTIVE',
    "rowCount"             INTEGER NOT NULL,
    "totalYuanCost"        DECIMAL(14,2),
    "totalUsdCost"         DECIMAL(14,2),
    "collectionFee"        TEXT,
    "pickedUpFromHarare"   BOOLEAN NOT NULL DEFAULT false,
    "transportCostHarare"  DECIMAL(10,2),
    "fileHash"             TEXT NOT NULL,
    "originalFileName"     TEXT NOT NULL,
    "notes"                TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_batches_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on fileHash for deduplication
CREATE UNIQUE INDEX "warehouse_batches_fileHash_key" ON "public"."warehouse_batches"("fileHash");

-- FK to users
ALTER TABLE "public"."warehouse_batches"
    ADD CONSTRAINT "warehouse_batches_importedBy_fkey"
    FOREIGN KEY ("importedBy") REFERENCES "public"."users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
