# Layby Management - User Acceptance Testing (UAT) Checklist

## Overview
This checklist is designed for business users to validate the Layby Management Module before production deployment. Each section should be tested thoroughly and signed off before proceeding.

## Pre-UAT Setup

### Test Environment
- [ ] UAT environment is accessible
- [ ] Test data has been seeded (businesses, customers, products)
- [ ] Test user accounts created with appropriate permissions
- [ ] Email/SMS notifications configured (test mode)
- [ ] No production data in UAT environment

### Test Users

| Role | Username | Permission | Business |
|------|----------|------------|----------|
| Admin | admin@test.com | canManageLaybys: true | All businesses |
| Manager | manager@test.com | canManageLaybys: true | Business 1 |
| Staff | staff@test.com | canManageLaybys: false | Business 1 |

### Test Data

- [ ] 5+ test customers with complete information
- [ ] 10+ test products with stock levels
- [ ] Test businesses: Clothing, Hardware, Grocery
- [ ] Sample laybys in various states (active, completed, cancelled)

## Section 1: Access and Permissions

### 1.1 Login and Navigation
- [ ] Can log in with test credentials
- [ ] Dashboard displays correctly
- [ ] Layby menu item visible in navigation
- [ ] Clicking "Laybys" navigates to `/business/laybys`

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 1.2 Permission Controls (Admin User)
- [ ] Can access layby list page
- [ ] Can access "New Layby" button
- [ ] Can create new layby
- [ ] Can record payments
- [ ] Can complete laybys
- [ ] Can cancel laybys
- [ ] Can access business rules page
- [ ] Can access automation page

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 1.3 Permission Controls (Staff User without Permission)
- [ ] Cannot access layby list page (shows permission denied)
- [ ] Cannot access new layby page directly via URL
- [ ] Cannot call API endpoints (403 Forbidden)
- [ ] Error messages are clear and user-friendly

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 1.4 Business Isolation
- [ ] User from Business 1 cannot see Business 2 laybys
- [ ] User from Business 1 cannot create layby for Business 2
- [ ] Multi-business user can switch between businesses
- [ ] Layby list filters by selected business correctly

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 2: Layby Creation

### 2.1 New Layby Form - Basic Creation
- [ ] Navigate to "New Layby" page
- [ ] Form displays all required fields
- [ ] Customer dropdown shows only customers from current business
- [ ] Can add multiple items to layby
- [ ] Item totals calculate correctly
- [ ] Deposit percentage can be adjusted (min/max enforced)
- [ ] Service fee and admin fee fields work
- [ ] Balance calculation is accurate
- [ ] Can select installment frequency
- [ ] Can set payment due date
- [ ] Can set completion due date
- [ ] Can add notes

**Test Case**: Create layby with 2 items, 20% deposit, $10 service fee

**Expected Results**:
- Items total: $200 (example)
- Deposit (20%): $40
- Service fee: $10
- Balance: $170
- Layby number generated: LAY-{TYPE}-YYYYMMDD-######

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 2.2 Validation Rules
- [ ] Cannot create layby with 0 items (error displayed)
- [ ] Cannot create layby below minimum amount (per business rules)
- [ ] Cannot create layby with deposit below minimum percentage
- [ ] Cannot create layby with deposit above maximum percentage
- [ ] Cannot create layby with completion date beyond max duration
- [ ] All validation errors display clearly
- [ ] Form prevents submission when invalid

**Test Case**: Try to create clothing store layby with:
- Total: $30 (below minimum $50)
- Expected: Error "Minimum layby amount is $50.00"

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 2.3 Stock Validation (if applicable)
- [ ] Cannot add item with insufficient stock
- [ ] Clear error message shows available vs requested quantity
- [ ] Stock is reserved when layby created (if business requires)
- [ ] Stock levels update correctly

**Test Case**: Add item with quantity 100 when only 10 in stock

**Expected**: Error message "Insufficient stock: 10 available, 100 requested"

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 2.4 Business Rule Enforcement

**Clothing Business**:
- [ ] Minimum deposit: 20% (cannot create with 10%)
- [ ] Maximum duration: 90 days (cannot set 6 months)
- [ ] Minimum amount: $50

