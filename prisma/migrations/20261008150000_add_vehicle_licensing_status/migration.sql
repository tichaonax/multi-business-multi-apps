-- MBM-305: vehicle licensing status (Non-exempt / Exempt / Retired),
-- replacing the old free-floating vehicles.isExempt checkbox with a single,
-- validated status set only through the new status-transition workflow.

-- 1. New license type for an exempt vehicle's exemption licence — tracked
--    like any other licence type (expiry, renewal, alerts all reused as-is).
ALTER TYPE "LicenseType" ADD VALUE 'EXEMPTION';

-- 2. The three mutually-exclusive statuses.
CREATE TYPE "VehicleLicensingStatus" AS ENUM ('NON_EXEMPT', 'EXEMPT', 'RETIRED');

-- 3. Extensible retirement-reason list (same shared/user-extensible pattern
--    as issuing_authorities).
CREATE TABLE IF NOT EXISTS "vehicle_retirement_reasons" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "isSystem"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_retirement_reasons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_retirement_reasons_name_key" UNIQUE ("name")
);

INSERT INTO "vehicle_retirement_reasons" ("id", "name", "isSystem") VALUES
  (gen_random_uuid()::text, 'Sold', true),
  (gen_random_uuid()::text, 'Off-road', true),
  (gen_random_uuid()::text, 'Other', true)
ON CONFLICT ("name") DO NOTHING;

-- 4. Vehicles: new status fields. Every existing vehicle defaults to
--    NON_EXEMPT regardless of its prior isExempt value — none currently
--    have an exemption-licence record to legitimately be Exempt with.
ALTER TABLE "vehicles"
  ADD COLUMN "licensingStatus"              "VehicleLicensingStatus" NOT NULL DEFAULT 'NON_EXEMPT',
  ADD COLUMN "statusEffectiveAt"            TIMESTAMP(3),
  ADD COLUMN "retirementReason"             TEXT,
  ADD COLUMN "retirementReasonDescription"  TEXT,
  ADD COLUMN "retiredAt"                    TIMESTAMP(3);

-- Superseded by licensingStatus (see model comment in schema.prisma).
ALTER TABLE "vehicles" DROP COLUMN "isExempt";

-- 5. Exemption fee lives on the licence row itself (licenseType =
--    EXEMPTION), as its own field distinct from renewalCost so the two can
--    never be conflated in a report.
ALTER TABLE "vehicle_licenses" ADD COLUMN "exemptionFee" DECIMAL(10,2);

-- 6. One row per status transition — the audit trail backing the
--    retirement/reinstatement reports.
CREATE TABLE IF NOT EXISTS "vehicle_status_history" (
  "id"                           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "vehicleId"                    TEXT NOT NULL,
  "previousStatus"               "VehicleLicensingStatus",
  "newStatus"                    "VehicleLicensingStatus" NOT NULL,
  "effectiveAt"                  TIMESTAMP(3) NOT NULL,
  "changedByUserId"              TEXT NOT NULL,
  "retirementReason"             TEXT,
  "retirementReasonDescription"  TEXT,
  "createdLicenseIds"            TEXT[] NOT NULL DEFAULT '{}',
  "deactivatedLicenseIds"        TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_status_history_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE,
  CONSTRAINT "vehicle_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "vehicle_status_history_vehicleId_idx" ON "vehicle_status_history"("vehicleId");
CREATE INDEX IF NOT EXISTS "vehicle_status_history_newStatus_idx" ON "vehicle_status_history"("newStatus");
