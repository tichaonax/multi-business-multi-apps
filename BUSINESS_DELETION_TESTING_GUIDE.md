# Business Deletion Feature - Testing Guide

## Feature Overview
The business deletion feature allows system administrators to delete businesses through the UI at `/business/manage`. It supports two deletion modes:
- **Soft Delete (Deactivation)**: For real businesses - marks as inactive but preserves data
- **Hard Delete (Permanent)**: Only for demo businesses with `[Demo]` in the name - permanently removes all data

## Prerequisites
- Must be logged in as a **system administrator**
- Access to at least one business (demo or real)
- The business to be deleted must have **no active members or employees**

## Test Scenarios

### Test 1: Soft Delete (Deactivate) a Real Business (No Employees)

**Setup**:
1. Navigate to `http://localhost:8080/business/manage`
2. Switch to a non-demo business (one without `[Demo]` in the name)

**Steps**:
1. Click the **"Delete Business"** button (red button in business info section)
2. Modal opens showing business details
3. Verify **"Deactivate (Soft Delete)"** is selected by default
4. Verify **"Permanent Delete"** option is **disabled/grayed out** (not available for real businesses)
5. Review the impact summary showing related records count
6. Click **"Continue"** button
7. Type the exact business name to confirm
8. Click **"Next Step"**
9. Type **"DEACTIVATE"** (must be exact, uppercase)
10. Click **"Deactivate Business"** button

**Expected Result**:
- ✅ Business is marked as `isActive: false` in database
- ✅ All related data is preserved
- ✅ Success message appears
- ✅ Redirected to dashboard
- ✅ Audit log entry created with action `BUSINESS_DEACTIVATED`

**Database Verification**:
```sql
SELECT id, name, "isActive" FROM businesses WHERE name = 'YourBusinessName';
-- Should show isActive = false

-- Verify data is preserved
SELECT COUNT(*) FROM business_products WHERE "businessId" = 'your-business-id';
-- Should still show existing count
```

---

### Test 2: Hard Delete a Demo Business

**Setup**:
1. Run a demo seed script: `node scripts/seed-clothing-demo.js`
2. Navigate to `http://localhost:8080/business/manage`
3. Switch to the demo business (e.g., "Clothing [Demo]")

**Steps**:
1. Verify the business card shows **"Demo Business"** badge
2. Click **"Delete Business"** button
3. Modal opens with business details
4. Notice both deletion options are available
5. Select **"Permanent Delete (Hard Delete)"** option
6. Review warning: "⚠️ This action cannot be undone!"
7. Review impact summary (products, orders, categories, etc.)
8. Click **"Continue"**
9. Type the exact business name (e.g., "Clothing [Demo]")
10. Click **"Next Step"**
11. Type **"DELETE PERMANENTLY"** (must be exact, uppercase)
12. Click **"Delete Permanently"** button
13. Wait for deletion to complete (may take a few seconds)

**Expected Result**:
- ✅ Business and ALL related data permanently deleted from database
- ✅ Success message: "Business deleted successfully"
- ✅ Redirected to dashboard
- ✅ Audit log entry with action `BUSINESS_HARD_DELETED` and deletion counts
- ✅ Business no longer appears in business list

**Database Verification**:
```sql
SELECT * FROM businesses WHERE id = 'clothing-demo-business';
-- Should return 0 rows

SELECT COUNT(*) FROM business_products WHERE "businessId" = 'clothing-demo-business';
-- Should return 0

SELECT COUNT(*) FROM business_categories WHERE "businessId" = 'clothing-demo-business';
-- Should return 0
```

---

### Test 3: Attempt Hard Delete on Real Business (Should Fail)

**Steps**:
1. Navigate to real business (without `[Demo]`)
2. Click "Delete Business"
3. Try to select "Permanent Delete" option

**Expected Result**:
- ✅ "Permanent Delete" option is **disabled**
- ✅ Shows message: "Only available for demo businesses"
- ✅ Cannot proceed with hard delete