**Hardware Business**:
- [ ] Minimum deposit: 30%
- [ ] Maximum duration: 60 days
- [ ] Late fee: $10

**Restaurant Business**:
- [ ] Minimum amount: $100
- [ ] No inventory reservation

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 3: Layby Viewing and Filtering

### 3.1 Layby List Page
- [ ] List displays all laybys for current business
- [ ] Layby number displayed and clickable
- [ ] Customer name shown (or "Walk-in" if no customer)
- [ ] Status badge shows correct color (green=ACTIVE, blue=COMPLETED, red=CANCELLED, yellow=ON_HOLD)
- [ ] Total amount displayed with currency
- [ ] Balance remaining displayed
- [ ] Created date displayed in readable format
- [ ] List sorted by newest first

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 3.2 Filtering
- [ ] Can filter by status (ACTIVE, COMPLETED, CANCELLED, DEFAULTED, ON_HOLD)
- [ ] Can filter by customer (dropdown shows business customers)
- [ ] Can search by layby number
- [ ] Filters work correctly (results match criteria)
- [ ] Can clear filters
- [ ] "Show all" option displays unfiltered list

**Test Case**: Filter by status ACTIVE
- Create 3 laybys (1 active, 1 completed, 1 cancelled)
- Filter by ACTIVE status
- Expected: Only 1 layby shown

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 3.3 Pagination and Performance
- [ ] List loads within 2 seconds
- [ ] Pagination controls appear if > 50 laybys
- [ ] Can navigate through pages
- [ ] Page numbers display correctly
- [ ] No duplicate laybys across pages

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 4: Layby Detail Page

### 4.1 Information Display
- [ ] Layby number prominent at top
- [ ] Status badge displayed correctly
- [ ] Customer information section shows all details
- [ ] Items section lists all layby items
- [ ] Financial summary shows:
  - Total amount
  - Deposit amount
  - Total paid
  - Balance remaining
  - Service fee
  - Late fee (if applicable)
  - Admin fee
  - Total fees
- [ ] Installment information (if applicable):
  - Installment amount
  - Frequency
  - Payment due date
  - Completion due date
- [ ] Payment history section displays all payments
- [ ] Action buttons available based on status

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 4.2 Action Buttons Visibility

**ACTIVE Layby**:
- [ ] "Record Payment" button visible and enabled
- [ ] "Complete Layby" button visible (enabled if balance = 0)
- [ ] "Hold Layby" button visible and enabled
- [ ] "Cancel Layby" button visible and enabled

**COMPLETED Layby**:
- [ ] All action buttons hidden or disabled
- [ ] Status badge shows COMPLETED (blue)
- [ ] Completion date displayed
- [ ] Order link displayed (if order created)

**ON_HOLD Layby**:
- [ ] "Reactivate" button visible and enabled
- [ ] "Cancel" button visible and enabled
- [ ] "Record Payment" button disabled
- [ ] "Complete" button disabled

**CANCELLED Layby**:
- [ ] All action buttons hidden/disabled
- [ ] Cancellation reason displayed
- [ ] Refund amount displayed

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 5: Payment Operations

### 5.1 Record Payment - Basic
- [ ] Click "Record Payment" opens modal/form
- [ ] Amount field accepts decimal values (e.g., 25.50)
- [ ] Payment method dropdown shows all methods (CASH, EFTPOS, CREDIT_CARD, BANK_TRANSFER)
- [ ] Can add optional reference number
- [ ] Can add optional notes
- [ ] Balance remaining displayed
- [ ] Shows warning if payment will complete layby ("This payment will complete the layby!")
- [ ] Can submit payment
- [ ] Success message displayed
- [ ] Receipt number generated and displayed
- [ ] Layby detail page updates immediately

**Test Case**: Record payment of $50 on $200 balance

