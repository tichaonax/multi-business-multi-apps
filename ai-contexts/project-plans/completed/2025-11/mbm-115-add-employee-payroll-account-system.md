# Feature Development Session Template

> **Template Type:** Feature Development
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For creating new features, screens, or endpoints with structured planning.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents **IN THE EXACT ORDER LISTED BELOW**.

### Core Contexts (Load in this EXACT order - ONE AT A TIME)

**CRITICAL:** Read these files sequentially. Do not proceed to the next document until you have fully read and understood the previous one.

1. **FIRST:** `ai-contexts/master-context.md` - General principles and conventions
   - ⚠️ Contains critical instruction to read code-workflow.md
   - ⚠️ Defines operating principles
   - ⚠️ Contains mandatory workflow enforcement
   - ⚠️ Defines example adherence requirements

2. **SECOND:** `ai-contexts/code-workflow.md` - Standard workflow and task tracking
   - Contains MANDATORY workflow requirements
   - Requires creating project plan BEFORE any code changes
   - Defines approval checkpoint process

### Feature-Specific Contexts (Load as needed after core contexts)

- `ai-contexts/frontend/component-context.md` - For UI component development
- `ai-contexts/frontend/ui-context.md` - For UI consistency and styling
- `ai-contexts/backend/backend-api-context.md` - For API endpoint development
- `ai-contexts/backend/database-context.md` - For database schema changes
- `ai-contexts/testing/unit-testing-context.md` - For test coverage

### Optional Contexts

- Domain-specific contexts based on the module being developed

**How to load:** Use the Read tool to load each relevant context document before beginning work.

---

## 🚀 Session Objective

<!-- Fill in your specific feature requirements before starting -->

**Ticket:** MBM-115

**Feature Name:** Employee Payroll Account System

**Feature Description:**
<!-- Add detailed description of what the payroll account system should do -->
From the payroll management UI
we want to add a new functionality that allows employees to receive their salaries after a payroll generation.
We need to create a payroll account whose sole purpose is to make salary payments.
money is deposited into this account directly from expense accounts from respective businesses.
Each deposit will have a auto generated note as to where the money was deposited from if the account transfer occurred as payroll expense from the respective business. If the deposit is made from the payroll account itself then the user will select source from eligible businesses account balance. You can only transfer as if the respective business has balance. In such situation the respective business is automatically debited with a business payroll expense automatically. The transaction must track who made such transaction.
Only managers who have payroll permissions can make these transactions, they a need to have payroll transaction permission in the respective businesses. In other  words they can only transfer payroll expenses into the payroll account only from the businesses they have payroll permissions for transfer. We may need new permissions to handle this.

When making salary payments the UI should allow entering many employee payments at the same time. The UI should show eligible employees in a list with ability to disable payments to some employees as well as ability to adjust amount with a note.

There should also be a UI to allow payment to be made at any time for example an employee may request salary advance before payroll run or simply we want to pay one employee earlier after payroll is run.

After the payments are entered into the system each employee must get a payment voucher they need to sign to indicate they received the money and the payroll manager will then mark that transaction as complete. The employee payment voucher will have the employee details and amount they received and can be regenerated anytime by going back to the payroll payment history.

No other transaction except for payroll are allowed in the payroll account.
once payments are made and signed that record cannot be changed or deleted


**Questions Answered:**
 - Will payroll accounts track salary, hourly
  wages, or both?

We will keep this initially very simple its just tracking the payslip payments. A 3rd party is responsible for determining
taxes, etc. The one thing important to track is employee salary advances and any deductions that must happen during the payments.

  - Do you need commission tracking integrated with     
  sales? ---- Yes we want commission tracking

  - Should it support different payment schedules       
  (weekly, bi-weekly, monthly)? ---- Yes

  - Does it need to track deductions (taxes,
  benefits, etc.)? --- NO this is done by third party see note above for what we should track for now

  - Should it integrate with existing employee
  records? --YES very important

  - Do you need payroll history and reporting?  ---Yes very important

