-- CreateTable: cash_bucket_entries (MBM-142 Physical Cash Bucket)
CREATE TABLE "cash_bucket_entries" (
    "id"            TEXT NOT NULL,
    "businessId"    TEXT NOT NULL,
    "entryType"     TEXT NOT NULL,
    "direction"     TEXT NOT NULL,
    "amount"        DECIMAL(12,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId"   TEXT,
    "notes"         TEXT,
    "entryDate"     TIMESTAMP(3) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy"     TEXT NOT NULL,

    CONSTRAINT "cash_bucket_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_bucket_entries_businessId_entryDate_idx" ON "cash_bucket_entries"("businessId", "entryDate");

-- CreateIndex
CREATE INDEX "cash_bucket_entries_entryDate_idx" ON "cash_bucket_entries"("entryDate");

-- CreateIndex
CREATE INDEX "cash_bucket_entries_direction_idx" ON "cash_bucket_entries"("direction");

-- AddForeignKey
ALTER TABLE "cash_bucket_entries" ADD CONSTRAINT "cash_bucket_entries_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bucket_entries" ADD CONSTRAINT "cash_bucket_entries_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
