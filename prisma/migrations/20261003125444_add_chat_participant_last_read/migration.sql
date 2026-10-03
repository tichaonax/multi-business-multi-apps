-- MBM-301 — per-conversation unread tracking: when a participant last read
-- a chat room, so the conversation list can badge messages newer than this
-- (excluding their own) without a separate read-receipts table.

ALTER TABLE "chat_participants"
  ADD COLUMN IF NOT EXISTS "lastReadAt" TIMESTAMP(3);
