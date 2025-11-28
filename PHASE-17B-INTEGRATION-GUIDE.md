# Phase 17B: Payee Management Page Integration Guide

## Overview
This guide explains how to integrate expense account payment tracking into payee management pages (Employees, Contractors/Persons, Businesses, Users).

## Components Created

### 1. PayeeExpenseSummary
**File:** `src/components/expense-account/payee-expense-summary.tsx`

**Purpose:** Displays a summary card showing total paid, payment count, and number of accounts

**Features:**
- Auto-hides if no payments exist
- Permission-gated (requires `canAccessExpenseAccount`)
- Expandable to show breakdown by account
- Click-to-navigate links to expense account detail pages

**Usage:**
```tsx
import { PayeeExpenseSummary } from '@/components/expense-account/payee-expense-summary'

<PayeeExpenseSummary
  payeeType="EMPLOYEE"  // or "PERSON", "BUSINESS", "USER"
  payeeId={employeeId}
  onViewDetails={() => setActiveTab('expensePayments')} // Optional callback
/>
```

### 2. PayeePaymentsTable
**File:** `src/components/expense-account/payee-payments-table.tsx`

**Purpose:** Shows detailed payment history grouped by expense account

**Features:**
- Payments grouped by account with collapsible sections
- Date range filtering
- Sort by date (newest/oldest first)
- Click account names to navigate to expense account detail
- Displays: Date, Category, Amount, Receipt Number, Notes
- Shows totals per account and grand total

**Usage:**
```tsx
import { PayeePaymentsTable } from '@/components/expense-account/payee-payments-table'

<PayeePaymentsTable
  payeeType="EMPLOYEE"  // or "PERSON", "BUSINESS", "USER"
  payeeId={employeeId}
/>
```

### 3. PayeeExpenseReport
**File:** `src/components/expense-account/payee-expense-report.tsx`

**Purpose:** Visual analytics with charts and reports

**Features:**
- Summary statistics (total paid, count, average, accounts)
- Pie chart: Payments by category
- Bar chart: Payments by account
- Line chart: Payment trends over time (monthly)
- Date range filtering
- Collapsible to save space

**Usage:**
```tsx
import { PayeeExpenseReport } from '@/components/expense-account/payee-expense-report'

<PayeeExpenseReport
  payeeType="EMPLOYEE"  // or "PERSON", "BUSINESS", "USER"
  payeeId={employeeId}
/>
```

## Integration Completed

### Employee Detail Page ✅
**File:** `src/app/employees/[id]/page.tsx`

**Changes Made:**
1. Added imports for the three components (lines 18-20)
2. Added 'expensePayments' to tab navigation (line 605)
3. Added tab label logic for "Expense Payments" (line 615)
4. Added expense payments tab content (lines 1253-1274)

**Result:**
- New "Expense Payments" tab appears as 5th tab
- Shows summary, detailed table, and charts
- Fully integrated with existing tab system
- Permission-gated (auto-hides if no access)

## Integration Needed

### Contractor/Person Detail Pages
**Status:** No individual detail pages found

**Current Structure:**
- `/contractors` - List page only
- `/personal/contractors` - Personal contractors list
- `/construction/[projectId]/contractors/[contractorId]` - Project-specific contractor page

**Recommended Action:**
1. **Option A:** Create a new detail page at `src/app/contractors/[id]/page.tsx`
2. **Option B:** Integrate into project contractor page
3. **Option C:** Add inline expansion on list page

**Integration Code (if detail page exists):**
```tsx
import { PayeeExpenseSummary } from '@/components/expense-account/payee-expense-summary'
import { PayeePaymentsTable } from '@/components/expense-account/payee-payments-table'
import { PayeeExpenseReport } from '@/components/expense-account/payee-expense-report'

// In tab content or section
<div className="space-y-6">
  <PayeeExpenseSummary
    payeeType="PERSON"
    payeeId={contractorId}
  />
  <PayeePaymentsTable
    payeeType="PERSON"
    payeeId={contractorId}
  />
  <PayeeExpenseReport
    payeeType="PERSON"
    payeeId={contractorId}
  />
</div>
```

### Business Detail Pages
**Status:** No individual detail pages found

**Current Structure:**
- `/business/manage` - Business management page
- `/business/manage/loans` - Loan management
- Business-specific functionality integrated into type-specific pages (restaurant, grocery, etc.)

**Recommended Action:**
Create a business detail page at `src/app/business/[businessId]/page.tsx` or add expense payments section to `/business/manage` page

**Integration Code:**
```tsx
import { PayeeExpenseSummary } from '@/components/expense-account/payee-expense-summary'
import { PayeePaymentsTable } from '@/components/expense-account/payee-payments-table'
import { PayeeExpenseReport } from '@/components/expense-account/payee-expense-report'

// In business detail page
<div className="space-y-6">
  <PayeeExpenseSummary
    payeeType="BUSINESS"
    payeeId={businessId}
  />
  <PayeePaymentsTable
    payeeType="BUSINESS"
    payeeId={businessId}
  />
  <PayeeExpenseReport
    payeeType="BUSINESS"
    payeeId={businessId}
  />
</div>
```

