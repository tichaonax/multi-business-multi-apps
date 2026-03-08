-- CreateTable: PaymentBatchSubmissions
CREATE TABLE "payment_batch_submissions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "depositId" TEXT,
    "businessTxId" TEXT,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_batch_submissions_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add batchSubmissionId to expense_account_payments
ALTER TABLE "expense_account_payments" ADD COLUMN "batch_submission_id" TEXT;

-- CreateIndex
CREATE INDEX "payment_batch_submissions_businessId_idx" ON "payment_batch_submissions"("businessId");

-- CreateIndex
CREATE INDEX "payment_batch_submissions_expenseAccountId_idx" ON "payment_batch_submissions"("expenseAccountId");

-- AddForeignKey
ALTER TABLE "payment_batch_submissions" ADD CONSTRAINT "payment_batch_submissions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_batch_submissions" ADD CONSTRAINT "payment_batch_submissions_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_batch_submissions" ADD CONSTRAINT "payment_batch_submissions_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_account_payments" ADD CONSTRAINT "expense_account_payments_batch_submission_id_fkey" FOREIGN KEY ("batch_submission_id") REFERENCES "payment_batch_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
