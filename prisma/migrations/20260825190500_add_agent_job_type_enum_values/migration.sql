-- AlterEnum
-- This migration is dated BEFORE 20260826090000_workstation_agent_request_log,
-- which is the migration that actually creates "WorkstationAgentJobType" — an
-- authoring bug (wrong timestamp prefix relative to when it was really written).
-- `prisma migrate deploy` applies strictly in filename order, so on any database
-- catching up from scratch this ALTER always ran before the type existed
-- (confirmed live in production 2026-08-30/31 — see incident notes). It never
-- surfaced in dev because dev had already applied 20260826090000 hours before
-- this migration was even created there, so dev never hit the bad order.
-- Guarded so it's correct regardless of whether the type already exists yet.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkstationAgentJobType') THEN
    CREATE TYPE "WorkstationAgentJobType" AS ENUM ('SCALE_LIST_PORTS', 'SCALE_CONNECT', 'SCALE_DISCONNECT', 'SCALE_TARE', 'SCALE_DETECT_BAUD', 'PRINT_RECEIPT', 'PRINT_LIST_PRINTERS');
  END IF;
END $$;
ALTER TYPE "WorkstationAgentJobType" ADD VALUE IF NOT EXISTS 'SCALE_RELEASE';
ALTER TYPE "WorkstationAgentJobType" ADD VALUE IF NOT EXISTS 'AGENT_SET_AUTO_START';

-- AlterEnum
ALTER TYPE "R710AgentJobType" ADD VALUE IF NOT EXISTS 'AGENT_SET_AUTO_START';
