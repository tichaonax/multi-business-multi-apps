-- Combo Payment Request auto-expiry: a request not paid within 30 days of
-- submission automatically becomes EXPIRED (cannot be approved or paid any
-- further, and must be resubmitted as a new request).
ALTER TYPE "ComboPaymentRequestStatus" ADD VALUE 'EXPIRED';

ALTER TABLE "combo_payment_requests" ADD COLUMN "expiredAt" TIMESTAMP(3);
