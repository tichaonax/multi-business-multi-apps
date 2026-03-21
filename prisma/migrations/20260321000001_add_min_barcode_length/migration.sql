-- Add minBarcodeLength to system_settings
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "minBarcodeLength" INTEGER NOT NULL DEFAULT 5;
