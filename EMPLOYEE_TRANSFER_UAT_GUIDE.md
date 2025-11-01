# Employee Transfer - User Acceptance Testing (UAT) Guide

## Overview
This guide provides step-by-step instructions for manually testing the employee transfer feature during business deletion.

**Test Duration:** 30-45 minutes  
**Prerequisites:** System admin access, test database with sample data  
**Tested By:** ________________  
**Test Date:** ________________

---

## Pre-Test Setup

### 1. Verify Test Environment
- [ ] Connected to TEST database (not production)
- [ ] System admin account logged in
- [ ] Browser console open (F12) for debugging

### 2. Create Test Data

```sql
-- Create two retail businesses (same type)
INSERT INTO businesses (id, name, type, is_active) VALUES
('test-retail-1', 'Test Retail Store 1', 'retail', true),
('test-retail-2', 'Test Retail Store 2', 'retail', true);

-- Create one restaurant business (different type)
INSERT INTO businesses (id, name, type, is_active) VALUES
('test-restaurant-1', 'Test Restaurant', 'restaurant', true);

-- Create 3 active employees for retail store 1
INSERT INTO employees (id, full_name, email, is_active, primary_business_id) VALUES
('test-emp-1', 'Test Employee 1', 'emp1@test.com', true, 'test-retail-1'),
('test-emp-2', 'Test Employee 2', 'emp2@test.com', true, 'test-retail-1'),
('test-emp-3', 'Test Employee 3', 'emp3@test.com', true, 'test-retail-1');

-- Create active contracts for employees
INSERT INTO employee_contracts (id, employee_id, primary_business_id, status, position, start_date) VALUES
('test-contract-1', 'test-emp-1', 'test-retail-1', 'active', 'Manager', NOW()),
('test-contract-2', 'test-emp-2', 'test-retail-1', 'active', 'Cashier', NOW()),
('test-contract-3', 'test-emp-3', 'test-retail-1', 'active', 'Stock Clerk', NOW());

-- Create business assignments
INSERT INTO employee_business_assignments (id, employee_id, business_id, is_primary, is_active) VALUES
('test-assign-1', 'test-emp-1', 'test-retail-1', true, true),
('test-assign-2', 'test-emp-2', 'test-retail-1', true, true),
('test-assign-3', 'test-emp-3', 'test-retail-1', true, true);
```

---

## Test Scenarios

### Scenario 1: Happy Path - Transfer All Employees

**Goal:** Successfully transfer all employees during business deletion

1. **Navigate to Business Management**
   - [ ] Go to `/business/manage` page
   - [ ] Verify "Test Retail Store 1" is listed
   - [ ] Verify it shows "3 employees" or similar count

2. **Initiate Business Deletion**
   - [ ] Click "Delete" button for "Test Retail Store 1"
   - [ ] Modal should open with warning about active employees
   - [ ] Should see: "Transfer 3 Active Employees" or similar message
   - [ ] "Delete Business" button should be disabled
   - [ ] "Transfer Employees" button should be visible and enabled

3. **Open Transfer Modal**
   - [ ] Click "Transfer Employees" button
   - [ ] Employee Transfer Modal should open (higher z-index)
   - [ ] Should show loading state initially
   - [ ] After loading, should show business selection cards

4. **Select Target Business**
   - [ ] Verify "Test Retail Store 2" is shown (same type)
   - [ ] Verify "Test Restaurant" is NOT shown (different type)
   - [ ] Click on "Test Retail Store 2" card
   - [ ] Card should highlight with blue border
   - [ ] "Continue" button should become enabled

5. **Review Transfer Preview**
   - [ ] Click "Continue" button
   - [ ] Should show preview of 3 employees
   - [ ] Each employee should show: name, email, current position
   - [ ] Should show warning about contract renewals
   - [ ] Should mention "7 days" for renewal due date
   - [ ] "Confirm Transfer" button should be visible

6. **Execute Transfer**
   - [ ] Click "Confirm Transfer" button
   - [ ] Should show "Transferring..." state
   - [ ] After completion, should show success message
   - [ ] Success message should confirm: "3 employees transferred"
   - [ ] Should mention contract renewals created

7. **Close and Verify**
   - [ ] Click "Close" or "Done" button
   - [ ] Transfer modal should close
   - [ ] Deletion modal should still be open
   - [ ] "Delete Business" button should now be ENABLED
   - [ ] Employee count should now show "0 employees"

