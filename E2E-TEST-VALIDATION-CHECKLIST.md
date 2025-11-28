# End-to-End Test Validation Checklist
## Multi-Expense Account Management Platform (MBM-116)

**Test Date:** _______________
**Tester Name:** _______________
**Environment:** ☐ Development ☐ Staging ☐ Production
**Browser:** _______________
**Version:** _______________

---

## Pre-Test Setup

- [ ] Database backed up
- [ ] Test user accounts created (Admin, Manager, Employee)
- [ ] At least one business with positive balance exists
- [ ] At least one employee record exists
- [ ] Expense categories seeded
- [ ] Development server running (`npm run dev`)

---

## Phase 1: Account Creation & Management

### Test 1.1: Create New Expense Account
- [ ] Navigate to Expense Accounts from sidebar
- [ ] Click "Create Account" button
- [ ] Fill in required fields:
  - Account Name: "Test Project Account"
  - Description: "Testing expense account creation"
  - Low Balance Threshold: $500
- [ ] Submit form
- [ ] ✅ Success message appears
- [ ] ✅ Account number generated (format: ACC-XXXX)
- [ ] ✅ Redirected to account detail page
- [ ] ✅ Initial balance is $0.00
- [ ] ✅ Account appears in list

**Result:** ☐ Pass ☐ Fail
**Notes:** _______________

### Test 1.2: View Account List
- [ ] Navigate to Expense Accounts
- [ ] ✅ See table with columns: Number, Name, Balance, Status
- [ ] ✅ Can sort by columns
- [ ] ✅ Search functionality works (if exists)
- [ ] Click on account name
- [ ] ✅ Navigates to detail page

**Result:** ☐ Pass ☐ Fail
**Notes:** _______________

---

## Phase 2: Deposits

### Test 2.1: Manual Deposit
- [ ] Navigate to account detail
- [ ] Click "Deposits" tab
- [ ] Select "Manual Deposit (Cash/External)"
- [ ] Enter amount: $5000
- [ ] Add note: "Initial funding"
- [ ] Submit deposit
- [ ] ✅ Success message appears
- [ ] ✅ Balance updates to $5000
- [ ] ✅ Transaction appears in history
- [ ] ✅ Transaction type is "MANUAL"

**Result:** ☐ Pass ☐ Fail
**Starting Balance:** $______
**Ending Balance:** $______

### Test 2.2: Transfer from Business
- [ ] Click "Deposits" tab
- [ ] Select "Transfer from Business"
- [ ] Select a business
- [ ] Note business balance before: $______
- [ ] Enter amount: $3000
- [ ] Add note: "Business transfer test"
- [ ] Submit deposit
- [ ] ✅ Expense account balance increases by $3000
- [ ] ✅ Business balance decreases by $3000
- [ ] ✅ Transaction shows source business name
- [ ] Navigate to business to verify debit

**Result:** ☐ Pass ☐ Fail
**ExpenseAccount Balance:** $______ → $______
**Business Balance:** $______ → $______

---

## Phase 3: Single Payments

### Test 3.1: Payment to Employee
- [ ] Navigate to "Payments" tab
- [ ] Select payee type: "Employee"
- [ ] Search and select employee
- [ ] Enter amount: $500
- [ ] Select category: "Salary & Wages"
- [ ] Add notes: "Test payment"
- [ ] Add receipt number: "TEST-001"
- [ ] Submit payment
- [ ] ✅ Success message appears
- [ ] ✅ Balance decreases by $500
- [ ] ✅ Transaction appears in history
- [ ] ✅ Payee name displayed correctly

**Result:** ☐ Pass ☐ Fail
**Balance:** $______ → $______

### Test 3.2: Create New Person/Contractor
- [ ] In Payments tab, select payee type: "Contractor"
- [ ] Click "Create New Person"
- [ ] Fill in details:
  - Full Name: "Test Contractor"
  - National ID: "TEST123"
  - Phone: "+1234567890"
  - Email: "test@contractor.com"