**Target Module/Component:**
- Payroll management module (new dedicated payroll account system)
- Business accounts (for deposits)
- Business expenses (integration for auto-deposits)
- Employee management (payment tracking)
- Payroll periods (integration for automatic payments)
- Permission system (new payroll account permissions)

**API Endpoints (if applicable):**

### New API Endpoints (10 total):

1. **`/api/payroll/account`** (GET, POST) - Get account details, create payroll account
2. **`/api/payroll/account/balance`** (GET) - Get current balance and transaction summary
3. **`/api/payroll/account/deposits`** (GET, POST) - List deposits, make new deposit
4. **`/api/payroll/account/payments`** (GET, POST) - List payments, create batch/single payment
5. **`/api/payroll/account/payments/[paymentId]`** (GET, PATCH, DELETE) - Get, update, delete payment
6. **`/api/payroll/account/payments/[paymentId]/voucher`** (GET, POST) - Get/regenerate voucher
7. **`/api/payroll/account/payments/[paymentId]/sign`** (POST) - Mark payment as signed
8. **`/api/payroll/account/payments/[paymentId]/complete`** (POST) - Mark payment as completed
9. **`/api/payroll/account/history`** (GET) - Get full transaction history
10. **`/api/payroll/account/reports`** (GET) - Generate payment reports with filters

### Modified API Endpoints:

- **`/api/business/[businessId]/expenses`** - Add logic to auto-create payroll deposit when expense is payroll type
- **`/api/payroll/entries`** - Link payroll entries to payments when approved

**UI/UX Requirements:**

### New UI Pages (10 total):

1. **Payroll Account Dashboard** (`/payroll/account/page.tsx`)
   - Display current balance with visual card
   - Show recent deposits and payments (last 10 transactions)
   - Quick action buttons: Make Deposit, Process Payments, Salary Advance, View History
   - Low balance alerts (< $1000)
   - Summary cards: Total deposits this month, Total payments this month, Pending payments count

2. **Deposit Management** (`/payroll/account/deposits/page.tsx`)
   - Business account selection dropdown (filter by permission - only businesses with payroll deposit permission)
   - Amount input with currency formatting
   - Real-time balance validation (prevent overdraft from business account)
   - Auto-generated note preview: "Deposit from [Business Name] payroll expense"
   - Deposit history table with pagination (Date, Business, Amount, Type, Created By)
   - Search and filter by business and date range

3. **Batch Payment Processing** (`/payroll/account/payments/page.tsx`)
   - Employee list table with columns: Checkbox, Name, Employee Number, Base Salary, Adjusted Amount, Note
   - Select all / Deselect all checkboxes
   - Individual amount adjustment inputs per employee
   - Note field per employee for adjustment reason
   - Total payment amount calculation (live update)
   - Balance validation before submission
   - Confirmation dialog using `useConfirm` hook
   - Success notification using `useAlert` hook

4. **Salary Advance Payment** (`/payroll/account/payments/advance/page.tsx`)
   - Employee search component (autocomplete)
   - Employee details display (name, number, national ID)
   - Amount input with validation
   - Reason/note textarea
   - Instant payment processing button
   - Auto-generate voucher after payment
   - Success message with voucher download link

5. **Payment History** (`/payroll/account/payments/history/page.tsx`)
   - Payment history table with columns: Date, Employee, Amount, Type, Status, Actions
   - Filters: Employee dropdown, Date range (DateInput component), Status, Payment Type
   - Status badges (color-coded): Pending, Voucher Issued, Signed, Completed
   - Actions: View Voucher, Regenerate Voucher, Mark as Complete (if manager)
   - Export to Excel button
   - Pagination with page size selector

