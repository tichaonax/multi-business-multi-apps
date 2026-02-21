-- Add wifiReward flag to promo_campaigns (whether this campaign awards WiFi access)
ALTER TABLE "promo_campaigns" ADD COLUMN "wifiReward" BOOLEAN NOT NULL DEFAULT false;

-- Add wifiReward flag to customer_rewards (copied from campaign at issue time)
ALTER TABLE "customer_rewards" ADD COLUMN "wifiReward" BOOLEAN NOT NULL DEFAULT false;

-- Add periodSpend to customer_rewards (actual spend at the time the campaign was run)
ALTER TABLE "customer_rewards" ADD COLUMN "periodSpend" DECIMAL(10, 2);
