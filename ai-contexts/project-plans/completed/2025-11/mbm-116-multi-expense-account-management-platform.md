# Feature Development Context

**Ticket:** mbm-116
**Feature:** Multi Expense Account Management Platform
**Date Created:** 2025-11-25
**Status:** Requirements Complete - Synced with Project Plan
**Last Synced:** 2025-11-25

---

## 📋 Feature Overview

**Brief Description:**
Create a comprehensive multi-expense account management platform that enables admins to create dedicated expense accounts, authorized users to add funds and make payments to various payee types (users, employees, contractors, businesses), track all expenses with receipt information, process batch payments with real-time balance validation, and generate detailed reports with charts showing spending patterns. The system includes bidirectional navigation between expense accounts and payee management pages.

**Problem Statement:**
Currently, there is no dedicated system to manage expense accounts for tracking payments to contractors, employees, businesses, and individuals. We need a centralized platform to manage multiple expense accounts, track all outgoing payments with proper categorization, maintain account balances, prevent overspending, and generate comprehensive reports showing where funds are being spent. Additionally, we need to track all payments to a specific payee across multiple accounts for better financial oversight.

**Expected Outcome:**
Users will be able to:
- Create and manage multiple dedicated expense accounts
- Add funds from businesses (with automatic business account debiting) or manually
- Make payments to any payee in the system (users, employees, contractors, businesses)
- Create individual payees on-the-fly with readable IDs
- Process batch payments with real-time balance validation and insufficient funds prevention
- Track receipt information for audit trails
- View comprehensive reports with charts showing expense breakdowns by category, payee, and account
- Receive dashboard alerts when account balances are low
- Navigate from payee management pages to see all expense account payments to that payee, segregated by account
- Navigate from expense accounts to payee detail pages for further information

---

## 🎯 Requirements

### Functional Requirements

We want to introduce an expense account management system with the following capabilities
1. Create a new expense account
2. Ability to add funds
3. Make and track expenses
4. Use existing expense categories whether business or personal categories
5. Payments can only be made to people in the system.
6. Payees can be users, employees, contractors individuals, businesses, but they must be in the system
7. Individual payees can be created on the fly. Individual payees will be assigned readable ids, we must capture Full name, optional values are national id, telephone number,
8. Each expense payment will have an optional brief note
9. Payments can be batched as inputs and at each level the system must calculate available funds and must stop further entries when insufficient funds. Ability to add funds can happen anytime without loosing unsubmitted work.
10. When everything in the batch is entered user can submit and all that is processed at once.
11. Every entry will have a transaction date, dates can be in the past so that we capture old receipts.
12. If payment is against a receipt then we need to capture minimal receipt information to understand the reason for the expense. this should include receipt number, service provider, reason for payment, full payment or part payment.
13.The account is for making expenses only and nothing else.
14.If expense categories have emojis use them
15. Only admins, managers or users with the special permissions can create expenses
16. Only admins can create new expense accounts
17. Only admins and users with special permission can add money to the expense accounts.
18. If a deposit comes from a business the business must be automatically debited with the right expense category for that business.
19. Detailed reports, and with graphs, charts that show where most expense are going.
20. If an account is running low in funds the alert must show on the dashboard and user can click on the alert to be taken to the respective account home page.
21. If a payment is made to an individual, contractor or business I should be able to have report for expenses against such a payee, contractor or business.
22. A contractor, payee or business can get paid from multiple expense accounts.
23. From the contractor or individual or business I should be able to get all the payments made segregated by account.
24. In other words if I go to contractor management or business management page I should be able to link back to the payment accounts (bidirectional navigation).

### User Stories

**As a** system administrator
**I want** to create dedicated expense accounts with custom names and low-balance thresholds
**So that** I can organize expenses by project, department, or purpose and monitor account health

**As a** manager with deposit permissions
**I want** to add funds from a business account to an expense account
**So that** the expense account has sufficient balance and the business account is automatically debited with proper expense categorization

**As a** user with payment permissions
**I want** to create batch payments to multiple payees with real-time balance validation
**So that** I can efficiently process multiple expenses at once without overspending the account

**As a** user making payments
**I want** to create individual contractors on-the-fly during payment entry
**So that** I can pay new contractors without leaving the payment workflow

**As a** financial manager
**I want** to view all payments made to a specific contractor across all expense accounts
**So that** I can track total spending with that contractor for contract negotiations and budgeting

**As a** contractor
**I want** to navigate from my contractor profile to see all expense account payments made to me
**So that** I can verify payments from different accounts and reconcile my invoices