6. **Payment Voucher Component** (`/components/payroll/payment-voucher.tsx`)
   - Printable layout (A4 size)
   - Company branding/logo area
   - Voucher number (unique, sequential)
   - Employee details: Name, Employee Number, National ID
   - Payment amount (large, bold font)
   - Payment date (formatted using global date format)
   - Signature section with date line
   - Regeneration timestamp if regenerated
   - Print button (hidden on print)

### UI Components:

- **Account Balance Card** - Display balance with trend indicators
- **Employee Payment Row** - Reusable row for batch payment table
- **Deposit Form** - Form for making deposits
- **Payment Status Badge** - Color-coded status indicators
- **Transaction History Table** - Shared table for deposits and payments

### UX Considerations:

- All date inputs use `DateInput` component (global settings compliant)
- All confirmations use `useConfirm` hook (no browser confirm dialogs)
- All alerts use `useAlert` hook (no browser alert dialogs)
- Success messages use toast notifications
- Form validation with inline error messages
- Loading states for all async operations
- Optimistic UI updates where applicable
- Disabled states for locked/signed payments
- Clear visual indicators for immutable records

**Custom UI Patterns (from `custom/use-custom-ui.md`):**
- Use `useAlert()` hook instead of browser alert()
- Use `useConfirm()` hook instead of browser confirm()
- Success messages via toast notifications or alert system
- Consistent styling with app's design system



## Global Settings Compliance

**CRITICAL:** Any UI that involves dates, phone numbers, or driver's licenses MUST conform to global settings.

### Required Components for Input Fields:


1. **Date Inputs**: Always use `@/components/ui/date-input` for consistent date formatting
2. **Phone Number Inputs**: Always use `@/components/ui/phone-number-input` for proper phone formatting 
3. **National ID Inputs**: Always use `@/components/ui/national-id-input` for ID validation and formatting
4. **Driver License Inputs**: Always use `@/components/ui/driver-license-input` when applicable

### Display Formatting:

1. **Date Display**: Use `formatDateByFormat(dateString, globalDateFormat)` from `@/lib/country-codes`
2. **Phone Display**: Use `formatPhoneNumberForDisplay(phoneNumber)` from `@/lib/country-codes`
3. **Import Settings Context**: Use `useDateFormat()` from `@/contexts/settings-context` for global date format

### Example Usage:
```tsx
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { DateInput } from '@/components/ui/date-input'

const { format: globalDateFormat } = useDateFormat()
const formatDate = (dateString: string) => formatDateByFormat(dateString, globalDateFormat)
```

**Remember**: Global settings ensure consistent user experience across different regions and countries. Always use these components and formatting functions instead of raw HTML inputs or browser defaults.

### **MANDATORY TEMPLATE INPUTS REMINDER**

**⚠️ CRITICAL DEVELOPER REMINDER**: When creating ANY form that captures user data, you MUST use the appropriate template input components:

#### **Required for ALL Forms Containing:**
- 📱 **Phone Numbers**: MUST use `PhoneNumberInput` - Never use basic `<input type="tel">`
- 🆔 **National IDs**: MUST use `NationalIdInput` with template validation
- 📅 **Dates**: MUST use `DateInput` with global date format support
- 🚗 **Driver Licenses**: MUST use `DriverLicenseInput` when applicable


**Acceptance Criteria:**

### Functional Requirements:

✅ **Payroll Account Management**
- [ ] Dedicated payroll account created successfully with unique account number
- [ ] Account balance displays correctly on dashboard
- [ ] Balance updates in real-time after deposits and payments
- [ ] Only one global payroll account exists initially

✅ **Deposit Management**
- [ ] Can deposit funds from any business account where user has payroll deposit permission
- [ ] Business account is automatically debited when deposit is made
- [ ] Auto-generated note includes source business name
- [ ] Cannot deposit if business account has insufficient balance
- [ ] Deposit history displays all transactions with correct details
- [ ] Payroll expenses automatically create deposits

