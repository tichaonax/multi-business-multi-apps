# Expense Account System - Manual Testing Guide

## Overview
This guide provides comprehensive testing instructions for the Multi-Expense Account Management Platform (MBM-116).

## Test Prerequisites

### Required Permissions (for Full Testing)
- `canCreateExpenseAccount` - Create new expense accounts
- `canAccessExpenseAccount` - View expense accounts
- `canMakeExpenseDeposits` - Add deposits
- `canMakeExpensePayments` - Create payments
- `canViewExpenseReports` - View analytics and reports

### Test Data Setup
1. Admin user account
2. At least one business with positive balance
3. At least one employee in the system
4. At least one expense category (created automatically or manually)

---

## Test Suite 1: Account Management

### Test 1.1: Create New Expense Account
**User:** Admin with `canCreateExpenseAccount` permission

**Steps:**
1. Navigate to Dashboard
2. Click "Expense Accounts" in sidebar (should see 💳 icon)
3. Click "Create Account" button
4. Fill in form:
   - Account Name: "Project Alpha Expenses"
   - Description: "Expenses for Project Alpha development"
   - Low Balance Threshold: $500
5. Click "Create Account"

**Expected Results:**
- ✅ Success message appears
- ✅ Redirected to account detail page
- ✅ Account number generated automatically (format: ACC-XXXX)
- ✅ Initial balance is $0.00
- ✅ Account appears in expense accounts list

**Validation:**
```bash
node scripts/check-expense-accounts.js  # If you create this script
```

---

### Test 1.2: View Expense Accounts List
**User:** Any user with `canAccessExpenseAccount`

**Steps:**
1. Navigate to "Expense Accounts" from sidebar
2. Observe list of accounts

**Expected Results:**
- ✅ See all expense accounts in table
- ✅ Columns: Account Number, Name, Balance, Status, Actions
- ✅ Color-coded status badges
- ✅ Can click account to view details

---

## Test Suite 2: Deposits

### Test 2.1: Manual Deposit (Cash/External)
**User:** Admin with `canMakeExpenseDeposits`

**Steps:**
1. Navigate to expense account detail page
2. Click "Deposits" tab
3. Select "Manual Deposit (Cash/External)"
4. Enter amount: $5000
5. Add note: "Initial funding from petty cash"
6. Click "Add Deposit"

**Expected Results:**
- ✅ Success message appears
- ✅ Balance increases by $5000
- ✅ Transaction appears in history
- ✅ Transaction type shows "MANUAL"

---

### Test 2.2: Deposit from Business
**User:** Admin with `canMakeExpenseDeposits`

**Prerequisites:**
- Business must have sufficient balance

**Steps:**
1. Navigate to expense account detail page
2. Click "Deposits" tab
3. Select "Transfer from Business"
4. Select a business (e.g., "Hardware Haven")
5. Enter amount: $3000
6. Add note: "Transfer for operational expenses"
7. Click "Add Deposit"

**Expected Results:**
- ✅ Success message appears
- ✅ Expense account balance increases by $3000
- ✅ Business balance decreases by $3000
- ✅ Transaction shows source business name
- ✅ Transaction type shows "BUSINESS_TRANSFER"

**Validation:**
- Check business balance decreased
- Check transaction history shows both sides

---

## Test Suite 3: Single Payments

### Test 3.1: Payment to Employee
**User:** Admin with `canMakeExpensePayments`

**Steps:**
1. Navigate to expense account detail page
2. Click "Payments" tab
3. Select payee type: "Employee"
4. Search and select employee
5. Enter amount: $500
6. Select category: "Salary & Wages"
7. Add notes: "Weekly salary payment"
8. Add receipt number (optional): "RCP-001"
9. Click "Create Payment"

**Expected Results:**
- ✅ Success message appears
- ✅ Balance decreases by $500
- ✅ Transaction appears in history
- ✅ Payment status is "SUBMITTED"
- ✅ Can view receipt number in transaction

---

### Test 3.2: Payment to Contractor/Person
**User:** Admin with `canMakeExpensePayments`

**Steps:**
1. Navigate to expense account detail page
2. Click "Payments" tab
3. Select payee type: "Contractor"
4. Click "Create New Person"
5. Fill in person details:
   - Full Name: "John Smith"
   - National ID: "123456789"
   - Phone: "+1234567890"
   - Email: "john@example.com"
6. Click "Create"
7. Enter payment amount: $750
8. Select category: "Consulting Services"
9. Click "Create Payment"

**Expected Results:**
- ✅ Person created successfully
- ✅ Payment processed
- ✅ Balance decreases by $750

