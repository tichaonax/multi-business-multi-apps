# Layby Management - End-to-End Testing Guide

## Overview
This guide provides comprehensive end-to-end test scenarios for the Layby Management Module, covering complete lifecycle workflows from creation to completion or cancellation.

## Test Environment Setup

### Prerequisites
```bash
# Start development environment
npm run dev

# Database should be migrated
npx prisma migrate dev

# Seed test data (optional)
npx prisma db seed
```

### Test Data Requirements
- 2+ test businesses (different types: clothing, hardware)
- 5+ test customers with complete information
- 10+ test products with variants and stock levels
- 3+ test users with different permission levels
- Test payment methods configured

## Core Test Scenarios

### Scenario 1: Happy Path - Complete Layby Lifecycle

**Objective**: Create layby, make payments, complete successfully

#### Setup
- Business: Clothing Store (type: clothing)
- Customer: John Doe (existing customer)
- Products: 2 items, total value $500
- Deposit: 20% ($100)
- Installments: $100 every 2 weeks
- Expected completion: 4 installments + deposit

#### Test Steps

**1.1 Create Layby**
```
Action: Navigate to /business/laybys/new
Input:
  - Select customer: John Doe
  - Add item 1: Red T-Shirt, quantity 2, $50 each
  - Add item 2: Blue Jeans, quantity 1, $400
  - Deposit: 20%
  - Service fee: $0
  - Admin fee: $0
  - Installment: $100
  - Frequency: FORTNIGHTLY
  - Payment due date: [2 weeks from now]
  - Completion due date: [10 weeks from now]

Expected:
  ✅ Layby created with number LAY-CLO-YYYYMMDD-000001
  ✅ Status: ACTIVE
  ✅ Total amount: $500
  ✅ Deposit collected: $100
  ✅ Balance remaining: $400
  ✅ Redirect to layby detail page
  ✅ Inventory reserved for items (if business requires)
```

**1.2 Verify Layby Details**
```
Action: View layby detail page
Expected:
  ✅ All details displayed correctly
  ✅ Customer information visible
  ✅ 2 items listed with correct prices
  ✅ Payment schedule displayed
  ✅ Status badge shows ACTIVE (green)
  ✅ Action buttons available: Record Payment, Complete, Cancel, Hold
```

**1.3 Record First Payment**
```
Action: Click "Record Payment"
Input:
  - Amount: $100
  - Method: CASH
  - Reference: (empty)
  - Notes: First installment

Expected:
  ✅ Payment recorded successfully
  ✅ Receipt number generated: RCP-CLO-YYYYMMDD-000001
  ✅ Balance updated: $400 → $300
  ✅ Total paid updated: $100 → $200
  ✅ Payment appears in payment history
  ✅ BusinessTransaction created with type LAYBY_PAYMENT
  ✅ Success message displayed
```

**1.4 Record Second Payment**
```
Action: Record payment
Input:
  - Amount: $100
  - Method: EFTPOS

Expected:
  ✅ Balance: $300 → $200
  ✅ Total paid: $200 → $300
  ✅ New receipt generated
```

**1.5 Record Third Payment**
```
Action: Record payment
Input:
  - Amount: $100
  - Method: BANK_TRANSFER
  - Reference: TXN123456

Expected:
  ✅ Balance: $200 → $100
  ✅ Total paid: $300 → $400
  ✅ Reference saved in payment record
```

**1.6 Record Final Payment (Auto-Complete)**
```
Action: Record payment
Input:
  - Amount: $100
  - Method: CASH

Expected:
  ✅ Balance: $100 → $0
  ✅ Total paid: $400 → $500
  ✅ Status automatically changes: ACTIVE → COMPLETED
  ✅ completedAt timestamp set
  ✅ Items marked as released
  ✅ itemsReleasedAt timestamp set
  ✅ itemsReleasedBy set to current user
  ✅ Order created (if createOrder option enabled)
  ✅ Order number generated: ORD-CLO-YYYYMMDD-000001
  ✅ Order payment method: LAYAWAY
  ✅ Success message: "Payment recorded. Layby completed!"
```

**1.7 Verify Completion**
```
Action: View layby detail
Expected:
  ✅ Status: COMPLETED (blue badge)
  ✅ Balance: $0.00
  ✅ Total paid: $500.00
  ✅ Items released: Yes
  ✅ Completion date displayed
  ✅ Order link displayed (if order created)
  ✅ Action buttons disabled (read-only mode)
  ✅ Payment history shows all 5 payments
```

