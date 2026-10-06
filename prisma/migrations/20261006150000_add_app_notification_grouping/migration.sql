-- Recurring reminders (e.g. daily outstanding-receipt nudges) upsert onto
-- the same row by groupKey instead of creating a new one each time, so
-- repeats collapse into one refreshed, still-unread notification.
ALTER TABLE "app_notifications" ADD COLUMN "groupKey" TEXT;
ALTER TABLE "app_notifications" ADD COLUMN "occurrenceCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "app_notifications" ADD COLUMN "lastOccurredAt" TIMESTAMP(3);

CREATE INDEX "app_notifications_userId_groupKey_idx" ON "app_notifications"("userId", "groupKey");
