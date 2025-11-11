-- AlterEnum: Add UPSERT to SyncOperation enum
ALTER TYPE "SyncOperation" ADD VALUE IF NOT EXISTS 'UPSERT';
