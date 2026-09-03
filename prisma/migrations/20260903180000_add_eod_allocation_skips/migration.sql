-- Tracks each time an EOD auto-allocation (rent transfer, expense/loan auto-deposit,
-- payroll contribution) was skipped for lack of real available cash, so the resulting
-- backlog is visible and can be manually caught up later once cash becomes available.
CREATE TABLE "eod_allocation_skips" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "allocationType" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "eodDate" DATE NOT NULL,
    "amountSkipped" DECIMAL(12,2) NOT NULL,
    "amountCaughtUp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "caughtUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "eod_allocation_skips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "eod_allocation_skips_businessId_allocationType_configKey_eodDate_key"
    ON "eod_allocation_skips"("businessId", "allocationType", "configKey", "eodDate");

CREATE INDEX "eod_allocation_skips_businessId_allocationType_configKey_idx"
    ON "eod_allocation_skips"("businessId", "allocationType", "configKey");

ALTER TABLE "eod_allocation_skips" ADD CONSTRAINT "eod_allocation_skips_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "eod_allocation_skips" ADD CONSTRAINT "eod_allocation_skips_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
