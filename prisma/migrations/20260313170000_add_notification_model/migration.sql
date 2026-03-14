-- Migration: add_notification_model
-- Adds the app_notifications table for persistent, user-targeted, cross-device notifications.

CREATE TABLE "app_notifications" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "linkUrl"   TEXT,
    "metadata"  JSONB,
    "isRead"    BOOLEAN NOT NULL DEFAULT FALSE,
    "readAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_notifications_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "app_notifications_userId_isRead_idx"  ON "app_notifications" ("userId", "isRead");
CREATE INDEX "app_notifications_userId_createdAt_idx" ON "app_notifications" ("userId", "createdAt");