---

### Test 4: Cancel at Each Step

**Steps**:
1. Open deletion modal
2. Click **"Cancel"** at step 1 (deletion type selection)
3. Repeat, but cancel at step 2 (typing business name)
4. Repeat, but cancel at step 3 (typing confirmation)

**Expected Result**:
- ✅ Modal closes at each step
- ✅ No deletion occurs
- ✅ Business remains active/unchanged

---

### Test 5: Incorrect Typed Confirmations

**Steps**:
1. Open deletion modal and proceed to step 2
2. Type incorrect business name (e.g., missing a letter)
3. Verify "Next Step" button is **disabled**
4. Type correct name and proceed
5. At step 3, type wrong confirmation (e.g., "delete" instead of "DELETE PERMANENTLY")
6. Verify final button is **disabled**

**Expected Result**:
- ✅ Cannot proceed without exact match
- ✅ Error message shows what to type
- ✅ Buttons remain disabled until correct input

---

### Test 6: Active Members Prevention

**Setup**:
1. Ensure demo business has at least one active member

**Steps**:
1. Attempt to delete the business
2. Proceed through all confirmation steps

**Expected Result**:
- ✅ Deletion fails with error message
- ✅ Error: "Cannot delete business with X active member(s). Deactivate them first."
- ✅ Business remains unchanged

**Fix & Retry**:
1. Deactivate all business members
2. Retry deletion
3. Should succeed

---

### Test 7: View Deletion Impact Before Deleting

**API Test**:
```bash
# Get deletion impact for a business
curl -X GET "http://localhost:8080/api/admin/businesses/clothing-demo-business/deletion-impact" \
  -H "Cookie: your-session-cookie"
```

**Expected Response**:
```json
{
  "businessName": "Clothing [Demo]",
  "businessType": "clothing",
  "isDemoBusiness": true,
  "relatedRecords": {
    "orders": 0,
    "products": 15,
    "categories": 4,
    "suppliers": 2,
    "locations": 1,
    "projects": 0,
    "employees": 0,
    "vehicles": 0,
    "memberships": 1,
    "customers": 0
  }
}
```

---

### Test 8: Non-Admin Access (Should Fail)

**Setup**:
1. Log in as non-admin user (employee or business-manager)

**Steps**:
1. Navigate to `/business/manage`
2. Look for "Delete Business" button

**Expected Result**:
- ✅ "Delete Business" button is **not visible**
- ✅ Direct API calls return 403 Forbidden

---

### Test 9: Multiple Demo Businesses

**Setup**:
1. Seed multiple demo businesses:
   ```bash
   node scripts/seed-clothing-demo.js
   node scripts/seed-hardware-demo.js
   node scripts/seed-grocery-demo.js
   ```

**Steps**:
1. Delete each demo business one by one
2. Verify correct business is deleted each time
3. Check other businesses remain unaffected

**Expected Result**:
- ✅ Each deletion only affects the selected business
- ✅ No cross-business data deletion
- ✅ Other businesses continue to function normally

---

### Test 10: Audit Log Verification

**After each deletion, check audit logs**:

```sql
SELECT 
  action, 
  "entityType", 
  "entityId", 
  "userId",
  details,
  "createdAt"
FROM audit_logs 
WHERE action IN ('BUSINESS_DEACTIVATED', 'BUSINESS_HARD_DELETED')
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected**:
- ✅ Entry for each deletion attempt
- ✅ Soft delete: `BUSINESS_DEACTIVATED`
- ✅ Hard delete: `BUSINESS_HARD_DELETED` with `deletedCounts` in details
- ✅ Correct userId (system admin)
- ✅ Business name and type in details

---

## Quick Test Commands

### Create Fresh Demo Businesses
```bash
cd /c/Users/ticha/apps/multi-business-multi-apps

