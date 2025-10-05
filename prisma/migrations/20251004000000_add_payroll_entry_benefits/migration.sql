-- CreateTable
CREATE TABLE "payroll_entry_benefits" (
    "id" TEXT NOT NULL,
    "payroll_entry_id" TEXT NOT NULL,
    "benefit_type_id" TEXT NOT NULL,
    "benefit_name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'contract',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_entry_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_entry_benefits_payroll_entry_id_idx" ON "payroll_entry_benefits"("payroll_entry_id");

-- CreateIndex
CREATE INDEX "payroll_entry_benefits_benefit_type_id_idx" ON "payroll_entry_benefits"("benefit_type_id");

-- AddForeignKey
ALTER TABLE "payroll_entry_benefits" ADD CONSTRAINT "payroll_entry_benefits_payroll_entry_id_fkey" FOREIGN KEY ("payroll_entry_id") REFERENCES "payroll_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entry_benefits" ADD CONSTRAINT "payroll_entry_benefits_benefit_type_id_fkey" FOREIGN KEY ("benefit_type_id") REFERENCES "benefit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
