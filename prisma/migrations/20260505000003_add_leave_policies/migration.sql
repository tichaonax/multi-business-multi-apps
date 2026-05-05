-- Add leave_policies table
-- Stores configurable leave accrual settings at umbrella business level
-- with optional per-business overrides.
--
-- IDEMPOTENT: Uses IF NOT EXISTS

CREATE TABLE IF NOT EXISTS "leave_policies" (
    "id"                    TEXT NOT NULL,
    "umbrellaBusinessId"    TEXT NOT NULL,
    "businessId"            TEXT,
    "annualAccrualPerMonth" DECIMAL(5,2) NOT NULL,
    "maxAnnualDays"         INTEGER NOT NULL,
    "sickDaysPerYear"       INTEGER NOT NULL,
    "carryoverEnabled"      BOOLEAN NOT NULL DEFAULT false,
    "maxCarryoverDays"      INTEGER,
    "isActive"              BOOLEAN NOT NULL DEFAULT true,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_policies_umbrellaBusinessId_businessId_key"
    ON "leave_policies"("umbrellaBusinessId", "businessId");

ALTER TABLE "leave_policies"
    DROP CONSTRAINT IF EXISTS "leave_policies_umbrellaBusinessId_fkey";
ALTER TABLE "leave_policies"
    ADD CONSTRAINT "leave_policies_umbrellaBusinessId_fkey"
    FOREIGN KEY ("umbrellaBusinessId") REFERENCES "businesses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_policies"
    DROP CONSTRAINT IF EXISTS "leave_policies_businessId_fkey";
ALTER TABLE "leave_policies"
    ADD CONSTRAINT "leave_policies_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