# Create demo businesses
node scripts/seed-clothing-demo.js
node scripts/seed-hardware-demo.js
node scripts/seed-grocery-demo.js
node scripts/seed-restaurant-demo.js
node scripts/seed-contractors-demo.js
```

### Check Demo Businesses
```sql
SELECT id, name, "isActive", type 
FROM businesses 
WHERE name LIKE '%[Demo]%'
ORDER BY name;
```

### Clean Up All Demo Businesses
```bash
node scripts/cleanup-demo-businesses.js
```

---

### Test 4: Delete Business with Active Employees (Employee Transfer)

**Setup**:
1. Create or use a business with 2-3 active employees
2. Ensure target business of same type exists
3. Verify employees have the business as primary business

**Steps**:
1. Navigate to `/business/manage`
2. Click **"Delete Business"** for business with employees
3. Deletion modal opens showing:
   - ⚠️ Warning: "This business has X active employees"
   - "Employees must be transferred before deletion"
   - **"Transfer Employees"** button (enabled)
   - **"Delete Business"** button (disabled)

**Employee Transfer Steps**:
4. Click **"Transfer Employees"** button
5. Employee Transfer Modal opens
6. Wait for loading to complete
7. View list of employees to be transferred:
   - Employee names
   - Job titles
   - Contract status
8. View list of compatible target businesses:
   - Same type as source business
   - Business cards with employee counts
9. Select target business (click card)
   - Card highlights with blue border
   - **"Continue"** button becomes enabled
10. Click **"Continue"**
11. Review transfer preview:
   - Source and target business names
   - Employee list with details
   - Contract renewal warning
   - "7 days due date" notice
12. Click **"Confirm Transfer"**
13. Wait for transfer to complete (1-5 seconds)
14. Success message appears:
   - "X employees transferred successfully"
   - "Y contract renewals created"
15. Click **"Close"**
16. Deletion modal refreshes showing:
   - "0 employees"
   - **"Delete Business"** button now enabled

**Complete Deletion**:
17. Type business name exactly
18. Click **"Continue"**
19. Type confirmation phrase
20. Click **"Delete Business"**
21. Business deleted successfully

**Expected Results**:
- ✅ Employees transferred to target business
- ✅ Employee `primaryBusinessId` updated
- ✅ Old business assignments marked inactive
- ✅ New business assignments created as primary
- ✅ Contract renewal records created (status: 'pending', due: 7 days)
- ✅ Audit log entry: `EMPLOYEE_TRANSFER`
- ✅ Source business can now be deleted

**Database Verification**:
```sql
-- Verify employees moved to target business
SELECT id, full_name, primary_business_id 
FROM employees 
WHERE id IN ('emp-id-1', 'emp-id-2');
-- Should show new primary_business_id

-- Verify old assignments inactive
SELECT employee_id, business_id, is_primary, is_active
FROM employee_business_assignments
WHERE business_id = 'old-business-id'
  AND employee_id IN ('emp-id-1', 'emp-id-2');
-- Should show is_primary=false, is_active=false

-- Verify new assignments created
SELECT employee_id, business_id, is_primary, is_active
FROM employee_business_assignments
WHERE business_id = 'new-business-id'
  AND employee_id IN ('emp-id-1', 'emp-id-2');
-- Should show is_primary=true, is_active=true

-- Verify contract renewals created
SELECT employee_id, status, is_auto_renewal, due_date, renewal_reason
FROM contract_renewals
WHERE employee_id IN ('emp-id-1', 'emp-id-2')
  AND is_auto_renewal = true
ORDER BY created_at DESC;
-- Should show 1 record per employee, status='pending', due ~7 days

