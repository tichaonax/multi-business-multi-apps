# Payroll Management System - Detailed Plan

## Executive Summary

A comprehensive payroll management system that:
- Tracks monthly employee attendance (sick days, leave days, work days)
- Manages employee loans and advances with automatic repayment tracking
- Handles employee deductions
- Generates monthly Excel spreadsheets for 3rd party payroll processing
- Maintains historical payroll data with yearly tabs
- Provides extensibility for future pay slip data entry

---

## Analysis of Current Schema

### Existing Tables We'll Leverage:
1. **employees** - Core employee data (ID, names, DOB, hire date, etc.)
2. **employee_contracts** - Active contract with salary and benefits
3. **employee_loans** - Loan tracking with monthly deductions
4. **employee_loan_payments** - Individual loan payment records
5. **employee_deductions** - One-time or recurring deductions
6. **employee_deduction_payments** - Individual deduction payment records
7. **employee_leave_requests** - Leave request tracking (already approved/rejected)
8. **employee_attendance** - Daily attendance records
9. **contract_benefits** - Benefits tied to contracts
10. **benefit_types** - Types of benefits (medical, housing, etc.)

### What's Missing (New Tables Needed):

1. **PayrollPeriod** - Monthly payroll period management
2. **PayrollEntry** - Individual employee payroll records per period
3. **PayrollAttendanceSummary** - Monthly attendance summary per employee
4. **PayrollAdjustment** - Manual adjustments (bonuses, penalties, etc.)
5. **PayrollExport** - Track generated Excel files
6. **PaySlipEntry** - For future pay slip data entry (extensibility)

---

## System Requirements

### 1. Core Functionality

#### A. Monthly Payroll Period Management
- **Create Payroll Period**: Payroll manager creates a new period for a specific month/year
- **Period States**:
  - `draft` - Being prepared
  - `in_progress` - Data entry in progress
  - `review` - Ready for review
  - `approved` - Approved for export
  - `exported` - Excel file generated
  - `closed` - Payroll processed and locked

#### B. Attendance Entry
- **Work Days**: Enter actual work days for each employee
- **Sick Days**: Track sick leave taken (with/without medical certificate)
- **Leave Days**: Track approved leave days (annual, unpaid, etc.)
- **Absence Days**: Track unauthorized absences
- **Overtime**: Track overtime hours
- **Auto-populate from EmployeeAttendance**: Option to auto-calculate from existing attendance records

#### C. Loan & Advance Management
- **Auto-calculate Deductions**: System automatically calculates monthly loan repayments
- **Track Remaining Balance**: Update loan balance after each payroll
- **Handle Multiple Loans**: Support multiple active loans per employee
- **Early Repayment**: Allow manual adjustments for early repayments
- **Advance Tracking**: Track salary advances (separate from loans)

#### D. Deduction Management
- **Recurring Deductions**: Monthly deductions (PAYE, pension, etc.)
- **One-time Deductions**: Damages, fines, etc.
- **Auto-apply from EmployeeDeduction**: Pull active deductions automatically
- **Manual Overrides**: Allow payroll manager to adjust

#### E. Salary & Benefits Calculation
- **Base Salary**: From active employee contract
- **Commission**: If applicable (from contract)
- **Allowances**: Living allowance, vehicle allowance, travel allowance
- **Benefits**: From ContractBenefit (medical, housing, etc.)
- **Overtime Pay**: Calculate based on hourly rate × overtime hours
- **Pro-rata Calculation**: For partial months (new hires, terminations)

#### F. Excel Export Generation
- **Multi-tab Workbook**: One tab per month
- **Yearly Generation**: Generate entire year with historical data
- **Column Mapping**: Match 3rd party payroll format exactly
- **File Storage**: Store generated files for audit trail
- **Re-generation**: Allow re-export if corrections needed

#### G. Manual Adjustments
- **Bonuses**: Add performance bonuses
- **Penalties**: Deduct for disciplinary issues
- **Corrections**: Fix errors from previous periods
- **Notes**: Add explanatory notes for adjustments

---

## Database Schema Design

### New Tables (Following Existing Naming Conventions)