8. **Complete Business Deletion**
   - [ ] Type business name in confirmation field
   - [ ] Click "Delete Business" button
   - [ ] Business should be deleted successfully
   - [ ] Redirected or modal closed
   - [ ] "Test Retail Store 1" should no longer appear in list

9. **Database Verification**

```sql
-- Verify employees now belong to new business
SELECT id, full_name, primary_business_id 
FROM employees 
WHERE id IN ('test-emp-1', 'test-emp-2', 'test-emp-3');
-- Expected: primary_business_id = 'test-retail-2'

-- Verify old assignments are inactive
SELECT employee_id, business_id, is_primary, is_active
FROM employee_business_assignments
WHERE employee_id IN ('test-emp-1', 'test-emp-2', 'test-emp-3')
AND business_id = 'test-retail-1';
-- Expected: is_primary = false, is_active = false

-- Verify new assignments created
SELECT employee_id, business_id, is_primary, is_active
FROM employee_business_assignments
WHERE employee_id IN ('test-emp-1', 'test-emp-2', 'test-emp-3')
AND business_id = 'test-retail-2';
-- Expected: is_primary = true, is_active = true

-- Verify contract renewals created
SELECT employee_id, status, is_auto_renewal, due_date
FROM contract_renewals
WHERE employee_id IN ('test-emp-1', 'test-emp-2', 'test-emp-3')
ORDER BY created_at DESC;
-- Expected: 3 records with status='pending', is_auto_renewal=true, due_date ~7 days from now

-- Verify audit log
SELECT action, details
FROM audit_log
WHERE action = 'EMPLOYEE_TRANSFER'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: Details about the transfer
```

**Result:** [ ] PASS  [ ] FAIL  
**Notes:** _______________________________________________

---

### Scenario 2: Cancel Transfer

**Goal:** Verify cancellation at each step

1. **Setup:** Restore test data if deleted
2. **Test Cancel at Business Selection**
   - [ ] Open deletion modal → Click "Transfer Employees"
   - [ ] In transfer modal, click "Cancel" before selecting business
   - [ ] Transfer modal should close
   - [ ] Deletion modal should still be open
   - [ ] Business deletion still blocked

3. **Test Cancel at Preview**
   - [ ] Open transfer modal again
   - [ ] Select target business → Click "Continue"
   - [ ] At preview screen, click "Back" or "Cancel"
   - [ ] Should return to business selection
   - [ ] Can re-select or cancel

4. **Test Backdrop Click Protection**
   - [ ] Open transfer modal
   - [ ] Click on dark backdrop (outside modal)
   - [ ] Modal should NOT close during loading
   - [ ] Modal should NOT close during transfer execution

**Result:** [ ] PASS  [ ] FAIL  
**Notes:** _______________________________________________

---

### Scenario 3: No Compatible Target Businesses

**Goal:** Handle case where no compatible businesses exist

1. **Setup:**
```sql
-- Make all other retail businesses inactive
UPDATE businesses 
SET is_active = false 
WHERE type = 'retail' AND id != 'test-retail-1';
```

2. **Test:**
   - [ ] Try to delete "Test Retail Store 1"
   - [ ] Click "Transfer Employees"
   - [ ] Should show error: "No compatible businesses found"
   - [ ] Should suggest creating a new business or deactivating employees
   - [ ] Cannot proceed with transfer

3. **Cleanup:**
```sql
-- Restore active businesses
UPDATE businesses SET is_active = true WHERE type = 'retail';
```

**Result:** [ ] PASS  [ ] FAIL  
**Notes:** _______________________________________________

---

### Scenario 4: Business Type Mismatch

**Goal:** Verify type validation

1. **Manual Override Test (if applicable):**
   - [ ] Attempt to transfer retail employees to restaurant business
   - [ ] System should prevent this
   - [ ] Only same-type businesses should appear in selection

**Result:** [ ] PASS  [ ] FAIL  
**Notes:** _______________________________________________

---

### Scenario 5: Partial Employee Selection (Future Enhancement)

**Note:** Current version transfers ALL active employees. If partial selection is implemented:

1. **Test:**
   - [ ] Open transfer modal
   - [ ] Select only 2 out of 3 employees
   - [ ] Complete transfer
   - [ ] Verify only selected employees transferred
   - [ ] Business deletion still blocked (1 employee remains)