-- Verify audit log
SELECT action, user_id, details
FROM audit_log
WHERE action = 'EMPLOYEE_TRANSFER'
ORDER BY created_at DESC
LIMIT 1;
-- Should show transfer details
```

---

### Test 5: Employee Transfer - No Compatible Businesses

**Setup**:
1. Business with employees
2. No other businesses of same type

**Steps**:
1. Attempt to delete business
2. Click **"Transfer Employees"**
3. Modal loads
4. Shows: "No compatible businesses found"
5. Error message suggests:
   - Creating a new business of same type
   - Deactivating employees instead

**Expected Result**:
- ✅ Clear error message
- ✅ Cannot proceed with transfer
- ✅ Can cancel and create target business
- ✅ Can retry after creating target

**Solution**:
```sql
-- Create compatible business
INSERT INTO businesses (id, name, type, is_active, created_by)
VALUES ('new-biz-id', 'Target Business', 'retail', true, 'admin-id');
```
Then retry transfer.

---

### Test 6: Employee Transfer - Business Type Mismatch

**Setup**:
1. Retail business with employees
2. Only restaurant businesses exist

**Steps**:
1. Attempt to delete retail business
2. Click **"Transfer Employees"**
3. View compatible businesses list
4. Verify restaurants are NOT shown
5. Only retail businesses appear

**Expected Result**:
- ✅ Business type validation enforced
- ✅ Only same-type businesses shown
- ✅ Cannot select incompatible business

**Database Verification**:
```sql
-- Verify business types
SELECT id, name, type FROM businesses 
WHERE is_active = true;

-- Compatible businesses for retail source
SELECT id, name, type FROM businesses
WHERE type = 'retail' 
  AND is_active = true
  AND id != 'source-business-id';
```

---

### Test 7: Employee Transfer Rollback Test

**Setup**:
1. Business with employees
2. Simulated failure scenario

**Steps**:
1. Start employee transfer
2. Simulate database error (disconnect mid-transaction)
3. Transfer fails

**Expected Result**:
- ✅ Transaction rolls back completely
- ✅ No partial updates
- ✅ Employees remain in source business
- ✅ No contract renewals created
- ✅ No business assignments changed
- ✅ Error message displayed
- ✅ Safe to retry

**Database Verification**:
```sql
-- Verify no changes occurred
SELECT primary_business_id FROM employees 
WHERE id IN ('emp-id-1', 'emp-id-2');
-- Should show original business

-- Verify no renewals created
SELECT COUNT(*) FROM contract_renewals
WHERE employee_id IN ('emp-id-1', 'emp-id-2')
  AND created_at > NOW() - INTERVAL '5 minutes';
-- Should be 0
```

---

### Test 8: Large Employee Transfer (Performance)

**Setup**:
1. Business with 50 employees
2. Target business of same type

**Steps**:
1. Delete business with 50 employees
2. Click **"Transfer Employees"**
3. Wait for employee list to load (should be <3 seconds)
4. Select target business
5. Review preview (all 50 employees listed)
6. Confirm transfer
7. Monitor transfer duration

**Expected Results**:
- ✅ List loads in <3 seconds
- ✅ Transfer completes in <10 seconds
- ✅ All 50 employees transferred
- ✅ 50 contract renewals created
- ✅ No timeout errors
- ✅ Progress indicator shows during transfer

**Performance Benchmarks**:
- 1-10 employees: <2 seconds
- 10-50 employees: <5 seconds
- 50-100 employees: <10 seconds

**SQL Setup for 50 employees**:
```sql
-- Create 50 test employees
INSERT INTO employees (id, full_name, email, is_active, primary_business_id)
SELECT 
  'test-emp-' || generate_series,
  'Test Employee ' || generate_series,
  'emp' || generate_series || '@test.com',
  true,
  'source-business-id'
FROM generate_series(1, 50);

-- Create contracts for all
INSERT INTO employee_contracts (employee_id, primary_business_id, status, position, start_date)
SELECT 
  'test-emp-' || generate_series,
  'source-business-id',
  'active',
  'Staff',
  NOW()