```prisma
model PayrollPeriod {
  id                String   @id
  businessId        String
  year              Int
  month             Int      // 1-12
  periodStart       DateTime
  periodEnd         DateTime
  status            String   @default("draft") // draft, in_progress, review, approved, exported, closed
  totalEmployees    Int      @default(0)
  totalGrossPay     Decimal  @default(0) @db.Decimal(12, 2)
  totalDeductions   Decimal  @default(0) @db.Decimal(12, 2)
  totalNetPay       Decimal  @default(0) @db.Decimal(12, 2)
  createdAt         DateTime @default(now())
  createdBy         String?
  approvedAt        DateTime?
  approvedBy        String?
  exportedAt        DateTime?
  closedAt          DateTime?
  notes             String?

  // Relations
  business          Business @relation(fields: [businessId], references: [id])
  creator           User?    @relation("payroll_periods_createdBy", fields: [createdBy], references: [id])
  approver          User?    @relation("payroll_periods_approvedBy", fields: [approvedBy], references: [id])
  payrollEntries    PayrollEntry[]
  payrollExports    PayrollExport[]

  @@unique([businessId, year, month])
  @@map("payroll_periods")
}

model PayrollEntry {
  id                      String   @id
  payrollPeriodId         String
  employeeId              String
  employeeNumber          String
  employeeName            String   // Denormalized for reporting
  nationalId              String   // Denormalized
  dateOfBirth             DateTime? // Denormalized
  hireDate                DateTime  // Denormalized
  terminationDate         DateTime? // If terminated during period

  // Attendance
  workDays                Int      @default(0)
  sickDays                Int      @default(0)
  leaveDays               Int      @default(0)
  absenceDays             Int      @default(0)
  overtimeHours           Decimal  @default(0) @db.Decimal(5, 2)
  expectedWorkDays        Int      @default(22) // Standard work days in month

  // Compensation (from contract)
  baseSalary              Decimal  @db.Decimal(12, 2)
  commission              Decimal  @default(0) @db.Decimal(12, 2)
  livingAllowance         Decimal  @default(0) @db.Decimal(12, 2)
  vehicleAllowance        Decimal  @default(0) @db.Decimal(12, 2)
  travelAllowance         Decimal  @default(0) @db.Decimal(12, 2)
  overtimePay             Decimal  @default(0) @db.Decimal(12, 2)

  // Benefits (from contract benefits)
  benefitsTotal           Decimal  @default(0) @db.Decimal(12, 2)
  benefitsBreakdown       Json?    // { "medical": 100, "housing": 200 }

  // Deductions
  loanDeductions          Decimal  @default(0) @db.Decimal(12, 2)
  loanBreakdown           Json?    // Array of { loanId, amount, description }
  advanceDeductions       Decimal  @default(0) @db.Decimal(12, 2)
  miscDeductions          Decimal  @default(0) @db.Decimal(12, 2)
  deductionsBreakdown     Json?    // Array of deductions

  // Calculated Totals
  grossPay                Decimal  @db.Decimal(12, 2)
  totalDeductions         Decimal  @db.Decimal(12, 2)
  netPay                  Decimal  @db.Decimal(12, 2)

  // Pro-rata flags
  isProRata               Boolean  @default(false)
  proRataReason           String?  // "new_hire", "termination", "unpaid_leave"
  proRataCalculation      Json?    // Details of pro-rata calculation

  // Manual Adjustments
  hasAdjustments          Boolean  @default(false)
  adjustmentsTotal        Decimal  @default(0) @db.Decimal(12, 2)

  // Audit
  createdAt               DateTime @default(now())
  updatedAt               DateTime @default(now())
  processedBy             String?
  notes                   String?

  // Relations
  payrollPeriod           PayrollPeriod @relation(fields: [payrollPeriodId], references: [id], onDelete: Cascade)
  employee                Employee @relation(fields: [employeeId], references: [id])
  processor               User? @relation(fields: [processedBy], references: [id])
  payrollAdjustments      PayrollAdjustment[]

  @@unique([payrollPeriodId, employeeId])
  @@map("payroll_entries")
}

model PayrollAdjustment {
  id                String   @id
  payrollEntryId    String
  type              String   // "bonus", "penalty", "correction", "overtime", "allowance", "other"
  category          String?  // More specific categorization
  amount            Decimal  @db.Decimal(12, 2)
  isAddition        Boolean  @default(true) // true for additions, false for deductions
  description       String
  reason            String?
  approvedBy        String?
  approvedAt        DateTime?
  createdAt         DateTime @default(now())
  createdBy         String?

  // Relations
  payrollEntry      PayrollEntry @relation(fields: [payrollEntryId], references: [id], onDelete: Cascade)
  creator           User? @relation("payroll_adjustments_createdBy", fields: [createdBy], references: [id])
  approver          User? @relation("payroll_adjustments_approvedBy", fields: [approvedBy], references: [id])

  @@map("payroll_adjustments")
}

model PayrollExport {
  id                String   @id
  payrollPeriodId   String
  businessId        String
  year              Int
  month             Int
  fileName          String
  fileUrl           String   // URL to stored Excel file
  fileSize          Int      // File size in bytes
  format            String   @default("excel") // Future: "csv", "pdf"
  includesMonths    Int[]    // Array of months included (for multi-month exports)
  employeeCount     Int
  totalGrossPay     Decimal  @db.Decimal(12, 2)
  totalNetPay       Decimal  @db.Decimal(12, 2)
  exportedAt        DateTime @default(now())
  exportedBy        String
  generationType    String   // "single_month", "year_to_date", "custom_range"
  notes             String?

  // Relations
  payrollPeriod     PayrollPeriod @relation(fields: [payrollPeriodId], references: [id])
  business          Business @relation(fields: [businessId], references: [id])
  exporter          User @relation(fields: [exportedBy], references: [id])

  @@map("payroll_exports")
}

model EmployeeAdvance {
  id                String   @id
  employeeId        String
  amount            Decimal  @db.Decimal(12, 2)
  advanceDate       DateTime
  deductionAmount   Decimal  @db.Decimal(12, 2) // Amount to deduct per month
  totalMonths       Int      // Number of months to deduct
  remainingMonths   Int
  remainingBalance  Decimal  @db.Decimal(12, 2)
  status            String   @default("active") // active, completed, cancelled
  reason            String?
  approvedBy        String?
  approvedAt        DateTime?
  createdAt         DateTime @default(now())
  createdBy         String?
  notes             String?

  // Relations
  employee          Employee @relation("employee_advances_employeeId", fields: [employeeId], references: [id], onDelete: Cascade)
  approver          Employee? @relation("employee_advances_approvedBy", fields: [approvedBy], references: [id])
  creator           User? @relation(fields: [createdBy], references: [id])
  advancePayments   EmployeeAdvancePayment[]

  @@map("employee_advances")
}

model EmployeeAdvancePayment {
  id              String   @id
  advanceId       String
  amount          Decimal  @db.Decimal(12, 2)
  paymentDate     DateTime
  payrollPeriodId String?  // Link to payroll period
  processedBy     String?
  createdAt       DateTime @default(now())
  notes           String?

  // Relations
  advance         EmployeeAdvance @relation(fields: [advanceId], references: [id], onDelete: Cascade)
  processor       Employee? @relation(fields: [processedBy], references: [id])

  @@map("employee_advance_payments")
}

// Extensibility: For future pay slip data entry
model PaySlipEntry {
  id                String   @id
  payrollEntryId    String   @unique
  employeeId        String
  payrollPeriodId   String

  // Data from actual pay slip (3rd party system)
  grossPayActual    Decimal? @db.Decimal(12, 2)
  netPayActual      Decimal? @db.Decimal(12, 2)
  taxActual         Decimal? @db.Decimal(12, 2)
  pensionActual     Decimal? @db.Decimal(12, 2)
  otherDeductions   Json?    // Additional deductions from pay slip

  // Reconciliation
  isReconciled      Boolean  @default(false)
  variance          Decimal? @db.Decimal(12, 2) // Difference between calculated and actual
  varianceNotes     String?

  // Document storage
  paySlipUrl        String?  // Scanned/uploaded pay slip

  // Audit
  enteredAt         DateTime @default(now())
  enteredBy         String
  reconciledAt      DateTime?
  reconciledBy      String?

  // Relations
  employee          Employee @relation(fields: [employeeId], references: [id])
  entryUser         User @relation("payslip_entries_enteredBy", fields: [enteredBy], references: [id])
  reconcilerUser    User? @relation("payslip_entries_reconciledBy", fields: [reconciledBy], references: [id])

  @@map("payslip_entries")
}
```