**Expected**:
- Balance: $200 → $150
- Total paid increases by $50
- Payment appears in history
- Receipt: RCP-{TYPE}-YYYYMMDD-######

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 5.2 Payment Validation
- [ ] Cannot enter negative amount (validation error)
- [ ] Cannot enter amount greater than balance (validation error)
- [ ] Cannot enter 0 amount (validation error)
- [ ] Cannot submit without amount (required field)
- [ ] Cannot submit without payment method (required field)
- [ ] Validation messages are clear

**Test Case**: Try to pay $300 on $200 balance

**Expected**: Error "Payment amount cannot exceed balance remaining (200.00)"

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 5.3 Auto-Completion on Full Payment
- [ ] Recording final payment automatically completes layby
- [ ] Status changes: ACTIVE → COMPLETED
- [ ] completedAt timestamp set
- [ ] Items marked as released
- [ ] Success message: "Payment recorded. Layby completed!"
- [ ] Order created (if option enabled)
- [ ] Order number displayed

**Test Case**: Pay exact remaining balance

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 5.4 Payment History
- [ ] All payments listed chronologically
- [ ] Each payment shows:
  - Receipt number
  - Date and time
  - Amount
  - Payment method
  - Reference (if provided)
  - Processed by (user name)
  - Notes (if provided)
- [ ] Refunds shown with negative amounts and "Refund" badge
- [ ] Payment history preserved after completion/cancellation

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 6: Layby Status Management

### 6.1 Complete Layby
- [ ] Click "Complete Layby" button
- [ ] Confirmation modal appears
- [ ] Option to create order displayed
- [ ] Cannot complete if balance > 0 (error message)
- [ ] Can complete if balance = 0
- [ ] Status changes to COMPLETED
- [ ] Items marked as released
- [ ] Completion date displayed
- [ ] Order created (if selected)
- [ ] Can view order from layby detail page

**Test Case**: Complete fully paid layby with order creation

**Expected**:
- Layby status: COMPLETED
- Order created: ORD-{TYPE}-YYYYMMDD-######
- Order total matches layby total
- Order items match layby items
- Order payment method: LAYAWAY

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 6.2 Hold Layby
- [ ] Click "Hold Layby" button on ACTIVE layby
- [ ] Reason field displayed (optional)
- [ ] Can confirm hold
- [ ] Status changes: ACTIVE → ON_HOLD
- [ ] Success message displayed
- [ ] Cannot record payments while on hold
- [ ] "Reactivate" button now visible

**Test Case**: Put active layby on hold

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 6.3 Reactivate Layby
- [ ] Click "Reactivate" on ON_HOLD layby
- [ ] Confirmation dialog appears
- [ ] Can confirm reactivation
- [ ] Status changes: ON_HOLD → ACTIVE
- [ ] Success message displayed
- [ ] Can now record payments again
- [ ] All payment functions restored

**Test Case**: Reactivate held layby

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 6.4 Cancel Layby
- [ ] Click "Cancel Layby" button
- [ ] Cancellation form appears
- [ ] Must provide cancellation reason (required)
- [ ] Refund amount field (editable)
- [ ] Refund amount auto-calculated based on business rules
- [ ] Confirmation checkbox or final confirm step
- [ ] Can submit cancellation
- [ ] Status changes to CANCELLED
- [ ] Cancellation date displayed
- [ ] Cancellation reason displayed
- [ ] Refund amount displayed
- [ ] Cannot reactivate cancelled layby

**Test Case**: Cancel layby with $300 paid, 10% cancellation fee

**Expected**:
- Cancellation fee: $30
- Refund amount: $270
- Status: CANCELLED

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 7: Business Rules and Configuration

### 7.1 View Business Rules
- [ ] Navigate to `/business/laybys/rules`
- [ ] Page displays rules for current business type
- [ ] Deposit percentage rules shown (min, max, default)
- [ ] Installment frequency options listed
- [ ] Maximum duration displayed (in days)
- [ ] Fee information shown:
  - Service fee percentage
  - Late fee amount
  - Administration fee
  - Cancellation fee percentage
- [ ] Policy information displayed:
  - Inventory reservation policy
  - Refund policy
  - Approval requirement
- [ ] Automation settings shown:
  - Auto-complete on full payment
  - Payment reminder settings
  - Default threshold (missed payments)
  - Late fee trigger (days)
