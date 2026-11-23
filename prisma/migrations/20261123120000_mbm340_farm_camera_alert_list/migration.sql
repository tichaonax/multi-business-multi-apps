-- MBM-340: each person's camera alerts (movement / sound) and paused cameras.
-- Transient (not backed up): alerts are cleaned after 30 days, except watch later.

CREATE TABLE IF NOT EXISTS "farm_camera_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "cameraName" TEXT NOT NULL,
    "siteId" TEXT,
    "siteName" TEXT,
    "trigger" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "times" INTEGER NOT NULL DEFAULT 1,
    "lastAt" TIMESTAMP(3) NOT NULL,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "picture" BYTEA,
    "pictureFromEvent" BOOLEAN NOT NULL DEFAULT false,
    "seenAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "laterAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "farm_camera_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "farm_camera_alerts_userId_dismissedAt_start_idx" ON "farm_camera_alerts"("userId", "dismissedAt", "start");
CREATE INDEX IF NOT EXISTS "farm_camera_alerts_userId_cameraId_start_idx" ON "farm_camera_alerts"("userId", "cameraId", "start");
ALTER TABLE "farm_camera_alerts" ADD CONSTRAINT "farm_camera_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "farm_camera_alert_pauses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "farm_camera_alert_pauses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "farm_camera_alert_pauses_userId_cameraId_key" ON "farm_camera_alert_pauses"("userId", "cameraId");
ALTER TABLE "farm_camera_alert_pauses" ADD CONSTRAINT "farm_camera_alert_pauses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MBM-339's per-camera bell rows give way to one count row per person (C1)
DELETE FROM "app_notifications" WHERE "type" = 'FARM_CAMERA_MOTION';