✅ **Batch Payment Processing**
- [ ] Can view list of eligible employees for batch payment
- [ ] Can enable/disable individual employee payments via checkbox
- [ ] Can adjust payment amounts with mandatory note for adjustments
- [ ] Total payment amount calculates correctly
- [ ] Cannot process batch payment if payroll account has insufficient balance
- [ ] Batch payment creates individual payment records for each employee
- [ ] Payment vouchers automatically generated for each payment

✅ **Salary Advance Payments**
- [ ] Can search and select any active employee
- [ ] Can process individual advance payment at any time
- [ ] Advance payment marked with `isAdvance: true` flag
- [ ] Advance deductions tracked in `deductions` JSON field
- [ ] Voucher generated immediately after payment

✅ **Payment Vouchers**
- [ ] Voucher displays employee name, employee number, national ID
- [ ] Voucher shows payment amount and date (formatted per global settings)
- [ ] Voucher has unique sequential number
- [ ] Voucher can be regenerated at any time from payment history
- [ ] Regeneration count tracked and displayed
- [ ] Voucher is printable (A4 size)

✅ **Payment Signing & Completion**
- [ ] Employee can sign payment voucher
- [ ] Signed payments are locked (isLocked = true)
- [ ] Locked payments cannot be edited or deleted
- [ ] Manager can mark signed payment as completed
- [ ] Payment status updates: PENDING → VOUCHER_ISSUED → SIGNED → COMPLETED

✅ **Payment History & Reporting**
- [ ] Payment history displays all payments with correct status
- [ ] Can filter by employee, date range, status, payment type
- [ ] Date range uses `DateInput` component (global settings compliant)
- [ ] Can view and regenerate vouchers from history
- [ ] Can export payment report to Excel
- [ ] Report includes all payment details and filters applied

✅ **Permissions & Security**
- [ ] Only users with `canAccessPayrollAccount` can access payroll account pages
- [ ] Only users with `canMakePayrollDeposits` can make deposits
- [ ] Only users with `canMakePayrollPayments` can process payments
- [ ] Can only deposit from businesses where user has payroll deposit permission
- [ ] Permission checks enforced on all API endpoints
- [ ] Audit trail tracks who created, signed, and completed each payment

✅ **Commission Tracking**
- [ ] Payment record includes `commissionAmount` field
- [ ] Commission amount stored separately from base salary
- [ ] UI displays commission amount in payment history
- [ ] Commission tracking structure ready for sales integration (future phase)

✅ **Payment Schedules**
- [ ] Payment record includes `paymentSchedule` field (WEEKLY, BIWEEKLY, MONTHLY)
- [ ] Payment schedule tracked for reporting purposes
- [ ] UI displays payment schedule in payment history

✅ **Data Integrity**
- [ ] All balance updates use database transactions
- [ ] Concurrent deposits/payments handled correctly (no race conditions)
- [ ] Signed payments cannot be modified (database constraint)
- [ ] Deleted payments only allowed if not signed
- [ ] Balance calculations accurate to 2 decimal places

### Non-Functional Requirements:

✅ **Performance**
- [ ] API response time < 500ms for list endpoints
- [ ] Batch payment processing < 2s for 50 employees
- [ ] Voucher generation < 3s per voucher
- [ ] Dashboard loads in < 1s

✅ **Security**
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Permission checks on all endpoints
- [ ] Audit trail for all transactions
- [ ] Sensitive data encrypted in transit (HTTPS)

✅ **Usability**
- [ ] All forms use custom UI hooks (`useAlert`, `useConfirm`)
- [ ] All date inputs use global date format
- [ ] Clear error messages for validation failures
- [ ] Loading states for all async operations
- [ ] Success notifications for completed actions

---

## 📐 Technical Specifications

<!-- Add technical details, architecture notes, or design patterns -->

**Technologies:**
- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **PDF Generation**: pdf-lib or puppeteer (for payment vouchers)
- **Excel Export**: xlsx library
- **State Management**: React hooks, Context API
- **Form Handling**: React Hook Form (if complex forms)
- **Validation**: Zod schemas for API validation