- [ ] Validation rules shown:
  - Min/max item count
  - Min/max total amount

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 7.2 Rules Enforcement in Creation
- [ ] Rules from this page actually enforced when creating laybys
- [ ] Different business types have different rules
- [ ] Cannot bypass rules via form

**Test Case**: Verify clothing store deposit minimum (20%)

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 8: Automation and Notifications

### 8.1 Automation Page Access
- [ ] Navigate to `/business/laybys/automation`
- [ ] Page displays automation information
- [ ] Help card explains automation features:
  - Payment reminders
  - Overdue notifications
  - Late fees
  - Default processing
- [ ] Job history section visible
- [ ] "Run Now" button available (manual trigger)

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 8.2 Manual Automation Trigger
- [ ] Click "Run Now" button
- [ ] Confirmation dialog appears
- [ ] Can confirm run
- [ ] Loading indicator shown during execution
- [ ] Job completes within reasonable time (< 30 seconds for small dataset)
- [ ] Success message displayed
- [ ] Results summary shown:
  - Reminders sent
  - Late fees applied
  - Defaults processed
  - Errors (if any)
- [ ] Job appears in history

**Test Case**: Run automation manually

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 8.3 Payment Reminders (Automated)

**Setup**: Create layby with payment due in 3 days

- [ ] Wait for automation job to run (or trigger manually)
- [ ] Customer with phone receives SMS reminder
- [ ] Customer with email receives email reminder
- [ ] Reminder message includes:
  - Layby number
  - Payment amount due
  - Due date
  - Balance remaining
  - Business contact information
- [ ] Reminders sent at correct intervals (3 days, 1 day, due date)

**Test Case**: Create layby due in 3 days, verify reminder sent

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 8.4 Late Fee Application

**Setup**: Create layby with payment overdue by 2+ days

- [ ] Run automation
- [ ] Late fee applied to layby
- [ ] totalFees updated correctly
- [ ] Late fee amount matches business rules
- [ ] Customer notified of late fee
- [ ] Late fee visible in layby detail

**Test Case**: Hardware store late fee ($10) applied after 1 day overdue

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 8.5 Default Processing

**Setup**: Create layby with 2+ missed payment deadlines

- [ ] Run automation
- [ ] Layby status changes: ACTIVE → DEFAULTED
- [ ] Customer notified of default
- [ ] Inventory released (if reserved)
- [ ] Can reactivate defaulted layby (with approval)
- [ ] Default appears in job results

**Test Case**: Process default for layby with 2 missed payments

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 8.6 Job History
- [ ] Job history displays all past runs
- [ ] Each entry shows:
  - Job ID
  - Start time
  - End time
  - Duration
  - Status (success/failure)
  - Processed count
  - Error count
- [ ] Can expand job to see details
- [ ] Details include breakdown by task type
- [ ] History paginated if many jobs
- [ ] Can clear old history

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 9: Integration Points

### 9.1 Customer Integration
- [ ] Can link layby to existing customer
- [ ] Customer dropdown shows only business customers
- [ ] Customer information displayed in layby detail
- [ ] Can create layby without customer (walk-in)
- [ ] Customer's layby history visible (if viewing customer profile)

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 9.2 Inventory Integration
- [ ] Stock checked before layby creation
- [ ] Insufficient stock error shown clearly
- [ ] Stock reserved when layby created (if business requires)
- [ ] Reserved stock not available for other orders
- [ ] Stock released on completion or cancellation
- [ ] Can view reserved inventory summary

**Test Case**: Create layby, check product stock, complete/cancel, verify stock updated

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 9.3 Order Integration
- [ ] Completed layby can create order
- [ ] Order number generated correctly
- [ ] Order includes all layby items
- [ ] Order total matches layby total
- [ ] Order payment method: LAYAWAY
- [ ] Order status: COMPLETED
- [ ] Order metadata includes layby reference
- [ ] Can view order from layby detail
- [ ] Can view layby from order detail (if implemented)