**As a** dashboard user
**I want** to see low-balance alerts on the dashboard with click-through to account details
**So that** I can proactively add funds before the account runs out

**As a** reporting user
**I want** to generate expense reports with pie charts and trend analysis by category and payee
**So that** I can identify spending patterns and make informed budget decisions

### Business Logic

**Account Management:**
- Only admins can create new expense accounts
- Each expense account has a unique account number (auto-generated) and account name
- Accounts have configurable low-balance thresholds (default: $500)
- Low-balance alerts: Critical (<$500), Warning (<$1000), Normal (≥$1000)
- Accounts are for expenses only, no deposits from external sources besides businesses or manual entry

**Deposit Rules:**
- Only admins and users with special permission can add money to expense accounts
- When deposit source is a business, the business account must be automatically debited
- Business debit creates a BusinessTransaction record with type=DEBIT and referenceType=EXPENSE_ACCOUNT_DEPOSIT
- Business must have sufficient balance before deposit is allowed
- Deposits support past dates for historical record-keeping
- Each deposit has an auto-generated note (editable) describing the source

**Payment Rules:**
- Only admins, managers, or users with special permissions can create payments
- Payments can only be made to payees in the system (Users, Employees, Persons, Businesses)
- Batch payment processing: Calculate running balance after each entry
- If insufficient funds detected during batch entry, stop further entries and alert user
- User can add funds mid-batch without losing unsubmitted work
- Payments support past transaction dates for capturing old receipts
- Once submitted, payments are immutable (cannot be edited or deleted)
- DRAFT payments can be edited or deleted
- Each payment requires: payee, expense category, amount, payment date
- Optional fields: notes, receipt information (receipt number, service provider, reason, full/partial payment indicator)

**Payee Management:**
- Individual payees (contractors) can be created on-the-fly during payment entry
- Individual payees get auto-generated readable IDs (e.g., IND-001, IND-002)
- Required fields: Full name
- Optional fields: National ID (unique), phone number (validated)
- A payee can receive payments from multiple expense accounts
- All payments to a payee are tracked and can be viewed segregated by account

**Balance Validation:**
- Real-time balance calculation: Total Deposits - Total Submitted Payments
- Prevent negative balances (insufficient funds validation)
- Amount validation: Must be > 0, ≤ 999,999,999.99, maximum 2 decimal places
- Use Prisma Decimal(12,2) for all monetary amounts to prevent floating-point errors

**Reporting:**
- Account-level reports: Expenses by category, expenses by payee, expense trends over time
- Payee-level reports: All payments to specific payee across all accounts, grouped by account
- Charts: Pie charts for category breakdown, bar charts for account comparison, line charts for trends
- All reports support date range filtering

**Permissions:**
- canAccessExpenseAccount: View expense accounts (all roles with access)
- canCreateExpenseAccount: Create new accounts (admin only)
- canMakeExpenseDeposits: Add funds to accounts (admin + special permission)
- canMakeExpensePayments: Create payments (admin, manager, special permission)
- canViewExpenseReports: View reports and charts (admin, manager, special permission)
- canCreateIndividualPayees: Create contractors on-the-fly (admin, manager, special permission)
- canDeleteExpenseAccounts: Delete accounts (admin only)
- canAdjustExpensePayments: Edit payment amounts (special permission only)

**Bidirectional Navigation:**
- From expense account payment list → Click payee name → Navigate to payee detail page (employee, contractor, business)
- From payee detail page → View "Expense Account Payments" section → Click account name/number → Navigate to expense account detail page
- Payee expense section shows: Total paid, payment count, number of accounts, payments grouped by account

---

## 🎨 UI/UX Requirements
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



### Screens/Pages Needed

1. **Expense Accounts List Page** (`/expense-accounts`) - Shows all expense accounts with balance, status, low-balance indicators. Includes search/filter. "Create New Account" button for admins.

2. **Expense Account Detail Page** (`/expense-accounts/[accountId]`) - Main account management page with tabs:
   - Overview: Quick stats, recent transactions
   - Deposits: Deposit history + Deposit form (if canMakeExpenseDeposits)
   - Payments: Payment history + Payment form with batch support (if canMakeExpensePayments)
   - Transactions: Combined deposits and payments in chronological order

3. **Expense Account Reports Page** (`/expense-accounts/[accountId]/reports`) - Detailed reports with charts:
   - Expense breakdown pie chart (by category)
   - Expense trends line chart (over time)
   - Top payees table
   - Summary stats cards
   - Date range filter