**Dependencies:**
- `@prisma/client` - Existing (Prisma ORM)
- `pdf-lib` or `puppeteer` - NEW (PDF voucher generation)
- `xlsx` - NEW (Excel report export)
- `react-hook-form` - Existing (Form management)
- `zod` - Existing (Validation schemas)

**Data Models:**

### New Database Tables (4 tables):

#### 1. **payroll_accounts**
- Stores payroll account details
- One global account initially (businessId = null)
- Tracks balance (Decimal 12,2)
- Relations: Business (optional), User (creator), Deposits, Payments

#### 2. **payroll_account_deposits**
- Tracks all deposits into payroll account
- Links to source business
- Auto-generated note field
- Transaction type: PAYROLL_EXPENSE or MANUAL_TRANSFER
- Optional link to BusinessExpense record
- Indexed on: payrollAccountId + depositDate

#### 3. **payroll_payments**
- Stores all employee payments
- Links to: Employee, PayrollEntry (optional), PayrollAccount
- Tracks: amount, adjustments, payment type, schedule, status
- Commission and deduction tracking (JSON fields)
- Multiple user relations: created, signed, completed
- Immutability flag: `isLocked` (true after signing)
- Indexed on: employeeId + paymentDate, payrollAccountId + status

#### 4. **payroll_payment_vouchers**
- Stores payment voucher details
- Unique sequential voucher number
- Employee details snapshot (name, number, nationalId)
- Regeneration tracking (count, last timestamp)
- Optional signature data (Base64 or text)
- Indexed on: voucherNumber

### New Permissions (9 permissions):

Added to `CoreBusinessPermissions` interface:
```typescript
canAccessPayrollAccount: boolean;
canViewPayrollAccountBalance: boolean;
canMakePayrollDeposits: boolean;
canMakePayrollPayments: boolean;
canAdjustPaymentAmounts: boolean;
canIssuePaymentVouchers: boolean;
canCompletePayments: boolean;
canViewPayrollHistory: boolean;
canExportPayrollPayments: boolean;
```

**Integration Points:**

### 1. **BusinessAccounts Integration**
- **When**: Deposit is made from business to payroll account
- **Action**: Debit business account balance
- **Validation**: Ensure sufficient balance before deposit
- **Transaction**: Use database transaction for atomic update

### 2. **BusinessExpenses Integration**
- **When**: Payroll expense is created
- **Action**: Auto-create deposit in payroll account
- **Link**: Store BusinessExpense ID in PayrollAccountDeposits
- **Note**: Auto-generate note with business name

### 3. **PayrollEntries Integration**
- **When**: Payroll period is approved
- **Action**: Create batch PayrollPayments records
- **Link**: Store PayrollEntry ID in PayrollPayments
- **Amount**: Use netPay from PayrollEntry

### 4. **Employees Integration**
- **When**: Payment is created
- **Link**: Store employee ID in PayrollPayments
- **Display**: Show payment history in employee profile
- **Validation**: Only allow payments to active employees

### 5. **BusinessMemberships Integration**
- **When**: User accesses payroll account features
- **Check**: Verify user has required permissions in business
- **Filter**: Show only businesses where user has payroll deposit permission
- **Audit**: Track user ID for all transactions

### 6. **Commission Tracking Integration** (Future Phase)
- **When**: Sales are recorded
- **Calculate**: Commission based on employee sales
- **Store**: Commission amount in PayrollPayments
- **Display**: Show commission breakdown in voucher

### 7. **Reporting Integration**
- **Source**: PayrollPayments, PayrollAccountDeposits
- **Export**: Excel format with all payment details
- **Filters**: Date range, employee, status, payment type
- **Format**: Use global date format for all dates

---

## 🧪 Testing Requirements

<!-- Define test coverage expectations -->

**Unit Tests:**