**1.8 Verify Order Creation**
```
Action: Navigate to /business/orders, search for order
Expected:
  ✅ Order exists with number ORD-CLO-YYYYMMDD-000001
  ✅ Status: COMPLETED
  ✅ Payment method: LAYAWAY
  ✅ Items match layby items
  ✅ Total amount: $500
  ✅ Notes: "Created from completed layby LAY-CLO-YYYYMMDD-000001"
  ✅ Metadata contains laybyId and laybyNumber
```

#### Validation Points
- [x] Layby number generation correct
- [x] Balance calculations accurate at each step
- [x] Auto-completion triggers on full payment
- [x] Order integration works correctly
- [x] Inventory reservation/release works
- [x] All timestamps recorded
- [x] Audit trail complete (createdBy, processedBy, itemsReleasedBy)

---

### Scenario 2: Cancellation with Partial Refund

**Objective**: Create layby, make partial payments, then cancel with refund

#### Setup
- Business: Hardware Store (type: hardware)
- Customer: Jane Smith
- Products: 1 item, value $800
- Deposit: 30% ($240)
- Cancellation fee: 10% ($80)

#### Test Steps

**2.1 Create Layby**
```
Action: Create layby
Input:
  - Item: Power Drill Set, $800
  - Deposit: 30%

Expected:
  ✅ Layby created
  ✅ Deposit: $240
  ✅ Balance: $560
  ✅ Status: ACTIVE
```

**2.2 Make Two Payments**
```
Action: Record payment $100 twice
Expected:
  ✅ Total paid: $240 → $340 → $440
  ✅ Balance: $560 → $460 → $360
```

**2.3 Cancel Layby**
```
Action: Click "Cancel Layby"
Input:
  - Reason: "Customer changed mind"
  - Refund amount: $360 (total paid $440 - cancellation fee $80)
  - Confirm cancellation

Expected:
  ✅ Status: ACTIVE → CANCELLED
  ✅ cancelledAt timestamp set
  ✅ cancellationReason saved
  ✅ cancellationRefund: $360
  ✅ Success message displayed
  ✅ Inventory released (returned to available stock)
```

**2.4 Verify Cancellation**
```
Action: View layby detail
Expected:
  ✅ Status: CANCELLED (red badge)
  ✅ Cancellation date displayed
  ✅ Cancellation reason shown
  ✅ Refund amount displayed
  ✅ Payment history preserved
  ✅ All action buttons disabled
```

#### Validation Points
- [x] Cancellation fee calculated correctly (business rules)
- [x] Refund amount accurate
- [x] Inventory returned to stock
- [x] No order created
- [x] Status change permanent (cannot reactivate)

---

### Scenario 3: Hold and Reactivate

**Objective**: Put layby on hold temporarily, then reactivate

#### Setup
- Business: Grocery Store (type: grocery)
- Customer: Bob Wilson
- Products: Various items, total $200
- Scenario: Customer traveling, requests hold for 2 weeks

#### Test Steps

**3.1 Create Layby with Initial Payment**
```
Action: Create layby
Expected:
  ✅ Layby created
  ✅ Deposit: $40 (20%)
  ✅ Balance: $160
```

**3.2 Put on Hold**
```
Action: Click "Hold Layby"
Input:
  - Reason: "Customer traveling - 2 weeks"
  - Confirm hold

Expected:
  ✅ Status: ACTIVE → ON_HOLD
  ✅ Success message displayed
  ✅ Status badge shows ON_HOLD (yellow)
```

**3.3 Verify Hold Status**
```
Action: View layby detail
Expected:
  ✅ Status: ON_HOLD
  ✅ "Record Payment" button disabled
  ✅ "Complete" button disabled
  ✅ "Reactivate" button enabled
  ✅ "Cancel" button still enabled
  ✅ Payment history preserved
```

**3.4 Attempt Payment While on Hold**
```
Action: Try to record payment via API
Expected:
  ❌ 400 Bad Request
  ❌ Error: "Cannot record payment on held layby"
```

**3.5 Reactivate Layby**
```
Action: Click "Reactivate Layby"
Input:
  - Confirm reactivation

Expected:
  ✅ Status: ON_HOLD → ACTIVE
  ✅ Success message displayed
  ✅ All payment actions re-enabled
```

