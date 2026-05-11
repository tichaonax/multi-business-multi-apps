-- Migration: chat_targeted_replies
-- Adds recipient targeting and threaded replies to chat_messages

-- 1. Add threading & reply-scope columns to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS "parentId"   TEXT,
  ADD COLUMN IF NOT EXISTS "replyScope" TEXT;

-- 2. Self-referential FK for threading
ALTER TABLE chat_messages
  ADD CONSTRAINT "chat_messages_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES chat_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "chat_messages_parentId_idx" ON chat_messages("parentId");

-- 3. New recipients table (no rows = broadcast to everyone)
CREATE TABLE IF NOT EXISTS chat_message_recipients (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "messageId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  CONSTRAINT "chat_message_recipients_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "chat_message_recipients_messageId_fkey"   FOREIGN KEY ("messageId") REFERENCES chat_messages(id) ON DELETE CASCADE,
  CONSTRAINT "chat_message_recipients_userId_fkey"      FOREIGN KEY ("userId")    REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT "chat_message_recipients_messageId_userId_key" UNIQUE ("messageId", "userId")
);

CREATE INDEX IF NOT EXISTS "chat_message_recipients_messageId_idx" ON chat_message_recipients("messageId");
CREATE INDEX IF NOT EXISTS "chat_message_recipients_userId_idx"    ON chat_message_recipients("userId");
