-- Replace wifiReward boolean with specific config references
ALTER TABLE "promo_campaigns" DROP COLUMN "wifiReward";
ALTER TABLE "customer_rewards" DROP COLUMN "wifiReward";

-- Add product reward (free menu item)
ALTER TABLE "promo_campaigns" ADD COLUMN "rewardProductId" TEXT;
ALTER TABLE "customer_rewards" ADD COLUMN "rewardProductId" TEXT;

-- Add WiFi token config reward (specific package)
ALTER TABLE "promo_campaigns" ADD COLUMN "wifiTokenConfigId" TEXT;
ALTER TABLE "customer_rewards" ADD COLUMN "wifiTokenConfigId" TEXT;