---

## Excel Export Format Mapping

### Column Structure (Based on Provided Example):

| Column | Field Name | Source |
|--------|-----------|--------|
| A | ID Number | `employee.nationalId` |
| B | Employee Surname | `employee.lastName` |
| C | Employee First Names | `employee.firstName` |
| D | Date of Birth | `employee.dateOfBirth` (formatted) |
| E | Date Engaged | `employee.hireDate` (formatted) |
| F | Date Dismissed | `employee.terminationDate` (if applicable) |
| G | Basic Salary | `payrollEntry.baseSalary` |
| H | Commission | `payrollEntry.commission` |
| I | Living Allowance | `payrollEntry.livingAllowance` |
| J | Vehicle Allowance (Reimbursement) | `payrollEntry.vehicleAllowance` |
| K | Overtime | `payrollEntry.overtimePay` |
| L | Travel Allowance | `payrollEntry.travelAllowance` |
| M | Advances | `payrollEntry.advanceDeductions` |
| N | Loans | `payrollEntry.loanDeductions` |
| O | Misc Deductions | `payrollEntry.miscDeductions` |

### Additional Columns (Recommendations):

| Column | Field Name | Purpose |
|--------|-----------|---------|
| P | Gross Pay | Total before deductions |
| Q | Total Deductions | Sum of all deductions |
| R | Net Pay | Take-home amount |
| S | Work Days | Actual days worked |
| T | Sick Days | Days on sick leave |
| U | Leave Days | Days on annual leave |
| V | Notes | Special notes/adjustments |

