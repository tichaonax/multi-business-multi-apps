-- Per-user "delete for me" on a shared chat message — currently only used
-- for read-only system alerts (e.g. "System Alerts" room digests).
-- Deleting one must only hide it for the user who deleted it, not for every
-- other admin/cashier still in the shared room — unlike
-- chat_messages."deletedAt" (a real shared delete, used for normal
-- sender-owned messages), this adds a row per dismisser instead of
-- mutating the shared message.
CREATE TABLE IF NOT EXISTS chat_message_dismissals (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "messageId"   TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_dismissals_pkey"                 PRIMARY KEY ("id"),
  CONSTRAINT "chat_message_dismissals_messageId_fkey"       FOREIGN KEY ("messageId") REFERENCES chat_messages(id) ON DELETE CASCADE,
  CONSTRAINT "chat_message_dismissals_userId_fkey"          FOREIGN KEY ("userId")    REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT "chat_message_dismissals_messageId_userId_key" UNIQUE ("messageId", "userId")
);

CREATE INDEX IF NOT EXISTS "chat_message_dismissals_messageId_idx" ON chat_message_dismissals("messageId");
CREATE INDEX IF NOT EXISTS "chat_message_dismissals_userId_idx"    ON chat_message_dismissals("userId");
