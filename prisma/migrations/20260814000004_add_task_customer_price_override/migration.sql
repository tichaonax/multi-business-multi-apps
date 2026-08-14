-- MBM-261 Phase 3: per-task fixed customer price override
-- When set, the customer is billed this amount instead of agreedFeeAmount
-- (the contractor payout amount) for this task's labour line.
ALTER TABLE "vehicle_service_tasks" ADD COLUMN "customerPriceOverride" DECIMAL(12,2);
