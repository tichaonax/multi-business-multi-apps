-- CreateEnum
CREATE TYPE "R710TokenStatus" AS ENUM ('AVAILABLE', 'SOLD', 'ACTIVE', 'EXPIRED', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "R710ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "R710SaleChannel" AS ENUM ('DIRECT', 'POS');

-- CreateEnum
CREATE TYPE "R710SyncType" AS ENUM ('TOKEN_SYNC', 'AUTO_GENERATION', 'HEALTH_CHECK');

-- CreateEnum
CREATE TYPE "R710SyncStatus" AS ENUM ('SUCCESS', 'DEVICE_UNREACHABLE', 'ERROR');

-- CreateEnum
CREATE TYPE "MacAclListType" AS ENUM ('BLACKLIST', 'WHITELIST');

-- CreateTable
CREATE TABLE "device_registry" (
    "id" TEXT NOT NULL,
    "macAddress" VARCHAR(17) NOT NULL,
    "hostname" VARCHAR(255),
    "deviceType" VARCHAR(100),
    "manufacturer" VARCHAR(100),
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "firstSeenSystem" VARCHAR(10) NOT NULL,
    "firstSeenBusinessId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenSystem" VARCHAR(10) NOT NULL,
    "lastSeenBusinessId" TEXT,
    "totalConnections" INTEGER NOT NULL DEFAULT 0,
    "esp32Connections" INTEGER NOT NULL DEFAULT 0,
    "r710Connections" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mac_acl_entries" (
    "id" TEXT NOT NULL,
    "macAddress" VARCHAR(17) NOT NULL,
    "deviceId" TEXT,
    "listType" "MacAclListType" NOT NULL,
    "system" VARCHAR(10) NOT NULL,
    "businessId" TEXT,
    "r710WlanId" TEXT,
    "r710AclId" VARCHAR(50),
    "reason" VARCHAR(255),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mac_acl_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_connection_history" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "system" VARCHAR(10) NOT NULL,
    "businessId" TEXT,
    "tokenId" TEXT,
    "wlanSsid" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "signalStrength" INTEGER,
    "radioBand" VARCHAR(10),
    "channel" VARCHAR(10),
    "bandwidthUsedDown" DECIMAL(12,2),
    "bandwidthUsedUp" DECIMAL(12,2),
    "connectedAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_connection_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_device_registry" (
    "id" TEXT NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "adminUsername" VARCHAR(255) NOT NULL,
    "encryptedAdminPassword" TEXT NOT NULL,
    "firmwareVersion" VARCHAR(50),
    "model" VARCHAR(50) NOT NULL DEFAULT 'R710',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthCheck" TIMESTAMP(3),
    "connectionStatus" "R710ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r710_device_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_business_integrations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceRegistryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r710_business_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_wlans" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceRegistryId" TEXT NOT NULL,
    "wlanId" VARCHAR(50) NOT NULL,
    "guestServiceId" VARCHAR(50) NOT NULL,
    "ssid" VARCHAR(255) NOT NULL,
    "logoType" VARCHAR(20) NOT NULL DEFAULT 'none',
    "title" VARCHAR(255) NOT NULL DEFAULT 'Welcome to Guest WiFi !',
    "validDays" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r710_wlans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_token_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "wlanId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" VARCHAR(20) NOT NULL,
    "deviceLimit" INTEGER NOT NULL DEFAULT 1,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "autoGenerateThreshold" INTEGER NOT NULL DEFAULT 5,
    "autoGenerateQuantity" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r710_token_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_tokens" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "wlanId" TEXT NOT NULL,
    "tokenConfigId" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(50) NOT NULL,
    "createdAtR710" TIMESTAMP(3),
    "expiresAtR710" TIMESTAMP(3),
    "validTimeSeconds" INTEGER,
    "firstUsedAt" TIMESTAMP(3),
    "status" "R710TokenStatus" NOT NULL DEFAULT 'AVAILABLE',
    "connectedMac" VARCHAR(17),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r710_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_token_sales" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "saleAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" VARCHAR(50) NOT NULL,
    "saleChannel" "R710SaleChannel" NOT NULL DEFAULT 'DIRECT',
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldBy" TEXT NOT NULL,
    "receiptPrinted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "r710_token_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_business_token_menu_items" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tokenConfigId" TEXT NOT NULL,
    "businessPrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r710_business_token_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_device_tokens" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "macAddress" VARCHAR(17) NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentIp" VARCHAR(15),
    "firstSeen" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "r710_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_sync_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceRegistryId" TEXT NOT NULL,
    "syncType" "R710SyncType" NOT NULL DEFAULT 'TOKEN_SYNC',
    "status" "R710SyncStatus" NOT NULL,
    "tokensChecked" INTEGER NOT NULL DEFAULT 0,
    "tokensUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "syncDurationMs" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r710_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_connected_clients" (
    "id" TEXT NOT NULL,
    "deviceRegistryId" TEXT NOT NULL,
    "wlanId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "macAddress" VARCHAR(17) NOT NULL,
    "ipAddress" VARCHAR(45),
    "hostname" VARCHAR(255),
    "deviceType" VARCHAR(100),
    "tokenUsername" VARCHAR(50),
    "connectedAt" TIMESTAMP(3) NOT NULL,
    "signalStrength" INTEGER,
    "radioBand" VARCHAR(10),
    "channel" VARCHAR(10),
    "rxBytes" BIGINT NOT NULL DEFAULT 0,
    "txBytes" BIGINT NOT NULL DEFAULT 0,
    "rxPackets" INTEGER NOT NULL DEFAULT 0,
    "txPackets" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "r710_connected_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_registry_macAddress_key" ON "device_registry"("macAddress");

-- CreateIndex
CREATE INDEX "device_registry_macAddress_idx" ON "device_registry"("macAddress");

-- CreateIndex
CREATE INDEX "device_registry_firstSeenAt_idx" ON "device_registry"("firstSeenAt");

-- CreateIndex
CREATE INDEX "device_registry_lastSeenAt_idx" ON "device_registry"("lastSeenAt");

-- CreateIndex
CREATE INDEX "device_registry_deviceType_idx" ON "device_registry"("deviceType");

-- CreateIndex
CREATE INDEX "device_registry_firstSeenBusinessId_idx" ON "device_registry"("firstSeenBusinessId");

-- CreateIndex
CREATE INDEX "device_registry_lastSeenBusinessId_idx" ON "device_registry"("lastSeenBusinessId");

-- CreateIndex
CREATE INDEX "device_registry_firstSeenSystem_idx" ON "device_registry"("firstSeenSystem");

-- CreateIndex
CREATE INDEX "device_registry_lastSeenSystem_idx" ON "device_registry"("lastSeenSystem");

-- CreateIndex
CREATE UNIQUE INDEX "mac_acl_entries_macAddress_system_businessId_listType_key" ON "mac_acl_entries"("macAddress", "system", "businessId", "listType");

-- CreateIndex
CREATE INDEX "mac_acl_entries_macAddress_idx" ON "mac_acl_entries"("macAddress");

-- CreateIndex
CREATE INDEX "mac_acl_entries_listType_idx" ON "mac_acl_entries"("listType");

-- CreateIndex
CREATE INDEX "mac_acl_entries_system_idx" ON "mac_acl_entries"("system");

-- CreateIndex
CREATE INDEX "mac_acl_entries_businessId_idx" ON "mac_acl_entries"("businessId");

-- CreateIndex
CREATE INDEX "mac_acl_entries_createdAt_idx" ON "mac_acl_entries"("createdAt");

-- CreateIndex
CREATE INDEX "mac_acl_entries_expiresAt_idx" ON "mac_acl_entries"("expiresAt");

-- CreateIndex
CREATE INDEX "device_connection_history_deviceId_idx" ON "device_connection_history"("deviceId");

-- CreateIndex
CREATE INDEX "device_connection_history_businessId_idx" ON "device_connection_history"("businessId");

-- CreateIndex
CREATE INDEX "device_connection_history_connectedAt_idx" ON "device_connection_history"("connectedAt");

-- CreateIndex
CREATE INDEX "device_connection_history_system_idx" ON "device_connection_history"("system");

-- CreateIndex
CREATE INDEX "device_connection_history_tokenId_idx" ON "device_connection_history"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "r710_device_registry_ipAddress_key" ON "r710_device_registry"("ipAddress");

-- CreateIndex
CREATE INDEX "r710_device_registry_ipAddress_idx" ON "r710_device_registry"("ipAddress");

-- CreateIndex
CREATE INDEX "r710_device_registry_connectionStatus_idx" ON "r710_device_registry"("connectionStatus");

-- CreateIndex
CREATE INDEX "r710_device_registry_isActive_idx" ON "r710_device_registry"("isActive");

-- CreateIndex
CREATE INDEX "r710_device_registry_lastHealthCheck_idx" ON "r710_device_registry"("lastHealthCheck");

-- CreateIndex
CREATE UNIQUE INDEX "r710_business_integrations_businessId_deviceRegistryId_key" ON "r710_business_integrations"("businessId", "deviceRegistryId");

-- CreateIndex
CREATE INDEX "r710_business_integrations_businessId_idx" ON "r710_business_integrations"("businessId");

-- CreateIndex
CREATE INDEX "r710_business_integrations_deviceRegistryId_idx" ON "r710_business_integrations"("deviceRegistryId");

-- CreateIndex
CREATE UNIQUE INDEX "r710_wlans_deviceRegistryId_wlanId_key" ON "r710_wlans"("deviceRegistryId", "wlanId");

-- CreateIndex
CREATE INDEX "r710_wlans_businessId_idx" ON "r710_wlans"("businessId");

-- CreateIndex
CREATE INDEX "r710_wlans_deviceRegistryId_idx" ON "r710_wlans"("deviceRegistryId");

-- CreateIndex
CREATE INDEX "r710_wlans_isActive_idx" ON "r710_wlans"("isActive");

-- CreateIndex
CREATE INDEX "r710_token_configs_businessId_idx" ON "r710_token_configs"("businessId");

-- CreateIndex
CREATE INDEX "r710_token_configs_wlanId_idx" ON "r710_token_configs"("wlanId");

-- CreateIndex
CREATE INDEX "r710_token_configs_isActive_idx" ON "r710_token_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "r710_tokens_username_key" ON "r710_tokens"("username");

-- CreateIndex
CREATE UNIQUE INDEX "r710_tokens_password_key" ON "r710_tokens"("password");

-- CreateIndex
CREATE INDEX "r710_tokens_businessId_idx" ON "r710_tokens"("businessId");

-- CreateIndex
CREATE INDEX "r710_tokens_wlanId_idx" ON "r710_tokens"("wlanId");

-- CreateIndex
CREATE INDEX "r710_tokens_tokenConfigId_idx" ON "r710_tokens"("tokenConfigId");

-- CreateIndex
CREATE INDEX "r710_tokens_status_idx" ON "r710_tokens"("status");

-- CreateIndex
CREATE INDEX "r710_tokens_username_idx" ON "r710_tokens"("username");

-- CreateIndex
CREATE INDEX "r710_tokens_password_idx" ON "r710_tokens"("password");

-- CreateIndex
CREATE INDEX "r710_tokens_connectedMac_idx" ON "r710_tokens"("connectedMac");

-- CreateIndex
CREATE INDEX "r710_token_sales_businessId_idx" ON "r710_token_sales"("businessId");

-- CreateIndex
CREATE INDEX "r710_token_sales_tokenId_idx" ON "r710_token_sales"("tokenId");

-- CreateIndex
CREATE INDEX "r710_token_sales_expenseAccountId_idx" ON "r710_token_sales"("expenseAccountId");

-- CreateIndex
CREATE INDEX "r710_token_sales_soldBy_idx" ON "r710_token_sales"("soldBy");

-- CreateIndex
CREATE INDEX "r710_token_sales_saleChannel_idx" ON "r710_token_sales"("saleChannel");

-- CreateIndex
CREATE INDEX "r710_token_sales_soldAt_idx" ON "r710_token_sales"("soldAt");

-- CreateIndex
CREATE UNIQUE INDEX "r710_business_token_menu_items_businessId_tokenConfigId_key" ON "r710_business_token_menu_items"("businessId", "tokenConfigId");

-- CreateIndex
CREATE INDEX "r710_business_token_menu_items_businessId_idx" ON "r710_business_token_menu_items"("businessId");

-- CreateIndex
CREATE INDEX "r710_business_token_menu_items_tokenConfigId_idx" ON "r710_business_token_menu_items"("tokenConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "r710_device_tokens_tokenId_macAddress_key" ON "r710_device_tokens"("tokenId", "macAddress");

-- CreateIndex
CREATE INDEX "r710_device_tokens_tokenId_idx" ON "r710_device_tokens"("tokenId");

-- CreateIndex
CREATE INDEX "r710_device_tokens_macAddress_idx" ON "r710_device_tokens"("macAddress");

-- CreateIndex
CREATE INDEX "r710_device_tokens_isOnline_idx" ON "r710_device_tokens"("isOnline");

-- CreateIndex
CREATE INDEX "r710_sync_logs_businessId_idx" ON "r710_sync_logs"("businessId");

-- CreateIndex
CREATE INDEX "r710_sync_logs_deviceRegistryId_idx" ON "r710_sync_logs"("deviceRegistryId");

-- CreateIndex
CREATE INDEX "r710_sync_logs_syncedAt_idx" ON "r710_sync_logs"("syncedAt");

-- CreateIndex
CREATE INDEX "r710_sync_logs_status_idx" ON "r710_sync_logs"("status");

-- CreateIndex
CREATE INDEX "r710_sync_logs_syncType_idx" ON "r710_sync_logs"("syncType");

-- CreateIndex
CREATE UNIQUE INDEX "r710_connected_clients_deviceRegistryId_macAddress_key" ON "r710_connected_clients"("deviceRegistryId", "macAddress");

-- CreateIndex
CREATE INDEX "r710_connected_clients_deviceRegistryId_idx" ON "r710_connected_clients"("deviceRegistryId");

-- CreateIndex
CREATE INDEX "r710_connected_clients_wlanId_idx" ON "r710_connected_clients"("wlanId");

-- CreateIndex
CREATE INDEX "r710_connected_clients_businessId_idx" ON "r710_connected_clients"("businessId");

-- CreateIndex
CREATE INDEX "r710_connected_clients_macAddress_idx" ON "r710_connected_clients"("macAddress");

-- CreateIndex
CREATE INDEX "r710_connected_clients_tokenUsername_idx" ON "r710_connected_clients"("tokenUsername");

-- CreateIndex
CREATE INDEX "r710_connected_clients_connectedAt_idx" ON "r710_connected_clients"("connectedAt");

-- AddForeignKey
ALTER TABLE "r710_device_registry" ADD CONSTRAINT "r710_device_registry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_business_integrations" ADD CONSTRAINT "r710_business_integrations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_business_integrations" ADD CONSTRAINT "r710_business_integrations_deviceRegistryId_fkey" FOREIGN KEY ("deviceRegistryId") REFERENCES "r710_device_registry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_wlans" ADD CONSTRAINT "r710_wlans_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_wlans" ADD CONSTRAINT "r710_wlans_deviceRegistryId_fkey" FOREIGN KEY ("deviceRegistryId") REFERENCES "r710_device_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_token_configs" ADD CONSTRAINT "r710_token_configs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_token_configs" ADD CONSTRAINT "r710_token_configs_wlanId_fkey" FOREIGN KEY ("wlanId") REFERENCES "r710_wlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_tokens" ADD CONSTRAINT "r710_tokens_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_tokens" ADD CONSTRAINT "r710_tokens_wlanId_fkey" FOREIGN KEY ("wlanId") REFERENCES "r710_wlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_tokens" ADD CONSTRAINT "r710_tokens_tokenConfigId_fkey" FOREIGN KEY ("tokenConfigId") REFERENCES "r710_token_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_token_sales" ADD CONSTRAINT "r710_token_sales_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_token_sales" ADD CONSTRAINT "r710_token_sales_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "r710_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_token_sales" ADD CONSTRAINT "r710_token_sales_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_token_sales" ADD CONSTRAINT "r710_token_sales_soldBy_fkey" FOREIGN KEY ("soldBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_business_token_menu_items" ADD CONSTRAINT "r710_business_token_menu_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_business_token_menu_items" ADD CONSTRAINT "r710_business_token_menu_items_tokenConfigId_fkey" FOREIGN KEY ("tokenConfigId") REFERENCES "r710_token_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_device_tokens" ADD CONSTRAINT "r710_device_tokens_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "r710_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_sync_logs" ADD CONSTRAINT "r710_sync_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_sync_logs" ADD CONSTRAINT "r710_sync_logs_deviceRegistryId_fkey" FOREIGN KEY ("deviceRegistryId") REFERENCES "r710_device_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_connected_clients" ADD CONSTRAINT "r710_connected_clients_deviceRegistryId_fkey" FOREIGN KEY ("deviceRegistryId") REFERENCES "r710_device_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_connected_clients" ADD CONSTRAINT "r710_connected_clients_wlanId_fkey" FOREIGN KEY ("wlanId") REFERENCES "r710_wlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_connected_clients" ADD CONSTRAINT "r710_connected_clients_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_registry" ADD CONSTRAINT "device_registry_firstSeenBusinessId_fkey" FOREIGN KEY ("firstSeenBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_registry" ADD CONSTRAINT "device_registry_lastSeenBusinessId_fkey" FOREIGN KEY ("lastSeenBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mac_acl_entries" ADD CONSTRAINT "mac_acl_entries_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "device_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mac_acl_entries" ADD CONSTRAINT "mac_acl_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mac_acl_entries" ADD CONSTRAINT "mac_acl_entries_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mac_acl_entries" ADD CONSTRAINT "mac_acl_entries_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mac_acl_entries" ADD CONSTRAINT "mac_acl_entries_r710WlanId_fkey" FOREIGN KEY ("r710WlanId") REFERENCES "r710_wlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_connection_history" ADD CONSTRAINT "device_connection_history_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "device_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_connection_history" ADD CONSTRAINT "device_connection_history_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
