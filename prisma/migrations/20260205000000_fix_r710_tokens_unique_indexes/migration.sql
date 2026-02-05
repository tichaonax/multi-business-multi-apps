-- Fix: Drop individual unique indexes on r710_tokens that were not removed by previous migration
-- The previous migration (20251228000000) used DROP CONSTRAINT which doesn't work for indexes
-- Prisma creates unique constraints as indexes, so we need DROP INDEX

-- Drop the individual unique indexes if they still exist
DROP INDEX IF EXISTS "r710_tokens_username_key";
DROP INDEX IF EXISTS "r710_tokens_password_key";

-- The composite unique constraint (r710_tokens_username_password_unique) should already exist
-- from the previous migration, but add it if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'r710_tokens_username_password_unique'
    ) THEN
        ALTER TABLE "r710_tokens" ADD CONSTRAINT "r710_tokens_username_password_unique" UNIQUE ("username", "password");
    END IF;
END $$;
