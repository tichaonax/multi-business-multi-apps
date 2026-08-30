-- MBM-275 Phase 5: audit trail for workstation-agent (scale/print) jobs,
-- mirroring r710_agent_request_logs. Purely additive — no existing table
-- changes.

-- CreateEnum
-- Guarded: 20260825190500_add_agent_job_type_enum_values now creates this type
-- itself when missing (see that migration's comment) — on a database where
-- that ran first, the type already exists by the time this runs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkstationAgentJobType') THEN
    CREATE TYPE "WorkstationAgentJobType" AS ENUM ('SCALE_LIST_PORTS', 'SCALE_CONNECT', 'SCALE_DISCONNECT', 'SCALE_TARE', 'SCALE_DETECT_BAUD', 'PRINT_RECEIPT', 'PRINT_LIST_PRINTERS');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkstationAgentJobStatus') THEN
    CREATE TYPE "WorkstationAgentJobStatus" AS ENUM ('SUCCESS', 'TIMEOUT', 'AGENT_OFFLINE', 'ERROR');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "workstation_agent_request_logs" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "workstation_agent_request_logs_jobId_key" ON "workstation_agent_request_logs"("jobId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workstation_agent_request_logs_workstationAgentId_idx" ON "workstation_agent_request_logs"("workstationAgentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workstation_agent_request_logs_status_idx" ON "workstation_agent_request_logs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workstation_agent_request_logs_createdAt_idx" ON "workstation_agent_request_logs"("createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workstation_agent_request_logs_workstationAgentId_fkey') THEN
    ALTER TABLE "workstation_agent_request_logs" ADD CONSTRAINT "workstation_agent_request_logs_workstationAgentId_fkey" FOREIGN KEY ("workstationAgentId") REFERENCES "workstation_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
