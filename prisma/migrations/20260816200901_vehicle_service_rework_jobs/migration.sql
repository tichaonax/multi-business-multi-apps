-- AlterTable
ALTER TABLE "vehicle_service_jobs" ADD COLUMN     "reworkOfJobId" TEXT,
ADD COLUMN     "waiveLabor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waiveParts" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "vehicle_service_tasks" ADD COLUMN     "contractorFeeOverride" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "vehicle_service_jobs_reworkOfJobId_idx" ON "vehicle_service_jobs"("reworkOfJobId");

-- AddForeignKey
ALTER TABLE "vehicle_service_jobs" ADD CONSTRAINT "vehicle_service_jobs_reworkOfJobId_fkey" FOREIGN KEY ("reworkOfJobId") REFERENCES "vehicle_service_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