---

## User Permissions

### New Permissions to Add:

```typescript
// Payroll Module Permissions
canAccessPayroll: boolean           // View payroll data
canManagePayroll: boolean          // Full payroll management
canCreatePayrollPeriod: boolean    // Create new payroll periods
canEditPayrollEntry: boolean       // Edit payroll entries
canApprovePayroll: boolean         // Approve payroll for export
canExportPayroll: boolean          // Generate Excel exports
canEnterPaySlips: boolean          // Enter actual pay slip data
canReconcilePayroll: boolean       // Reconcile payroll vs actuals
canViewPayrollReports: boolean     // View payroll reports
canManageAdvances: boolean         // Approve/manage salary advances
```

### Default Permission Sets:

- **Business Owner**: All payroll permissions
- **Business Manager**: All except `canApprovePayroll` (requires owner approval)
- **Payroll Manager**: All operational permissions (`canManagePayroll`, `canEditPayrollEntry`, `canExportPayroll`)
- **Employee**: None (future: view own payslips)

---

## Implementation Plan - Phased Approach

### Phase 1: Database Schema & Core Models (Week 1)
**Tasks:**
1. Add new Prisma models to schema
2. Create migration files
3. Add new permissions to permissions types
4. Update permission templates
5. Generate Prisma client
6. Test database migrations in development

**Deliverables:**
- Updated `schema.prisma`
- Migration files
- Updated `src/types/permissions.ts`
- Seed script for payroll permissions

---

### Phase 2: Backend APIs (Week 2)

#### API Endpoints to Create:

**Payroll Period Management:**
- `POST /api/payroll/periods` - Create new period
- `GET /api/payroll/periods` - List periods (with filters)
- `GET /api/payroll/periods/[periodId]` - Get period details
- `PUT /api/payroll/periods/[periodId]` - Update period
- `PUT /api/payroll/periods/[periodId]/status` - Change period status
- `DELETE /api/payroll/periods/[periodId]` - Delete draft period

**Payroll Entry Management:**
- `POST /api/payroll/periods/[periodId]/entries` - Create entry
- `GET /api/payroll/periods/[periodId]/entries` - List entries for period
- `GET /api/payroll/entries/[entryId]` - Get entry details
- `PUT /api/payroll/entries/[entryId]` - Update entry
- `POST /api/payroll/entries/[entryId]/calculate` - Recalculate totals
- `POST /api/payroll/periods/[periodId]/auto-populate` - Auto-create entries from employees

