-- Rename table from InitialLoadSessions to FullSyncSessions
ALTER TABLE "initial_load_sessions" RENAME TO "full_sync_sessions";

-- Add new columns for bidirectional sync and backup method tracking
ALTER TABLE "full_sync_sessions"
ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'push',
ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT 'backup',
ADD COLUMN IF NOT EXISTS "phase" TEXT,
ADD COLUMN IF NOT EXISTS "transferSpeed" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "estimatedCompletion" TIMESTAMP(3);

-- Add column comments for documentation
COMMENT ON COLUMN "full_sync_sessions"."direction" IS 'Sync direction: push (local to remote) or pull (remote to local)';
COMMENT ON COLUMN "full_sync_sessions"."method" IS 'Transfer method: backup (pg_dump) or http (record-by-record)';
COMMENT ON COLUMN "full_sync_sessions"."phase" IS 'Current phase: backup, transfer, convert, restore, verify';
COMMENT ON COLUMN "full_sync_sessions"."transferSpeed" IS 'Transfer speed in bytes per second';
COMMENT ON COLUMN "full_sync_sessions"."estimatedCompletion" IS 'Estimated completion timestamp';