### Balance Calculation Functions (`src/lib/payroll-account-utils.ts`)
- [ ] Calculate balance from deposits and payments
- [ ] Handle edge cases (zero balance, negative attempts)
- [ ] Decimal precision (2 places)
- [ ] Currency formatting

### Permission Checking Utilities
- [ ] Check payroll deposit permission for specific business
- [ ] Check payroll payment permission
- [ ] Validate business membership
- [ ] Handle missing permissions gracefully

### Voucher Number Generation
- [ ] Generate unique sequential numbers
- [ ] Handle concurrent generation
- [ ] Format: "PAY-YYYY-MM-NNNNNN"

### Payment Validation Logic
- [ ] Validate payment amount (positive, 2 decimals)
- [ ] Validate employee eligibility (active, exists)
- [ ] Validate payroll account balance (sufficient funds)
- [ ] Validate adjustment notes (required when amount adjusted)

**Integration Tests:**

### Deposit Creation with Business Account Debit
- [ ] Create deposit → verify business account debited
- [ ] Create deposit with insufficient business balance → should fail
- [ ] Auto-create deposit from payroll expense → verify both records created
- [ ] Verify auto-generated note format

### Payment Creation with Payroll Account Debit
- [ ] Create payment → verify payroll account debited
- [ ] Create payment with insufficient payroll balance → should fail
- [ ] Batch payment → verify all payments created
- [ ] Verify payment vouchers auto-generated

### Payment Signing and Locking
- [ ] Sign payment → verify isLocked = true
- [ ] Attempt to edit locked payment → should fail
- [ ] Attempt to delete locked payment → should fail
- [ ] Verify signed payment status changes

### Voucher Generation
- [ ] Generate voucher for payment
- [ ] Regenerate voucher → verify count incremented
- [ ] Verify voucher number uniqueness
- [ ] PDF generation successful

### Permission-Based Access Control
- [ ] Access payroll account without permission → should fail (401/403)
- [ ] Deposit from business without permission → should fail
- [ ] Make payment without permission → should fail
- [ ] View history without permission → should fail

**E2E Tests:**

### Full Deposit Flow
1. User logs in with payroll manager role
2. Navigate to payroll account dashboard
3. Click "Make Deposit" button
4. Select business from dropdown (filter by permission)
5. Enter deposit amount
6. See auto-generated note preview
7. Submit deposit form
8. Verify success notification
9. Verify balance updated on dashboard
10. Verify deposit appears in history table
11. Verify business account balance decreased

### Full Batch Payment Flow
1. User logs in with payroll manager role
2. Navigate to payroll account payments page
3. See list of eligible employees
4. Select multiple employees (checkboxes)
5. Adjust amount for one employee with note
6. See total payment calculation update
7. Click "Process Batch Payment"
8. Confirm using useConfirm dialog
9. Verify success notification with payment count
10. Verify vouchers generated for all payments
11. Navigate to payment history
12. Verify all payments listed with VOUCHER_ISSUED status

### Salary Advance Flow
1. User logs in with payroll manager role
2. Navigate to salary advance page
3. Search for employee (autocomplete)
4. Select employee → see details displayed
5. Enter advance amount and reason
6. Click "Process Advance Payment"
7. Verify success notification
8. Verify voucher auto-generated and downloadable
9. Navigate to payment history
10. Verify advance payment listed with isAdvance flag

### Sign Payment Flow
1. Open payment voucher from history
2. Employee signs voucher (manual process)
3. Payroll manager clicks "Mark as Signed"
4. Verify payment status changes to SIGNED
5. Verify payment is now locked
6. Attempt to edit payment → verify disabled/error
7. Attempt to delete payment → verify disabled/error

### Complete Payment Flow
1. Open signed payment from history
2. Payroll manager clicks "Mark as Complete"
3. Verify payment status changes to COMPLETED
4. Verify completedBy and completedAt fields set
5. Verify payment remains locked

