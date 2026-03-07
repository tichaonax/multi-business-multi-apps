-- CreateTable
CREATE TABLE "per_diem_entries" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enteredBy" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "notes" TEXT,
    "payrollMonth" INTEGER NOT NULL,
    "payrollYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "per_diem_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "per_diem_entries_employeeId_idx" ON "per_diem_entries"("employeeId");

-- CreateIndex
CREATE INDEX "per_diem_entries_businessId_idx" ON "per_diem_entries"("businessId");

-- CreateIndex
CREATE INDEX "per_diem_entries_payrollYear_payrollMonth_idx" ON "per_diem_entries"("payrollYear", "payrollMonth");

-- CreateIndex
CREATE INDEX "per_diem_entries_date_idx" ON "per_diem_entries"("date");

-- AddForeignKey
ALTER TABLE "per_diem_entries" ADD CONSTRAINT "per_diem_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "per_diem_entries" ADD CONSTRAINT "per_diem_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "per_diem_entries" ADD CONSTRAINT "per_diem_entries_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
