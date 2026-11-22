-- MBM-339: personal switches for Farm Control camera alerts (movement / sound)
ALTER TABLE "farm_camera_user_preferences" ADD COLUMN IF NOT EXISTS "motionAlertsBell" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "farm_camera_user_preferences" ADD COLUMN IF NOT EXISTS "motionAlertsSound" BOOLEAN NOT NULL DEFAULT true;