**Adjustments:**
- `POST /api/payroll/entries/[entryId]/adjustments` - Add adjustment
- `GET /api/payroll/entries/[entryId]/adjustments` - List adjustments
- `PUT /api/payroll/adjustments/[adjustmentId]` - Update adjustment
- `DELETE /api/payroll/adjustments/[adjustmentId]` - Delete adjustment

**Advances Management:**
- `POST /api/employees/[employeeId]/advances` - Create advance
- `GET /api/employees/[employeeId]/advances` - List advances
- `PUT /api/advances/[advanceId]` - Update advance
- `POST /api/advances/[advanceId]/payments` - Record payment

**Export:**
- `POST /api/payroll/periods/[periodId]/export` - Generate Excel
- `POST /api/payroll/export/yearly` - Generate yearly workbook
- `GET /api/payroll/exports` - List exports
- `GET /api/payroll/exports/[exportId]/download` - Download file

**Pay Slip Entry (Future):**
- `POST /api/payroll/entries/[entryId]/payslip` - Enter actual payslip
- `GET /api/payroll/entries/[entryId]/payslip` - Get payslip data
- `POST /api/payroll/entries/[entryId]/reconcile` - Reconcile entry

**Deliverables:**
- All API route files
- Validation schemas (Zod)
- Excel generation utility (using `exceljs` library)
- Calculation engine for payroll totals

---

### Phase 3: UI Components (Week 3)

#### Pages to Create:

1. **Payroll Dashboard** (`/payroll`)
   - List of payroll periods
   - Quick stats (employees, total payroll, pending approvals)
   - Recent exports
   - Quick actions (create period, export, etc.)

2. **Payroll Period Details** (`/payroll/periods/[periodId]`)
   - Period header (month, year, status)
   - Employee list with payroll entries
   - Summary totals
   - Actions (edit, approve, export)

3. **Payroll Entry Form** (`/payroll/periods/[periodId]/entries/[entryId]`)
   - Employee info (read-only)
   - Attendance inputs (work days, sick, leave)
   - Salary breakdown (auto-calculated)
   - Deductions (auto-populated from loans/deductions)
   - Manual adjustments
   - Preview of net pay

4. **Payroll Export** (`/payroll/export`)
   - Select export type (single month, year-to-date, full year)
   - Select periods to include
   - Preview data
   - Generate and download Excel

5. **Employee Advances** (`/employees/[employeeId]/advances`)
   - List of advances
   - Create new advance
   - View repayment schedule
   - Track remaining balance

6. **Payroll Reports** (`/payroll/reports`)
   - Monthly payroll summary
   - Deductions report
   - Loans/advances report
   - Year-over-year comparison

#### Components to Create:

- `PayrollPeriodCard` - Display period summary
- `PayrollEntryRow` - Employee payroll entry row
- `PayrollCalculator` - Real-time calculation display
- `PayrollStatusBadge` - Period status indicator
- `AdvanceForm` - Create/edit advance modal
- `AdjustmentForm` - Add payroll adjustment modal
- `ExportPreview` - Preview Excel data before export
- `PayrollSummaryStats` - Dashboard statistics

**Deliverables:**
- All page components
- All UI components
- Responsive layouts
- Dark mode support
- Form validation

---

### Phase 4: Excel Generation Engine (Week 3-4)

#### Excel Library: `exceljs`

**Features to Implement:**

1. **Single Month Tab:**
   - Employee rows with all data
   - Column headers matching 3rd party format
   - Auto-calculate totals
   - Formatting (borders, bold headers, currency)

2. **Multi-tab Workbook:**
   - One tab per month (e.g., "Jan 2025", "Feb 2025")
   - Summary tab with yearly totals
   - Conditional formatting for warnings (missing data, negative balances)

3. **Styling:**
   - Company branding (colors, logo)
   - Professional formatting
   - Print-ready layout
   - Freeze panes for headers

4. **Data Validation:**
   - Ensure all required fields present
   - Flag anomalies (unusually high/low values)
   - Validate calculations

**Deliverables:**
- `src/lib/payroll-excel-generator.ts`
- Template configuration
- File storage utilities
- Download handler

