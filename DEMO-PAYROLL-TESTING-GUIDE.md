# Payroll System Testing Guide

**Last Updated:** 2026-01-02
**Version:** 1.0
**Purpose:** Comprehensive testing guide for payroll accounts, periods, and processing

---

## 📚 Table of Contents

- [Overview](#overview)
- [Payroll Account Management](#payroll-account-management)
- [Payroll Period Processing](#payroll-period-processing)
- [Employee Payroll Entries](#employee-payroll-entries)
- [Reporting and Analytics](#reporting-and-analytics)
- [Integration Testing](#integration-testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The payroll system manages employee compensation through dedicated accounts and processing periods:

**Key Components:**
- **Payroll Accounts:** Dedicated expense accounts for payroll funds
- **Payroll Periods:** Processing cycles (weekly, bi-weekly, monthly)
- **Payroll Entries:** Individual employee paychecks
- **Deductions:** Taxes, benefits, loans, advances
- **Reports:** Payroll summaries, tax reports, employee history

**Supported Frequencies:**
- Weekly
- Bi-weekly (every 2 weeks)
- Semi-monthly (twice per month)
- Monthly

---

## Payroll Account Management

### Prerequisites

**Test Accounts:**
- **Restaurant Manager:** sarah.johnson@restaurant-demo.com (Password: Demo@123)
- **Grocery Manager:** james.brown@grocery-demo.com (Password: Demo@123)

**Demo Data Required:**
```bash
POST /api/admin/seed-payroll-accounts
```

**Expected Data:**
- 4 payroll accounts (one per business)
- Initial deposits ($98K-$118K per account)
- Transaction history

---

### Test 1: View Payroll Accounts

**Objective:** Display payroll accounts for a business

**Steps:**
1. Login as Restaurant manager
2. Navigate to `/payroll/accounts`
3. View account list

**Expected Results:**
- ✅ See payroll account(s)
- ✅ Current balance displayed
- ✅ Account status (Active/Inactive)
- ✅ Transaction history link
- ✅ "Add Funds" button visible

**Sample Account:**
| Account Name | Balance | Status | Last Activity |
|--------------|---------|--------|---------------|
| Restaurant Payroll Account | $108,750.00 | Active | 2026-01-01 |

---

### Test 2: Create Payroll Account

**Objective:** Set up a new payroll account

**Steps:**
1. Navigate to `/payroll/accounts`
2. Click "Create Payroll Account"
3. Fill in form:
   - **Account Name:** "Restaurant Main Payroll"
   - **Type:** Expense Account
   - **Category:** Payroll
   - **Initial Balance:** $0.00
   - **Status:** Active
4. Click "Save"

**Expected Results:**
- ✅ Account created successfully
- ✅ Appears in account list
- ✅ Balance starts at $0.00
- ✅ Ready for deposits

**Validation:**
```bash
GET /api/business/expense-accounts?category=payroll
```

---

### Test 3: Add Funds to Payroll Account

**Objective:** Deposit funds into payroll account

**Steps:**
1. Navigate to `/payroll/accounts`
2. Select account: "Restaurant Main Payroll"
3. Click "Add Funds"
4. Fill in deposit form:
   - **Amount:** $50,000.00
   - **Source:** Operating Account Transfer
   - **Reference:** "Monthly payroll funding"
   - **Date:** 2026-01-02
5. Click "Deposit"

**Expected Results:**
- ✅ Deposit recorded successfully
- ✅ Balance updates: $0.00 → $50,000.00
- ✅ Transaction appears in history
- ✅ Timestamp and user recorded

**Transaction Record:**
```
Type: Deposit
Amount: +$50,000.00
Reference: Monthly payroll funding
Date: 2026-01-02
User: Sarah Johnson
New Balance: $50,000.00
```

---

### Test 4: Withdraw Funds (Payment)

**Objective:** Record payroll account withdrawal

**Steps:**
1. Navigate to account detail page
2. Click "Record Payment"
3. Fill in form:
   - **Amount:** $5,000.00
   - **Purpose:** Emergency payroll advance
   - **Reference:** "Advance payment to operations"
   - **Date:** 2026-01-02
4. Click "Save"

**Expected Results:**
- ✅ Withdrawal recorded
- ✅ Balance updates: $50,000.00 → $45,000.00
- ✅ Transaction logged
- ✅ Payment categorized correctly

---

### Test 5: View Transaction History

**Objective:** Review all payroll account transactions

**Steps:**
1. Navigate to account detail page
2. Click "Transaction History" tab
3. View all transactions
4. Filter by type: "Deposits"
5. Filter by date range: Last 30 days

**Expected Results:**
- ✅ All transactions listed chronologically
- ✅ Each shows: date, type, amount, reference, balance
- ✅ Filters work correctly
- ✅ Export option available (CSV)

**Sample History:**
| Date | Type | Amount | Reference | Balance |
|------|------|--------|-----------|---------|
| 2026-01-02 | Payment | -$5,000.00 | Emergency advance | $45,000.00 |
| 2026-01-02 | Deposit | +$50,000.00 | Monthly funding | $50,000.00 |
| 2026-01-01 | Deposit | +$100,000.00 | Initial funding | $100,000.00 |

---

### Test 6: Low Balance Alert

**Objective:** Verify warning when balance is low

**Steps:**
1. Set up account with $5,000 balance
2. Create payroll period with total payroll: $15,000
3. Attempt to process payroll

**Expected Results:**
- ✅ Warning displayed: "Insufficient funds"
- ✅ Shows shortfall amount: -$10,000
- ✅ Prompts to add funds first
- ✅ Prevents payroll processing

---

## Payroll Period Processing

### Prerequisites

**Demo Data Required:**
```bash
POST /api/admin/seed-payroll-periods
```

**Expected Data:**
- 3 payroll periods (2 Restaurant, 1 Grocery)
- 14 payroll entries
- Various statuses (Draft, Approved, Processed, Paid)

---

### Test 1: View Payroll Periods

**Objective:** Display all payroll periods for business

**Steps:**
1. Login as Restaurant manager
2. Navigate to `/payroll/periods`
3. View period list

**Expected Results:**
- ✅ See list of payroll periods
- ✅ Each shows: period dates, status, employee count, total amount
- ✅ Status indicators (Draft, Approved, Processed, Paid)
- ✅ "Create Period" button visible

**Sample Data:**
| Period | Start Date | End Date | Employees | Gross Pay | Status |
|--------|------------|----------|-----------|-----------|--------|
| Weekly 01/2026 | 2025-12-30 | 2026-01-05 | 4 | $8,800.00 | Processed |
| Weekly 52/2025 | 2025-12-23 | 2025-12-29 | 4 | $8,400.00 | Paid |

---

### Test 2: Create Payroll Period

**Objective:** Set up a new payroll period

**Steps:**
1. Navigate to `/payroll/periods`
2. Click "Create Payroll Period"
3. Fill in form:
   - **Period Type:** Weekly
   - **Start Date:** 2026-01-06
   - **End Date:** 2026-01-12
   - **Pay Date:** 2026-01-15
   - **Description:** "Week 2, January 2026"
4. Click "Create"

**Expected Results:**
- ✅ Period created with status "Draft"
- ✅ Start/end dates validated (no overlap)
- ✅ Pay date after end date
- ✅ Ready for employee entries

**Validation Rules:**
- End date must be after start date
- Pay date must be after end date
- No overlapping periods for same frequency
- Period length matches frequency type

---

### Test 3: Add Employee to Payroll Period

**Objective:** Create payroll entry for an employee

**Steps:**
1. Navigate to payroll period detail page
2. Click "Add Employee"
3. Select employee: "Michael Chen"
4. Fill in payroll details:
   - **Base Salary:** $2,000.00
   - **Hours Worked:** 40
   - **Hourly Rate:** $25.00
   - **Overtime Hours:** 5
   - **Overtime Rate:** $37.50
   - **Bonuses:** $100.00
   - **Commissions:** $150.00
5. System calculates:
   - Regular Pay: $1,000.00 (40 × $25)
   - Overtime Pay: $187.50 (5 × $37.50)
   - Gross Pay: $1,437.50
6. Click "Save"

**Expected Results:**
- ✅ Entry created for employee
- ✅ Calculations correct
- ✅ Deductions calculated automatically
- ✅ Net pay displayed

**Calculation Breakdown:**
```
Regular Hours: 40 × $25.00 = $1,000.00
Overtime: 5 × $37.50 = $187.50
Bonuses: $100.00
Commissions: $150.00
─────────────────────────────────
Gross Pay: $1,437.50

Deductions:
- Federal Tax (15%): -$215.63
- State Tax (5%): -$71.88
- Social Security (6.2%): -$89.13
- Medicare (1.45%): -$20.84
- Health Insurance: -$150.00
─────────────────────────────────
Total Deductions: -$547.48

Net Pay: $890.02
```

---

### Test 4: Bulk Add Employees to Period

**Objective:** Add multiple employees at once

**Steps:**
1. Navigate to period detail page
2. Click "Bulk Add Employees"
3. Select all active employees (4 employees)
4. System pre-fills based on:
   - Last period's data
   - Employee salary information
   - Standard hours (40)
5. Review and adjust as needed
6. Click "Add All"

**Expected Results:**
- ✅ All employees added to period
- ✅ Pre-filled data accurate
- ✅ Can edit individual entries
- ✅ Calculations automatic

---

### Test 5: Apply Deductions

**Objective:** Configure and apply payroll deductions

**Deduction Types:**
- Federal Income Tax (percentage)
- State Income Tax (percentage)
- Social Security (6.2%)
- Medicare (1.45%)
- Health Insurance (fixed amount)
- 401(k) Contribution (percentage)
- Employee Loans (see HR features)

**Steps:**
1. Navigate to employee payroll entry
2. Click "Edit Deductions"
3. Configure deductions:
   - Federal Tax: 15% of gross
   - State Tax: 5% of gross
   - Social Security: 6.2% of gross
   - Medicare: 1.45% of gross
   - Health Insurance: $150.00 (fixed)
   - 401(k): 5% of gross
4. Save

**Expected Results:**
- ✅ All deductions calculated
- ✅ Percentages applied to gross pay
- ✅ Fixed amounts added
- ✅ Net pay recalculated
- ✅ Total deductions displayed

---

### Test 6: Approve Payroll Period

**Objective:** Move period from Draft to Approved status

**Steps:**
1. Navigate to period detail page (status: Draft)
2. Verify all employees added
3. Review total payroll amount
4. Check payroll account has sufficient funds
5. Click "Approve Period"
6. Confirm approval

**Expected Results:**
- ✅ Status changes: Draft → Approved
- ✅ Entries locked for editing
- ✅ Ready for processing
- ✅ Approval timestamp recorded

**Validation:**
- All employees have entries
- No entries have errors
- Total amount ≤ account balance
- Manager has approval permission

---

### Test 7: Process Payroll Period

**Objective:** Execute payroll and generate paychecks

**Steps:**
1. Navigate to approved period
2. Click "Process Payroll"
3. Confirm processing
4. System processes:
   - Deducts total from payroll account
   - Marks entries as "Processed"
   - Generates paycheck records
   - Updates employee payment history
5. View results

**Expected Results:**
- ✅ Status: Approved → Processed
- ✅ Payroll account debited
- ✅ All entries marked "Processed"
- ✅ Paychecks generated
- ✅ Processing timestamp recorded

**Account Transaction:**
```
Type: Payroll Processing
Period: Weekly 01/2026
Amount: -$8,800.00
Employees: 4
Date: 2026-01-15
Reference: Week 2, January 2026
New Balance: $36,200.00
```

---

### Test 8: Mark Payroll as Paid

**Objective:** Record payment completion

**Steps:**
1. Navigate to processed period
2. Click "Mark as Paid"
3. Enter payment details:
   - **Payment Method:** Direct Deposit
   - **Payment Date:** 2026-01-15
   - **Reference:** "ACH Batch #12345"
4. Confirm

**Expected Results:**
- ✅ Status: Processed → Paid
- ✅ Payment details recorded
- ✅ Employees notified (if configured)
- ✅ Period finalized

---

### Test 9: Payroll Period Corrections

**Objective:** Make corrections to processed payroll

**Scenario:** Employee overtime was entered incorrectly

**Steps:**
1. Navigate to processed period
2. Click "Unlock for Corrections"
3. Enter manager password/approval
4. Edit employee entry
5. Correct overtime hours
6. Recalculate
7. Click "Reprocess Period"

**Expected Results:**
- ✅ Period unlocked for editing
- ✅ Corrections applied
- ✅ Difference calculated
- ✅ Adjustment transaction created
- ✅ Period re-locked

**Adjustment Transaction:**
```
Type: Payroll Adjustment
Period: Weekly 01/2026
Employee: Michael Chen
Original: $1,437.50
Corrected: $1,625.00
Difference: +$187.50
Reason: Overtime correction
Date: 2026-01-16
```

---

## Employee Payroll Entries

### Test 1: View Employee Payroll History

**Objective:** Review all payroll for an employee

**Steps:**
1. Navigate to `/payroll/employees`
2. Select employee: "Michael Chen"
3. View payroll history

**Expected Results:**
- ✅ All payroll periods listed
- ✅ Each shows: period, gross pay, deductions, net pay
- ✅ Year-to-date totals displayed
- ✅ Export to PDF (for employee)

**Sample History:**
| Period | Gross Pay | Deductions | Net Pay | Pay Date |
|--------|-----------|------------|---------|----------|
| 01/2026 | $2,200.00 | -$845.32 | $1,354.68 | 2026-01-15 |
| 52/2025 | $2,100.00 | -$806.50 | $1,293.50 | 2025-12-31 |

**YTD Totals (2026):**
- Gross Pay: $2,200.00
- Deductions: $845.32
- Net Pay: $1,354.68

---

### Test 2: Generate Paystub

**Objective:** Create detailed paystub for employee

**Steps:**
1. Navigate to employee payroll entry
2. Click "Generate Paystub"
3. Review paystub preview
4. Click "Download PDF"

**Expected Paystub:**
```
═══════════════════════════════════
        ACME RESTAURANT
       EMPLOYEE PAY STUB
═══════════════════════════════════
Employee: Michael Chen
ID: EMP-RC-002
Pay Period: 12/30/2025 - 01/05/2026
Pay Date: 01/15/2026

─────────────────────────────────
EARNINGS
─────────────────────────────────
Regular (40 hrs × $25.00)  $1,000.00
Overtime (5 hrs × $37.50)    $187.50
Bonuses                      $100.00
Commissions                  $150.00
─────────────────────────────────
GROSS PAY:                 $1,437.50

─────────────────────────────────
DEDUCTIONS
─────────────────────────────────
Federal Tax (15%)            $215.63
State Tax (5%)                $71.88
Social Security (6.2%)        $89.13
Medicare (1.45%)              $20.84
Health Insurance             $150.00
401(k) (5%)                   $71.88
─────────────────────────────────
TOTAL DEDUCTIONS:            $619.36

─────────────────────────────────
NET PAY:                     $818.14
═══════════════════════════════════

Year-to-Date Totals:
Gross Pay:    $2,200.00
Deductions:     $845.32
Net Pay:      $1,354.68
```

---

### Test 3: Employee Self-Service View

**Objective:** Allow employees to view their own payroll

**Steps:**
1. Login as employee (michael.chen@restaurant-demo.com)
2. Navigate to `/my-payroll`
3. View payroll history
4. Download paystub

**Expected Results:**
- ✅ Employee sees only their own payroll
- ✅ Cannot view other employees
- ✅ Can download paystubs
- ✅ YTD totals visible

---

## Reporting and Analytics

### Test 1: Payroll Summary Report

**Objective:** Generate business-wide payroll report

**Steps:**
1. Navigate to `/payroll/reports`
2. Select report: "Payroll Summary"
3. Configure:
   - **Period:** Last 3 months
   - **Group By:** Department
   - **Include:** All deductions
4. Generate report

**Expected Results:**
- ✅ Report shows total payroll by department
- ✅ Breakdown by pay period
- ✅ Deduction summaries
- ✅ Charts and graphs
- ✅ Export to Excel/PDF

**Sample Report:**
```
PAYROLL SUMMARY REPORT
Period: October - December 2025
Business: ACME Restaurant

═══════════════════════════════════
Total Payroll: $26,400.00
Employees: 4
Periods: 3
Average per Period: $8,800.00
═══════════════════════════════════

BY DEPARTMENT:
Kitchen:        $12,600.00 (47.7%)
Front of House: $10,200.00 (38.6%)
Management:      $3,600.00 (13.6%)

DEDUCTION TOTALS:
Federal Tax:     $3,960.00
State Tax:       $1,320.00
Social Security: $1,636.80
Medicare:          $382.80
Benefits:        $1,800.00
─────────────────────────────────
Total Deductions: $9,099.60
Net Paid:        $17,300.40
```

---

### Test 2: Tax Report (W-2 Preparation)

**Objective:** Generate annual tax report data

**Steps:**
1. Navigate to `/payroll/reports/tax`
2. Select year: 2025
3. Generate report

**Expected Results:**
- ✅ Total wages per employee
- ✅ Tax withholdings breakdown
- ✅ Export for W-2 preparation
- ✅ Quarterly summaries

---

### Test 3: Payroll Account Reconciliation

**Objective:** Reconcile payroll account transactions

**Steps:**
1. Navigate to `/payroll/accounts/reconciliation`
2. Select period: December 2025
3. Review:
   - Opening balance
   - Deposits
   - Payroll payments
   - Other withdrawals
   - Closing balance
4. Compare to bank statement
5. Mark as reconciled

**Expected Results:**
- ✅ All transactions listed
- ✅ Balances match bank statement
- ✅ Discrepancies highlighted
- ✅ Reconciliation saved

---

## Integration Testing

### Test 1: Employee Benefits Integration

**Objective:** Verify benefit deductions apply to payroll

**Steps:**
1. Employee has active health insurance ($150/month)
2. Create payroll period
3. Add employee
4. Verify benefit deduction appears automatically

**Expected Results:**
- ✅ Health insurance deducted: $150.00
- ✅ Links to benefit record
- ✅ Benefit status checked

---

### Test 2: Employee Loan Deductions

**Objective:** Apply loan payments to payroll

**Steps:**
1. Employee has active loan (balance: $1,000, payment: $100/period)
2. Create payroll period
3. Add employee
4. Verify loan payment deducted

**Expected Results:**
- ✅ Loan payment deducted: $100.00
- ✅ Loan balance updated: $1,000 → $900
- ✅ Payment recorded in loan history
- ✅ Loan status checked

---

### Test 3: Expense Account Integration

**Objective:** Verify payroll charges expense accounts correctly

**Steps:**
1. Process payroll period
2. Navigate to `/business/expense-accounts`
3. Find "Payroll Account"
4. Verify transaction recorded

**Expected Results:**
- ✅ Payroll expense recorded
- ✅ Amount matches period total
- ✅ Date matches pay date
- ✅ Reference links to period

---

## Troubleshooting

### Common Issues

**Problem:** Cannot create payroll period - "Overlapping dates"

**Solution:**
- Check existing periods for date conflicts
- Ensure end date is after start date
- Verify no duplicate periods for same frequency

---

**Problem:** Payroll calculations incorrect

**Solutions:**
1. Verify employee hourly rate
2. Check overtime rate (usually 1.5× regular)
3. Verify tax percentages configured
4. Review deduction setup
5. Recalculate manually

---

**Problem:** Insufficient funds error

**Solutions:**
1. Check payroll account balance
2. Add funds before processing
3. Verify deposit recorded correctly
4. Check for pending transactions

---

**Problem:** Cannot edit processed period

**Solution:**
- Processed periods are locked
- Use "Unlock for Corrections" feature
- Requires manager approval
- Creates adjustment transactions

---

**Problem:** Employee not appearing in period

**Solutions:**
1. Verify employee is active
2. Check employment dates
3. Ensure employee in correct business
4. Verify employee has salary/rate configured

---

## Performance Benchmarks

**Payroll Period Creation:**
- Create period: <2 seconds
- Add single employee: <1 second
- Bulk add employees: <5 seconds (10 employees)

**Processing:**
- Approve period: <2 seconds
- Process period: <10 seconds (10 employees)
- Mark as paid: <1 second

**Reports:**
- Summary report: <5 seconds
- Tax report: <8 seconds
- Employee history: <2 seconds

---

## Testing Checklist

**Payroll Accounts:**
- ☐ Account created
- ☐ Funds deposited
- ☐ Withdrawals recorded
- ☐ Transaction history accurate
- ☐ Balance calculations correct
- ☐ Low balance alerts working

**Payroll Periods:**
- ☐ Period created
- ☐ Employees added (single and bulk)
- ☐ Calculations correct
- ☐ Deductions applied
- ☐ Period approved
- ☐ Payroll processed
- ☐ Marked as paid
- ☐ Corrections workflow tested

**Employee Features:**
- ☐ Payroll history accessible
- ☐ Paystubs generated
- ☐ Self-service portal working
- ☐ YTD totals correct

**Reports:**
- ☐ Summary report generated
- ☐ Tax report accurate
- ☐ Reconciliation completed
- ☐ Exports working

**Integrations:**
- ☐ Benefits deductions automatic
- ☐ Loan payments applied
- ☐ Expense accounts updated

---

**Document Version:** 1.0
**Last Updated:** 2026-01-02
**Next Review:** 2026-02-02
