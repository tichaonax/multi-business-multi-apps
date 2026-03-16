-- Add priority flag to petty_cash_requests
-- Values: NORMAL (default) | URGENT (requester-flagged)
ALTER TABLE "petty_cash_requests" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL';
