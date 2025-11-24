# Testing Guide: MBM-108 - Loan Lending from Outside

## 🎯 Overview

This guide provides step-by-step instructions for manually testing all aspects of the loan lending feature.

**Testing URL:** http://localhost:8080/business/manage/loans
**Lenders Page:** http://localhost:8080/business/manage/lenders

---

## 📋 Pre-Test Setup

### Required Test Users

You need users with different roles to test permissions:

1. **Admin User** - System administrator or business admin
2. **Manager User** - Business manager
3. **Owner User** - Business owner
4. **Employee User** - Regular employee (no special permissions)

### Required Test Businesses

You need at least 2 businesses to test:
- Business A (where you have admin/manager/owner role)
- Business B (for cross-business testing)

---

## ✅ Test Checklist

### Phase 6.1: Test Admin Permissions ✓

**Objective:** Verify admin can create lenders and loans

1. **Login as Admin**
   - Navigate to http://localhost:8080/business/manage/lenders
   - Click "Add Lender" button
   - **Expected:** Modal opens successfully

2. **Create Individual Lender**
   - Fill in form:
     - Full Name: "Test Individual Lender"
     - Email: "test-individual@example.com"
     - Phone: "+1234567890"
     - National ID: "IND-12345"
     - Address: "123 Test St"
     - Lender Type: Select "Individual"
   - Click "Create Lender"
   - **Expected:** ✅ Lender created successfully, appears in table

3. **Create Loan as Admin**
   - Navigate to http://localhost:8080/business/manage/loans
   - Click "Create Loan" button
   - Select lender type: "Person / Individual"
   - Select the lender you just created
   - Enter loan details (amount: $5,000, interest: 5%)
   - Click "Create Loan"
   - **Expected:** ✅ Loan created successfully

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.2: Test Manager Permissions ✓

**Objective:** Verify manager can create lenders and loans

1. **Login as Manager**
   - Navigate to lenders page
   - Click "Add Lender"
   - **Expected:** Modal opens (manager has permission)

2. **Create Bank Lender**
   - Full Name: "First National Bank"
   - Email: "bank@example.com"
   - Phone: "+1987654321"
   - National ID: "BANK-98765"
   - Lender Type: Select "Bank"
   - Click "Create Lender"
   - **Expected:** ✅ Bank lender created, appears with bank icon

3. **Create Loan from Bank**
   - Create new loan with bank as lender
   - Amount: $20,000
   - **Expected:** ✅ Loan created, no balance validation for bank lender

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.3: Test Owner Permissions ✓

**Objective:** Verify business owner can create lenders and loans

1. **Login as Owner**
   - Navigate to lenders page
   - **Expected:** Can see "Add Lender" button

2. **Create Another Individual Lender**
   - Create lender with unique details
   - **Expected:** ✅ Successfully created

3. **Create Person-to-Business Loan**
   - Lender Type: Person
   - Select individual lender
   - Borrower Type: Business
   - Select your business
   - Amount: $10,000
   - **Expected:** ✅ Loan created, no balance check for person lender

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.4: Test Employee Permissions (Should FAIL) ✓

**Objective:** Verify regular employees CANNOT create lenders/loans

1. **Login as Employee**
   - Navigate to http://localhost:8080/business/manage/lenders
   - Try to click "Add Lender"
   - **Expected:** ❌ Button disabled OR 403 error when attempting

2. **Try to Create Loan**
   - Navigate to loans page
   - Try to create loan via API (if button visible)
   - **Expected:** ❌ 403 Forbidden error
   - Error message: "Insufficient permissions. Only admins, managers, and owners can create loans."

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.5 & 6.6: Lender Creation Tests ✓

**Objective:** Test creating different types of lenders

1. **Create Multiple Individual Lenders**
   ```
   Lender 1: John Doe (Individual)
   Lender 2: Jane Smith (Individual)
   Lender 3: Bob Johnson (Individual)
   ```
   - **Expected:** All appear in lenders table

