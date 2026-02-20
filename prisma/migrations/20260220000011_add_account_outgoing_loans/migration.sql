-- Add outgoingLoanPaymentId to expense_account_deposits
ALTER TABLE "expense_account_deposits" ADD COLUMN "outgoingLoanPaymentId" TEXT;

-- Add outgoingLoanId to expense_account_payments
ALTER TABLE "expense_account_payments" ADD COLUMN "outgoingLoanId" TEXT;

-- CreateTable: account_outgoing_loans
CREATE TABLE "account_outgoing_loans" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "loanType" TEXT NOT NULL,
    "recipientPersonId" TEXT,
    "recipientBusinessId" TEXT,
    "recipientEmployeeId" TEXT,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "monthlyInstallment" DECIMAL(12,2),
    "totalMonths" INTEGER,
    "remainingMonths" INTEGER,
    "interestRate" DECIMAL(5,4),
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "purpose" TEXT,
    "notes" TEXT,
    "paymentType" TEXT NOT NULL DEFAULT 'MANUAL',
    "approvedByEmployeeId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractSignedAt" TIMESTAMP(3),
    "contractSignedByUserId" TEXT,
    "contractTerms" JSONB,
    "disbursementPaymentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_outgoing_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: account_outgoing_loan_payments
CREATE TABLE "account_outgoing_loan_payments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "payrollEntryId" TEXT,
    "depositId" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_outgoing_loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_outgoing_loans_loanNumber_key" ON "account_outgoing_loans"("loanNumber");

-- CreateIndex
CREATE INDEX "account_outgoing_loans_expenseAccountId_idx" ON "account_outgoing_loans"("expenseAccountId");

-- CreateIndex
CREATE INDEX "account_outgoing_loans_recipientEmployeeId_idx" ON "account_outgoing_loans"("recipientEmployeeId");

-- CreateIndex
CREATE INDEX "account_outgoing_loans_status_idx" ON "account_outgoing_loans"("status");

-- CreateIndex
CREATE INDEX "account_outgoing_loan_payments_loanId_idx" ON "account_outgoing_loan_payments"("loanId");

-- AddForeignKey
ALTER TABLE "account_outgoing_loans" ADD CONSTRAINT "account_outgoing_loans_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loans" ADD CONSTRAINT "account_outgoing_loans_recipientPersonId_fkey" FOREIGN KEY ("recipientPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loans" ADD CONSTRAINT "account_outgoing_loans_recipientBusinessId_fkey" FOREIGN KEY ("recipientBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loans" ADD CONSTRAINT "account_outgoing_loans_recipientEmployeeId_fkey" FOREIGN KEY ("recipientEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loans" ADD CONSTRAINT "account_outgoing_loans_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loans" ADD CONSTRAINT "account_outgoing_loans_contractSignedByUserId_fkey" FOREIGN KEY ("contractSignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loans" ADD CONSTRAINT "account_outgoing_loans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loan_payments" ADD CONSTRAINT "account_outgoing_loan_payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "account_outgoing_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loan_payments" ADD CONSTRAINT "account_outgoing_loan_payments_payrollEntryId_fkey" FOREIGN KEY ("payrollEntryId") REFERENCES "payroll_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_outgoing_loan_payments" ADD CONSTRAINT "account_outgoing_loan_payments_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
