-- Add isAutoTransfer flag to BusinessTransferLedger
-- Auto-transfers (created by supplier-payment cross-account payments) must:
--   1. Not be editable even by admin
--   2. Always be returned in full (no partial returns allowed)

ALTER TABLE "business_transfer_ledger" ADD COLUMN "isAutoTransfer" BOOLEAN NOT NULL DEFAULT false;
