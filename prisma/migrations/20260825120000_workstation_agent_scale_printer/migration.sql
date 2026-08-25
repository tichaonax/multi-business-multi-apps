-- MBM-275 Phase 1: workstation-local device agent (generalized from the
-- R710 agent pattern) to relay scale and printer access. Additive only —
-- no existing table's behavior changes; network_printers.connectionMode
-- defaults every existing row to 'DIRECT' (today's exact code path).

-- CreateEnum
CREATE TYPE "WorkstationAgentConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateTable
CREATE TABLE "workstation_agents" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "agentTokenHash" TEXT NOT NULL,
    "agentVersion" TEXT,
    "connectionStatus" "WorkstationAgentConnectionStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastConnectedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "lastError" TEXT,
    "pairedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "workstation_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_device_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "workstationAgentId" TEXT NOT NULL,
    "comPort" TEXT,
    "baudRate" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scale_device_configs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "network_printers" ADD COLUMN "connectionMode" TEXT NOT NULL DEFAULT 'DIRECT',
ADD COLUMN "workstationAgentId" TEXT;

-- CreateIndex
CREATE INDEX "workstation_agents_businessId_idx" ON "workstation_agents"("businessId");

-- CreateIndex
CREATE INDEX "workstation_agents_connectionStatus_idx" ON "workstation_agents"("connectionStatus");

-- CreateIndex
CREATE INDEX "scale_device_configs_businessId_idx" ON "scale_device_configs"("businessId");

-- CreateIndex
CREATE INDEX "scale_device_configs_workstationAgentId_idx" ON "scale_device_configs"("workstationAgentId");

-- CreateIndex
CREATE INDEX "network_printers_workstationAgentId_idx" ON "network_printers"("workstationAgentId");

-- AddForeignKey
ALTER TABLE "workstation_agents" ADD CONSTRAINT "workstation_agents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workstation_agents" ADD CONSTRAINT "workstation_agents_pairedBy_fkey" FOREIGN KEY ("pairedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_device_configs" ADD CONSTRAINT "scale_device_configs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_device_configs" ADD CONSTRAINT "scale_device_configs_workstationAgentId_fkey" FOREIGN KEY ("workstationAgentId") REFERENCES "workstation_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_printers" ADD CONSTRAINT "network_printers_workstationAgentId_fkey" FOREIGN KEY ("workstationAgentId") REFERENCES "workstation_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
