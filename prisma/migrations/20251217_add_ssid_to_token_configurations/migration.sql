-- Add SSID field to TokenConfigurations to store WiFi Access Point name
-- This allows tokens to display the correct WiFi network name on receipts

ALTER TABLE "token_configurations" ADD COLUMN "ssid" VARCHAR(255);