---

### Test 3.3: Payment to Business
**User:** Admin with `canMakeExpensePayments`

**Steps:**
1. Navigate to expense account detail page
2. Click "Payments" tab
3. Select payee type: "Business"
4. Select a business
5. Enter amount: $1200
6. Select category: "Office Supplies"
7. Click "Create Payment"

**Expected Results:**
- ✅ Payment processed
- ✅ Balance decreases by $1200
- ✅ Transaction shows business name

---

## Test Suite 4: Batch Payments

### Test 4.1: Create Batch with Multiple Employees
**User:** Admin with `canMakeExpensePayments`

**Steps:**
1. Navigate to expense account detail page
2. Click "Payments" tab
3. Scroll to "Batch Payments" section
4. Add 5 payments:
   - Employee 1: $500, Category: Salary
   - Employee 2: $600, Category: Salary
   - Employee 3: $450, Category: Bonus
   - Contractor 1: $750, Category: Consulting
   - Business 1: $300, Category: Supplies
5. Review batch total (should be $2600)
6. Click "Submit Batch"

**Expected Results:**
- ✅ All 5 payments created
- ✅ Balance decreases by $2600
- ✅ Each payment has individual transaction record
- ✅ Transaction history shows all payments

---

### Test 4.2: Insufficient Funds During Batch
**User:** Admin with `canMakeExpensePayments`

**Setup:**
- Ensure account has only $1000 balance

**Steps:**
1. Create batch with total > $1000 (e.g., $1500)
2. Try to submit batch

**Expected Results:**
- ✅ Error message: "Insufficient funds"
- ✅ Shows current balance vs. required amount
- ✅ Batch not submitted
- ✅ Option to "Add Funds" appears

---

### Test 4.3: Add Funds Mid-Batch
**User:** Admin with both deposit and payment permissions

**Steps:**
1. Create batch requiring $2000
2. Current balance: $1000
3. Click "Add Funds" button
4. Switch to Deposits tab
5. Add deposit of $1500
6. Return to Payments tab
7. Submit batch

**Expected Results:**
- ✅ Batch data preserved in session storage
- ✅ After deposit, balance is $2500
- ✅ Can now submit batch successfully
- ✅ Final balance: $500

---

## Test Suite 5: Transaction History

### Test 5.1: View Combined History
**User:** Any user with `canAccessExpenseAccount`

**Steps:**
1. Navigate to expense account detail page
2. Click "Transaction History" tab
3. Observe combined list of deposits and payments

**Expected Results:**
- ✅ Deposits shown as positive amounts
- ✅ Payments shown as negative amounts
- ✅ Sorted by date (newest first)
- ✅ Running balance displayed
- ✅ Can filter by date range
- ✅ Can filter by transaction type (DEPOSIT/PAYMENT)

---

### Test 5.2: Filter Transactions
**User:** Any user with `canAccessExpenseAccount`

**Steps:**
1. In Transaction History tab
2. Set date range: Last 30 days
3. Filter by type: PAYMENT only
4. Observe filtered results

**Expected Results:**
- ✅ Only payments shown
- ✅ Within date range
- ✅ Pagination works

---

## Test Suite 6: Reports and Analytics

### Test 6.1: View Account Reports
**User:** Admin with `canViewExpenseReports`

**Steps:**
1. Navigate to expense account detail page
2. Click "View Reports" button (top right)
3. Observe charts and statistics

**Expected Results:**
- ✅ Summary cards: Total spent, payment count, deposit count
- ✅ Pie chart: Expenses by category
- ✅ Bar chart: Expenses by payee type
- ✅ Line chart: Daily/monthly trends
- ✅ All charts interactive with tooltips

---

### Test 6.2: Filter Reports by Date Range
**User:** Admin with `canViewExpenseReports`

**Steps:**
1. In Reports page
2. Set date range: Last quarter
3. Observe updated charts

**Expected Results:**
- ✅ All charts update based on date filter
- ✅ Summary statistics recalculate
- ✅ Trends show only selected period

---

## Test Suite 7: Low Balance Alerts

### Test 7.1: Dashboard Alert
**User:** Admin with `canAccessExpenseAccount`

**Setup:**
- Create account with threshold $500
- Reduce balance to $300 (below threshold)

**Steps:**
1. Navigate to Dashboard
2. Observe alerts section

**Expected Results:**
- ✅ "Low Balance Alert" card appears
- ✅ Shows warning icon and message
- ✅ Lists account name and current balance
- ✅ Click navigates to account detail

---

### Test 7.2: Critical Balance Alert
**User:** Admin

