-- MBM-262 Phase C: contractor parts requests -> Inventory Department issue/reject
-- vehicle_service_job_parts is the "committed to this job" list, populated when a
-- request is issued (stock decremented at that moment) or a part is added directly
-- at billing time (partsRequestId null in that case).

-- CreateTable
CREATE TABLE "vehicle_service_parts_requests" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "taskId" TEXT,
    "contractorId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "productVariantId" TEXT,
    "issuedQuantity" INTEGER,
    "issuedAt" TIMESTAMP(3),

    CONSTRAINT "vehicle_service_parts_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_service_job_parts" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "partsRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_service_job_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_service_parts_requests_jobId_idx" ON "vehicle_service_parts_requests"("jobId");

-- CreateIndex
CREATE INDEX "vehicle_service_parts_requests_contractorId_idx" ON "vehicle_service_parts_requests"("contractorId");

-- CreateIndex
CREATE INDEX "vehicle_service_parts_requests_status_idx" ON "vehicle_service_parts_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_service_job_parts_partsRequestId_key" ON "vehicle_service_job_parts"("partsRequestId");

-- CreateIndex
CREATE INDEX "vehicle_service_job_parts_jobId_idx" ON "vehicle_service_job_parts"("jobId");

-- AddForeignKey
ALTER TABLE "vehicle_service_parts_requests" ADD CONSTRAINT "vehicle_service_parts_requests_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "vehicle_service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_parts_requests" ADD CONSTRAINT "vehicle_service_parts_requests_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "vehicle_service_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_parts_requests" ADD CONSTRAINT "vehicle_service_parts_requests_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "vehicle_service_contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_parts_requests" ADD CONSTRAINT "vehicle_service_parts_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_parts_requests" ADD CONSTRAINT "vehicle_service_parts_requests_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_job_parts" ADD CONSTRAINT "vehicle_service_job_parts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "vehicle_service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_job_parts" ADD CONSTRAINT "vehicle_service_job_parts_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_job_parts" ADD CONSTRAINT "vehicle_service_job_parts_partsRequestId_fkey" FOREIGN KEY ("partsRequestId") REFERENCES "vehicle_service_parts_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
