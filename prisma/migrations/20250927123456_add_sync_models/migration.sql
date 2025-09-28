-- CreateTable
CREATE TABLE "dataSnapshot" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecords" INTEGER NOT NULL,
    "totalSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "tableMetadata" JSONB NOT NULL,

    CONSTRAINT "dataSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initialLoadSession" (
    "id" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "transferredRecords" INTEGER NOT NULL DEFAULT 0,
    "transferredBytes" INTEGER NOT NULL DEFAULT 0,
    "estimatedTimeRemaining" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "initialLoadSession_pkey" PRIMARY KEY ("id")
);

-- Add any missing network partition or offline queue tables if they don't exist
CREATE TABLE IF NOT EXISTS "OfflineQueue" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "OfflineQueue_pkey" PRIMARY KEY ("id")
);