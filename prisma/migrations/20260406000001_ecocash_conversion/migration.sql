-- CreateTable: ecocash_conversions
-- Tracks eco-cash to physical cash conversion requests.
-- On completion two CashBucketEntry rows are created atomically:
--   OUTFLOW ECOCASH + INFLOW CASH, both for tenderedAmount.
-- Net effect on total wallet value = zero.

CREATE TABLE "ecocash_conversions" (
    "id"               TEXT NOT NULL,
    "businessId"       TEXT NOT NULL,
    "amount"           DECIMAL(12,2) NOT NULL,
    "tendered_amount"  DECIMAL(12,2),
    "notes"            TEXT,
    "status"           TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy"      TEXT NOT NULL,
    "requestedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy"       TEXT,
    "approvedAt"       TIMESTAMP(3),
    "completedBy"      TEXT,
    "completedAt"      TIMESTAMP(3),
    "rejectedBy"       TEXT,
    "rejectedAt"       TIMESTAMP(3),
    "rejectionReason"  TEXT,
    "outflow_entry_id" TEXT,
    "inflow_entry_id"  TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecocash_conversions_pkey" PRIMARY KEY ("id")
);

-- Unique constraints for linked ledger entry IDs
CREATE UNIQUE INDEX "ecocash_conversions_outflow_entry_id_key" ON "ecocash_conversions"("outflow_entry_id");
CREATE UNIQUE INDEX "ecocash_conversions_inflow_entry_id_key"  ON "ecocash_conversions"("inflow_entry_id");

-- Indexes for common queries
CREATE INDEX "ecocash_conversions_businessId_status_idx"      ON "ecocash_conversions"("businessId", "status");
CREATE INDEX "ecocash_conversions_businessId_requestedAt_idx" ON "ecocash_conversions"("businessId", "requestedAt");

-- Foreign keys
ALTER TABLE "ecocash_conversions" ADD CONSTRAINT "ecocash_conversions_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecocash_conversions" ADD CONSTRAINT "ecocash_conversions_requestedBy_fkey"
    FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecocash_conversions" ADD CONSTRAINT "ecocash_conversions_approvedBy_fkey"
    FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ecocash_conversions" ADD CONSTRAINT "ecocash_conversions_completedBy_fkey"
    FOREIGN KEY ("completedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ecocash_conversions" ADD CONSTRAINT "ecocash_conversions_rejectedBy_fkey"
    FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
