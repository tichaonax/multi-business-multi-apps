-- Add missing sync models
-- dataSnapshot model
CREATE TABLE IF NOT EXISTS "dataSnapshot" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecords" INTEGER NOT NULL,
    "totalSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "tableMetadata" JSONB NOT NULL,

    CONSTRAINT "dataSnapshot_pkey" PRIMARY KEY ("id")
);

-- initialLoadSession model
CREATE TABLE IF NOT EXISTS "initialLoadSession" (
    "id" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "transferredRecords" INTEGER NOT NULL DEFAULT 0,
    "transferredBytes" BIGINT NOT NULL DEFAULT 0,
    "estimatedTimeRemaining" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "initialLoadSession_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_initialLoadSession_sourceNodeId" ON "initialLoadSession"("sourceNodeId");
CREATE INDEX IF NOT EXISTS "idx_initialLoadSession_targetNodeId" ON "initialLoadSession"("targetNodeId");
CREATE INDEX IF NOT EXISTS "idx_dataSnapshot_nodeId" ON "dataSnapshot"("nodeId");