- [ ] Click "Create"
- [ ] ✅ Person created successfully
- [ ] Enter payment amount: $750
- [ ] Select category: "Consulting Services"
- [ ] Submit payment
- [ ] ✅ Payment processes successfully

**Result:** ☐ Pass ☐ Fail

### Test 3.3: Payment to Business
- [ ] Select payee type: "Business"
- [ ] Select a business
- [ ] Enter amount: $300
- [ ] Select category: "Office Supplies"
- [ ] Submit payment
- [ ] ✅ Payment successful

**Result:** ☐ Pass ☐ Fail

---

## Phase 4: Batch Payments

### Test 4.1: Create Batch (5 Payments)
- [ ] Navigate to "Batch Payments" section
- [ ] Add 5 payments:
  1. Employee 1: $400 - Salary
  2. Employee 2: $450 - Salary
  3. Contractor: $600 - Consulting
  4. Business: $200 - Supplies
  5. Employee 3: $350 - Bonus
- [ ] ✅ Batch total calculates: $2000
- [ ] ✅ Can edit entries before submit
- [ ] ✅ Can remove entries
- [ ] Submit batch
- [ ] ✅ All 5 payments created
- [ ] ✅ Balance decreases by $2000
- [ ] ✅ Each payment has individual transaction record

**Result:** ☐ Pass ☐ Fail
**Balance:** $______ → $______

### Test 4.2: Insufficient Funds
- [ ] Create batch total > current balance
- [ ] Try to submit
- [ ] ✅ Error message: "Insufficient funds"
- [ ] ✅ Shows current balance vs. required
- [ ] ✅ Batch not submitted
- [ ] ✅ "Add Funds" option appears

**Result:** ☐ Pass ☐ Fail

### Test 4.3: Add Funds Mid-Batch
- [ ] Click "Add Funds" from insufficient funds error
- [ ] Switch to Deposits tab
- [ ] Add deposit of $3000
- [ ] ✅ Balance increases
- [ ] ✅ Return to Payments tab
- [ ] ✅ Batch data preserved (not lost)
- [ ] Submit batch successfully
- [ ] ✅ All payments processed

**Result:** ☐ Pass ☐ Fail

---

## Phase 5: Transaction History

### Test 5.1: View Combined History
- [ ] Click "Transaction History" tab
- [ ] ✅ See deposits and payments combined
- [ ] ✅ Deposits show as positive amounts
- [ ] ✅ Payments show as negative amounts
- [ ] ✅ Sorted by date (newest first)
- [ ] ✅ Running balance displayed

**Result:** ☐ Pass ☐ Fail

### Test 5.2: Filter Transactions
- [ ] Set date range filter: Last 30 days
- [ ] ✅ Transactions filtered correctly
- [ ] Filter by type: PAYMENT only
- [ ] ✅ Only payments shown
- [ ] Clear filters
- [ ] ✅ All transactions return

**Result:** ☐ Pass ☐ Fail

---

## Phase 6: Reports & Analytics

### Test 6.1: View Reports
- [ ] Click "View Reports" button
- [ ] ✅ Summary cards display: Total spent, payment count, deposit count
- [ ] ✅ Pie chart: Expenses by category renders
- [ ] ✅ Bar chart: Expenses by payee type renders
- [ ] ✅ Line chart: Trends over time renders
- [ ] ✅ Charts are interactive (hover tooltips)

**Result:** ☐ Pass ☐ Fail

### Test 6.2: Date Range Filter in Reports
- [ ] Set date range: Last quarter
- [ ] ✅ All charts update
- [ ] ✅ Summary statistics recalculate
- [ ] ✅ Trends show only selected period

**Result:** ☐ Pass ☐ Fail

---

## Phase 7: Low Balance Alerts

### Test 7.1: Low Balance Warning
- [ ] Reduce account balance to below threshold
- [ ] Navigate to Dashboard
- [ ] ✅ Low balance alert appears
- [ ] ✅ Shows warning icon and message
- [ ] ✅ Lists account name and balance
- [ ] Click alert
- [ ] ✅ Navigates to account detail