---

### Phase 5: Calculation Engine (Week 4)

#### Auto-calculation Functions:

```typescript
// Calculate gross pay
calculateGrossPay(entry: PayrollEntry): Decimal

// Calculate pro-rata for partial months
calculateProRata(baseSalary: Decimal, workDays: number, expectedDays: number): Decimal

// Calculate overtime pay
calculateOvertimePay(overtimeHours: Decimal, hourlyRate: Decimal): Decimal

// Calculate total deductions
calculateTotalDeductions(entry: PayrollEntry): Decimal

// Calculate net pay
calculateNetPay(grossPay: Decimal, totalDeductions: Decimal): Decimal

// Auto-populate loan deductions
getMonthlyLoanDeductions(employeeId: string, periodMonth: number, periodYear: number): LoanDeduction[]

// Auto-populate recurring deductions
getMonthlyDeductions(employeeId: string): Deduction[]

// Get active contract for period
getActiveContract(employeeId: string, periodStart: Date, periodEnd: Date): EmployeeContract

// Get contract benefits
getContractBenefits(contractId: string): ContractBenefit[]
```

**Deliverables:**
- `src/lib/payroll-calculations.ts`
- Unit tests for all calculation functions
- Validation rules

---

### Phase 6: Testing & Refinement (Week 5)

**Testing Checklist:**

1. **Unit Tests:**
   - Calculation functions
   - Pro-rata calculations
   - Loan deduction calculations
   - Benefit calculations

2. **Integration Tests:**
   - API endpoints
   - Database operations
   - Excel generation

3. **User Acceptance Testing:**
   - Create payroll period
   - Enter attendance data
   - Auto-populate employees
   - Add manual adjustments
   - Approve period
   - Generate Excel export
   - Verify Excel format matches requirements

4. **Edge Cases:**
   - New hire mid-month
   - Termination mid-month
   - Multiple active loans
   - Negative balances
   - Zero work days
   - Unpaid leave
   - Corrections to previous periods

**Deliverables:**
- Test suite
- Bug fixes
- Documentation
- User guide

---

## Additional Suggestions

### 1. **Payroll Notifications**
- Notify payroll manager when period is ready for approval
- Notify business owner when payroll needs approval
- Alert when loan balance is fully paid
- Remind when export is overdue

### 2. **Payroll Analytics Dashboard**
- Monthly payroll trends
- Department-wise costs
- Employee cost breakdown
- Deductions analysis
- Year-over-year comparisons

### 3. **Payroll Audit Trail**
- Track all changes to payroll entries
- Log who approved/exported
- Record manual adjustments with reasons
- Maintain history of recalculations

### 4. **Bulk Operations**
- Bulk import attendance from CSV
- Bulk apply adjustments (e.g., company-wide bonus)
- Bulk approve entries
- Bulk recalculate entries

### 5. **Integration Readiness**
- Design APIs with future integration in mind
- Support webhooks for payroll events
- Export in multiple formats (Excel, CSV, JSON, XML)
- API documentation for 3rd party integration

### 6. **Employee Self-Service (Future)**
- View own payroll history
- Download payslips
- View loan balances
- Request advances online
- View leave balance impact on pay

### 7. **Payroll Forecasting**
- Predict next month's payroll
- Budget vs actual comparison
- Alert if over budget
- Project annual payroll costs

### 8. **Compliance & Reporting**
- Tax withholding reports
- Pension contribution reports
- Government remittance reports
- Annual payroll summary for tax filing

### 9. **Multi-Currency Support**
- Handle employees paid in different currencies
- Exchange rate tracking
- Currency conversion reports

### 10. **Payroll Approval Workflow**
- Multi-level approval (payroll manager → business manager → owner)
- Approval comments
- Rejection with reasons
- Re-submission tracking

---

## Technical Stack Recommendations

### Excel Generation:
- **Library**: `exceljs` (most feature-rich)
- **Alternative**: `xlsx` (lighter weight)

### File Storage:
- **Local**: Store in `public/payroll-exports/` or `private/payroll-exports/`
- **Cloud**: AWS S3, Azure Blob, or Cloudinary (future)

### Calculations:
- **Library**: `decimal.js` or Prisma's `Decimal` type
- Avoid floating point errors with currency

