-- CreateTable
CREATE TABLE "saved_reports" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "reportData" JSONB NOT NULL,
    "managerName" TEXT NOT NULL,
    "managerUserId" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "expectedCash" DECIMAL(10,2),
    "cashCounted" DECIMAL(10,2),
    "variance" DECIMAL(10,2),
    "totalSales" DECIMAL(10,2) NOT NULL,
    "totalOrders" INTEGER NOT NULL,
    "receiptsIssued" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_reports_businessId_reportType_reportDate_key" ON "saved_reports"("businessId", "reportType", "reportDate");

-- CreateIndex
CREATE INDEX "saved_reports_businessId_reportType_reportDate_idx" ON "saved_reports"("businessId", "reportType", "reportDate");

-- CreateIndex
CREATE INDEX "saved_reports_reportDate_idx" ON "saved_reports"("reportDate");

-- CreateIndex
CREATE INDEX "saved_reports_businessId_idx" ON "saved_reports"("businessId");

-- AddForeignKey
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
