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

### Test 1: Soft Delete (Deactivate) a Real Business

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

## Troubleshooting

### Issue: "Cannot delete business with active members"
**Solution**: Deactivate all business memberships first
```sql
UPDATE business_memberships 
SET "isActive" = false 
WHERE "businessId" = 'your-business-id';
```

### Issue: "Cannot delete business with active employees"
**Solution**: Deactivate all employees first
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

- ✅ System admin can soft delete (deactivate) any business
- ✅ System admin can hard delete only demo businesses
- ✅ Real businesses cannot be hard deleted
- ✅ Multi-step confirmation prevents accidents
- ✅ Exact name match required at step 2
- ✅ Exact confirmation phrase required at step 3
- ✅ Active members/employees prevent deletion
- ✅ All related data deleted in correct order (no FK violations)
- ✅ Audit logs capture all deletion attempts
- ✅ UI shows deletion impact before proceeding
- ✅ Demo business badge visible in UI
- ✅ Non-admins cannot access deletion feature
- ✅ Transaction rollback on errors
- ✅ Success message and redirect after deletion
