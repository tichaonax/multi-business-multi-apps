-- Fix wifi_tokens.status column type from TEXT to WifiTokenStatus enum
-- The column was originally created as TEXT but the Prisma schema defines it as WifiTokenStatus enum.
-- The WifiTokenStatus enum type already exists in PostgreSQL with all required values.

-- Sanitize any rows with invalid status values before casting
UPDATE "wifi_tokens"
SET "status" = 'ACTIVE'
WHERE "status" NOT IN ('ACTIVE', 'EXPIRED', 'DISABLED', 'UNUSED', 'SOLD');

-- Drop the text default first (required before type change)
ALTER TABLE "wifi_tokens" ALTER COLUMN "status" DROP DEFAULT;

-- Alter the column type to use the enum
ALTER TABLE "wifi_tokens"
  ALTER COLUMN "status" TYPE "WifiTokenStatus"
  USING "status"::"WifiTokenStatus";

-- Restore the default using the enum value
ALTER TABLE "wifi_tokens" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"WifiTokenStatus";