### User Management Pages
**Status:** User detail pages may exist in admin section

**Potential Locations:**
- `/admin/users` - User management list
- `/admin/users/[userId]` - Individual user detail (if exists)

**Integration Code:**
```tsx
import { PayeeExpenseSummary } from '@/components/expense-account/payee-expense-summary'
import { PayeePaymentsTable } from '@/components/expense-account/payee-payments-table'
import { PayeeExpenseReport } from '@/components/expense-account/payee-expense-report'

// In user detail page
<div className="space-y-6">
  <PayeeExpenseSummary
    payeeType="USER"
    payeeId={userId}
  />
  <PayeePaymentsTable
    payeeType="USER"
    payeeId={userId}
  />
  <PayeeExpenseReport
    payeeType="USER"
    payeeId={userId}
  />
</div>
```

## Bidirectional Navigation

### From Payee to Expense Account
**Implemented:** Yes

All three components include clickable links to expense accounts:
- PayeeExpenseSummary: Click account names in breakdown
- PayeePaymentsTable: Click account names in section headers
- Both navigate to: `/expense-accounts/[accountId]`

### From Expense Account to Payee
**Partially Implemented:** Payment forms include payee selection, but no direct navigation

**Future Enhancement:**
Add clickable payee names in:
- `src/components/expense-account/transaction-history.tsx`
- `src/components/expense-account/payment-form.tsx`

**Example Code:**
```tsx
// In transaction history
{payment.payeeType === 'EMPLOYEE' && payment.payeeEmployee && (
  <Link
    href={`/employees/${payment.payeeEmployee.id}`}
    className="text-blue-600 dark:text-blue-400 hover:underline"
  >
    {payment.payeeEmployee.fullName}
  </Link>
)}
```

## Permission Handling

All components check permissions internally:
- **PayeeExpenseSummary:** Requires `canAccessExpenseAccount`
- **PayeePaymentsTable:** Requires `canAccessExpenseAccount`
- **PayeeExpenseReport:** Requires `canViewExpenseReports`

If user lacks permission, components auto-hide (return null).

**No additional permission checks needed in parent pages.**

## Testing Checklist

### Component Functionality
- [ ] PayeeExpenseSummary loads and displays correct totals
- [ ] Expansion shows account breakdown
- [ ] Account links navigate correctly
- [ ] Auto-hides when no payments exist
- [ ] Permission enforcement works

### PayeePaymentsTable
- [ ] Payments grouped correctly by account
- [ ] Expand/collapse works for each account
- [ ] Date range filter works
- [ ] Sort order toggle works
- [ ] Totals calculate correctly
- [ ] Account links navigate correctly
- [ ] Empty state displays when no payments

### PayeeExpenseReport
- [ ] Summary stats calculate correctly
- [ ] Pie chart renders (payments by category)
- [ ] Bar chart renders (payments by account)
- [ ] Line chart renders (payment trends)
- [ ] Date range filter affects all charts
- [ ] Expand/collapse works
- [ ] Permission enforcement works

### Integration
- [ ] New tab appears in employee detail page
- [ ] Tab navigation works
- [ ] All three components render in tab
- [ ] No console errors
- [ ] Dark mode support works

### Bidirectional Navigation
- [ ] From employee page → click account link → navigate to expense account
- [ ] From expense account → make payment to employee → navigate to employee page
- [ ] Verify payment appears in employee's expense payments tab
- [ ] Test with employee having payments from multiple accounts

## Future Enhancements

1. **Export Functionality**
   - Add CSV export to PayeePaymentsTable
   - Add PDF export to PayeeExpenseReport

2. **Advanced Filtering**
   - Filter by category
   - Filter by specific account
   - Filter by date presets (last 7/30/90 days)

3. **Notifications**
   - Alert payee when payment received
   - Email summaries of monthly payments

4. **Comparison Views**
   - Compare payments across multiple payees
   - Year-over-year comparisons

5. **Enhanced Navigation**
   - Add payee links in expense account transaction history
   - Add quick navigation breadcrumbs

## File Manifest

**Components Created:**
- `src/components/expense-account/payee-expense-summary.tsx`
- `src/components/expense-account/payee-payments-table.tsx`
- `src/components/expense-account/payee-expense-report.tsx`

**Pages Modified:**
- `src/app/employees/[id]/page.tsx` - Added expense payments tab

**API Routes (from Phase 17A):**
- `src/app/api/expense-account/payees/[payeeType]/[payeeId]/payments/route.ts`
- `src/app/api/expense-account/payees/[payeeType]/[payeeId]/reports/route.ts`

**Documentation:**
- `TESTING-PAYEE-API.md` - API testing guide
- `PHASE-17B-INTEGRATION-GUIDE.md` - This file

**Test Scripts:**
- `scripts/test-payee-payment-api.js`
- `scripts/create-test-expense-payment-data.js`