**Result:** [ ] N/A (Not Implemented)  [ ] PASS  [ ] FAIL

---

### Scenario 6: Dark Mode Compatibility

**Goal:** Verify UI visibility in dark mode

1. **Test:**
   - [ ] Switch to dark mode (if supported)
   - [ ] Open business management page
   - [ ] Open deletion modal
   - [ ] Open transfer modal
   - [ ] Verify all text is readable
   - [ ] Verify modals have proper backgrounds
   - [ ] Check employee list table visibility

**Result:** [ ] PASS  [ ] FAIL  
**Notes:** _______________________________________________

---

### Scenario 7: Error Handling

**Goal:** Test error scenarios

1. **Network Error Simulation:**
   - [ ] Open transfer modal
   - [ ] Disconnect network (Developer Tools → Network → Offline)
   - [ ] Try to select business or execute transfer
   - [ ] Should show error message
   - [ ] Should allow retry

2. **Invalid Data:**
   - [ ] (Requires developer to manually create invalid state)
   - [ ] System should handle gracefully

**Result:** [ ] PASS  [ ] FAIL  
**Notes:** _______________________________________________

---

### Scenario 8: Large Employee Count

**Goal:** Test performance with many employees

1. **Setup:**
```sql
-- Create 50 test employees
INSERT INTO employees (id, full_name, email, is_active, primary_business_id)
SELECT 
  'test-emp-' || generate_series,
  'Test Employee ' || generate_series,
  'emp' || generate_series || '@test.com',
  true,
  'test-retail-1'
FROM generate_series(10, 59);

-- Create contracts for all
INSERT INTO employee_contracts (employee_id, primary_business_id, status, position, start_date)
SELECT 
  'test-emp-' || generate_series,
  'test-retail-1',
  'active',
  'Staff',
  NOW()
FROM generate_series(10, 59);
```

2. **Test:**
   - [ ] Open transfer for business with 50+ employees
   - [ ] Preview should load within 3 seconds
   - [ ] Transfer should complete within 10 seconds
   - [ ] No UI freezing or timeout errors

**Result:** [ ] PASS  [ ] FAIL  
**Performance Notes:** _______________________________________________

---

## Post-Test Cleanup

```sql
-- Remove all test data
DELETE FROM contract_renewals WHERE employee_id LIKE 'test-emp-%';
DELETE FROM employee_business_assignments WHERE employee_id LIKE 'test-emp-%';
DELETE FROM employee_contracts WHERE employee_id LIKE 'test-emp-%';
DELETE FROM employees WHERE id LIKE 'test-emp-%';
DELETE FROM businesses WHERE id LIKE 'test-%';
DELETE FROM audit_log WHERE action = 'EMPLOYEE_TRANSFER' AND details::text LIKE '%test-%';
```

---

## Summary

**Total Scenarios:** 8  
**Passed:** ______  
**Failed:** ______  
**N/A:** ______

**Critical Issues Found:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Minor Issues Found:**
1. _______________________________________________
2. _______________________________________________

**Recommendations:**
_______________________________________________
_______________________________________________
_______________________________________________

**Sign-off:**
- [ ] Feature is ready for production deployment
- [ ] Feature needs minor fixes before deployment
- [ ] Feature needs significant rework

**Tester Signature:** ________________  **Date:** ________________  
**Product Owner Approval:** ________________  **Date:** ________________

---

## Troubleshooting Guide

### Modal Not Appearing
- Check browser console for JavaScript errors
- Verify z-index hierarchy (Transfer: z-[60], Deletion: z-50)
- Check if another modal is blocking

### Transfer Button Disabled
- Verify employees are active (is_active = true)
- Check if compatible target businesses exist
- Verify system admin permissions

### Contract Renewals Not Created
- Check employee_contracts table for active contracts
- Verify due_date is ~7 days in future
- Check is_auto_renewal flag is true

### Performance Issues
- Monitor browser Network tab for slow API calls
- Check database query performance
- Verify transaction is completing successfully

### Dark Mode Issues
- Check Tailwind dark mode classes are applied
- Verify text contrast ratios
- Test all modal backgrounds

---

**Version:** 1.0  
**Last Updated:** 2025  
**Maintained By:** Development Team
