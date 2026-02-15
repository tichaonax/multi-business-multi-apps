-- Add UPSERT to SyncOperation enum (safe, won't fail if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'UPSERT'
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'SyncOperation'
        )
    ) THEN
        ALTER TYPE "SyncOperation" ADD VALUE 'UPSERT';
    END IF;
END $$;
