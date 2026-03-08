-- Add optional signature capture to petty cash requests (MBM-136)
ALTER TABLE "petty_cash_requests" ADD COLUMN "signatureData" TEXT;
