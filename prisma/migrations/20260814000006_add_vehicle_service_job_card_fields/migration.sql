-- MBM-262 Phase A: job card — primary contractor, print tracking, vehicle release
ALTER TABLE "vehicle_service_jobs" ADD COLUMN "primaryContractorId" TEXT;
ALTER TABLE "vehicle_service_jobs" ADD COLUMN "jobCardPrintedAt" TIMESTAMP(3);
ALTER TABLE "vehicle_service_jobs" ADD COLUMN "vehicleReleasedAt" TIMESTAMP(3);
ALTER TABLE "vehicle_service_jobs" ADD COLUMN "vehicleReleasedById" TEXT;

-- AddForeignKey
ALTER TABLE "vehicle_service_jobs" ADD CONSTRAINT "vehicle_service_jobs_primaryContractorId_fkey" FOREIGN KEY ("primaryContractorId") REFERENCES "vehicle_service_contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_jobs" ADD CONSTRAINT "vehicle_service_jobs_vehicleReleasedById_fkey" FOREIGN KEY ("vehicleReleasedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