**Result:** ☐ Pass ☐ Fail

### Test 7.2: Critical Balance Alert
- [ ] Reduce balance to < $500 (critical threshold)
- [ ] ✅ Alert shows as red/critical
- [ ] ✅ Message: "Critical balance - add funds immediately"

**Result:** ☐ Pass ☐ Fail

---

## Phase 8: Payee Integration (Employee View)

### Test 8.1: Employee Expense Payments Tab
- [ ] Navigate to employee detail page (employee with payments)
- [ ] ✅ "Expense Payments" tab visible
- [ ] Click tab
- [ ] ✅ PayeeExpenseSummary card displays
- [ ] ✅ Shows: Total paid, payment count, accounts count
- [ ] ✅ Summary stats have correct values

**Result:** ☐ Pass ☐ Fail

### Test 8.2: Payments Table
- [ ] In Expense Payments tab
- [ ] ✅ Payments grouped by account
- [ ] ✅ Account sections expandable/collapsible
- [ ] ✅ First account auto-expanded
- [ ] ✅ Shows: Date, Category, Amount, Receipt, Notes
- [ ] ✅ Account names are clickable links
- [ ] Click account link
- [ ] ✅ Navigates to expense account detail

**Result:** ☐ Pass ☐ Fail

### Test 8.3: Expense Report Charts
- [ ] Click "Show Charts"
- [ ] ✅ Pie chart: Payments by category renders
- [ ] ✅ Bar chart: Payments by account renders
- [ ] ✅ Line chart: Monthly trends renders
- [ ] ✅ Summary stats displayed
- [ ] Set date range filter
- [ ] ✅ All charts update

**Result:** ☐ Pass ☐ Fail

### Test 8.4: Bidirectional Navigation
- [ ] From employee detail → Click account link
- [ ] ✅ Navigate to expense account detail
- [ ] Make new payment to same employee
- [ ] Return to employee detail page
- [ ] Refresh or navigate back
- [ ] ✅ New payment appears in expense payments tab
- [ ] ✅ Totals update correctly

**Result:** ☐ Pass ☐ Fail

---

## Phase 9: Permission Scenarios

### Test 9.1: Admin User
Login as: **Admin**
- [ ] ✅ "Expense Accounts" menu visible
- [ ] ✅ "Create Account" button visible
- [ ] ✅ All tabs visible (Overview, Deposits, Payments, Transactions)
- [ ] ✅ "View Reports" button visible
- [ ] ✅ Can perform all actions

**Result:** ☐ Pass ☐ Fail

### Test 9.2: Finance Manager
Login as: **Finance Manager** (limited permissions)
- [ ] ✅ Menu visible
- [ ] ❌ "Create Account" button NOT visible
- [ ] ❌ Deposits tab NOT visible
- [ ] ✅ Payments tab visible
- [ ] ✅ Can make payments
- [ ] ✅ Reports accessible

**Result:** ☐ Pass ☐ Fail

### Test 9.3: Regular Employee
Login as: **Employee** (no permissions)
- [ ] ❌ "Expense Accounts" menu NOT visible
- [ ] Try direct URL: `/expense-accounts`
- [ ] ❌ Redirects to dashboard (403)
- [ ] View own employee detail page
- [ ] ❌ "Expense Payments" tab NOT visible

**Result:** ☐ Pass ☐ Fail

---

## Phase 10: Edge Cases

### Test 10.1: Zero Balance Account
- [ ] Create new account (balance $0)
- [ ] Try to make payment
- [ ] ✅ Error: "Insufficient funds"
- [ ] ✅ Cannot proceed without deposit

**Result:** ☐ Pass ☐ Fail

### Test 10.2: Decimal Precision
- [ ] Try to enter: $100.999 (3 decimals)
- [ ] ✅ Rejected or rounded to $101.00
- [ ] Enter: $100.5 (1 decimal)
- [ ] ✅ Accepted as $100.50

