-- Self-healing migration: Clear locks and add UPSERT to SyncOperation enum

-- Step 1: Clear any stuck migration locks
-- This removes incomplete migrations that are blocking new ones
DELETE FROM _prisma_migrations 
WHERE started_at IS NOT NULL 
AND finished_at IS NULL;

-- Step 2: Remove duplicate/failed UPSERT migrations to prevent conflicts
DELETE FROM _prisma_migrations 
WHERE migration_name LIKE '%add_upsert_to_sync_operation%'
AND finished_at IS NULL;

-- Step 3: Add UPSERT to SyncOperation enum (safe, won't fail if exists)
DO $$ 
BEGIN
    -- Try to add UPSERT value to enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'UPSERT' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'SyncOperation'
        )
    ) THEN
        ALTER TYPE "SyncOperation" ADD VALUE 'UPSERT';
        RAISE NOTICE 'Added UPSERT to SyncOperation enum';
    ELSE
        RAISE NOTICE 'UPSERT already exists in SyncOperation enum';
    END IF;
END $$;

-- Step 4: Verify enum values
DO $$
DECLARE
    enum_values text;
BEGIN
    SELECT string_agg(enumlabel::text, ', ' ORDER BY enumsortorder)
    INTO enum_values
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SyncOperation');
    
    RAISE NOTICE 'SyncOperation enum values: %', enum_values;
END $$;
