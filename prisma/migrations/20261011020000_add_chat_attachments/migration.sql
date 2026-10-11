-- MBM-307: chat message attachments (PDF/JPEG/PNG), stored as bytea so they
-- flow through the existing backup/restore/validation pipeline like the
-- `images` table does, not left orphaned on the filesystem.

CREATE TABLE "chat_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_attachments_messageId_key" ON "chat_attachments"("messageId");

CREATE INDEX "chat_attachments_uploadedBy_idx" ON "chat_attachments"("uploadedBy");

ALTER TABLE "chat_attachments"
  ADD CONSTRAINT "chat_attachments_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_attachments"
  ADD CONSTRAINT "chat_attachments_uploadedBy_fkey"
  FOREIGN KEY ("uploadedBy") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