**3.6 Complete Remaining Payments**
```
Action: Record payments to complete
Expected:
  ✅ Can record payments normally
  ✅ Can complete when fully paid
```

#### Validation Points
- [x] Hold prevents payment operations
- [x] Reactivate restores normal operations
- [x] Balance and payment history preserved
- [x] Can cancel while on hold
- [x] Cannot complete while on hold

---

### Scenario 4: Overpayment Handling

**Objective**: Test behavior when payment exceeds balance

#### Test Steps

**4.1 Create Layby with $100 Balance**
```
Setup:
  - Total: $200
  - Paid: $100
  - Balance: $100
```

**4.2 Attempt Overpayment**
```
Action: Record payment
Input:
  - Amount: $150 (exceeds $100 balance)

Expected:
  ❌ Client-side validation error
  ❌ Message: "Payment amount cannot exceed balance remaining (100.00)"
  ❌ Submit button disabled
```

**4.3 Pay Exact Amount**
```
Action: Record payment
Input:
  - Amount: $100

Expected:
  ✅ Payment accepted
  ✅ Balance: $0
  ✅ Status: COMPLETED
```

#### Validation Points
- [x] Client-side validation prevents overpayment
- [x] Server-side validation enforces balance limit
- [x] Exact payment completes successfully

---

### Scenario 5: Default Handling (Automation)

**Objective**: Test automatic default processing for overdue laybys

#### Setup
- Business with automation enabled
- Layby with 2 missed payment deadlines
- Business rule: defaultAfterMissedPayments = 2

#### Test Steps

**5.1 Create Overdue Layby**
```
Setup in database:
  - Layby created 30 days ago
  - Payment due date: 20 days ago
  - No payments made since creation
  - Status: ACTIVE
```

**5.2 Run Default Automation**
```
Action: Trigger automation job
Method: POST /api/laybys/automation/run
  OR
  Navigate to /business/laybys/automation and click "Run Now"

Expected:
  ✅ Automation processes layby
  ✅ Checks missed payment count (2)
  ✅ Exceeds threshold (2)
  ✅ Status: ACTIVE → DEFAULTED
  ✅ Notification sent to customer
  ✅ Job result shows 1 processed
```

**5.3 Verify Default Status**
```
Action: View layby
Expected:
  ✅ Status: DEFAULTED (red badge)
  ✅ Cannot record payments
  ✅ Can reactivate (with approval)
  ✅ Can cancel
```

**5.4 Reactivate Defaulted Layby**
```
Action: Click "Reactivate"
Expected:
  ✅ Status: DEFAULTED → ACTIVE
  ✅ Can resume payments
  ✅ Late fees applied (if business rules require)
```

#### Validation Points
- [x] Automation correctly identifies overdue laybys
- [x] Default threshold enforced per business rules
- [x] Notifications sent
- [x] Reactivation possible with approval
- [x] Late fees applied correctly

---

### Scenario 6: Refund Processing

**Objective**: Record refund on completed layby

#### Setup
- Completed layby with $300 paid
- Customer returns item worth $100

#### Test Steps

**6.1 Create Refund**
```
Action: POST /api/laybys/{id}/refund
Input:
  - amount: $100
  - reason: "Item returned - defective"
  - paymentMethod: "CASH"

Expected:
  ✅ Refund payment created
  ✅ isRefund: true
  ✅ amount: -100 (negative)
  ✅ Receipt: REF-CLO-YYYYMMDD-000001
  ✅ totalPaid updated: $300 → $200
  ✅ Status remains COMPLETED
```

**6.2 Verify Refund in History**
```
Action: View payment history
Expected:
  ✅ Refund shown with negative amount
  ✅ Refund badge displayed
  ✅ Refund receipt number shown
  ✅ Reason displayed
```

#### Validation Points
- [x] Refunds recorded with negative amounts
- [x] Total paid decremented correctly
- [x] Refund receipt numbers distinct from payment receipts
- [x] Status logic handles refunds

---

### Scenario 7: Multi-Item Inventory Validation

**Objective**: Test stock validation before layby creation

#### Test Steps

**7.1 Attempt Layby with Insufficient Stock**
```
Action: Create layby
Input:
  - Item 1: Product A, quantity 10 (only 5 in stock)
  - Item 2: Product B, quantity 2 (20 in stock)

Expected:
  ❌ Validation error before creation
  ❌ Message: "Insufficient stock for Product A: 5 available, 10 requested"
  ❌ Layby not created
```

