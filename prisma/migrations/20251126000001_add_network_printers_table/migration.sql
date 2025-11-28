-- CreateTable: Network Printers and Print Jobs System
-- This migration adds the network printers and print jobs management system
-- Idempotent: Works for both fresh installs and upgrades

-- Create network_printers table
CREATE TABLE IF NOT EXISTS "network_printers" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "printerName" TEXT NOT NULL,
    "printerType" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "port" INTEGER,
    "capabilities" JSONB,
    "isShareable" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_printers_pkey" PRIMARY KEY ("id")
);

-- Create print_jobs table
CREATE TABLE IF NOT EXISTS "print_jobs" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "jobData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "network_printers_printerId_key" ON "network_printers"("printerId");

-- Create indexes for network_printers
CREATE INDEX IF NOT EXISTS "network_printers_nodeId_idx" ON "network_printers"("nodeId");
CREATE INDEX IF NOT EXISTS "network_printers_printerType_idx" ON "network_printers"("printerType");

-- Create indexes for print_jobs
CREATE INDEX IF NOT EXISTS "print_jobs_printerId_idx" ON "print_jobs"("printerId");
CREATE INDEX IF NOT EXISTS "print_jobs_businessId_idx" ON "print_jobs"("businessId");
CREATE INDEX IF NOT EXISTS "print_jobs_userId_idx" ON "print_jobs"("userId");
CREATE INDEX IF NOT EXISTS "print_jobs_status_idx" ON "print_jobs"("status");
CREATE INDEX IF NOT EXISTS "print_jobs_createdAt_idx" ON "print_jobs"("createdAt");

-- Add foreign key constraints (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_printers_nodeId_fkey') THEN
        ALTER TABLE "network_printers" ADD CONSTRAINT "network_printers_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "sync_nodes"("nodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'print_jobs_printerId_fkey') THEN
        ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "network_printers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'print_jobs_businessId_fkey') THEN
        ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'print_jobs_userId_fkey') THEN
        ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;