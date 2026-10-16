-- MBM-315 — chat history is now loaded ~30 messages at a time by cursor
-- (newest page, page around the first unread, before/after a message), all
-- of which filter on roomId and order by createdAt. Index only, no data change.
CREATE INDEX IF NOT EXISTS "chat_messages_roomId_createdAt_idx" ON "chat_messages"("roomId", "createdAt");
