-- AlterTable
ALTER TABLE "r710_wlans" ADD COLUMN "enableFriendlyKey" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "r710_token_configs" ALTER COLUMN "deviceLimit" SET DEFAULT 1;