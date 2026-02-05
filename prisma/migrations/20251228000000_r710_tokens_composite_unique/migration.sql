-- AlterTable: Change R710 tokens uniqueness from individual fields to composite
-- Drop individual unique indexes on username and password
-- Add composite unique constraint on (username, password)

-- Drop existing unique indexes (Prisma creates unique constraints as indexes)
DROP INDEX IF EXISTS "r710_tokens_username_key";
DROP INDEX IF EXISTS "r710_tokens_password_key";

-- Add composite unique constraint
ALTER TABLE "r710_tokens" ADD CONSTRAINT "r710_tokens_username_password_unique" UNIQUE ("username", "password");
