-- MBM-261: Vehicle Repair & Service business type — Phase 1 schema
-- Contractors, contractor skills/authorized-services, jobs, tasks

-- CreateTable
CREATE TABLE "vehicle_service_contractors" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_service_contractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_service_contractor_skills" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "certification" TEXT,
    "issuedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_service_contractor_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_service_contractor_services" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "feeAmount" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_service_contractor_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_service_jobs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehiclePlate" TEXT,
    "vehicleVin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "orderId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_service_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_service_tasks" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "workDescription" TEXT,
    "agreedFeeAmount" DECIMAL(12,2) NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_service_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_service_contractors_personId_key" ON "vehicle_service_contractors"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_service_contractors_userId_key" ON "vehicle_service_contractors"("userId");

-- CreateIndex
CREATE INDEX "vehicle_service_contractors_businessId_idx" ON "vehicle_service_contractors"("businessId");

-- CreateIndex
CREATE INDEX "vehicle_service_contractors_status_idx" ON "vehicle_service_contractors"("status");

-- CreateIndex
CREATE INDEX "vehicle_service_contractor_skills_contractorId_idx" ON "vehicle_service_contractor_skills"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_service_contractor_services_contractorId_subcategor_key" ON "vehicle_service_contractor_services"("contractorId", "subcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_service_jobs_orderId_key" ON "vehicle_service_jobs"("orderId");

-- CreateIndex
CREATE INDEX "vehicle_service_jobs_businessId_status_idx" ON "vehicle_service_jobs"("businessId", "status");

-- CreateIndex
CREATE INDEX "vehicle_service_tasks_jobId_idx" ON "vehicle_service_tasks"("jobId");

-- CreateIndex
CREATE INDEX "vehicle_service_tasks_contractorId_idx" ON "vehicle_service_tasks"("contractorId");

-- CreateIndex
CREATE INDEX "vehicle_service_tasks_status_idx" ON "vehicle_service_tasks"("status");

-- AddForeignKey
ALTER TABLE "vehicle_service_contractors" ADD CONSTRAINT "vehicle_service_contractors_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractors" ADD CONSTRAINT "vehicle_service_contractors_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractors" ADD CONSTRAINT "vehicle_service_contractors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractors" ADD CONSTRAINT "vehicle_service_contractors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_skills" ADD CONSTRAINT "vehicle_service_contractor_skills_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "vehicle_service_contractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_services" ADD CONSTRAINT "vehicle_service_contractor_services_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "vehicle_service_contractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_services" ADD CONSTRAINT "vehicle_service_contractor_services_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "inventory_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_jobs" ADD CONSTRAINT "vehicle_service_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_jobs" ADD CONSTRAINT "vehicle_service_jobs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_jobs" ADD CONSTRAINT "vehicle_service_jobs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "business_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_jobs" ADD CONSTRAINT "vehicle_service_jobs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_tasks" ADD CONSTRAINT "vehicle_service_tasks_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "vehicle_service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_tasks" ADD CONSTRAINT "vehicle_service_tasks_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "inventory_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_tasks" ADD CONSTRAINT "vehicle_service_tasks_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "vehicle_service_contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