2. **Create Multiple Bank Lenders**
   ```
   Bank 1: City Bank
   Bank 2: Credit Union
   Bank 3: National Trust
   ```
   - **Expected:** All have bank icon/badge
   - Notes contain [BANK] tag

3. **Test Duplicate Prevention**
   - Try to create lender with same National ID
   - **Expected:** ❌ Error: "A person with this National ID already exists"

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.7: Person-to-Business Loan ✓

**Objective:** Test loan from individual/bank to business

1. **Create Loan from Individual to Business**
   - Lender Type: Person
   - Lender: Select "John Doe"
   - Borrower Type: Business
   - Borrower: Your business
   - Amount: $15,000
   - Interest Rate: 5%
   - Terms: "12 months repayment"

2. **Verify Loan Details**
   - Check loan appears in list
   - **Expected:** Shows "John Doe → [Your Business Name]"
   - **Expected:** No balance was deducted from business
   - Remaining balance: $15,750 (with 5% interest)

3. **Create Loan from Bank to Business**
   - Lender Type: Person (bank is stored as person)
   - Lender: Select "City Bank"
   - Amount: $50,000
   - Interest: 3.5%
   - **Expected:** ✅ Loan created, no balance validation

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.8: Business-to-Person Loan ✓

**Objective:** Test loan from business to individual

1. **Check Business Balance First**
   - Note your business current balance
   - Ensure balance > $5,000

2. **Create Loan from Business to Person**
   - Lender Type: Business
   - Lender: Your business
   - Borrower Type: Person
   - Borrower: Select "Jane Smith"
   - Amount: $5,000
   - Interest: 4%

3. **Verify Balance Deduction**
   - **Expected:** Business balance decreased by $5,000
   - **Expected:** Loan shows in list: "[Your Business] → Jane Smith"
   - **Expected:** Transaction recorded in business transactions

4. **Test Insufficient Balance**
   - Try to create loan for $1,000,000 (more than balance)
   - **Expected:** ❌ Error: "Insufficient funds to create loan"
   - Shows current balance vs required amount

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.9: Loan Repayment ✓

**Objective:** Test payment processing for all loan types

1. **Test Payment on Person-to-Business Loan**
   - Open loan details (John Doe → Your Business)
   - Click "Make Payment"
   - Amount: $1,000
   - Description: "Monthly payment"
   - **Expected:**
     - ✅ Payment recorded
     - Balance reduced by $1,000
     - Business balance decreased by $1,000

2. **Test Payment on Business-to-Person Loan**
   - Open loan details (Your Business → Jane Smith)
   - Person makes payment (simulated)
   - **Expected:**
     - ✅ Payment recorded
     - No balance validation for person payment
     - Loan balance reduced

3. **Test Advance from Person Lender**
   - Select person-to-business loan
   - Click "Record Advance"
   - Amount: $2,000
   - **Expected:**
     - ✅ Advance recorded
     - Loan balance increased by $2,000
     - No balance validation for person lender

4. **Test Full Loan Repayment**
   - Make payments until loan is fully paid
   - **Expected:**
     - ✅ Loan status changes to "paid"
     - Remaining balance = $0

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.10: Business Balance Tracking ✓

**Objective:** Verify business balance is correctly tracked

1. **Record Initial Balance**
   - Note business balance before test: $__________

2. **Create Business-to-Person Loan**
   - Amount: $3,000
   - **Expected:** Balance decreases by $3,000

3. **Receive Person-to-Business Loan Payment**
   - Payment: $1,000
   - **Expected:** Balance decreases by $1,000 (payment going out)

4. **Check Transaction History**
   - Navigate to business transactions
   - **Expected:**
     - ✅ "Loan disbursement" entry for $3,000
     - ✅ "Loan payment" entry for $1,000
     - ✅ All transactions linked to loan reference

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.11: Backward Compatibility ✓

**Objective:** Ensure existing business-to-business loans still work

1. **Create Business-to-Business Loan**
   - Lender Type: Business
   - Lender: Business A
   - Borrower Type: Business
   - Borrower: Business B
   - Amount: $8,000
   - **Expected:** ✅ Works exactly as before

