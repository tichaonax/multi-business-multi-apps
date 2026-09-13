-- MBM-296 follow-up: genuine user-supplied reason for a price change,
-- distinct from the existing `changeReason` technical flow label
-- (MANUAL_EDIT / QUICK_EDIT / STOCK_RECEIVING).

ALTER TABLE "product_price_history" ADD COLUMN "reason" VARCHAR(500);
