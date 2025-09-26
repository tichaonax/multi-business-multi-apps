-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" INTEGER,
    "tokenType" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    "sessionState" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "tableName" TEXT,
    "recordId" TEXT,
    "changes" JSONB,
    "details" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."benefit_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultAmount" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPercentage" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "templateId" TEXT,

    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "umbrellaBusinessId" TEXT,
    "isUmbrellaBusiness" BOOLEAN NOT NULL DEFAULT false,
    "umbrellaBusinessName" TEXT DEFAULT 'Demo Umbrella Company',

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT,
    "userId" TEXT,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_participants" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT,
    "userId" TEXT,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'group',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."compensation_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "baseAmount" DECIMAL(12,2),
    "commissionPercentage" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frequency" TEXT DEFAULT 'monthly',

    CONSTRAINT "compensation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."construction_expenses" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "vendor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "projectId" TEXT,
    "receiptUrl" TEXT,

    CONSTRAINT "construction_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."construction_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "budget" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "endDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "construction_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contract_benefits" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "benefitTypeId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPercentage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "contract_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contract_renewals" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "autoRenewalMonths" INTEGER,
    "benefitChanges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "isAutoRenewal" BOOLEAN NOT NULL DEFAULT false,
    "jobTitleChange" TEXT,
    "managerNotifiedAt" TIMESTAMP(3),
    "newContractId" TEXT,
    "originalContractId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "renewalDueDate" TIMESTAMP(3) NOT NULL,
    "salaryChange" DECIMAL(12,2),
    "salaryChangeType" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."disciplinary_actions" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "violationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "actionDate" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "improvementPlan" TEXT,
    "followUpDate" TIMESTAMP(3),
    "followUpNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "hrReviewed" BOOLEAN NOT NULL DEFAULT false,
    "hrReviewedBy" TEXT,
    "hrReviewedAt" TIMESTAMP(3),
    "hrNotes" TEXT,
    "employeeAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "employeeResponse" TEXT,
    "employeeSignedAt" TIMESTAMP(3),
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disciplinary_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_benefits" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "benefitTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPercentage" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_business_assignments" (
    "id" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "assignedBy" TEXT,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_business_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_contracts" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "additionalBusinesses" TEXT[],
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "compensationTypeId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "customResponsibilities" TEXT,
    "employeeId" TEXT NOT NULL,
    "employeeSignedAt" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCommissionBased" BOOLEAN NOT NULL DEFAULT false,
    "isSalaryBased" BOOLEAN NOT NULL DEFAULT true,
    "jobTitleId" TEXT NOT NULL,
    "managerSignedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "primaryBusinessId" TEXT NOT NULL,
    "probationPeriodMonths" INTEGER,
    "signedPdfUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "supervisorName" TEXT NOT NULL,
    "supervisorTitle" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commissionAmount" DECIMAL(12,2),
    "contractDurationMonths" INTEGER,
    "livingAllowance" DECIMAL(12,2),
    "pdfGenerationData" JSONB,
    "umbrellaBusinessId" TEXT,
    "umbrellaBusinessName" TEXT DEFAULT 'Demo Umbrella Company',
    "businessAssignments" JSONB,

    CONSTRAINT "employee_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "employmentStatus" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "compensationTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "customResponsibilities" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "idFormatTemplateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jobTitleId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "primaryBusinessId" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "supervisorId" TEXT,
    "terminationDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "driverLicenseNumber" TEXT,
    "driverLicenseTemplateId" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT DEFAULT '💰',
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fund_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT DEFAULT '💰',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,

    CONSTRAINT "fund_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."id_format_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pattern" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "id_format_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_license_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pattern" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_license_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_titles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsibilities" TEXT[],
    "department" TEXT,
    "level" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."menu_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "barcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "menuItemId" TEXT,
    "orderId" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "orderNumber" TEXT NOT NULL,
    "tableNumber" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permission_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "businessType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."personal_budgets" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'deposit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "personal_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."personal_expenses" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptUrl" TEXT,
    "userId" TEXT,

    CONSTRAINT "personal_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."persons" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "fullName" TEXT NOT NULL,
    "idFormatTemplateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nationalId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverLicenseNumber" TEXT,
    "driverLicenseTemplateId" TEXT,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_contractors" (
    "id" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "hourlyRate" DECIMAL(12,2),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "personId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "totalContractAmount" DECIMAL(12,2),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_contractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "completionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "estimatedAmount" DECIMAL(12,2),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentCategory" TEXT,
    "paymentMethod" TEXT,
    "personalExpenseId" TEXT NOT NULL,
    "projectContractorId" TEXT,
    "projectId" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "recipientPersonId" TEXT,
    "referenceNumber" TEXT,
    "stageAssignmentId" TEXT,
    "stageId" TEXT,
    "transactionType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stage_contractor_assignments" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "depositAmount" DECIMAL(12,2),
    "depositPaidDate" TIMESTAMP(3),
    "depositPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "finalPaymentDate" TIMESTAMP(3),
    "isDepositPaid" BOOLEAN NOT NULL DEFAULT false,
    "isFinalPaymentMade" BOOLEAN NOT NULL DEFAULT false,
    "predeterminedAmount" DECIMAL(12,2) NOT NULL,
    "projectContractorId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_contractor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedBy" TEXT,
    "deactivationReason" TEXT,
    "deactivationNotes" TEXT,
    "reactivatedAt" TIMESTAMP(3),
    "reactivatedBy" TEXT,
    "reactivationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_loans" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "loanAmount" DECIMAL(12,2) NOT NULL,
    "monthlyDeduction" DECIMAL(12,2) NOT NULL,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "remainingMonths" INTEGER NOT NULL,
    "totalMonths" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_loan_payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loanId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "processedBy" TEXT,

    CONSTRAINT "employee_loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_bonuses" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "employee_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_deductions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "employee_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_deduction_payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deductionId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "processedBy" TEXT,

    CONSTRAINT "employee_deduction_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_salary_increases" (
    "id" TEXT NOT NULL,
    "reason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "increaseAmount" DECIMAL(12,2) NOT NULL,
    "increasePercent" DECIMAL(5,2) NOT NULL,
    "newSalary" DECIMAL(12,2) NOT NULL,
    "previousSalary" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "employee_salary_increases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_attendance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'present',
    "notes" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "hoursWorked" DECIMAL(4,2),

    CONSTRAINT "employee_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_leave_balance" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annualLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "remainingAnnual" INTEGER NOT NULL DEFAULT 0,
    "remainingSick" INTEGER NOT NULL DEFAULT 0,
    "sickLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usedAnnualDays" INTEGER NOT NULL DEFAULT 0,
    "usedSickDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "employee_leave_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_leave_requests" (
    "id" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysRequested" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "leaveType" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_allowances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "payrollMonth" INTEGER NOT NULL,
    "payrollYear" INTEGER NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_time_tracking" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "workDays" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DECIMAL(5,2),
    "overtimeHours" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_time_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inter_business_loans" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "lenderType" TEXT NOT NULL,
    "lenderUserId" TEXT,
    "lenderBusinessId" TEXT,
    "borrowerBusinessId" TEXT,
    "loanDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "terms" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "borrowerPersonId" TEXT,
    "borrowerType" TEXT NOT NULL,

    CONSTRAINT "inter_business_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loan_transactions" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "personalExpenseId" TEXT,
    "businessTransactionId" TEXT,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "autoGeneratedNote" TEXT,
    "initiatedFrom" TEXT,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "loan_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_types_name_key" ON "public"."benefit_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_userId_businessId_key" ON "public"."business_memberships"("userId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "compensation_types_name_key" ON "public"."compensation_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employee_business_assignments_employeeId_businessId_key" ON "public"."employee_business_assignments"("employeeId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_contracts_contractNumber_key" ON "public"."employee_contracts"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "public"."employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeNumber_key" ON "public"."employees"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_nationalId_key" ON "public"."employees"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "public"."employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "job_titles_title_key" ON "public"."job_titles"("title");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "public"."orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "persons_email_key" ON "public"."persons"("email");

-- CreateIndex
CREATE UNIQUE INDEX "persons_nationalId_key" ON "public"."persons"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "project_contractors_projectId_personId_key" ON "public"."project_contractors"("projectId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "stage_contractor_assignments_stageId_projectContractorId_key" ON "public"."stage_contractor_assignments"("stageId", "projectContractorId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employee_attendance_employeeId_date_key" ON "public"."employee_attendance"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "employee_leave_balance_employeeId_year_key" ON "public"."employee_leave_balance"("employeeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "employee_time_tracking_employeeId_year_month_key" ON "public"."employee_time_tracking"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "inter_business_loans_loanNumber_key" ON "public"."inter_business_loans"("loanNumber");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_memberships" ADD CONSTRAINT "business_memberships_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_memberships" ADD CONSTRAINT "business_memberships_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."permission_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_memberships" ADD CONSTRAINT "business_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."businesses" ADD CONSTRAINT "businesses_umbrellaBusinessId_fkey" FOREIGN KEY ("umbrellaBusinessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_participants" ADD CONSTRAINT "chat_participants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_participants" ADD CONSTRAINT "chat_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_rooms" ADD CONSTRAINT "chat_rooms_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."construction_expenses" ADD CONSTRAINT "construction_expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."construction_expenses" ADD CONSTRAINT "construction_expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."construction_projects" ADD CONSTRAINT "construction_projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contract_benefits" ADD CONSTRAINT "contract_benefits_benefitTypeId_fkey" FOREIGN KEY ("benefitTypeId") REFERENCES "public"."benefit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contract_benefits" ADD CONSTRAINT "contract_benefits_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."employee_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contract_renewals" ADD CONSTRAINT "contract_renewals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contract_renewals" ADD CONSTRAINT "contract_renewals_newContractId_fkey" FOREIGN KEY ("newContractId") REFERENCES "public"."employee_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contract_renewals" ADD CONSTRAINT "contract_renewals_originalContractId_fkey" FOREIGN KEY ("originalContractId") REFERENCES "public"."employee_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disciplinary_actions" ADD CONSTRAINT "disciplinary_actions_created_by_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disciplinary_actions" ADD CONSTRAINT "disciplinary_actions_employee_id_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_benefits" ADD CONSTRAINT "employee_benefits_benefitTypeId_fkey" FOREIGN KEY ("benefitTypeId") REFERENCES "public"."benefit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_benefits" ADD CONSTRAINT "employee_benefits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_business_assignments" ADD CONSTRAINT "employee_business_assignments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_business_assignments" ADD CONSTRAINT "employee_business_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_contracts" ADD CONSTRAINT "employee_contracts_compensationTypeId_fkey" FOREIGN KEY ("compensationTypeId") REFERENCES "public"."compensation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_contracts" ADD CONSTRAINT "employee_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_contracts" ADD CONSTRAINT "employee_contracts_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "public"."job_titles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_contracts" ADD CONSTRAINT "employee_contracts_primaryBusinessId_fkey" FOREIGN KEY ("primaryBusinessId") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_contracts" ADD CONSTRAINT "employee_contracts_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_contracts" ADD CONSTRAINT "employee_contracts_umbrellaBusinessId_fkey" FOREIGN KEY ("umbrellaBusinessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_compensationTypeId_fkey" FOREIGN KEY ("compensationTypeId") REFERENCES "public"."compensation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_driverLicenseTemplateId_fkey" FOREIGN KEY ("driverLicenseTemplateId") REFERENCES "public"."driver_license_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_idFormatTemplateId_fkey" FOREIGN KEY ("idFormatTemplateId") REFERENCES "public"."id_format_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "public"."job_titles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_primaryBusinessId_fkey" FOREIGN KEY ("primaryBusinessId") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_categories" ADD CONSTRAINT "expense_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fund_sources" ADD CONSTRAINT "fund_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "public"."menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."permission_templates" ADD CONSTRAINT "permission_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personal_budgets" ADD CONSTRAINT "personal_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personal_expenses" ADD CONSTRAINT "personal_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."persons" ADD CONSTRAINT "persons_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."persons" ADD CONSTRAINT "persons_driverLicenseTemplateId_fkey" FOREIGN KEY ("driverLicenseTemplateId") REFERENCES "public"."driver_license_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."persons" ADD CONSTRAINT "persons_idFormatTemplateId_fkey" FOREIGN KEY ("idFormatTemplateId") REFERENCES "public"."id_format_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_contractors" ADD CONSTRAINT "project_contractors_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_contractors" ADD CONSTRAINT "project_contractors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_stages" ADD CONSTRAINT "project_stages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_transactions" ADD CONSTRAINT "project_transactions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_transactions" ADD CONSTRAINT "project_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_transactions" ADD CONSTRAINT "project_transactions_personalExpenseId_fkey" FOREIGN KEY ("personalExpenseId") REFERENCES "public"."personal_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_transactions" ADD CONSTRAINT "project_transactions_projectContractorId_fkey" FOREIGN KEY ("projectContractorId") REFERENCES "public"."project_contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_transactions" ADD CONSTRAINT "project_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_transactions" ADD CONSTRAINT "project_transactions_recipientPersonId_fkey" FOREIGN KEY ("recipientPersonId") REFERENCES "public"."persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_transactions" ADD CONSTRAINT "project_transactions_stageAssignmentId_fkey" FOREIGN KEY ("stageAssignmentId") REFERENCES "public"."stage_contractor_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_transactions" ADD CONSTRAINT "project_transactions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."project_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stage_contractor_assignments" ADD CONSTRAINT "stage_contractor_assignments_projectContractorId_fkey" FOREIGN KEY ("projectContractorId") REFERENCES "public"."project_contractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stage_contractor_assignments" ADD CONSTRAINT "stage_contractor_assignments_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."project_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_loans" ADD CONSTRAINT "employee_loans_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_loans" ADD CONSTRAINT "employee_loans_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_loan_payments" ADD CONSTRAINT "employee_loan_payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."employee_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_loan_payments" ADD CONSTRAINT "employee_loan_payments_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_bonuses" ADD CONSTRAINT "employee_bonuses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_bonuses" ADD CONSTRAINT "employee_bonuses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_deductions" ADD CONSTRAINT "employee_deductions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_deductions" ADD CONSTRAINT "employee_deductions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_deduction_payments" ADD CONSTRAINT "employee_deduction_payments_deductionId_fkey" FOREIGN KEY ("deductionId") REFERENCES "public"."employee_deductions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_deduction_payments" ADD CONSTRAINT "employee_deduction_payments_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_salary_increases" ADD CONSTRAINT "employee_salary_increases_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_salary_increases" ADD CONSTRAINT "employee_salary_increases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_attendance" ADD CONSTRAINT "employee_attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_leave_balance" ADD CONSTRAINT "employee_leave_balance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_leave_requests" ADD CONSTRAINT "employee_leave_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_leave_requests" ADD CONSTRAINT "employee_leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_allowances" ADD CONSTRAINT "employee_allowances_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_allowances" ADD CONSTRAINT "employee_allowances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_time_tracking" ADD CONSTRAINT "employee_time_tracking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inter_business_loans" ADD CONSTRAINT "inter_business_loans_borrowerBusinessId_fkey" FOREIGN KEY ("borrowerBusinessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inter_business_loans" ADD CONSTRAINT "inter_business_loans_borrowerPersonId_fkey" FOREIGN KEY ("borrowerPersonId") REFERENCES "public"."persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inter_business_loans" ADD CONSTRAINT "inter_business_loans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inter_business_loans" ADD CONSTRAINT "inter_business_loans_lenderBusinessId_fkey" FOREIGN KEY ("lenderBusinessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inter_business_loans" ADD CONSTRAINT "inter_business_loans_lenderUserId_fkey" FOREIGN KEY ("lenderUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loan_transactions" ADD CONSTRAINT "loan_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loan_transactions" ADD CONSTRAINT "loan_transactions_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."inter_business_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loan_transactions" ADD CONSTRAINT "loan_transactions_personalExpenseId_fkey" FOREIGN KEY ("personalExpenseId") REFERENCES "public"."personal_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
