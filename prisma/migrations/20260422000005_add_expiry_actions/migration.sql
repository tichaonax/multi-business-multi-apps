-- CreateTable
CREATE TABLE "expiry_actions" (
    "id"          TEXT NOT NULL,
    "businessId"  TEXT NOT NULL,
    "batchId"     TEXT NOT NULL,
    "actionType"  TEXT NOT NULL,
    "actionDate"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity"    INTEGER NOT NULL,
    "notes"       TEXT,
    "newItemId"   TEXT,
    "newPrice"    DECIMAL(10,2),
    "discountPct" DECIMAL(5,2),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy"   TEXT NOT NULL,

    CONSTRAINT "expiry_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expiry_actions_businessId_idx" ON "expiry_actions"("businessId");

-- CreateIndex
CREATE INDEX "expiry_actions_batchId_idx" ON "expiry_actions"("batchId");
