# HR Features Testing Guide

**Last Updated:** 2026-01-02
**Version:** 1.0
**Purpose:** Comprehensive testing guide for HR features (Benefits, Loans, Leave Management, Salary Increases)

---

## 📚 Table of Contents

- [Overview](#overview)
- [Employee Benefits](#employee-benefits)
- [Employee Loans](#employee-loans)
- [Leave Management](#leave-management)
- [Salary Increases](#salary-increases)
- [Employee Self-Service](#employee-self-service)
- [HR Reporting](#hr-reporting)
- [Troubleshooting](#troubleshooting)

---

## Overview

The HR module provides comprehensive employee management features:

| Feature | Purpose | Manager Access | Employee Access |
|---------|---------|----------------|-----------------|
| **Benefits** | Health insurance, retirement, perks | Full | View only |
| **Loans** | Employee advances and loans | Approve, manage | Request, view |
| **Leave Management** | Vacation, sick, personal time | Approve requests | Request, view balance |
| **Salary Increases** | Compensation history | Full | View own history |

**Key Workflows:**
- Employee requests → Manager approves → System processes
- Automatic payroll integration
- Self-service portal for employees
- Comprehensive audit trails

---

## Employee Benefits

### Prerequisites

**Test Accounts:**
- **Restaurant Manager:** sarah.johnson@restaurant-demo.com (Password: Demo@123)
- **Any Employee:** michael.chen@restaurant-demo.com (Password: Demo@123)

**Demo Data Required:**
```bash
POST /api/admin/seed-employee-benefits
```

**Expected Data:**
- 8 benefit types
- 80 benefit assignments (5 per employee × 16 employees)

---

### Test 1: View Benefit Types

**Objective:** Display available benefit types

**Steps:**
1. Login as Restaurant manager
2. Navigate to `/hr/benefits/types`
3. View benefit catalog

**Expected Results:**
- ✅ See list of benefit types
- ✅ Each shows: name, category, cost, coverage details
- ✅ "Create Benefit Type" button visible
- ✅ Edit/Delete options

**Sample Benefit Types:**
| Name | Category | Employee Cost | Employer Cost | Coverage |
|------|----------|---------------|---------------|----------|
| Health Insurance - Basic | Health | $150/month | $450/month | Individual |
| Health Insurance - Premium | Health | $250/month | $650/month | Family |
| Dental Insurance | Dental | $40/month | $60/month | Individual |
| Vision Insurance | Vision | $15/month | $25/month | Individual |
| Life Insurance | Life | $0/month | $50/month | $100K coverage |
| 401(k) Matching | Retirement | 5% of salary | 5% match | Up to 5% |
| Gym Membership | Wellness | $0/month | $50/month | Local gym |
| Transit Pass | Transportation | $0/month | $75/month | Monthly pass |

---

### Test 2: Create New Benefit Type

**Objective:** Add a custom benefit offering

**Steps:**
1. Navigate to `/hr/benefits/types`
2. Click "Create Benefit Type"
3. Fill in form:
   - **Name:** "Educational Assistance"
   - **Category:** Professional Development
   - **Description:** "Annual tuition reimbursement"
   - **Employee Cost:** $0/month
   - **Employer Cost:** $200/month
   - **Eligibility:** Full-time employees
   - **Coverage:** Up to $2,400/year
4. Click "Save"

**Expected Results:**
- ✅ Benefit type created
- ✅ Available for assignment
- ✅ Shows in benefit catalog
- ✅ Cost calculated correctly

---

### Test 3: Assign Benefits to Employee

**Objective:** Enroll employee in benefits

**Steps:**
1. Navigate to `/hr/employees`
2. Select employee: "Michael Chen"
3. Click "Benefits" tab
4. Click "Add Benefit"
5. Select multiple benefits:
   - Health Insurance - Basic
   - Dental Insurance
   - Vision Insurance
   - 401(k) Matching
6. Configure each:
   - **Start Date:** 2026-01-01
   - **Coverage:** Individual/Family
   - **Employee Contribution:** (pre-filled)
7. Click "Enroll"

**Expected Results:**
- ✅ All benefits assigned
- ✅ Start dates recorded
- ✅ Costs calculated
- ✅ Payroll deductions configured

**Total Monthly Costs:**
```
Employee Portion:
- Health Insurance: $150.00
- Dental Insurance:  $40.00
- Vision Insurance:  $15.00
- 401(k): 5% of salary (varies)
────────────────────────────────
Total: $205.00 + 5% salary

Employer Portion:
- Health Insurance: $450.00
- Dental Insurance:  $60.00
- Vision Insurance:  $25.00
- 401(k) Match: 5% of salary
- Life Insurance:    $50.00
────────────────────────────────
Total: $585.00 + 5% salary
```

---

### Test 4: Modify Benefit Assignment

**Objective:** Change employee benefit options

**Steps:**
1. Navigate to employee benefits
2. Find "Health Insurance - Basic"
3. Click "Change Plan"
4. Select "Health Insurance - Premium"
5. Update coverage: Individual → Family
6. Set effective date: 2026-02-01
7. Save changes

**Expected Results:**
- ✅ Change scheduled for future date
- ✅ Cost difference calculated
- ✅ Payroll deduction updates on effective date
- ✅ Change logged in history

---

### Test 5: Terminate Benefit

**Objective:** End benefit coverage for employee

**Steps:**
1. Navigate to employee benefits
2. Select "Gym Membership"
3. Click "Terminate Benefit"
4. Enter termination date: 2026-01-31
5. Select reason: "Employee request"
6. Confirm termination

**Expected Results:**
- ✅ Benefit marked for termination
- ✅ Coverage ends on specified date
- ✅ Payroll deductions stop
- ✅ Termination logged

---

### Test 6: Bulk Benefits Enrollment

**Objective:** Enroll multiple employees in same benefit

**Steps:**
1. Navigate to `/hr/benefits/bulk-enroll`
2. Select benefit: "Health Insurance - Basic"
3. Select employees:
   - All full-time Restaurant employees (4)
4. Configure:
   - **Start Date:** 2026-01-01
   - **Coverage:** Individual
5. Click "Enroll All"

**Expected Results:**
- ✅ All employees enrolled
- ✅ Individual assignments created
- ✅ Payroll deductions configured
- ✅ Success confirmation

---

### Test 7: Benefits Eligibility Check

**Objective:** Verify eligibility rules enforced

**Steps:**
1. Attempt to assign benefits to part-time employee
2. Select benefit: "Health Insurance - Basic"
3. System checks eligibility

**Expected Results:**
- ✅ Warning: "Employee not eligible - part-time status"
- ✅ Option to override (with manager approval)
- ✅ Or select eligible benefits only

---

## Employee Loans

### Prerequisites

**Demo Data Required:**
```bash
POST /api/admin/seed-employee-loans
```

**Expected Data:**
- 13 employee loans
- 101 loan payments
- Various statuses (Active, Paid Off, Defaulted)

---

### Test 1: View Employee Loans

**Objective:** Display all loans for business

**Steps:**
1. Navigate to `/hr/loans`
2. View loan list
3. Filter by status: "Active"

**Expected Results:**
- ✅ See list of all loans
- ✅ Each shows: employee, amount, balance, status
- ✅ Payment schedule visible
- ✅ "Create Loan" button visible

**Sample Data:**
| Employee | Amount | Balance | Payment | Status | Due Date |
|----------|--------|---------|---------|--------|----------|
| Michael Chen | $2,000 | $800 | $200/period | Active | 2026-02-15 |
| Emily Rodriguez | $1,500 | $0 | $150/period | Paid Off | N/A |
| David Williams | $3,000 | $3,000 | $300/period | Defaulted | Past due |

---

### Test 2: Create Employee Loan

**Objective:** Issue a loan to an employee

**Steps:**
1. Navigate to `/hr/loans`
2. Click "Create Loan"
3. Fill in form:
   - **Employee:** Sarah Johnson
   - **Loan Amount:** $5,000.00
   - **Purpose:** Emergency personal expense
   - **Interest Rate:** 3% annual
   - **Payment Amount:** $500/period (bi-weekly)
   - **Start Date:** 2026-01-15
   - **Payment Frequency:** Bi-weekly (payroll deduction)
   - **Terms:** Repay within 6 months
4. Click "Issue Loan"

**Expected Results:**
- ✅ Loan created with status "Active"
- ✅ Payment schedule generated
- ✅ Payroll deductions configured
- ✅ Funds disbursed (if configured)

**Loan Summary:**
```
═══════════════════════════════════
     EMPLOYEE LOAN AGREEMENT
═══════════════════════════════════
Employee: Sarah Johnson
Loan Amount: $5,000.00
Interest Rate: 3% annually
Payment: $500.00 bi-weekly
Total Payments: 10
Total Interest: ~$75.00
Total Repayment: ~$5,075.00

Payment Schedule:
1. 2026-01-15: $500.00
2. 2026-01-29: $500.00
3. 2026-02-12: $500.00
... (7 more payments)
10. 2026-06-02: $575.00 (final)

═══════════════════════════════════
```

---

### Test 3: Record Loan Payment

**Objective:** Process manual or payroll-deducted payment

**Steps:**
1. Navigate to loan detail page
2. Click "Record Payment"
3. Fill in payment:
   - **Amount:** $500.00
   - **Date:** 2026-01-15
   - **Method:** Payroll deduction
   - **Reference:** "Payroll Period 01/2026"
4. Click "Save"

**Expected Results:**
- ✅ Payment recorded
- ✅ Balance updated: $5,000 → $4,500
- ✅ Interest calculated
- ✅ Payment logged in history

**Payment Record:**
```
Payment #1
Date: 2026-01-15
Amount: $500.00
Principal: $487.50
Interest: $12.50
New Balance: $4,512.50
Method: Payroll deduction
```

---

### Test 4: Payroll Integration

**Objective:** Verify automatic loan deductions in payroll

**Steps:**
1. Employee has active loan ($500 payment)
2. Create payroll period
3. Add employee to period
4. Review deductions

**Expected Results:**
- ✅ Loan payment appears in deductions
- ✅ Amount matches loan payment: $500
- ✅ Links to loan record
- ✅ Net pay reduced accordingly

**Payroll Entry:**
```
Gross Pay: $2,000.00

Deductions:
- Taxes: -$450.00
- Benefits: -$205.00
- Loan Payment: -$500.00
────────────────────────────
Total Deductions: -$1,155.00

Net Pay: $845.00
```

---

### Test 5: Early Loan Payoff

**Objective:** Allow employee to pay off loan early

**Steps:**
1. Navigate to loan detail
2. Current balance: $4,500
3. Click "Pay Off Loan"
4. Enter amount: $4,500
5. Select date: 2026-01-20
6. Confirm payment

**Expected Results:**
- ✅ Final payment recorded
- ✅ Balance: $4,500 → $0
- ✅ Status: Active → Paid Off
- ✅ Payroll deductions stop
- ✅ Loan completion logged

---

### Test 6: Handle Defaulted Loan

**Objective:** Manage loan in default

**Steps:**
1. Loan has 3 missed payments
2. Navigate to loan detail
3. System shows: "3 payments overdue"
4. Click "Mark as Defaulted"
5. Enter reason: "Employee terminated, unable to repay"
6. Configure collection:
   - Contact employee: Yes
   - Collection agency: No
   - Write-off: Partial
7. Save

**Expected Results:**
- ✅ Status: Active → Defaulted
- ✅ Collection process initiated
- ✅ Manager notified
- ✅ Payroll deductions stopped
- ✅ Default logged

---

### Test 7: Loan Modification

**Objective:** Adjust loan terms (hardship)

**Steps:**
1. Employee requests payment reduction
2. Navigate to loan detail
3. Click "Modify Terms"
4. Adjust:
   - Payment: $500 → $300/period
   - Duration: Extended
5. Calculate new schedule
6. Approve modification

**Expected Results:**
- ✅ New terms saved
- ✅ Payment schedule recalculated
- ✅ Modification logged
- ✅ Employee notified

---

## Leave Management

### Prerequisites

**Demo Data Required:**
```bash
POST /api/admin/seed-leave-management
```

**Expected Data:**
- 16 leave balances (one per employee)
- 45 leave requests (28 approved, 8 pending, 9 rejected)
- Multiple leave types

---

### Test 1: View Leave Balances

**Objective:** Display employee leave accruals

**Steps:**
1. Navigate to `/hr/leave/balances`
2. View all employees

**Expected Results:**
- ✅ All employees listed
- ✅ Each shows: vacation, sick, personal time balances
- ✅ Accrual rates visible
- ✅ Year-to-date usage shown

**Sample Data:**
| Employee | Vacation | Sick | Personal | Total Available |
|----------|----------|------|----------|-----------------|
| Sarah Johnson | 80 hrs | 40 hrs | 24 hrs | 144 hrs |
| Michael Chen | 64 hrs | 32 hrs | 16 hrs | 112 hrs |
| Emily Rodriguez | 48 hrs | 24 hrs | 8 hrs | 80 hrs |

**Accrual Rates:**
- Vacation: 6.67 hrs/month (80 hrs/year)
- Sick: 3.33 hrs/month (40 hrs/year)
- Personal: 2 hrs/month (24 hrs/year)

---

### Test 2: Employee Leave Request

**Objective:** Submit leave request as employee

**Steps:**
1. Login as employee (michael.chen@restaurant-demo.com)
2. Navigate to `/my-leave`
3. Click "Request Time Off"
4. Fill in form:
   - **Leave Type:** Vacation
   - **Start Date:** 2026-01-20
   - **End Date:** 2026-01-24
   - **Total Days:** 5 (40 hours)
   - **Reason:** Family vacation
5. Submit request

**Expected Results:**
- ✅ Request created with status "Pending"
- ✅ Manager notified
- ✅ Balance shows pending deduction
- ✅ Request appears in employee's history

**Balance Update:**
```
Vacation Balance:
Available: 64 hours
Pending: -40 hours
────────────────────────────────
Remaining if approved: 24 hours
```

---

### Test 3: Manager Approve Leave Request

**Objective:** Approve employee leave as manager

**Steps:**
1. Login as manager (sarah.johnson@restaurant-demo.com)
2. Navigate to `/hr/leave/requests`
3. See pending request from Michael Chen
4. Click "Review"
5. Check:
   - Employee has sufficient balance
   - No scheduling conflicts
   - Coverage arranged
6. Click "Approve"
7. Add note: "Approved, enjoy your vacation"

**Expected Results:**
- ✅ Status: Pending → Approved
- ✅ Employee notified
- ✅ Balance deducted
- ✅ Calendar updated
- ✅ Approval logged

**Updated Balance:**
```
Vacation Balance:
Previous: 64 hours
Used: -40 hours
────────────────────────────────
New Balance: 24 hours
```

---

### Test 4: Manager Reject Leave Request

**Objective:** Deny leave request with reason

**Steps:**
1. Review pending leave request
2. Identify conflict: "Too many staff on leave"
3. Click "Reject"
4. Enter reason: "Staffing shortage that week, please choose alternate dates"
5. Suggest alternative dates (optional)
6. Submit rejection

**Expected Results:**
- ✅ Status: Pending → Rejected
- ✅ Employee notified with reason
- ✅ Balance not deducted
- ✅ Rejection logged

---

### Test 5: Leave Calendar View

**Objective:** View team leave schedule

**Steps:**
1. Navigate to `/hr/leave/calendar`
2. View current month
3. See all approved leave requests

**Expected Results:**
- ✅ Calendar shows all team members
- ✅ Approved leave highlighted
- ✅ Pending leave shown differently
- ✅ Can filter by department/employee
- ✅ Conflict detection visible

**Calendar Display:**
```
January 2026 - Restaurant Team
────────────────────────────────
Mon  Tue  Wed  Thu  Fri
13   14   15   16   17
           Sarah    Sarah

20   21   22   23   24   [Michael Chen - VACATION]
27   28   29   30   31
     Emily
     (Sick)

Legend:
■ Approved  □ Pending  ● Rejected
```

---

### Test 6: Leave Accrual Processing

**Objective:** Verify automatic leave accrual

**Steps:**
1. Wait for month-end processing (or trigger manually)
2. Navigate to leave balances
3. Verify accruals applied

**Expected Results:**
- ✅ All employees receive accrual
- ✅ Amounts match accrual rate
- ✅ Accrual logged with date
- ✅ Balance limits enforced (if configured)

**Monthly Accrual:**
```
Employee: Michael Chen
Previous Balance: 24 hrs

Accrual - January 2026:
Vacation: +6.67 hrs
Sick: +3.33 hrs
Personal: +2.00 hrs
────────────────────────────────
New Balance:
Vacation: 30.67 hrs
Sick: 35.33 hrs
Personal: 18.00 hrs
```

---

### Test 7: Leave Type Configuration

**Objective:** Manage leave types and policies

**Steps:**
1. Navigate to `/hr/leave/types`
2. View existing leave types
3. Click "Create Leave Type"
4. Configure:
   - **Name:** Bereavement Leave
   - **Accrual Rate:** None (fixed allocation)
   - **Annual Allocation:** 24 hours
   - **Max Balance:** 24 hours
   - **Carryover:** No
   - **Requires Approval:** Yes
5. Save

**Expected Results:**
- ✅ New leave type created
- ✅ Available for requests
- ✅ Policies enforced

---

### Test 8: Leave Balance Adjustment

**Objective:** Manually adjust employee leave balance

**Scenario:** Correct error or grant additional time

**Steps:**
1. Navigate to employee leave balance
2. Click "Adjust Balance"
3. Fill in:
   - **Leave Type:** Vacation
   - **Adjustment:** +16 hours
   - **Reason:** "Compensation for overtime worked"
   - **Date:** 2026-01-15
4. Save

**Expected Results:**
- ✅ Balance updated
- ✅ Adjustment logged
- ✅ Reason recorded
- ✅ Manager approval logged

---

## Salary Increases

### Prerequisites

**Demo Data Required:**
```bash
POST /api/admin/seed-salary-increases
```

**Expected Data:**
- 38 salary increase records
- All employees have increase history
- Average increase: 6.55%

---

### Test 1: View Salary History

**Objective:** Display employee compensation history

**Steps:**
1. Navigate to `/hr/salary`
2. Select employee: "Michael Chen"
3. View salary history

**Expected Results:**
- ✅ All salary changes listed chronologically
- ✅ Each shows: date, old salary, new salary, % increase, reason
- ✅ Current salary highlighted
- ✅ Charts showing growth over time

**Sample History:**
| Effective Date | Previous | New Salary | Increase | Reason |
|----------------|----------|------------|----------|--------|
| 2026-01-01 | $48,000 | $52,000 | 8.33% | Annual performance review |
| 2025-07-01 | $45,000 | $48,000 | 6.67% | Mid-year adjustment |
| 2025-01-01 | $42,000 | $45,000 | 7.14% | Promotion to Senior Sales |
| 2024-06-01 | $40,000 | $42,000 | 5.00% | Cost of living adjustment |

**Current Compensation:**
- Base Salary: $52,000/year
- Hourly Rate: $25.00/hour
- Annual Increases: Average 6.93%
- Total Growth: 30% over 2 years

---

### Test 2: Grant Salary Increase

**Objective:** Process salary increase for employee

**Steps:**
1. Navigate to `/hr/salary/increases`
2. Click "New Salary Increase"
3. Fill in form:
   - **Employee:** Emily Rodriguez
   - **Current Salary:** $45,000/year
   - **New Salary:** $48,000/year
   - **Increase:** 6.67% (calculated)
   - **Effective Date:** 2026-02-01
   - **Reason:** Annual merit increase
   - **Performance Rating:** Exceeds expectations
   - **Notes:** "Exceptional sales performance"
4. Click "Save"

**Expected Results:**
- ✅ Increase scheduled for effective date
- ✅ Payroll will update automatically
- ✅ Employee notified (if configured)
- ✅ Increase logged in history

---

### Test 3: Bulk Salary Increases

**Objective:** Process increases for multiple employees

**Scenario:** Annual company-wide raises

**Steps:**
1. Navigate to `/hr/salary/bulk-increase`
2. Select employees:
   - All Restaurant staff (4 employees)
3. Configure increase:
   - **Type:** Percentage
   - **Amount:** 5% across the board
   - **Effective Date:** 2026-01-01
   - **Reason:** Annual cost of living adjustment
4. Review preview showing all calculations
5. Click "Apply to All"

**Expected Results:**
- ✅ All employees get 5% increase
- ✅ Individual records created
- ✅ Payroll updates scheduled
- ✅ Summary report generated

**Preview:**
| Employee | Current | New Salary | Increase $ | Increase % |
|----------|---------|------------|------------|------------|
| Sarah Johnson | $60,000 | $63,000 | +$3,000 | 5.00% |
| Michael Chen | $52,000 | $54,600 | +$2,600 | 5.00% |
| Emily Rodriguez | $45,000 | $47,250 | +$2,250 | 5.00% |
| David Williams | $45,000 | $47,250 | +$2,250 | 5.00% |

**Total Impact:** +$10,100/year in payroll

---

### Test 4: Salary Adjustment (Non-Increase)

**Objective:** Record salary change (reduction or correction)

**Steps:**
1. Create salary adjustment
2. Configure:
   - **Employee:** John Doe
   - **Previous:** $50,000
   - **New:** $48,000
   - **Change:** -4% (reduction)
   - **Effective:** 2026-01-15
   - **Reason:** Role change - moved to part-time
3. Require approval for reductions
4. Manager approves

**Expected Results:**
- ✅ Reduction recorded
- ✅ Approval required and logged
- ✅ Employee notified
- ✅ Payroll updates

---

### Test 5: Salary Increase Approval Workflow

**Objective:** Multi-level approval for large increases

**Steps:**
1. Manager requests 15% increase (above threshold)
2. System requires senior management approval
3. Request routed to admin
4. Admin reviews and approves
5. Increase processed

**Expected Results:**
- ✅ Approval workflow triggered
- ✅ Notifications sent to approvers
- ✅ Increase pending until approved
- ✅ Full audit trail

---

### Test 6: Compensation Planning

**Objective:** Plan future salary budgets

**Steps:**
1. Navigate to `/hr/salary/planning`
2. Select year: 2026
3. Configure parameters:
   - Average merit increase: 5%
   - Promotion budget: 3% of payroll
   - COLA adjustment: 3%
4. Generate projection

**Expected Results:**
- ✅ Total payroll projection calculated
- ✅ Budget requirements shown
- ✅ Department breakdowns
- ✅ Export for finance review

**Projection:**
```
2026 COMPENSATION PLANNING
Current Annual Payroll: $800,000

Planned Increases:
Merit (5%): +$40,000
Promotions (3%): +$24,000
COLA (3%): +$24,000
────────────────────────────────
Total Increase: +$88,000

Projected 2026 Payroll: $888,000
Budget Requirement: $888,000 (+11%)
```

---

## Employee Self-Service

### Test 1: Employee Portal Overview

**Objective:** Employee views their own HR information

**Steps:**
1. Login as employee (michael.chen@restaurant-demo.com)
2. Navigate to `/my-hr`
3. View dashboard

**Expected Dashboard:**
- ✅ Current benefits summary
- ✅ Active loans and balances
- ✅ Leave balances
- ✅ Salary history
- ✅ Recent pay stubs
- ✅ Request buttons (leave, loans)

---

### Test 2: Employee Benefit Enrollment

**Objective:** Allow employees to select benefits during open enrollment

**Steps:**
1. Login as employee
2. Navigate to `/my-benefits/enroll`
3. Review available benefits
4. Select desired benefits
5. Review costs
6. Submit selections

**Expected Results:**
- ✅ Employee can view all available benefits
- ✅ Can calculate total cost
- ✅ Submit for manager approval
- ✅ Enrollment confirmed

---

### Test 3: Employee Leave Request (Self-Service)

**Objective:** Streamlined leave request from employee portal

**Steps:**
1. Login as employee
2. Click "Request Time Off" from dashboard
3. See current balance
4. Submit request
5. Track status

**Expected Results:**
- ✅ Simple request form
- ✅ Balance validation
- ✅ Real-time status updates
- ✅ Email notifications

---

## HR Reporting

### Test 1: Benefits Enrollment Report

**Objective:** Generate benefits participation report

**Steps:**
1. Navigate to `/hr/reports/benefits`
2. Generate report
3. View enrollment by benefit type

**Expected Report:**
```
BENEFITS ENROLLMENT REPORT
Period: January 2026

Total Employees: 16
Total Enrolled: 16 (100%)

By Benefit Type:
Health Insurance: 16 (100%)
  - Basic Plan: 12 (75%)
  - Premium Plan: 4 (25%)

Dental Insurance: 14 (87.5%)
Vision Insurance: 14 (87.5%)
Life Insurance: 16 (100%)
401(k): 12 (75%)
Gym Membership: 8 (50%)
Transit Pass: 10 (62.5%)

Total Monthly Cost:
Employee Portion: $3,280.00
Employer Portion: $9,360.00
────────────────────────────────
Total: $12,640.00/month
Annual: $151,680.00/year
```

---

### Test 2: Loan Portfolio Report

**Objective:** Overview of all employee loans

**Steps:**
1. Navigate to `/hr/reports/loans`
2. Generate report

**Expected Report:**
```
EMPLOYEE LOAN PORTFOLIO
As of: January 2, 2026

Active Loans: 8
Total Principal: $21,000
Total Balance: $15,500
Average Interest Rate: 3.2%

By Status:
Active: 8 loans ($15,500)
Paid Off: 4 loans
Defaulted: 1 loan ($3,000)

Repayment Schedule:
January 2026: $2,400
February 2026: $2,200
March 2026: $2,000
...
Total Expected: $15,500

Risk Assessment:
Low Risk: 6 loans (75%)
Medium Risk: 2 loans (25%)
High Risk: 0 loans (0%)
```

---

### Test 3: Leave Utilization Report

**Objective:** Analyze leave usage patterns

**Steps:**
1. Navigate to `/hr/reports/leave`
2. Select period: Last 12 months
3. Generate report

**Expected Report:**
```
LEAVE UTILIZATION REPORT
Period: January 2025 - December 2025

Total Leave Accrued: 2,304 hours
Total Leave Used: 1,856 hours
Utilization Rate: 80.5%

By Leave Type:
Vacation: 1,200 hrs (65%)
Sick: 480 hrs (26%)
Personal: 176 hrs (9%)

By Month:
Peak Usage: July (240 hrs)
Lowest Usage: January (80 hrs)

Carryover Balance: 448 hours
```

---

## Troubleshooting

### Benefits Issues

**Problem:** Employee cannot enroll in benefit

**Solutions:**
1. Check eligibility requirements
2. Verify employee status (full-time/part-time)
3. Confirm employment date meets waiting period
4. Review benefit type restrictions

---

**Problem:** Benefit cost not deducting from payroll

**Solutions:**
1. Verify benefit assignment is active
2. Check effective date is in past
3. Confirm payroll integration enabled
4. Review payroll period includes employee

---

### Loan Issues

**Problem:** Loan payment not appearing in payroll

**Solutions:**
1. Verify loan status is "Active"
2. Check payment frequency matches payroll period
3. Confirm payroll integration enabled
4. Review loan payment schedule

---

**Problem:** Cannot mark loan as paid off

**Solutions:**
1. Verify all payments recorded
2. Check balance is exactly $0.00
3. Review payment history for missing entries
4. Manually adjust if needed (with approval)

---

### Leave Issues

**Problem:** Leave balance showing incorrectly

**Solutions:**
1. Check accrual calculations
2. Verify all requests are accounted for
3. Review adjustment history
4. Recalculate balance manually

---

**Problem:** Cannot approve leave request

**Solutions:**
1. Verify manager permissions
2. Check for conflicting requests
3. Ensure employee has sufficient balance
4. Review approval workflow rules

---

## Testing Checklist

**Benefits:**
- ☐ Benefit types created
- ☐ Employee enrollments completed
- ☐ Payroll deductions working
- ☐ Benefit modifications processed
- ☐ Terminations handled correctly

**Loans:**
- ☐ Loans issued successfully
- ☐ Payments recorded
- ☐ Payroll integration working
- ☐ Early payoffs processed
- ☐ Default handling tested

**Leave Management:**
- ☐ Leave requests submitted
- ☐ Approvals working
- ☐ Rejections handled
- ☐ Balances accurate
- ☐ Accruals processing
- ☐ Calendar view functional

**Salary Increases:**
- ☐ Individual increases granted
- ☐ Bulk increases processed
- ☐ History tracking accurate
- ☐ Approval workflows tested
- ☐ Payroll integration verified

**Self-Service:**
- ☐ Employee portal accessible
- ☐ Benefit enrollment works
- ☐ Leave requests functional
- ☐ Information accurate

**Reporting:**
- ☐ Benefits reports generated
- ☐ Loan reports accurate
- ☐ Leave reports comprehensive
- ☐ Exports working

---

**Document Version:** 1.0
**Last Updated:** 2026-01-02
**Next Review:** 2026-02-02
