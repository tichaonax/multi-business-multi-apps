-- Proposed Migration: R710 Device Registry Redesign
-- This redesigns the R710 integration to use a centralized device registry

-- ============================================================================
-- STEP 1: Create Global Device Registry Table
-- ============================================================================

CREATE TABLE "r710_device_registry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ipAddress" VARCHAR(45) NOT NULL UNIQUE,
  "adminUsername" VARCHAR(255) NOT NULL,
  "encryptedAdminPassword" TEXT NOT NULL,
  "firmwareVersion" VARCHAR(50),
  "model" VARCHAR(50) DEFAULT 'R710',
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastHealthCheck" TIMESTAMP,
  "connectionStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_r710_device_registry_ipAddress" ON "r710_device_registry"("ipAddress");
CREATE INDEX "idx_r710_device_registry_connectionStatus" ON "r710_device_registry"("connectionStatus");
CREATE INDEX "idx_r710_device_registry_isActive" ON "r710_device_registry"("isActive");

-- ============================================================================
-- STEP 2: Create Business Integration Link Table
-- ============================================================================

CREATE TABLE "r710_business_integrations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "deviceRegistryId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE,
  FOREIGN KEY ("deviceRegistryId") REFERENCES "r710_device_registry"("id") ON DELETE RESTRICT,

  UNIQUE("businessId", "deviceRegistryId")
);

CREATE INDEX "idx_r710_business_integrations_businessId" ON "r710_business_integrations"("businessId");
CREATE INDEX "idx_r710_business_integrations_deviceRegistryId" ON "r710_business_integrations"("deviceRegistryId");

-- ============================================================================
-- STEP 3: Modify R710Wlans to reference device registry instead
-- ============================================================================

-- Add new column
ALTER TABLE "r710_wlans" ADD COLUMN "deviceRegistryId" TEXT;

-- Migrate existing data (if any exists)
-- This would need custom migration logic to:
-- 1. Create device registry entries from existing r710_devices
-- 2. Link r710_wlans to new device registry
-- For now, this is a schema proposal

-- Drop old foreign key and add new one
ALTER TABLE "r710_wlans" DROP CONSTRAINT IF EXISTS "r710_wlans_deviceId_fkey";
ALTER TABLE "r710_wlans" ADD CONSTRAINT "r710_wlans_deviceRegistryId_fkey"
  FOREIGN KEY ("deviceRegistryId") REFERENCES "r710_device_registry"("id") ON DELETE CASCADE;

-- Update unique constraint
ALTER TABLE "r710_wlans" DROP CONSTRAINT IF EXISTS "r710_wlans_deviceId_wlanId_key";
ALTER TABLE "r710_wlans" ADD CONSTRAINT "r710_wlans_deviceRegistryId_wlanId_key"
  UNIQUE("deviceRegistryId", "wlanId");

-- ============================================================================
-- STEP 4: Drop old r710_devices table (after migration)
-- ============================================================================

-- DROP TABLE "r710_devices"; -- This would be done after data migration

-- ============================================================================
-- BENEFITS OF THIS DESIGN:
-- ============================================================================
-- 1. No duplicate credentials across businesses
-- 2. Admin manages devices globally (IP + credentials once)
-- 3. Businesses select from registered devices
-- 4. Credential updates affect all businesses using that device
-- 5. Easy to see which businesses use which devices
-- 6. Simpler session management (one session per IP, period)