**Test Case**: Complete layby, verify order created

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 9.4 Transaction Integration
- [ ] Each payment creates BusinessTransaction record
- [ ] Transaction type: LAYBY_PAYMENT
- [ ] Transaction amount matches payment amount
- [ ] Transaction metadata includes layby reference
- [ ] Transactions visible in business transaction history
- [ ] Financial reports include layby transactions

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 9.5 Analytics Integration
- [ ] Can view layby analytics (if implemented)
- [ ] Analytics show:
  - Total laybys by status
  - Revenue metrics
  - Average completion time
  - Default rate
  - Cancellation rate
- [ ] Analytics can be filtered by date range
- [ ] Data is accurate (matches manual count)
- [ ] Charts/graphs render correctly

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 10: User Experience

### 10.1 Responsive Design
- [ ] Pages render correctly on desktop (1920x1080)
- [ ] Pages render correctly on tablet (768x1024)
- [ ] Pages render correctly on mobile (375x667)
- [ ] All buttons accessible on mobile
- [ ] Forms usable on touch devices
- [ ] No horizontal scrolling on mobile
- [ ] Text readable without zooming

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 10.2 Browser Compatibility
- [ ] Works in Chrome (latest)
- [ ] Works in Firefox (latest)
- [ ] Works in Safari (latest)
- [ ] Works in Edge (latest)
- [ ] No console errors in any browser
- [ ] Consistent appearance across browsers

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 10.3 Loading States
- [ ] Loading indicators shown during API calls
- [ ] "Loading..." text or spinner displayed
- [ ] Buttons disabled during submission
- [ ] No double-submission possible
- [ ] Loading states clear when complete

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 10.4 Error Handling
- [ ] All error messages user-friendly (no technical jargon)
- [ ] Errors displayed in visible location
- [ ] Errors dismissible
- [ ] Form validation errors shown inline
- [ ] API errors handled gracefully
- [ ] Network errors handled (offline mode message)
- [ ] No blank/broken pages on error

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 10.5 Success Feedback
- [ ] Success messages displayed after actions
- [ ] Success messages auto-dismiss after 3-5 seconds
- [ ] Success messages positioned visibly
- [ ] Action confirmation clear (e.g., "Layby LAY-123 created successfully")

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 11: Data Accuracy and Calculations

### 11.1 Financial Calculations
- [ ] Total amount = sum of all item totals
- [ ] Balance = total + fees - total paid
- [ ] Deposit = total × deposit percentage / 100
- [ ] Cancellation refund = total paid - cancellation fee
- [ ] All calculations to 2 decimal places
- [ ] No rounding errors on multiple payments

**Test Case**: Create layby with complex amounts

**Items**:
- Item 1: $33.33
- Item 2: $66.66
- Item 3: $100.01
- Total: $200.00
- Deposit 20%: $40.00
- Service fee: $5.50
- Balance: $165.50

**Record payments**:
- Payment 1: $50.25
- Payment 2: $50.25
- Payment 3: $50.25
- Payment 4: $14.75
- Total paid: $165.50
- Balance: $0.00

**Verify**: All calculations accurate, no rounding errors

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 11.2 Date Handling
- [ ] All dates displayed in user's locale format
- [ ] Time zones handled correctly
- [ ] Due dates calculated correctly
- [ ] Completion due date enforced
- [ ] "Created" date accurate
- [ ] Automation respects date logic (reminders at correct intervals)

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 11.3 Data Integrity
- [ ] Layby number unique across all laybys
- [ ] Receipt number unique across all payments
- [ ] Order number unique across all orders
- [ ] No orphaned records after cancellation
- [ ] Payment history preserved after completion
- [ ] Can retrieve any layby by number

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 12: Edge Cases and Stress Testing

### 12.1 Large Datasets
- [ ] List page performs well with 100+ laybys
- [ ] Payment history displays correctly with 20+ payments
- [ ] Filters work with large datasets
- [ ] Pagination works smoothly
- [ ] No performance degradation

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 12.2 Concurrent Access
- [ ] Two users can view same layby simultaneously
- [ ] Two users recording payment on same layby (one should succeed, one should get error or both succeed if balance sufficient)
- [ ] Status changes reflected immediately for all viewers
- [ ] No data corruption

