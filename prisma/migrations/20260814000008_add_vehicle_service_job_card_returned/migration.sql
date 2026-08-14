-- MBM-262 Phase D: track the physical job card being returned to the
-- completed-jobs queue, distinct from individual task completion.
ALTER TABLE "vehicle_service_jobs" ADD COLUMN "jobCardReturnedAt" TIMESTAMP(3);
