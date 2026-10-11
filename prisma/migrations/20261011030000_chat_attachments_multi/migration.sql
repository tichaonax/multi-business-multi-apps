-- MBM-307 follow-up: a message can now carry more than one attachment
-- (drag-and-drop / multi-select upload), so messageId is no longer unique —
-- drop the one-to-one constraint, keep a plain index for the FK lookup.

DROP INDEX "chat_attachments_messageId_key";

CREATE INDEX "chat_attachments_messageId_idx" ON "chat_attachments"("messageId");
