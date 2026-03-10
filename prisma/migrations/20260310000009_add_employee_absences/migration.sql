-- MBM-144: Add employee_absences table and absenceDaysFromRecords to payroll_entries

-- CreateTable
CREATE TABLE "employee_absences" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_absences_employeeId_date_key" ON "employee_absences"("employeeId", "date");

-- CreateIndex
CREATE INDEX "employee_absences_businessId_date_idx" ON "employee_absences"("businessId", "date");

-- CreateIndex
CREATE INDEX "employee_absences_employeeId_idx" ON "employee_absences"("employeeId");

-- AddForeignKey
ALTER TABLE "employee_absences" ADD CONSTRAINT "employee_absences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_absences" ADD CONSTRAINT "employee_absences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_absences" ADD CONSTRAINT "employee_absences_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: add absenceDaysFromRecords to payroll_entries
ALTER TABLE "payroll_entries" ADD COLUMN "absenceDaysFromRecords" INTEGER NOT NULL DEFAULT 0;
