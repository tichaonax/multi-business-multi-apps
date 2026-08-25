-- MBM-275 Phase 5: audit trail for workstation-agent (scale/print) jobs,
-- mirroring r710_agent_request_logs. Purely additive — no existing table
-- changes.

-- CreateEnum
CREATE TYPE "WorkstationAgentJobType" AS ENUM ('SCALE_LIST_PORTS', 'SCALE_CONNECT', 'SCALE_DISCONNECT', 'SCALE_TARE', 'SCALE_DETECT_BAUD', 'PRINT_RECEIPT', 'PRINT_LIST_PRINTERS');

-- CreateEnum
CREATE TYPE "WorkstationAgentJobStatus" AS ENUM ('SUCCESS', 'TIMEOUT', 'AGENT_OFFLINE', 'ERROR');

-- CreateTable
CREATE TABLE "workstation_agent_request_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workstationAgentId" TEXT NOT NULL,
    "jobType" "WorkstationAgentJobType" NOT NULL,
    "requestedBy" TEXT,
    "status" "WorkstationAgentJobStatus" NOT NULL,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workstation_agent_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workstation_agent_request_logs_jobId_key" ON "workstation_agent_request_logs"("jobId");

-- CreateIndex
CREATE INDEX "workstation_agent_request_logs_workstationAgentId_idx" ON "workstation_agent_request_logs"("workstationAgentId");

-- CreateIndex
CREATE INDEX "workstation_agent_request_logs_status_idx" ON "workstation_agent_request_logs"("status");

-- CreateIndex
CREATE INDEX "workstation_agent_request_logs_createdAt_idx" ON "workstation_agent_request_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "workstation_agent_request_logs" ADD CONSTRAINT "workstation_agent_request_logs_workstationAgentId_fkey" FOREIGN KEY ("workstationAgentId") REFERENCES "workstation_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