### Payment History Filtering
1. Navigate to payment history page
2. Select employee from dropdown filter
3. Verify only that employee's payments shown
4. Select date range using DateInput
5. Verify only payments in range shown
6. Select payment status filter
7. Verify only payments with that status shown
8. Clear all filters
9. Verify all payments shown again

### Export Payment Report
1. Navigate to payment history page
2. Apply filters (employee, date range, status)
3. Click "Export to Excel"
4. Verify Excel file downloads
5. Open file → verify data matches filtered results
6. Verify date formatting uses global date format
7. Verify all columns present (date, employee, amount, type, status, etc.)

### Permission-Based Access
1. User without `canAccessPayrollAccount` logs in
2. Attempt to navigate to `/payroll/account`
3. Verify redirect or 403 error
4. User with limited permissions logs in
5. Navigate to deposit page
6. Verify only businesses with permission shown in dropdown
7. Attempt to access business without permission (direct API call)
8. Verify 403 error

### Concurrent Deposit/Payment Handling
1. Two users simultaneously make deposits
2. Verify both succeed
3. Verify balance updated correctly (sum of both)
4. Two users simultaneously process payments
5. Verify balance updated correctly
6. Verify no race conditions or duplicate payments

---

## 📝 Session Notes

### Key Constraints:

1. **Single Global Payroll Account**: Initial implementation uses one account. Can extend to business-specific accounts later.

2. **Immutability After Signing**: CRITICAL - Once payment is signed, it CANNOT be modified or deleted. This is enforced at database level with `isLocked` flag and API validation.

3. **Permission-Based Access**: Strict permission checking required on ALL endpoints. Users can only deposit from businesses where they have explicit payroll deposit permission.

4. **Auto-Generated Deposits**: When a business expense with payroll type is created, a deposit must be automatically created in the payroll account with a link to the expense.

5. **Balance Integrity**: ALL balance updates (deposits and payments) MUST use database transactions to ensure atomic operations and prevent race conditions.

6. **Voucher Regeneration**: Vouchers can be regenerated unlimited times for reprints, but regeneration count must be tracked and displayed.

7. **Commission Tracking**: Structure is in place for commission tracking, but integration with sales system is a future enhancement.

8. **Payment Schedules**: Payment schedule field is for tracking/reporting only. Automatic scheduling is a future enhancement.

### Security Considerations:

- **SQL Injection**: Use Prisma parameterized queries (built-in protection)
- **XSS**: Sanitize all user inputs before display
- **Permission Bypass**: Double-check permissions on API and UI
- **CSRF**: Use Next.js built-in CSRF protection
- **Audit Trail**: Log all transactions with user ID and timestamp

### Performance Optimizations:

- **Database Indexes**: Added on frequently queried columns (employeeId + paymentDate, payrollAccountId + status)
- **Pagination**: Implement pagination on all list endpoints (deposits, payments, history)
- **Caching**: Cache payroll account balance for dashboard (invalidate on updates)
- **Lazy Loading**: Use lazy loading for employee list in batch payment UI
- **Optimistic Updates**: Use optimistic UI updates for better UX (with rollback on error)

### Future Enhancements (Not in Current Scope):

1. Business-specific payroll accounts (vs single global account)
2. Automated payment scheduling based on payment schedule field
3. Digital signature capture for vouchers (vs manual signing)
4. SMS/Email notifications for payments
5. Commission calculation from sales data
6. Payroll payment approval workflow
7. Multi-currency support
8. Bank integration for direct deposits
9. Payroll account reconciliation tools
10. Advanced reporting and analytics

---

## ✅ REQUIREMENTS SYNCHRONIZED

**Status:** Requirements have been synchronized with project plan MBM-115

**Project Plan:** `ai-contexts/project-plans/active/projectplan-mbm-115-add-employee-payroll-account-system-2025-11-24.md`

**Last Updated:** 2025-11-24

All technical specifications, database schemas, API endpoints, UI requirements, acceptance criteria, and testing requirements have been extracted from the project plan and added to this requirements document.

---