**Test Case**: Open same layby in two browser tabs, record payment in each

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 12.3 Special Characters
- [ ] Customer name with special characters (O'Brien, José)
- [ ] Notes with special characters (@#$%&*)
- [ ] Product names with unicode characters
- [ ] All display correctly, no encoding errors

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 12.4 Extreme Values
- [ ] Very large layby amount ($999,999.99)
- [ ] Very small layby amount ($50.01)
- [ ] Many items (20+ items)
- [ ] Long notes (500+ characters)
- [ ] All handled correctly without breaking

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 13: Security

### 13.1 Authentication
- [ ] Cannot access layby pages without login
- [ ] Session timeout redirects to login
- [ ] Re-login works correctly
- [ ] Logout clears session

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 13.2 Authorization
- [ ] Cannot access other business's laybys via URL manipulation
- [ ] Cannot call API for other business's laybys
- [ ] Permission checks enforced on all operations
- [ ] No permission bypass via browser tools

**Test Case**: Try to access layby from different business by changing URL

**Actual Results**: _________________________________

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 13.3 Data Validation
- [ ] All inputs validated server-side (not just client-side)
- [ ] Cannot inject SQL via form fields
- [ ] Cannot inject XSS via form fields
- [ ] File uploads (if any) validated for type and size
- [ ] API returns appropriate error codes (400, 401, 403, 404, 500)

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Section 14: Documentation and Help

### 14.1 Help Resources
- [ ] Help text or tooltips available where needed
- [ ] Business rules page explains all rules clearly
- [ ] Automation page explains automated features
- [ ] Error messages provide guidance on resolution
- [ ] User guide or documentation accessible (if available)

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

### 14.2 Training Materials
- [ ] User training materials available
- [ ] Training covers all major features
- [ ] Examples provided for common scenarios
- [ ] FAQ addresses common questions

**Tester**: _____________ **Date**: _____________ **Result**: Pass ☐ Fail ☐

---

## Final Sign-Off

### Critical Issues Found

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| 1 | | High/Medium/Low | Open/Resolved |
| 2 | | | |
| 3 | | | |

### UAT Summary

**Total Test Cases**: _______
**Passed**: _______
**Failed**: _______
**Pass Rate**: _______%

### Recommendations

_[Add any recommendations for improvements or additional features]_

### Sign-Off

- [ ] All critical test cases passed
- [ ] All high-severity issues resolved
- [ ] Medium and low severity issues documented for future releases
- [ ] System ready for production deployment
- [ ] Training completed for all users
- [ ] Documentation complete and accessible

**Business Owner**: _____________________________ **Date**: _____________

**Project Manager**: ____________________________ **Date**: _____________

**QA Lead**: __________________________________ **Date**: _____________

**Technical Lead**: _____________________________ **Date**: _____________

---

## Appendix: Test Scenarios Quick Reference

### Scenario 1: Create and Complete Layby
1. Create layby with 2 items, $200 total, 20% deposit
2. Record payment $50
3. Record payment $50
4. Record payment $50
5. Record final payment $30
6. Verify status COMPLETED
7. Verify order created

### Scenario 2: Create and Cancel Layby
1. Create layby with 1 item, $400 total, 30% deposit
2. Record payment $100
3. Cancel with reason
4. Verify status CANCELLED
5. Verify refund calculated correctly

### Scenario 3: Hold and Reactivate
1. Create layby
2. Put on hold with reason
3. Verify payment buttons disabled
4. Reactivate
5. Record payment
6. Verify works normally

### Scenario 4: Automation Run
1. Create layby with due date in 3 days
2. Create layby overdue by 2 days
3. Run automation manually
4. Verify reminders sent
5. Verify late fees applied

### Scenario 5: Permission Testing
1. Login as admin - verify full access
2. Login as staff without permission - verify denied
3. Login as user from Business 1 - verify cannot see Business 2 laybys

---

**Document Version**: 1.0
**Last Updated**: [Date]
**Next Review Date**: [Date]