**Result:** ☐ Pass ☐ Fail

### Test 10.3: Large Batch (20+ Payments)
- [ ] Create batch with 25 payments
- [ ] Submit batch
- [ ] ✅ All 25 payments process
- [ ] ✅ No timeout errors
- [ ] ✅ Transaction history shows all 25
- [ ] ✅ Balance calculates correctly

**Result:** ☐ Pass ☐ Fail

### Test 10.4: Invalid Payee ID
- [ ] Use API or inspect element to submit invalid payee ID
- [ ] ✅ Error: "Payee not found"
- [ ] ✅ No transaction created
- [ ] ✅ Balance unchanged

**Result:** ☐ Pass ☐ Fail

---

## Phase 11: Data Integrity Validation

### Run Validation Scripts

```bash
# Validate entire system
node scripts/validate-expense-account-system.js

# Test edge cases
node scripts/test-edge-cases.js

# Check for specific payee payments
node scripts/test-payee-payment-api.js
```

- [ ] All validation scripts run without errors
- [ ] No balance mismatches reported
- [ ] No orphaned payments found
- [ ] Decimal precision correct
- [ ] Payee relationships intact

**Result:** ☐ Pass ☐ Fail
**Notes:** _______________

---

## Phase 12: UI/UX Testing

### Test 12.1: Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] ✅ All layouts responsive
- [ ] ✅ No horizontal scrolling
- [ ] ✅ Touch-friendly on mobile

**Result:** ☐ Pass ☐ Fail

### Test 12.2: Dark Mode
- [ ] Switch to dark mode
- [ ] ✅ All pages render correctly
- [ ] ✅ Text readable
- [ ] ✅ Charts visible
- [ ] ✅ No white flashes

**Result:** ☐ Pass ☐ Fail

### Test 12.3: Loading States
- [ ] Observe loading indicators
- [ ] ✅ Spinners or skeletons appear during data fetch
- [ ] ✅ No blank screens
- [ ] ✅ Smooth transitions

**Result:** ☐ Pass ☐ Fail

### Test 12.4: Error Handling
- [ ] Trigger various errors (invalid data, network failure, etc.)
- [ ] ✅ User-friendly error messages
- [ ] ✅ No console errors (or acceptable errors logged)
- [ ] ✅ Can recover from errors

**Result:** ☐ Pass ☐ Fail

---

## Phase 13: Performance

### Test 13.1: Page Load Times
- [ ] Account list page loads in < 2 seconds
- [ ] Account detail page loads in < 2 seconds
- [ ] Reports page loads in < 3 seconds

**Result:** ☐ Pass ☐ Fail
**Load Times:** List: ___s Detail: ___s Reports: ___s

### Test 13.2: Large Dataset
- [ ] Create account with 100+ transactions
- [ ] ✅ Transaction history loads reasonably
- [ ] ✅ Pagination works (if implemented)
- [ ] ✅ Reports calculate without timeout

**Result:** ☐ Pass ☐ Fail

---

## Phase 14: Browser Compatibility

Test on multiple browsers:

**Chrome:** ☐ Pass ☐ Fail
**Firefox:** ☐ Pass ☐ Fail
**Safari:** ☐ Pass ☐ Fail
**Edge:** ☐ Pass ☐ Fail

---

## Test Summary

**Total Tests:** ______
**Passed:** ______
**Failed:** ______
**Skipped:** ______

**Pass Rate:** ______%

### Critical Issues Found
1. _______________
2. _______________
3. _______________

### Medium Issues Found
1. _______________
2. _______________

### Low Priority Issues
1. _______________
2. _______________

### Recommendations
_______________
_______________
_______________

---

## Sign-Off

**System Ready for Production:** ☐ Yes ☐ No ☐ With Caveats

**Tester Signature:** _______________
**Date:** _______________

**Reviewed By:** _______________
**Date:** _______________

---

**End of E2E Test Validation Checklist**