2. **Verify Old Loans Still Display**
   - Check existing loans from before MBM-108
   - **Expected:** All display correctly with business names

3. **Test Payment on Old Loan**
   - Make payment on business-to-business loan
   - **Expected:** ✅ Works as before, balance validation applies

**Test Result:** ☐ PASS ☐ FAIL

---

### Phase 6.12: Cross-Business Security ✓

**Objective:** Verify users can't access other businesses' data

1. **Try to Create Loan for Different Business**
   - User from Business A
   - Try to create loan with Business B as lender (where user has no role)
   - **Expected:** ❌ 403 Forbidden error

2. **Try to View Loans of Other Business**
   - Login as user with access to Business A only
   - Try to fetch loans for Business B
   - **Expected:** ❌ Loans not returned (filtered by membership)

3. **Try to Make Payment on Other Business Loan**
   - Try to process payment for loan you don't have access to
   - **Expected:** ❌ 404 Not Found or 403 Forbidden

4. **Verify System Admin Access**
   - Login as system admin
   - **Expected:** ✅ Can see all loans across all businesses

**Test Result:** ☐ PASS ☐ FAIL

---

## 🎨 UI/UX Testing

### Search and Filter Testing

1. **Search Lenders**
   - Search by name
   - Search by email
   - Search by phone
   - Search by National ID
   - **Expected:** Results filter correctly

2. **Filter by Lender Type**
   - Filter: "Individual" → Shows only individuals
   - Filter: "Bank" → Shows only banks
   - Filter: "All" → Shows all lenders

3. **Lender Statistics**
   - Check dashboard shows:
     - Total lenders count
     - Individual lenders count
     - Bank lenders count
     - Active lenders count

### Dark Mode Testing

1. **Toggle Dark Mode**
   - Switch to dark mode
   - **Expected:** All pages render correctly
   - No white backgrounds bleeding through
   - Text remains readable

### Custom Alerts Testing

1. **Verify No Browser Alerts**
   - Create lender → Custom modal appears (not browser alert)
   - Delete lender → Custom confirmation (not browser confirm)
   - Errors → Custom error display (not browser alert)

---

## 📊 Expected Results Summary

### ✅ What Should Work

- [x] Admin can create lenders and loans
- [x] Manager can create lenders and loans
- [x] Owner can create lenders and loans
- [x] Individual and bank lenders can be created
- [x] Person-to-business loans work (no balance validation for person)
- [x] Business-to-person loans work (with balance validation for business)
- [x] All 4 loan type combinations work
- [x] Loan payments process correctly
- [x] Business balance tracking is accurate
- [x] Old business-to-business loans still work
- [x] Cross-business security enforced

### ❌ What Should NOT Work

- [x] Employee cannot create lenders (403 error)
- [x] Employee cannot create loans (403 error)
- [x] Cannot create loan with insufficient business balance
- [x] Cannot create duplicate lenders (same National ID)
- [x] Cannot delete lender with active loans
- [x] Cannot access other businesses' loans

---

## 🐛 Bug Reporting Template

If you find any issues during testing, report them with:

```markdown
**Test:** [Test name/number]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3
**Error Message:** [If any]
**Browser/Environment:** [Browser version, etc.]
**Screenshot:** [If applicable]
```

---

## 🎯 Test Completion Criteria

All tests pass when:

1. ✅ All permission checks work correctly
2. ✅ All 4 loan type combinations can be created
3. ✅ Balance validation works for business entities only
4. ✅ Transaction processing works for all scenarios
5. ✅ No business balance is deducted for person/bank lenders
6. ✅ Cross-business security prevents unauthorized access
7. ✅ Backward compatibility maintained
8. ✅ UI/UX works in both light and dark modes
9. ✅ Search and filter functionality works
10. ✅ Custom alerts used throughout (no browser alerts)

---

**Testing Complete!** 🎉

Once all tests pass, proceed to Phase 7: Documentation and Polish
