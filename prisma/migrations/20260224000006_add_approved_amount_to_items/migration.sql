-- Add approved amount and approval note to line items (used when manager approves less than requested)
ALTER TABLE "supplier_payment_request_items" ADD COLUMN "approvedAmount" DECIMAL(12,2);
ALTER TABLE "supplier_payment_request_items" ADD COLUMN "approvalNote" TEXT;