4. **Create Expense Account Page** (`/expense-accounts/new`) - Full-page account creation form (admin only)

5. **Dashboard Enhancement** - Add low-balance alerts section with click-through to account detail

6. **Payee Management Page Integration** - Add "Expense Account Payments" section to existing pages:
   - Employee detail page (`/employees/[employeeId]`)
   - Contractor/Person detail page (`/persons/[personId]`)
   - Business detail page (`/businesses/[businessId]`)
   - User management page (if exists)

### User Flows

**Flow 1: Create Expense Account and Add Funds (Admin)**
1. Admin navigates to /expense-accounts
2. Clicks "Create New Account" button
3. Fills form: Account Name, Description, Low Balance Threshold
4. Submits → Account created with auto-generated account number
5. Redirected to account detail page
6. Navigates to Deposits tab
7. Selects source (Business or Manual)
8. If Business: Selects business from dropdown, enters amount
9. System validates business has sufficient funds
10. Submits → Business account debited, expense account credited
11. Balance updated, transaction recorded

**Flow 2: Batch Payment Processing with Insufficient Funds**
1. User with payment permissions navigates to expense account detail
2. Navigates to Payments tab
3. Adds first payment: Selects payee, category, amount, date
4. System calculates running balance: $5000 - $2000 = $3000 remaining
5. Clicks "Add to Batch"
6. Adds second payment: $1500
7. Running balance: $3000 - $1500 = $1500 remaining
8. Adds third payment: $2000
9. System alerts: "Insufficient funds! $500 short. Available: $1500"
10. "Add to Batch" button disabled
11. User clicks "Add Funds" (mini modal)
12. Deposits $1000 from business
13. Balance refreshed: $1500 + $1000 = $2500 available
14. "Add to Batch" button re-enabled
15. Adds third payment successfully
16. Reviews batch (3 payments totaling $5500)
17. Clicks "Submit All Payments"
18. All 3 payments processed atomically, status=SUBMITTED
19. Balance updated to $500
20. Transaction history shows all payments

**Flow 3: Contractor Views Payments from Multiple Accounts**
1. Contractor logs in and navigates to their profile
2. Sees "Expense Account Payments" section
3. Summary card shows: Total Paid: $15,000, Payment Count: 45, Accounts: 3
4. Expands detailed table
5. Payments grouped by account:
   - **Project Alpha (ACC-001)**: $8000 (25 payments)
   - **Marketing Budget (ACC-002)**: $5000 (15 payments)
   - **Operations Fund (ACC-003)**: $2000 (5 payments)
6. Clicks on "Project Alpha (ACC-001)"
7. Navigates to expense account detail page
8. Sees all payments from this account
9. Clicks back, navigates to profile
10. Views pie chart showing payments by category across all accounts

**Flow 4: Dashboard Low-Balance Alert**
1. User logs into dashboard
2. Sees Low-Balance Alert section at top
3. Alert shows: "Critical: Project Alpha ($450) | Warning: Marketing Budget ($800)"
4. Clicks on "Project Alpha" alert
5. Navigates directly to Project Alpha expense account detail page
6. Navigates to Deposits tab
7. Adds funds to restore balance
8. Returns to dashboard
9. Alert removed for Project Alpha

### Design Considerations

**Balance Display:**
- Large, prominent balance display on account detail page
- Color-coded: Green (≥$1000), Yellow (<$1000), Red (<$500)
- Real-time balance updates during batch entry
- Running balance shown after each payment in batch list

**Alert System:**
- Dashboard alerts: Critical (red background, ⚠️ emoji), Warning (yellow background, ⚡ emoji)
- Click-through navigation from alerts to account detail
- Dismiss/remind later options (future enhancement)

**Batch Payment UX:**
- Two-section layout: Entry form (left), Batch list (right)
- Running balance calculation visible at all times
- Disable "Add to Batch" when insufficient funds
- Inline "Add Funds" modal without losing batch data
- Batch persisted to sessionStorage (prevent loss on refresh)
- Color-coded warnings when approaching low balance