### Date Handling:
- **Library**: `date-fns` (already in use)
- Timezone-aware calculations

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── payroll/
│   │       ├── periods/
│   │       │   ├── route.ts
│   │       │   └── [periodId]/
│   │       │       ├── route.ts
│   │       │       ├── entries/
│   │       │       │   └── route.ts
│   │       │       ├── export/
│   │       │       │   └── route.ts
│   │       │       └── status/
│   │       │           └── route.ts
│   │       ├── entries/
│   │       │   └── [entryId]/
│   │       │       ├── route.ts
│   │       │       ├── adjustments/
│   │       │       │   └── route.ts
│   │       │       └── calculate/
│   │       │           └── route.ts
│   │       ├── advances/
│   │       │   └── route.ts
│   │       └── exports/
│   │           ├── route.ts
│   │           └── [exportId]/
│   │               └── download/
│   │                   └── route.ts
│   └── payroll/
│       ├── page.tsx (dashboard)
│       ├── periods/
│       │   └── [periodId]/
│       │       └── page.tsx
│       ├── export/
│       │   └── page.tsx
│       └── reports/
│           └── page.tsx
├── components/
│   └── payroll/
│       ├── payroll-period-card.tsx
│       ├── payroll-entry-row.tsx
│       ├── payroll-calculator.tsx
│       ├── payroll-status-badge.tsx
│       ├── advance-form.tsx
│       ├── adjustment-form.tsx
│       ├── export-preview.tsx
│       └── payroll-summary-stats.tsx
└── lib/
    ├── payroll-calculations.ts
    ├── payroll-excel-generator.ts
    └── payroll-utils.ts

scripts/
└── seed-payroll-data.js (for testing)

prisma/
├── schema.prisma (updated)
└── migrations/
    └── YYYYMMDDHHMMSS_add_payroll_tables/
```

---

## Risk Mitigation

### Risks:

1. **Data Loss**: Accidentally deleting payroll data
   - **Mitigation**: Soft deletes, audit trail, backups

2. **Calculation Errors**: Wrong salary calculations
   - **Mitigation**: Extensive unit tests, manual review before export, reconciliation

3. **Permission Issues**: Unauthorized access to sensitive payroll data
   - **Mitigation**: Strict permission checks, audit logs

4. **Excel Format Mismatch**: 3rd party system rejects file
   - **Mitigation**: Template configuration, validation before export

5. **Partial Month Calculation Errors**: Pro-rata calculations incorrect
   - **Mitigation**: Test edge cases thoroughly, manual override option

6. **Loan Tracking Errors**: Incorrect balance updates
   - **Mitigation**: Transaction-based updates, reconciliation reports

---

## Success Metrics

1. **Accuracy**: 100% match between calculated and expected payroll
2. **Time Savings**: Reduce payroll processing time from X hours to Y hours
3. **User Adoption**: 100% of payroll managers using system by Month 3
4. **Error Rate**: < 1% manual corrections needed after export
5. **Audit Compliance**: Pass all payroll audits with complete audit trail

---

## Next Steps

1. **Review this plan** - Get stakeholder approval
2. **Schema review** - Verify database design
3. **Begin Phase 1** - Database schema implementation
4. **Set up development environment** - Install `exceljs`, configure file storage
5. **Create project tasks** - Break down into GitHub issues/tasks
6. **Kick off development** - Start with database migrations

---

## Questions for Clarification

1. **Tax Handling**: Should we include PAYE/tax calculations or is that handled by 3rd party? --- 3rd party
2. **Pension**: Should pension contributions be tracked separately?
3. **Currency**: All employees paid in same currency (USD, ZWL, etc.)?
4. **Payment Method**: Track how employees are paid (bank transfer, cash, mobile money)? Yes
5. **Bank Details**: Do we need to export bank details for direct deposit? ---NO
6. **Department/Cost Center**: Should payroll be segmented by department? -- No
7. **Approval Workflow**: How many approval levels required? --One
8. **Historical Data**: Do we need to import historical payroll data? --NO

---

**Document Version**: 1.0
**Created**: 2025-01-03
**Author**: Claude Code
**Status**: Draft - Awaiting Review