**Setup:**
- Reduce account balance to $200 (< $500 critical threshold)

**Steps:**
1. Check dashboard alerts

**Expected Results:**
- ✅ Alert shows as "Critical" (red)
- ✅ Message: "Critical balance - please add funds immediately"

---

## Test Suite 8: Payee-Specific Views (Phase 17B)

### Test 8.1: Employee Expense Payments Tab
**User:** Admin with `canAccessExpenseAccount`

**Prerequisites:**
- Employee with expense account payments

**Steps:**
1. Navigate to Employees list
2. Click on employee with payments
3. Click "Expense Payments" tab

**Expected Results:**
- ✅ PayeeExpenseSummary card shows totals
- ✅ Summary shows: Total paid, payment count, accounts count
- ✅ Expandable section shows breakdown by account
- ✅ Account names are clickable links

---

### Test 8.2: Payee Payments Table
**User:** Admin with `canAccessExpenseAccount`

**Steps:**
1. In Employee detail → Expense Payments tab
2. Observe payments table

**Expected Results:**
- ✅ Payments grouped by expense account
- ✅ Each account section is expandable/collapsible
- ✅ Shows: Date, Category, Amount, Receipt, Notes
- ✅ Account headers show totals
- ✅ Can click account name to navigate

---

### Test 8.3: Payee Expense Reports
**User:** Admin with `canViewExpenseReports`

**Steps:**
1. In Employee detail → Expense Payments tab
2. Click "Show Charts"

**Expected Results:**
- ✅ Pie chart: Payments by category
- ✅ Bar chart: Payments by account
- ✅ Line chart: Monthly payment trends
- ✅ Summary stats: Total, count, average
- ✅ Date range filter works

---

### Test 8.4: Bidirectional Navigation
**User:** Admin with permissions

**Steps:**
1. Navigate to Employee detail → Expense Payments tab
2. Click on account link in summary
3. Navigate to expense account detail
4. Make new payment to same employee
5. Navigate back to employee detail
6. Refresh expense payments tab

**Expected Results:**
- ✅ Navigation to account works
- ✅ New payment appears in employee's tab
- ✅ Totals update correctly

---

## Test Suite 9: Permission Scenarios

### Test 9.1: Admin User (Full Access)
**User:** System Admin

**Expected Access:**
- ✅ Can create expense accounts
- ✅ Can make deposits
- ✅ Can make payments
- ✅ Can view reports
- ✅ See all menu items
- ✅ See all tabs and actions

---

### Test 9.2: Manager (Limited Access)
**User:** Manager with custom permissions
- `canAccessExpenseAccount: true`
- `canMakeExpensePayments: true`
- `canCreateExpenseAccount: false`
- `canMakeExpenseDeposits: false`

**Expected Access:**
- ✅ Can view expense accounts
- ✅ Can make payments
- ❌ Cannot create accounts ("Create Account" button hidden)
- ❌ Cannot make deposits ("Deposits" tab hidden)

---

### Test 9.3: Employee (No Access)
**User:** Regular employee with no expense permissions

**Expected Access:**
- ❌ "Expense Accounts" menu item not visible
- ❌ Cannot access `/expense-accounts` URL (redirects)
- ✅ Can still see own employee detail page
- ❌ "Expense Payments" tab not visible in own profile

---

### Test 9.4: Reports Permission
**User:** User with `canAccessExpenseAccount` but not `canViewExpenseReports`

**Expected Access:**
- ✅ Can view accounts and transactions
- ❌ "View Reports" button not visible
- ❌ Reports page redirects to account detail
- ❌ PayeeExpenseReport component not visible in employee detail

---

## Test Suite 10: Edge Cases

### Test 10.1: Zero Balance Account
**Setup:**
- Account with $0 balance

**Tests:**
- ✅ Cannot make payments (insufficient funds error)
- ✅ Can add deposits
- ✅ Transaction history empty state displays
- ✅ Reports show "No data" state

---

### Test 10.2: Decimal Precision
**Steps:**
1. Try to enter amount with 3 decimal places: $100.999
2. Try to enter amount with 1 decimal place: $100.5

**Expected Results:**
- ✅ 3 decimals rejected or rounded
- ✅ 1 decimal accepted as $100.50
- ✅ Balance calculations precise to 2 decimals

---

### Test 10.3: Concurrent Submissions
**Setup:**
- Two browser windows logged in as same user

**Steps:**
1. Window 1: Create payment for $500
2. Window 2: Simultaneously create payment for $600
3. Current balance: $1000