**7.2 Create with Available Stock**
```
Action: Create layby
Input:
  - Item 1: Product A, quantity 5
  - Item 2: Product B, quantity 2

Expected:
  ✅ Layby created
  ✅ Inventory reserved (if business requires)
  ✅ Stock levels updated
```

**7.3 Verify Inventory Reservation**
```
Action: Check product stock
Expected:
  ✅ Product A: available reduced by 5
  ✅ Product B: available reduced by 2
  ✅ Reservation recorded with laybyId
```

**7.4 Release on Completion**
```
Action: Complete layby
Expected:
  ✅ Inventory reservation released
  ✅ Stock marked as sold (or kept reserved per business logic)
```

#### Validation Points
- [x] Stock validation before creation
- [x] Clear error messages for insufficient stock
- [x] Reservation tracking accurate
- [x] Release on completion/cancellation

---

### Scenario 8: Business Rules Validation

**Objective**: Test business-type-specific rules enforcement

#### Test Cases by Business Type

**8.1 Clothing Business**
```
Rules:
  - Min deposit: 20%
  - Max duration: 90 days
  - Min amount: $50

Test: Create with 10% deposit
Expected: ❌ Error: "Deposit must be at least 20%"

Test: Create with $30 total
Expected: ❌ Error: "Minimum layby amount is $50.00"

Test: Create with 6-month completion
Expected: ❌ Error: "Maximum duration is 90 days"
```

**8.2 Hardware Business**
```
Rules:
  - Min deposit: 30%
  - Max duration: 60 days
  - Late fee: $10.00

Test: Create with 25% deposit
Expected: ❌ Error: "Deposit must be at least 30%"

Test: Overdue payment
Expected: ✅ Late fee of $10 applied
```

**8.3 Restaurant Business**
```
Rules:
  - No inventory reservation (perishable goods)
  - Min amount: $100

Test: Create layby
Expected: ✅ No inventory reserved
Expected: ✅ Warning about perishable items
```

#### Validation Points
- [x] Deposit percentage enforced per business type
- [x] Duration limits enforced
- [x] Minimum amounts validated
- [x] Late fees applied per business rules
- [x] Inventory policies followed

---

### Scenario 9: Concurrent Operations

**Objective**: Test race conditions and concurrent access

#### Test Steps

**9.1 Simultaneous Payments**
```
Setup: Two users attempt payment at same time
Action:
  - User A: POST payment $50
  - User B: POST payment $50 (1 second later)
Expected:
  ✅ Both payments succeed (if balance sufficient)
  ✅ Balance updated atomically
  ✅ Both payments in history
  ✅ No duplicate payment numbers
```

**9.2 Payment During Cancellation**
```
Setup: User A cancels while User B records payment
Action:
  - User A: POST /cancel (takes 2 seconds)
  - User B: POST /payments (1 second after A starts)
Expected:
  ⚠️ One operation succeeds, one fails gracefully
  ⚠️ Data consistency maintained
  ⚠️ Clear error message to failed user
```

**9.3 Double Completion**
```
Setup: Two users complete layby simultaneously
Action:
  - User A: POST /complete
  - User B: POST /complete (same time)
Expected:
  ✅ One succeeds, one gets 400 error
  ✅ Error: "Layby already completed"
  ✅ Only one order created
```

#### Validation Points
- [x] Prisma transactions prevent race conditions
- [x] Status changes atomic
- [x] No duplicate receipts/orders
- [x] Clear error messages on conflicts

---

### Scenario 10: Automation Job Execution

**Objective**: Test all automated tasks

#### Test Steps

**10.1 Payment Reminders**
```
Setup:
  - Layby with due date in 3 days
  - Layby with due date in 1 day
  - Layby with due date today

Action: Run automation job
Expected:
  ✅ 3 reminders sent
  ✅ SMS sent to customers with phone
  ✅ Email sent to customers with email
  ✅ Job history recorded
```

**10.2 Late Fee Application**
```
Setup:
  - Layby overdue by 2 days
  - Business rule: apply late fee after 1 day

Action: Run automation
Expected:
  ✅ Late fee applied ($5)
  ✅ totalFees updated
  ✅ Notification sent to customer
```

**10.3 Default Processing**
```
Setup:
  - Layby with 2 missed payments
  - Business rule: default after 2 missed

Action: Run automation
Expected:
  ✅ Status: DEFAULTED
  ✅ Notification sent
  ✅ Inventory released
```

