-- Add eco_cash_amount and cash_tendered columns to ecocash_conversions
-- eco_cash_amount: actual decimal eco-cash sent (e.g. 66.35) — used for OUTFLOW ECOCASH ledger
-- cash_tendered: whole number physical cash given to requester (e.g. 67) — used for INFLOW CASH ledger

ALTER TABLE "ecocash_conversions" ADD COLUMN "eco_cash_amount" DECIMAL(12,2);
ALTER TABLE "ecocash_conversions" ADD COLUMN "cash_tendered" INTEGER;
