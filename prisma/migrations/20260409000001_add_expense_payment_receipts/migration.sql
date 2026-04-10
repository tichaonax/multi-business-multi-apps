-- CreateTable: expense_payment_receipts (MBM-173)
CREATE TABLE "expense_payment_receipts" (
    "id" TEXT NOT NULL,
    "expense_payment_id" TEXT NOT NULL,
    "receipt_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "payee_type" TEXT,
    "payee_person_id" TEXT,
    "payee_business_id" TEXT,
    "payee_supplier_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_expense_payment_receipts_payment_id" ON "expense_payment_receipts"("expense_payment_id");

-- CreateIndex
CREATE INDEX "idx_expense_payment_receipts_person_id" ON "expense_payment_receipts"("payee_person_id");

-- CreateIndex
CREATE INDEX "idx_expense_payment_receipts_business_id" ON "expense_payment_receipts"("payee_business_id");

-- AddForeignKey
ALTER TABLE "expense_payment_receipts" ADD CONSTRAINT "expense_payment_receipts_expense_payment_id_fkey" FOREIGN KEY ("expense_payment_id") REFERENCES "expense_account_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_receipts" ADD CONSTRAINT "expense_payment_receipts_payee_person_id_fkey" FOREIGN KEY ("payee_person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_receipts" ADD CONSTRAINT "expense_payment_receipts_payee_business_id_fkey" FOREIGN KEY ("payee_business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_receipts" ADD CONSTRAINT "expense_payment_receipts_payee_supplier_id_fkey" FOREIGN KEY ("payee_supplier_id") REFERENCES "business_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_receipts" ADD CONSTRAINT "expense_payment_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
