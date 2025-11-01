# How to Transfer Employees During Business Deletion

## Overview
When deleting a business that has active employees, you must first transfer those employees to another business of the same type. This guide walks you through the complete process.

**Who Can Do This:** System Administrators Only  
**Time Required:** 5-10 minutes  
**Prerequisites:** Target business of same type must exist

---

## Table of Contents
1. [When Employee Transfer is Required](#when-employee-transfer-is-required)
2. [Step-by-Step Transfer Process](#step-by-step-transfer-process)
3. [After Transfer: Contract Renewals](#after-transfer-contract-renewals)
4. [Completing Business Deletion](#completing-business-deletion)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## When Employee Transfer is Required

Employee transfer is **required** when:
- ✅ Business has one or more active employees
- ✅ Those employees have the business as their primary business
- ✅ You want to delete the business

Employee transfer is **not required** when:
- ❌ Business has no employees
- ❌ All employees are inactive
- ❌ Employees belong to different primary businesses

---

## Step-by-Step Transfer Process

### Step 1: Navigate to Business Management

1. Log in as a system administrator
2. Navigate to **Business** → **Manage Businesses**
3. Find the business you want to delete in the list

**What You'll See:**
- Business name and details
- Employee count (e.g., "5 employees")
- Action buttons (Edit, Delete, View)

---

### Step 2: Initiate Business Deletion

1. Click the **"Delete"** button for the business
2. Business Deletion Modal will open

**What You'll See:**
- Business details (name, type, status)
- Impact analysis showing:
  - Number of active employees
  - ⚠️ Warning: "This business has X active employees"
  - Note: "Employees must be transferred before deletion"
- **"Transfer Employees"** button (blue, prominent)
- **"Delete Business"** button (disabled, red)

> **Important:** The Delete button will remain disabled until you transfer all active employees.

---

### Step 3: Open Transfer Modal

1. Click **"Transfer Employees"** button
2. Employee Transfer Modal will open

**What You'll See:**
- Modal title: "Transfer Employees"
- Business info: "Transferring X employees from [Business Name]"
- Loading spinner (briefly)

---

### Step 4: Select Target Business

**After loading completes:**

1. You'll see a list of compatible target businesses
   - Displayed as cards with:
     - Business name
     - Business type (must match source)
     - Employee count
     - Short name/code

2. Click on the target business card to select it
   - Selected card will have a **blue border**
   - Card will highlight on hover

3. Click **"Continue"** button at bottom

**Compatible Business Rules:**
- ✅ Must be the **same type** as source business (e.g., both "retail")
- ✅ Must be **active**
- ✅ Cannot be the source business itself

**If No Compatible Businesses:**
- You'll see: "No compatible businesses found"
- Message: "Create a new [type] business or deactivate employees first"
- You must either:
  - Create a new business of the same type
  - Deactivate the employees
  - Cancel the deletion

---

### Step 5: Review Transfer Preview

**What You'll See:**

**Transfer Summary Box:**
- Source business name
- Target business name
- Number of employees to transfer
- Icon showing transfer direction (→)

**Employee List:**
- Each employee with:
  - Full name
  - Employee number
  - Current position/job title
  - Contract status
  - Contract details

**Contract Renewal Warning:**
- ⚠️ **Important Notice:**
  - "Contract renewals will be automatically created for all transferred employees"
  - "Due date: 7 days from now"
  - "Status: Pending approval"
  - "HR must approve these renewals to update primary business in contracts"

**Action Buttons:**
- **"Back"** - Return to business selection
- **"Cancel"** - Close modal and cancel transfer
- **"Confirm Transfer"** - Execute the transfer

---

### Step 6: Execute Transfer

1. Review all information carefully
2. Click **"Confirm Transfer"** button

**What Happens:**
- Button changes to "Transferring..." with spinner
- Progress indicator shown
- Transfer executes (usually 1-5 seconds)

**Behind the Scenes:**
The system performs these actions automatically:
1. Updates employee primary business to target
2. Creates new business assignment records
3. Deactivates old business assignments
4. Creates contract renewal records (pending, 7 days)
5. Creates audit log entry
6. All in a single database transaction (all-or-nothing)

---

### Step 7: Transfer Complete

**Success Screen:**
- ✅ Green checkmark icon
- "Transfer Complete!" message
- Summary:
  - "X employees transferred successfully"
  - "Y contract renewals created"
  - "Employees now belong to [Target Business]"

**Action Buttons:**
- **"Close"** - Close transfer modal
- **"View Renewals"** - Jump to contract renewals page (optional)

Click **"Close"** to return to deletion modal.

---

## After Transfer: Contract Renewals

### What Are Contract Renewals?

When employees are transferred, their **contracts are not automatically updated**. Instead:
- Original contracts remain unchanged (for history)
- **New contract renewal records** are created
- Status: **Pending**
- Due Date: **7 days from transfer**
- Flag: **Auto Renewal** (system-generated)
- Reason: "Business Transfer - [Source] to [Target]"

### HR Approval Required

**HR/Admin Must:**
1. Navigate to **Employees** → **Contract Renewals**
2. Filter by **"Auto Renewal"** or **"Pending"**
3. Review each transferred employee:
   - Verify new primary business
   - Confirm all contract terms remain same
   - Update any necessary details
4. **Approve** each renewal
   - This creates the new contract with updated primary business
   - Old contract is archived

**Timeline:**
- Due Date: 7 days from transfer
- HR should process within 3-5 business days
- System sends reminders if approaching due date

### Viewing Contract Renewals

**Option 1: From Transfer Success Screen**
- Click **"View Renewals"** button
- Automatically filtered to transferred employees

**Option 2: From Main Menu**
1. Navigate to **Employees** → **Contract Renewals**
2. Filter by:
   - Status: "Pending"
   - Type: "Auto Renewal"
   - Date Range: Last 7 days
3. You'll see all transferred employee renewals

---

## Completing Business Deletion

### After Successful Transfer

**Back in Deletion Modal:**
- Employee count now shows: **"0 employees"**
- Warning message removed
- **"Delete Business"** button now **ENABLED** (red)

### Final Deletion Steps

1. Read the deletion warning
2. Type the business name **exactly** as shown
3. Click **"Delete Business"** button
4. Business will be deleted
5. Success message appears
6. Redirected to business list

**What Gets Deleted:**
- Business record (marked inactive)
- Business settings
- Business-specific data

**What's Preserved:**
- Transferred employees (now with new business)
- Old contracts (archived)
- Business assignment history
- Audit logs
- Contract renewal records

---

## Troubleshooting

### Issue: "No compatible businesses found"

**Cause:** No other businesses of the same type exist or are active.

**Solutions:**
1. **Create New Business:**
   - Navigate to **Business** → **Create Business**
   - Set type to match source business
   - Complete business creation
   - Return to deletion and try again

2. **Activate Existing Business:**
   - Check if business exists but is inactive
   - Reactivate the business
   - Return to deletion and try again

3. **Deactivate Employees:**
   - If no target business is needed
   - Manually deactivate employees
   - Then delete business without transfer

---

### Issue: Transfer button disabled

**Causes & Solutions:**

1. **No employees to transfer**
   - All employees already inactive
   - Solution: Proceed directly with deletion

2. **Already transferred**
   - Employees already moved
   - Solution: Refresh page and check employee count

3. **Permission issue**
   - Not logged in as system admin
   - Solution: Log in with admin account

---

### Issue: "Business types do not match"

**Cause:** Selected a target business of different type than source.

**Example:**
- Source: "retail"
- Target: "restaurant" ❌

**Solution:**
- Go back and select a business with matching type
- Only businesses with same type will appear in selection

---

### Issue: Transfer fails with error

**Common Errors:**

1. **"Transfer failed: Transaction error"**
   - Cause: Database issue
   - Solution: 
     - Wait 1 minute and try again
     - Check database connection
     - Contact support if persists

2. **"Employee not found"**
   - Cause: Employee deleted during transfer
   - Solution:
     - Refresh page
     - Check employee list
     - Try transfer again

3. **"Target business no longer active"**
   - Cause: Target business was deactivated
   - Solution:
     - Select different target
     - Reactivate original target

---

### Issue: Modal closes unexpectedly

**Solutions:**
1. **Check browser console** for JavaScript errors
2. **Clear browser cache** and reload
3. **Try different browser** (Chrome, Firefox, Edge)
4. **Check internet connection**
5. **Contact support** if issue persists

**Known Issues:**
- First click may not work (React StrictMode)
  - Solution: Click button again
- Modal may appear behind other modals
  - Solution: Close all other modals first

---

### Issue: Dark mode visibility problems

**If text is hard to read:**
1. Check browser dark mode settings
2. Try switching to light mode
3. Report issue to development team

**Workaround:**
- Use light mode for transfer operations
- Dark mode support being improved

---

## FAQ

### Q: Can I transfer some employees and not others?

**A:** Currently, the transfer process moves **all active employees**. Partial selection is not yet available.

**Workaround:**
1. Deactivate employees you don't want to transfer
2. Transfer remaining active employees
3. Reactivate other employees if needed

---

### Q: What happens to employee contracts?

**A:** 
- **Original contracts remain unchanged** (preserved for history)
- **Contract renewals are created** (pending approval)
- **HR must approve renewals** to generate new contracts
- **New contracts will have updated primary business**
- **All other terms remain the same** (salary, position, dates)

---

### Q: Can I undo a transfer?

**A:** **Yes, but manually:**
1. Navigate to employee details
2. Change primary business back to original
3. Update business assignments
4. Delete the contract renewal records
5. Recommended: Contact support for assistance

**Better Approach:**
- Review carefully before confirming transfer
- Use preview screen to verify
- Cancel if not sure

---

### Q: How long does transfer take?

**A:**
- **Small transfer (1-10 employees):** 1-2 seconds
- **Medium transfer (10-50 employees):** 2-5 seconds
- **Large transfer (50+ employees):** 5-10 seconds

**If takes longer:**
- Check network connection
- Wait for completion (don't close browser)
- If >30 seconds, refresh and check if completed

---

### Q: What if target business is deleted before renewals are processed?

**A:** 
- Contract renewals remain valid
- HR can still process them
- System will show warning if target business inactive
- **Recommendation:** Process renewals within 7 days

---

### Q: Can non-admin users transfer employees?

**A:** **No.** Employee transfer requires:
- System administrator role
- `isSystemAdmin = true` in user account
- Special permissions (not business owner/admin)

**Reason:** Transfer affects multiple businesses and contracts.

---

### Q: Will payroll be affected?

**A:**
- **Transferred employees** automatically appear in target business payroll
- **Payroll periods** are preserved
- **Payroll history** remains with source business
- **New payroll entries** go to target business
- **Recommendation:** Notify payroll team of transfer

---

### Q: What about pending leave requests?

**A:**
- Leave requests **remain active**
- Approvals **transfer to new business managers**
- Leave balances **are preserved**
- Historical leave **stays in records**

---

### Q: Can I see transfer history?

**A:** **Yes:**

**Method 1: Audit Logs**
1. Navigate to **Admin** → **Audit Logs**
2. Filter by action: "EMPLOYEE_TRANSFER"
3. View details: source, target, employees, date

**Method 2: Employee History**
1. Navigate to employee detail page
2. View **Business Assignments** section
3. See historical assignments with dates

**Method 3: SQL Query**
```sql
SELECT * FROM audit_log 
WHERE action = 'EMPLOYEE_TRANSFER'
ORDER BY created_at DESC;
```

---

## Best Practices

### Before Transfer

1. ✅ **Verify target business exists** and is active
2. ✅ **Notify HR team** of upcoming transfer
3. ✅ **Check employee contracts** are up to date
4. ✅ **Backup database** (if deleting critical business)
5. ✅ **Document reason** for business deletion

### During Transfer

1. ✅ **Review preview carefully** before confirming
2. ✅ **Don't close browser** during transfer
3. ✅ **Wait for completion** message
4. ✅ **Verify success** before closing modal
5. ✅ **Take screenshot** of success message (optional)

### After Transfer

1. ✅ **Notify HR** to process renewals
2. ✅ **Verify employees** appear in target business
3. ✅ **Check contract renewals** were created
4. ✅ **Monitor for issues** over next 24 hours
5. ✅ **Complete business deletion** if satisfied

---

## Related Documentation

- **Testing Guide:** `EMPLOYEE_TRANSFER_UAT_GUIDE.md`
- **API Documentation:** `docs/API_EMPLOYEE_TRANSFER.md`
- **Implementation Details:** `EMPLOYEE_TRANSFER_PHASE4_SUMMARY.md`
- **Business Deletion Guide:** `BUSINESS_DELETION_TESTING_GUIDE.md`

---

## Support

**Need Help?**
- Check **Troubleshooting** section above
- Review **FAQ** for common questions
- Contact system administrator
- Email support team

**Report Issues:**
- Describe the issue
- Include screenshots
- Note the exact error message
- Provide business and employee IDs

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Maintained By:** Development Team
