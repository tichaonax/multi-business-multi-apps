-- MBM-304: optional action link on a chat message, for system broadcasts
-- (e.g. license compliance alerts) that should deep-link somewhere.
ALTER TABLE "chat_messages" ADD COLUMN "linkUrl" TEXT;
