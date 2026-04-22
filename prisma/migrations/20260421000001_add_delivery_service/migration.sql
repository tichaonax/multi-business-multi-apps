-- MBM-184: Restaurant Delivery Service
-- Creates tables for delivery customer accounts, credit ledger, order metadata, and driver runs.

CREATE TABLE "delivery_customer_accounts" (
    "id"              TEXT NOT NULL,
    "customerId"      TEXT NOT NULL,
    "businessId"      TEXT NOT NULL,
    "balance"         DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isBlacklisted"   BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "blacklistedAt"   TIMESTAMP(3),
    "blacklistedBy"   TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_customer_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_customer_accounts_customerId_key"
    ON "delivery_customer_accounts"("customerId");

CREATE INDEX "delivery_customer_accounts_businessId_idx"
    ON "delivery_customer_accounts"("businessId");

ALTER TABLE "delivery_customer_accounts"
    ADD CONSTRAINT "delivery_customer_accounts_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "business_customers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_customer_accounts"
    ADD CONSTRAINT "delivery_customer_accounts_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "delivery_account_transactions" (
    "id"        TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "amount"    DECIMAL(10,2) NOT NULL,
    "orderId"   TEXT,
    "notes"     TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_account_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_account_transactions_accountId_idx"
    ON "delivery_account_transactions"("accountId");

CREATE INDEX "delivery_account_transactions_createdAt_idx"
    ON "delivery_account_transactions"("createdAt");

ALTER TABLE "delivery_account_transactions"
    ADD CONSTRAINT "delivery_account_transactions_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "delivery_customer_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "delivery_runs" (
    "id"            TEXT NOT NULL,
    "businessId"    TEXT NOT NULL,
    "driverId"      TEXT NOT NULL,
    "vehicleId"     TEXT,
    "vehiclePlate"  TEXT,
    "odometerStart" DECIMAL(10,1),
    "odometerEnd"   DECIMAL(10,1),
    "runDate"       TIMESTAMP(3) NOT NULL,
    "dispatchedAt"  TIMESTAMP(3),
    "completedAt"   TIMESTAMP(3),
    "notes"         TEXT,
    "createdBy"     TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_runs_businessId_idx"
    ON "delivery_runs"("businessId");

CREATE INDEX "delivery_runs_runDate_idx"
    ON "delivery_runs"("runDate");

ALTER TABLE "delivery_runs"
    ADD CONSTRAINT "delivery_runs_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_runs"
    ADD CONSTRAINT "delivery_runs_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "delivery_order_meta" (
    "id"            TEXT NOT NULL,
    "orderId"       TEXT NOT NULL,
    "deliveryNote"  TEXT,
    "creditUsed"    DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creditBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMode"   TEXT NOT NULL DEFAULT 'ON_DELIVERY',
    "status"        TEXT NOT NULL DEFAULT 'PENDING',
    "runId"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_order_meta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_order_meta_orderId_key"
    ON "delivery_order_meta"("orderId");

CREATE INDEX "delivery_order_meta_status_idx"
    ON "delivery_order_meta"("status");

CREATE INDEX "delivery_order_meta_runId_idx"
    ON "delivery_order_meta"("runId");

ALTER TABLE "delivery_order_meta"
    ADD CONSTRAINT "delivery_order_meta_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "delivery_runs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
