-- MBM-332: Farm Control alerts in MBM notifications and chat

ALTER TABLE "farm_control_integrations" ADD COLUMN "alertsLastRunAt" TIMESTAMP(3);
ALTER TABLE "farm_control_integrations" ADD COLUMN "alertsLastError" TEXT;
ALTER TABLE "farm_control_integrations" ADD COLUMN "alertsUsers" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "farm_control_user_links" ADD COLUMN "alertsCursor" TIMESTAMP(3);
ALTER TABLE "farm_control_user_links" ADD COLUMN "alertsCheckedAt" TIMESTAMP(3);
ALTER TABLE "farm_control_user_links" ADD COLUMN "alertsError" TEXT;

ALTER TABLE "farm_camera_user_preferences" ADD COLUMN "alertsBell" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "farm_camera_user_preferences" ADD COLUMN "alertsChat" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "farm_control_alert_deliveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "parentAlertId" TEXT,
    "kind" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "siteName" TEXT,
    "subjectKind" TEXT,
    "subjectId" TEXT,
    "openedAt" TIMESTAMP(3),
    "changedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "times" INTEGER NOT NULL DEFAULT 1,
    "chatMessageId" TEXT,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_control_alert_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "farm_control_alert_deliveries_userId_alertId_key" ON "farm_control_alert_deliveries"("userId", "alertId");
CREATE INDEX "farm_control_alert_deliveries_alertId_idx" ON "farm_control_alert_deliveries"("alertId");

ALTER TABLE "farm_control_alert_deliveries" ADD CONSTRAINT "farm_control_alert_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One "Farm Camera Alerts" room only (same guard as System Alerts)
CREATE UNIQUE INDEX IF NOT EXISTS "chat_rooms_farm_camera_alerts_singleton"
  ON "chat_rooms" (name)
  WHERE name = 'Farm Camera Alerts' AND type = 'system';