**Payee Selector:**
- Grouped dropdown: Users | Employees | Contractors | Businesses
- Search/filter within each group
- Display: Name, Type badge, Identifier (employee #, national ID)
- "Create New Contractor" quick action button

**Charts and Reports:**
- Use Recharts library (consistent with existing reports)
- Show category emojis in pie chart legend
- Responsive charts (desktop, tablet, mobile)
- Export options: CSV (MVP), PDF (future)
- Date range picker with presets (This Month, Last 3 Months, This Year)

**Bidirectional Navigation:**
- Clear visual links: Account name/number as clickable hyperlinks
- Payee name as clickable hyperlink
- "View in Expense Account" button on payee detail page
- "View Payee Profile" button on payment details

**Permission-Based UI:**
- Hide "Create Account" button if !canCreateExpenseAccount
- Hide deposit form if !canMakeExpenseDeposits
- Hide payment form if !canMakeExpensePayments
- Show read-only view if user only has canAccessExpenseAccount
- Gray out/disable actions user doesn't have permission for

---

## 🗄️ Data Requirements

### Database Changes Needed

**New Tables (3):**

1. **ExpenseAccounts** (`expense_accounts`) - Core account management
   - Fields: id (UUID), accountNumber (unique string), accountName (string), balance (Decimal 12,2), description (string, nullable), isActive (boolean), lowBalanceThreshold (Decimal 12,2, default 500), createdBy (UUID FK Users), createdAt, updatedAt
   - Relations: creator (Users), deposits (ExpenseAccountDeposits[]), payments (ExpenseAccountPayments[])
   - Indexes: [accountNumber UNIQUE], [isActive]

2. **ExpenseAccountDeposits** (`expense_account_deposits`) - Track all deposits into accounts
   - Fields: id (UUID), expenseAccountId (UUID FK), sourceType (enum: BUSINESS/MANUAL/OTHER), sourceBusinessId (UUID FK Businesses, nullable), amount (Decimal 12,2), depositDate (DateTime), autoGeneratedNote (string, nullable), manualNote (string, nullable), transactionType (string, nullable), createdBy (UUID FK Users), createdAt
   - Relations: expenseAccount (ExpenseAccounts), sourceBusiness (Businesses, nullable), creator (Users)
   - Indexes: [expenseAccountId, depositDate], [sourceBusinessId]
   - Cascade: onDelete CASCADE (when expense account deleted, delete deposits)

3. **ExpenseAccountPayments** (`expense_account_payments`) - Track all payments from accounts
   - Fields: id (UUID), expenseAccountId (UUID FK), payeeType (enum: USER/EMPLOYEE/PERSON/BUSINESS), payeeUserId (UUID FK Users, nullable), payeeEmployeeId (UUID FK Employees, nullable), payeePersonId (UUID FK Persons, nullable), payeeBusinessId (UUID FK Businesses, nullable), categoryId (UUID FK ExpenseCategories), subcategoryId (UUID FK ExpenseSubcategories, nullable), amount (Decimal 12,2), paymentDate (DateTime), notes (text, nullable), receiptNumber (string, nullable), receiptServiceProvider (string, nullable), receiptReason (text, nullable), isFullPayment (boolean, default true), batchId (string, nullable), status (enum: DRAFT/SUBMITTED, default SUBMITTED), createdBy (UUID FK Users), submittedBy (UUID FK Users, nullable), submittedAt (DateTime, nullable), createdAt, updatedAt
   - Relations: expenseAccount (ExpenseAccounts), payeeUser (Users, nullable), payeeEmployee (Employees, nullable), payeePerson (Persons, nullable), payeeBusiness (Businesses, nullable), category (ExpenseCategories), subcategory (ExpenseSubcategories, nullable), creator (Users), submitter (Users, nullable)
   - Indexes: [expenseAccountId, paymentDate], [categoryId], [payeeType], [batchId], [status], [payeeEmployeeId], [payeePersonId], [payeeBusinessId], [payeeUserId]
   - Cascade: onDelete CASCADE (when expense account deleted, delete payments)

**Modified Tables (6):**

1. **Users** - Add relations to expense account tables
   - New relations: expenseAccountsCreated (ExpenseAccounts[]), expenseDepositsCreated (ExpenseAccountDeposits[]), expensePaymentsCreated (ExpenseAccountPayments[]), expensePaymentsSubmitted (ExpenseAccountPayments[]), expensePaymentsAsPayee (ExpenseAccountPayments[])

2. **Businesses** - Add relations to expense account tables
   - New relations: expenseAccountDeposits (ExpenseAccountDeposits[]), expensePaymentsAsPayee (ExpenseAccountPayments[])

3. **Employees** - Add relations to expense account payments
   - New relations: expensePaymentsAsPayee (ExpenseAccountPayments[])

4. **Persons** - Add relations to expense account payments
   - New relations: expensePaymentsAsPayee (ExpenseAccountPayments[])

5. **ExpenseCategories** - Add relation to expense account payments
   - New relation: expenseAccountPayments (ExpenseAccountPayments[])

6. **ExpenseSubcategories** - Add relation to expense account payments
   - New relation: expenseAccountPayments (ExpenseAccountPayments[])

### Data Models

**ExpenseAccount Structure:**
```typescript
{
  id: string (UUID)
  accountNumber: string (unique, e.g., "ACC-001", "ACC-002")
  accountName: string (e.g., "Project Alpha Expenses")
  balance: Decimal (current balance calculated as deposits - submitted payments)
  description: string | null
  isActive: boolean
  lowBalanceThreshold: Decimal (default: 500.00)
  createdBy: string (User ID)
  createdAt: DateTime
  updatedAt: DateTime
}
```

**ExpenseAccountDeposit Structure:**
```typescript
{
  id: string (UUID)
  expenseAccountId: string (FK)
  sourceType: "BUSINESS" | "MANUAL" | "OTHER"
  sourceBusinessId: string | null (FK - only if sourceType=BUSINESS)
  amount: Decimal
  depositDate: DateTime (can be in past)
  autoGeneratedNote: string | null (e.g., "Deposit from Business XYZ")
  manualNote: string | null (user can override auto note)
  transactionType: string | null
  createdBy: string (User ID)
  createdAt: DateTime
}
```

**ExpenseAccountPayment Structure:**
```typescript
{
  id: string (UUID)
  expenseAccountId: string (FK)
  payeeType: "USER" | "EMPLOYEE" | "PERSON" | "BUSINESS"
  payeeUserId: string | null (FK - only if payeeType=USER)
  payeeEmployeeId: string | null (FK - only if payeeType=EMPLOYEE)
  payeePersonId: string | null (FK - only if payeeType=PERSON)
  payeeBusinessId: string | null (FK - only if payeeType=BUSINESS)
  categoryId: string (FK ExpenseCategories - required)
  subcategoryId: string | null (FK ExpenseSubcategories - optional)
  amount: Decimal
  paymentDate: DateTime (can be in past for old receipts)
  notes: string | null (brief note about payment)
  receiptNumber: string | null
  receiptServiceProvider: string | null
  receiptReason: string | null
  isFullPayment: boolean (true=full payment, false=partial payment)
  batchId: string | null (UUID to group batch submissions)
  status: "DRAFT" | "SUBMITTED" (draft can be edited, submitted is immutable)
  createdBy: string (User ID)
  submittedBy: string | null (User ID who submitted)
  submittedAt: DateTime | null
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Polymorphic Payee Pattern:**
- Each payment has ONE payee type (USER, EMPLOYEE, PERSON, or BUSINESS)
- Corresponding payee FK field is populated based on type
- Other payee FK fields are null
- Example: If payeeType="EMPLOYEE", then payeeEmployeeId is populated, others are null
- Allows flexible payment to any entity in the system
- Enables querying all payments to a specific payee across all accounts

**Balance Calculation:**
```
Account Balance = SUM(Deposits.amount) - SUM(Payments.amount WHERE status='SUBMITTED')
```
Note: DRAFT payments are NOT included in balance calculation

---

## 🔌 API Requirements

### New Endpoints (17 total)

**Account Management:**
1. `GET /api/expense-account` - List all expense accounts (with filters)
2. `POST /api/expense-account` - Create new expense account (admin only)
3. `GET /api/expense-account/[accountId]` - Get account details
4. `PATCH /api/expense-account/[accountId]` - Update account (name, description, threshold)
5. `DELETE /api/expense-account/[accountId]` - Soft delete account (admin only)
6. `GET /api/expense-account/[accountId]/balance` - Get balance summary (totalDeposits, totalPayments, currentBalance, counts)

**Deposits:**
7. `GET /api/expense-account/[accountId]/deposits` - List deposits (with date range filter, pagination)
8. `POST /api/expense-account/[accountId]/deposits` - Create deposit (auto-debit business if sourceType=BUSINESS)

**Payments:**
9. `GET /api/expense-account/[accountId]/payments` - List payments (with filters: date, category, payee, status, pagination)
10. `POST /api/expense-account/[accountId]/payments` - Create payment(s) with batch support (array of payments, atomic processing)
11. `GET /api/expense-account/[accountId]/payments/[paymentId]` - Get single payment details
12. `PATCH /api/expense-account/[accountId]/payments/[paymentId]` - Update payment (DRAFT only)
13. `DELETE /api/expense-account/[accountId]/payments/[paymentId]` - Delete payment (DRAFT only)

**Transactions & Reports:**
14. `GET /api/expense-account/[accountId]/transactions` - Combined deposits + payments in chronological order (with date range, pagination)
15. `GET /api/expense-account/[accountId]/reports` - Generate report data (expense by category, trends, top payees, with date range filter)

**Payee Management:**
16. `GET /api/expense-account/payees` - List all available payees (grouped by type: Users, Employees, Persons, Businesses, with search)
17. `POST /api/expense-account/payees/individuals` - Create individual payee (Person record with auto-generated ID)

**Payee-Specific Reporting (NEW):**
18. `GET /api/expense-account/payees/[payeeType]/[payeeId]/payments` - Get all payments to specific payee across ALL accounts (grouped by account, with pagination, date filter)
19. `GET /api/expense-account/payees/[payeeType]/[payeeId]/reports` - Generate payee-specific expense reports (total paid, by category, by account, trends, with date filter)

### Modified Endpoints

None - This is an entirely new feature with no modifications to existing endpoints

---

## ✅ Success Criteria

**This feature is complete when:**

- [ ] Admin can create new expense accounts with custom names, descriptions, and low-balance thresholds
- [ ] Authorized users can add funds from businesses with automatic business account debiting and transaction recording
- [ ] Authorized users can add manual deposits to expense accounts
- [ ] Users can make batch payments with real-time balance validation and insufficient funds prevention
- [ ] Users can create individual payees (contractors) on-the-fly with auto-generated IDs
- [ ] Payments support all payee types: Users, Employees, Persons/Contractors, Businesses
- [ ] Batch payment processing includes "Add Funds" capability without losing batch data
- [ ] Receipt information can be captured for each payment (receipt number, service provider, reason, full/partial indicator)
- [ ] Past-dated transactions are supported for historical record entry
- [ ] Submitted payments are immutable (cannot be edited or deleted)
- [ ] DRAFT payments can be edited or deleted
- [ ] Account balance is accurately calculated as deposits minus submitted payments
- [ ] Dashboard displays low-balance alerts (Critical <$500, Warning <$1000) with click-through navigation
- [ ] Account detail page shows balance with color-coded indicators (green/yellow/red)
- [ ] Expense reports with charts are available at account level (pie chart by category, trends, top payees)
- [ ] Payee-specific expense reports show all payments to a payee across all accounts, segregated by account
- [ ] Bidirectional navigation works: Expense Account ↔ Payee Detail Pages
- [ ] Employee detail pages show "Expense Account Payments" section
- [ ] Contractor/Person detail pages show "Expense Account Payments" section
- [ ] Business detail pages show "Expense Account Payments" section
- [ ] All forms use proper global settings components (DateInput, PhoneNumberInput, NationalIdInput)
- [ ] All alerts use useAlert hook (no browser alerts)
- [ ] All confirmations use useConfirm hook (no browser confirms)
- [ ] Permission-based UI: Hide/disable features based on user permissions
- [ ] All API endpoints have proper permission checks
- [ ] Balance calculations use Decimal(12,2) to prevent floating-point errors
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## 🚧 Constraints & Considerations

### Technical Constraints

**Amount Constraints:**
- All monetary amounts must be between 0 and 999,999,999.99
- Maximum 2 decimal places for all amounts
- Use Prisma Decimal(12,2) type for all monetary fields
- Client-side validation must match server-side validation

**Balance Constraints:**
- Accounts cannot have negative balances
- Real-time balance validation required during batch entry
- Balance calculation must be atomic (use database transactions)
- DRAFT payments excluded from balance calculations

**Performance Constraints:**
- Batch payment processing limited to reasonable size (suggested: 50 payments max)
- Large batches may require background job processing (future enhancement)
- Report aggregations may be slow for large datasets (consider caching)
- Transaction history pagination required for accounts with 1000+ transactions

**Data Integrity Constraints:**
- Submitted payments are immutable (cannot be edited or deleted)
- Account number must be unique across all accounts
- Individual payee national IDs must be unique if provided
- Business account must have sufficient funds before expense account deposit allowed
- Payee must exist and be active before payment creation

**Permission Constraints:**
- All API endpoints must check permissions before execution
- UI must hide/disable features based on user permissions
- Default to restrictive permissions (deny by default, explicit grant)

### Dependencies

**Existing Systems:**
- **Expense Category System:** ExpenseDomains, ExpenseCategories, ExpenseSubcategories with emojis
- **User Management:** Users, authentication, session management
- **Employee Management:** Employees, contracts, signatures
- **Contractor Management:** Persons table for individual contractors
- **Business Management:** Businesses, BusinessAccounts, BusinessTransactions
- **Permission System:** Role-based permissions, permission templates
- **Dashboard Infrastructure:** Dashboard page, alert components
- **Global Settings:** DateInput, PhoneNumberInput, NationalIdInput components
- **UI Components:** useAlert, useConfirm hooks, toast notifications
- **Reporting Infrastructure:** Recharts library, chart components

**External Libraries:**
- **Recharts:** For pie charts, line charts, bar charts
- **Prisma:** ORM for database operations
- **React Hook Form (if used):** Form management
- **Next.js:** Page routing, API routes

**Payee Management Pages (for bidirectional navigation):**
- Employee detail page (`/employees/[employeeId]`)
- Contractor/Person detail page (`/persons/[personId]` or similar)
- Business detail page (`/businesses/[businessId]`)
- User management page (if exists)

### Assumptions

**User Behavior:**
- Users will primarily use batch payment processing for efficiency
- Most payments will be to contractors and employees
- Batch sizes will typically be under 20 payments
- Users want to see historical transactions (past dates supported)
- Low-balance alerts are critical for preventing payment failures

**Business Rules:**
- Expense accounts are for outgoing payments only (no income)
- Business account debiting happens automatically without manual approval
- Receipt information is optional but encouraged for audit trails
- Submitted payments should never be editable (audit trail integrity)
- Individual payees (contractors) are frequently created on-the-fly

**Technical:**
- PayrollAccounts architecture is a proven pattern to follow
- Decimal(12,2) provides sufficient precision for monetary values
- Real-time balance validation is feasible with current architecture
- SessionStorage is reliable for batch data persistence
- Existing permission system can accommodate new permissions

**Data:**
- Expense categories already exist and have emojis
- Users, Employees, Persons, Businesses already exist in system
- Business accounts have sufficient balance tracking
- Existing payroll payment patterns can be reused

---

## 🧪 Testing Requirements

### Test Cases

**Account Management:**
1. Admin creates new expense account → Verify account created with unique account number
2. Non-admin tries to create account → Verify rejection with permission error
3. Update account details (name, description, threshold) → Verify changes saved
4. Delete account with zero balance → Verify soft delete successful
5. Try to delete account with balance → Verify rejection with warning

**Deposit Functionality:**
6. Create manual deposit → Verify balance increased, transaction recorded
7. Create business deposit with sufficient funds → Verify business debited, expense account credited
8. Try business deposit with insufficient business funds → Verify rejection with error
9. Create deposit with past date → Verify allowed and date recorded correctly
10. Verify auto-generated note is created and can be overridden

**Batch Payment Processing:**
11. Add 3 payments to batch with sufficient funds → Verify running balance calculated correctly
12. Add payment that exceeds available balance → Verify error, "Add to Batch" disabled
13. Add funds mid-batch → Verify balance refreshed, batch data preserved
14. Submit batch of 5 payments → Verify all processed atomically with same batchId
15. Refresh page during batch entry → Verify batch persisted from sessionStorage

**Payee Management:**
16. Create individual payee with full name only → Verify ID auto-generated (IND-001)
17. Create individual payee with national ID → Verify national ID validated and stored
18. Try to create payee with duplicate national ID → Verify rejection
19. Create payment to each payee type (User, Employee, Person, Business) → Verify all work correctly

**Payment Immutability:**
20. Create DRAFT payment → Verify can edit
21. Create DRAFT payment → Verify can delete
22. Submit payment (status=SUBMITTED) → Verify cannot edit
23. Try to delete SUBMITTED payment → Verify rejection

**Balance Calculations:**
24. Account with $5000 deposits, $3000 payments → Verify balance = $2000
25. Account with DRAFT payments → Verify DRAFT excluded from balance
26. Submit DRAFT payment → Verify balance updated immediately

**Low-Balance Alerts:**
27. Account balance drops below $500 → Verify critical alert on dashboard
28. Account balance below $1000 but above $500 → Verify warning alert
29. Click dashboard alert → Verify navigation to account detail page
30. Add funds to restore balance → Verify alert removed from dashboard

**Reports:**
31. Generate account expense report → Verify pie chart shows categories with emojis
32. Generate payee expense report → Verify payments grouped by account
33. Filter reports by date range → Verify only matching data shown
34. Export report to CSV → Verify data exported correctly

**Bidirectional Navigation:**
35. From expense account payment list, click payee name → Verify navigation to payee detail page
36. From employee detail page, view expense account payments section → Verify payments shown
37. From employee payments section, click account name → Verify navigation to expense account
38. Test navigation for contractor, business, and user payees

**Permission Enforcement:**
39. User without canAccessExpenseAccount → Verify no access to any expense account pages
40. User without canCreateExpenseAccount → Verify "Create Account" button hidden
41. User without canMakeExpenseDeposits → Verify deposit form hidden
42. User without canMakeExpensePayments → Verify payment form hidden
43. Admin user → Verify full access to all features

### Edge Cases

**Balance Edge Cases:**
- Zero balance account attempting payment → Should reject
- Exact balance payment (balance = $100, payment = $100) → Should allow, balance = $0
- Floating-point precision issues (e.g., $10.10 + $20.20 = $30.30, not $30.299999) → Must use Decimal type
- Very large amounts (e.g., $999,999,999.99) → Should allow
- Amounts exceeding max ($1,000,000,000) → Should reject

**Date Edge Cases:**
- Payment date 5 years in past → Should allow (historical receipts)
- Payment date in future → Should reject
- Deposit date before account creation date → Should allow (historical tracking)
- Leap year dates (Feb 29) → Should handle correctly

**Batch Payment Edge Cases:**
- Empty batch submission → Should reject
- Single payment batch → Should process correctly
- 50 payment batch → Should process (may be slow)
- 100+ payment batch → Should warn about performance
- Concurrent batch submissions from different users → Should handle atomically

**Payee Edge Cases:**
- Deleted/inactive payee → Payment creation should reject
- Payee with special characters in name → Should handle correctly
- Payment to user who is also an employee → Should allow (different payee types)
- Individual payee with very long name (200+ chars) → Should validate length

**Business Account Debit Edge Cases:**
- Business account has exactly the deposit amount → Should allow
- Business account has $0.01 less than deposit → Should reject
- Business account deleted after deposit created → Should not break expense account

**Permission Edge Cases:**
- User permission changed mid-session → Should respect new permissions on next action
- User with conflicting permissions → Should follow most restrictive
- Permission template updated → Existing users should inherit changes

**Report Edge Cases:**
- Account with no transactions → Should show empty state
- Account with 10,000+ transactions → Should paginate correctly
- Report spanning multiple years → Should handle date range correctly
- Category with no emoji → Should show text fallback

---

## 📝 Additional Notes

**Architectural Pattern:**
This feature closely follows the existing PayrollAccounts system architecture. Key patterns reused:
- Account + Deposits + Payments model structure
- Balance calculation: Deposits - Payments
- Atomic transaction processing
- Permission-based access control
- Dashboard alert integration
- Report generation with charts

**Key Technical Decisions:**
- **Polymorphic Payee Pattern:** Using payeeType + 4 nullable FK fields instead of polymorphic associations for better query performance and type safety
- **DRAFT vs SUBMITTED:** Two-state system allows batch entry workflow without affecting balance
- **SessionStorage for Batch Persistence:** Prevents data loss on page refresh during batch entry
- **Decimal(12,2):** Prevents floating-point precision errors in financial calculations
- **Automatic Business Debiting:** Streamlines workflow by eliminating manual debit step

**Future Enhancements (Out of Scope for MVP):**
- Recurring payments (auto-schedule monthly expenses)
- Budget allocation per category with overspending alerts
- Approval workflow for payments (manager approval before submission)
- Multi-currency support
- Expense account transfers (move funds between accounts)
- Receipt image upload with OCR for data extraction
- Integration with accounting systems (QuickBooks, Xero)
- Mobile app for expense tracking
- Email notifications for low balance, large payments
- Expense account archiving (close account but preserve history)
- Advanced reporting: Year-over-year comparison, forecasting, budget vs actual
- Bulk payment export to bank format (CSV, OFX)
- Audit log for all account actions with detailed change tracking

---

**📅 Requirements-Plan Sync Status:**
- **Last Synced:** 2025-11-25
- **Synced From:** projectplan-mbm-116-multi-expense-account-management-platform-2025-11-25.md
- **Sync Type:** Complete - All technical specifications, database schema, API endpoints, business logic, and testing requirements synced from project plan
- **Status:** ✅ IN SYNC - Requirements now match project plan analysis

---

**Next Step:** Project plan is ready for approval. Type **APPROVE PLAN** or **PHASE 1** to begin implementation.