**10.4 Completion Reminders**
```
Setup:
  - Layby completion due in 7 days

Action: Run automation
Expected:
  ✅ Reminder sent
  ✅ Balance and due date in message
```

**10.5 View Automation History**
```
Action: Navigate to /business/laybys/automation
Expected:
  ✅ Job history displayed
  ✅ Processed counts shown
  ✅ Error counts shown
  ✅ Details expandable
  ✅ Can trigger manual run
```

#### Validation Points
- [x] All automation tasks run successfully
- [x] Notifications sent correctly
- [x] Business rules applied
- [x] Job history tracked
- [x] Manual trigger works

---

## Edge Cases and Error Scenarios

### Edge Case 1: Zero Balance Layby
```
Scenario: Layby with 100% deposit
Expected: Immediately completes on creation
```

### Edge Case 2: Guest Customer
```
Scenario: Layby without linked customer (customerId = null)
Expected: Layby created, no customer info displayed
```

### Edge Case 3: Deleted Product
```
Scenario: Product deleted after layby creation
Expected: Layby preserves item data in JSON field
```

### Edge Case 4: Very Large Payment History
```
Scenario: Layby with 50+ payments
Expected: Pagination or scrollable history
```

### Edge Case 5: Decimal Precision
```
Scenario: Payment of $33.33 on $100 balance
Expected: Correct decimal handling, no rounding errors
```

### Error Scenario 1: Database Connection Lost
```
During: Payment recording
Expected: Transaction rolls back, error message shown
```

### Error Scenario 2: Invalid Product Variant ID
```
During: Layby creation
Expected: Validation error, clear message
```

### Error Scenario 3: Concurrent Status Change
```
During: Two users change status simultaneously
Expected: One succeeds, one gets conflict error
```

## Performance Test Scenarios

### Load Test 1: Bulk Layby Creation
```
Action: Create 100 laybys in 1 minute
Expected:
  - All created successfully
  - Response time < 2 seconds each
  - No database locks
```

### Load Test 2: Automation on Large Dataset
```
Action: Run automation with 1000 active laybys
Expected:
  - Completes within 5 minutes
  - All laybys processed
  - No timeout errors
```

### Load Test 3: Concurrent Payment Recording
```
Action: 10 users record payments simultaneously
Expected:
  - All succeed
  - No race conditions
  - Correct balance calculations
```

## Test Report Template

```markdown
# Layby E2E Test Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Dev/Staging/Production]
**Build**: [Version/Commit]

## Test Results Summary

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Happy Path | ✅ PASS | All steps completed |
| 2. Cancellation | ✅ PASS | Refund calculated correctly |
| 3. Hold/Reactivate | ❌ FAIL | Reactivation button missing |
| ... | ... | ... |

## Issues Found

### Issue #1: Reactivation Button Missing
- **Severity**: High
- **Steps to Reproduce**:
  1. Create layby
  2. Put on hold
  3. View detail page
- **Expected**: Reactivate button visible
- **Actual**: No reactivate button shown
- **Screenshot**: [attached]

## Performance Metrics

| Test | Avg Response Time | Max Response Time |
|------|-------------------|-------------------|
| Create Layby | 250ms | 450ms |
| Record Payment | 180ms | 320ms |
| Complete Layby | 400ms | 650ms |

## Recommendations

1. Add reactivation button to ON_HOLD status
2. Optimize completion query (too slow)
3. Add loading indicators for slow operations

## Sign-off

- [x] All critical scenarios passed
- [x] No blocking issues found
- [ ] Ready for UAT
- [ ] Ready for production

**Tester Signature**: _______________
**Date**: _______________
```

## Continuous Testing Checklist

Before each release:

- [ ] Run all 10 core scenarios
- [ ] Test all 5 edge cases
- [ ] Verify all 3 error scenarios
- [ ] Run performance tests
- [ ] Check automation jobs
- [ ] Verify inventory integration
- [ ] Test order creation
- [ ] Validate analytics data
- [ ] Review permission controls
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Review console for errors
- [ ] Check database for orphaned records
- [ ] Verify notification delivery
- [ ] Test with real business rules

## Conclusion

This end-to-end testing guide ensures comprehensive coverage of the Layby Management Module. Execute these scenarios regularly during development and before each deployment to maintain system quality and reliability.
