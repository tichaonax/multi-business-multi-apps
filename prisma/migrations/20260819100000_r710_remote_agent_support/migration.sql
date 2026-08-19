-- MBM-272: R710 remote-site support via a paired local agent process.

-- CreateEnum
CREATE TYPE "R710ConnectionMode" AS ENUM ('DIRECT', 'AGENT');

-- CreateEnum
CREATE TYPE "R710AgentConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "R710AgentJobType" AS ENUM ('TOKEN_GENERATE', 'HEALTH_CHECK', 'TEST_CONNECTION', 'CONNECTED_CLIENTS_QUERY', 'AUTO_GENERATE', 'TOKEN_SYNC');

-- CreateEnum
CREATE TYPE "R710AgentJobStatus" AS ENUM ('SUCCESS', 'TIMEOUT', 'AGENT_OFFLINE', 'DEVICE_UNREACHABLE', 'ERROR');

-- AlterTable
ALTER TABLE "r710_device_registry" ADD COLUMN "connectionMode" "R710ConnectionMode" NOT NULL DEFAULT 'DIRECT';

-- CreateTable
CREATE TABLE "r710_remote_agents" (
    "id" TEXT NOT NULL,
    "deviceRegistryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "agentTokenHash" TEXT NOT NULL,
    "hostLabel" TEXT,
    "agentVersion" TEXT,
    "connectionStatus" "R710AgentConnectionStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastConnectedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "lastError" TEXT,
    "pairedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "r710_remote_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r710_agent_request_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "deviceRegistryId" TEXT NOT NULL,
    "jobType" "R710AgentJobType" NOT NULL,
    "requestedBy" TEXT,
    "status" "R710AgentJobStatus" NOT NULL,
    "durationMs" INTEGER,
    "resultTokenId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r710_agent_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "r710_remote_agents_deviceRegistryId_key" ON "r710_remote_agents"("deviceRegistryId");

-- CreateIndex
CREATE INDEX "r710_remote_agents_connectionStatus_idx" ON "r710_remote_agents"("connectionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "r710_agent_request_logs_jobId_key" ON "r710_agent_request_logs"("jobId");

-- CreateIndex
CREATE INDEX "r710_agent_request_logs_agentId_idx" ON "r710_agent_request_logs"("agentId");

-- CreateIndex
CREATE INDEX "r710_agent_request_logs_deviceRegistryId_idx" ON "r710_agent_request_logs"("deviceRegistryId");

-- CreateIndex
CREATE INDEX "r710_agent_request_logs_createdAt_idx" ON "r710_agent_request_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "r710_remote_agents" ADD CONSTRAINT "r710_remote_agents_deviceRegistryId_fkey" FOREIGN KEY ("deviceRegistryId") REFERENCES "r710_device_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_remote_agents" ADD CONSTRAINT "r710_remote_agents_pairedBy_fkey" FOREIGN KEY ("pairedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r710_agent_request_logs" ADD CONSTRAINT "r710_agent_request_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "r710_remote_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
