-- MBM-315 — Team Chat (General) "last seen" position, server-side so it
-- follows the user across browsers/devices (previously localStorage only).
-- Nullable, no backfill: each browser hands over its old local marker on
-- first load after this ships.
ALTER TABLE "users" ADD COLUMN "teamChatLastReadAt" TIMESTAMP(3);