FROM generate_series(1, 50);
```

---

### Test 9: Contract Renewal Verification

**Purpose**: Verify HR can process contract renewals after transfer

**Setup**:
1. Complete employee transfer (Test 4)
2. Wait for contract renewals to be created

**Steps**:
1. Navigate to **Employees** → **Contract Renewals**
2. Filter by:
   - Status: "Pending"
   - Type: "Auto Renewal"
3. Verify transferred employees appear
4. Each renewal should show:
   - Employee name
   - Status: 'pending'
   - Due date: ~7 days from transfer
   - Flag: Auto renewal = true
   - Reason: "Business Transfer - [Source] to [Target]"
5. Select a renewal
6. Review details
7. Approve renewal
8. Verify new contract created with updated primary business

**Expected Results**:
- ✅ All transferred employees have pending renewals
- ✅ Due date is 7 days from transfer
- ✅ Auto renewal flag is true
- ✅ Renewal reason references transfer
- ✅ HR can approve renewals
- ✅ New contracts have correct primary business

**SQL Verification**:
```sql
-- Check pending renewals
SELECT 
  cr.id,
  cr.employee_id,
  e.full_name,
  cr.status,
  cr.due_date,
  cr.is_auto_renewal,
  cr.renewal_reason
FROM contract_renewals cr
JOIN employees e ON e.id = cr.employee_id
WHERE cr.status = 'pending'
  AND cr.is_auto_renewal = true
ORDER BY cr.due_date;
```

---

## Troubleshooting

### Issue: "Cannot delete business with active members"
**Solution**: Deactivate all business memberships first
```sql
UPDATE business_memberships 
SET "isActive" = false 
WHERE "businessId" = 'your-business-id';
```

### Issue: "Cannot delete business with active employees"
**Solution**: Transfer employees to another business first (see Test 4 below) or deactivate them:
```sql
UPDATE employees 
SET "isActive" = false 
WHERE "businessId" = 'your-business-id';
```

### Issue: Foreign key constraint violation
**Cause**: Manual database modifications bypassing the deletion service
**Solution**: Always use the UI or API endpoints, which handle dependencies correctly

### Issue: Modal doesn't open
**Check**:
1. Is user a system admin? (Check `isSystemAdmin` in session)
2. Is `canDeleteBusiness` permission true?
3. Browser console for errors

---

## Performance Notes

- **Soft Delete**: Fast (~100-200ms) - only updates one record
- **Hard Delete**: Slower for large businesses (1-5 seconds for typical demo)
  - Depends on volume of related records
  - Uses database transaction for safety
  - Progress indicator shows during deletion

---

## Success Criteria Checklist

### Business Deletion
- ✅ System admin can soft delete (deactivate) any business
- ✅ System admin can hard delete only demo businesses
- ✅ Real businesses cannot be hard deleted
- ✅ Multi-step confirmation prevents accidents
- ✅ Exact name match required at step 2
- ✅ Exact confirmation phrase required at step 3
- ✅ Active members prevent deletion (unless transferred)
- ✅ Active employees prevent deletion (unless transferred)
- ✅ All related data deleted in correct order (no FK violations)
- ✅ Audit logs capture all deletion attempts
- ✅ UI shows deletion impact before proceeding
- ✅ Demo business badge visible in UI
- ✅ Non-admins cannot access deletion feature

### Employee Transfer
- ✅ Transfer modal accessible from deletion modal
- ✅ Only shows compatible businesses (same type, active)
- ✅ Displays all active employees with details
- ✅ Business type validation enforced
- ✅ Transaction-based transfer (atomic)
- ✅ Contract renewals automatically created
- ✅ Due date set to 7 days from transfer
- ✅ Auto renewal flag set
- ✅ Old business assignments deactivated
- ✅ New business assignments created as primary
- ✅ Employee primary business updated
- ✅ Audit log captures transfer details
- ✅ Transfer completes in reasonable time (<10s for 50 employees)
- ✅ Rollback on any error (no partial updates)
- ✅ Clear error messages for common issues
- ✅ Delete button enabled only after transfer complete
- ✅ HR can process contract renewals post-transfer
- ✅ Transaction rollback on errors
- ✅ Success message and redirect after deletion