**Expected Results:**
- ✅ Both payments succeed if total ≤ balance
- ✅ Final balance: $1000 - $500 - $600 = -$100 (or rejected if negative balance prevention)

---

### Test 10.4: Large Batch (50+ Payments)
**Steps:**
1. Create batch with 60 payments
2. Submit batch

**Expected Results:**
- ✅ All payments process successfully
- ✅ No timeout errors
- ✅ Transaction history shows all 60
- ✅ Balance calculated correctly

---

### Test 10.5: Very Old Transaction Dates
**Steps:**
1. Try to create payment with date from 2 years ago

**Expected Results:**
- ✅ Accepted (or validation error if date restrictions exist)
- ✅ Transaction sorts correctly in history
- ✅ Reports include old transactions

---

### Test 10.6: Invalid Payee ID
**Test via API:**
```bash
curl -X POST http://localhost:8080/api/expense-account/{accountId}/payments \
  -H "Content-Type: application/json" \
  -d '{"payeeType": "EMPLOYEE", "payeeEmployeeId": "invalid-id", "amount": 100}'
```

**Expected Results:**
- ❌ 404 error: "Payee not found"
- ✅ No transaction created
- ✅ Balance unchanged

---

### Test 10.7: Deleted/Inactive Payee
**Setup:**
- Create payment to employee
- Soft-delete or deactivate employee

**Tests:**
- ✅ Past payments still visible in history
- ✅ Payee name still displays
- ❌ Cannot create new payments to deleted payee

---

## Test Suite 11: API Direct Testing

### Test 11.1: Payee Payments API
```bash
# Get all payments to specific employee
curl http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/payments

# With date filter
curl "http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/payments?startDate=2025-01-01&endDate=2025-11-30"
```

**Expected Response:**
- ✅ 200 OK
- ✅ JSON with payments array
- ✅ accountBreakdown with totals
- ✅ Pagination metadata

---

### Test 11.2: Payee Reports API
```bash
curl http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/reports
```

**Expected Response:**
- ✅ 200 OK
- ✅ Summary statistics
- ✅ paymentsByCategory array
- ✅ paymentsByAccount array
- ✅ paymentTrends array

---

## Test Validation Scripts

### Create Test Data
```bash
node scripts/create-test-expense-payment-data.js
```

### Verify Database State
```bash
# Check expense accounts
node scripts/check-expense-accounts.js

# Check specific payee payments
node scripts/test-payee-payment-api.js
```

---

## Known Issues / Limitations

1. **Contractor Detail Pages:** Integration pending (no detail pages exist yet)
2. **Business Detail Pages:** Integration pending (no detail pages exist yet)
3. **Negative Balance:** Currently not fully prevented (depends on implementation)
4. **Concurrent Transactions:** Race conditions possible without database locks

---

## Test Sign-Off Checklist

### Core Functionality
- [ ] Account creation works
- [ ] Deposits increase balance correctly
- [ ] Payments decrease balance correctly
- [ ] Batch payments process all entries
- [ ] Transaction history accurate
- [ ] Reports display correctly

### Payee Integration
- [ ] Employee expense payments tab works
- [ ] Payments grouped by account correctly
- [ ] Charts render properly
- [ ] Navigation links functional

### Permissions
- [ ] Admin has full access
- [ ] Limited users see only permitted features
- [ ] Unauthorized access blocked

### Edge Cases
- [ ] Zero balance handled
- [ ] Insufficient funds prevented
- [ ] Decimal precision maintained
- [ ] Large batches process successfully

### UI/UX
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Loading states display
- [ ] Success/error messages clear

---

## Reporting Issues

If you find bugs during testing:

1. **Document:**
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots if applicable
   - Browser/environment details

2. **Priority:**
   - Critical: Data loss, security issues
   - High: Core functionality broken
   - Medium: Feature incomplete
   - Low: UI/UX improvements

3. **Report Location:**
   - GitHub Issues: https://github.com/your-repo/issues
   - Or internal tracking system

---

## Test Data Cleanup

After testing, you may want to clean up test data:

```sql
-- Reset expense accounts (CAUTION: Development only!)
DELETE FROM ExpenseAccountPayments WHERE expenseAccountId IN (
  SELECT id FROM ExpenseAccounts WHERE accountName LIKE '%Test%'
);
DELETE FROM ExpenseAccountDeposits WHERE expenseAccountId IN (
  SELECT id FROM ExpenseAccounts WHERE accountName LIKE '%Test%'
);
DELETE FROM ExpenseAccounts WHERE accountName LIKE '%Test%';
```

---

**End of Testing Guide**
