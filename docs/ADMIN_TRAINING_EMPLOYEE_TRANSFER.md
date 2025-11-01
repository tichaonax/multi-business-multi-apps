# Admin Training Guide: Employee Transfer During Business Deletion

## Training Overview

**Target Audience:** System Administrators  
**Training Duration:** 45-60 minutes  
**Delivery Method:** Hands-on with test environment  
**Prerequisites:** System administrator access, basic understanding of business and employee management

---

## Learning Objectives

By the end of this training, administrators will be able to:
1. ✅ Identify when employee transfer is required
2. ✅ Execute employee transfers confidently
3. ✅ Handle common scenarios and edge cases
4. ✅ Troubleshoot transfer issues
5. ✅ Guide HR through contract renewal process
6. ✅ Perform rollback if necessary

---

## Training Agenda

1. **Introduction** (5 min) - Feature overview and business context
2. **Demo** (10 min) - Instructor demonstrates full transfer process
3. **Hands-On Practice** (20 min) - Students perform transfers in test environment
4. **Common Scenarios** (10 min) - Walkthrough of real-world cases
5. **Troubleshooting** (10 min) - Handle errors and edge cases
6. **Q&A** (10 min) - Questions and discussion

---

## Part 1: Introduction (5 minutes)

### Business Context

**Why This Feature Exists:**
- Businesses sometimes need to be closed/deleted
- Employees can't be "orphaned" without a business
- Need clean way to move employees to new business
- Must maintain contract and payroll continuity

**Key Benefits:**
- ✅ Prevents data loss
- ✅ Maintains employee history
- ✅ Ensures contract continuity
- ✅ Provides audit trail
- ✅ Automatic contract renewal flagging

### System Requirements

**Who Can Transfer:**
- System Administrators **ONLY**
- Requires `isSystemAdmin = true`
- Business owners/managers cannot transfer

**When Transfer Required:**
- Business has ≥1 active employees
- Employees have business as primary
- Want to delete the business

**When Transfer Not Needed:**
- Zero employees
- All employees inactive
- Employees belong to other businesses

---

## Part 2: Live Demonstration (10 minutes)

### Instructor Demonstration

**Setup:**
- Test database with sample businesses
- "Store A" (retail) with 3 employees
- "Store B" (retail) as target
- "Restaurant A" (restaurant) - different type

**Demonstration Steps:**

1. **Navigate to Business Management**
   - Show business list
   - Point out employee counts
   - Highlight "Store A" with employees

2. **Initiate Deletion**
   - Click Delete button
   - Show deletion modal
   - Point out employee warning
   - Show disabled Delete button
   - Highlight "Transfer Employees" button

3. **Open Transfer Modal**
   - Click "Transfer Employees"
   - Explain loading state
   - Show 3 employees listed

4. **Select Target Business**
   - Show business cards
   - Point out "Store B" (compatible)
   - Point out "Restaurant A" not shown (different type)
   - Click "Store B"
   - Show blue border selection
   - Click "Continue"

5. **Review Preview**
   - Show employee list
   - Explain contract renewal warning
   - Highlight 7-day due date
   - Review all details

6. **Execute Transfer**
   - Click "Confirm Transfer"
   - Show progress indicator
   - Wait for completion
   - Show success message
   - Point out statistics

7. **Verify Results**
   - Close transfer modal
   - Show 0 employees in deletion modal
   - Show enabled Delete button
   - Navigate to target business
   - Show 3 new employees

8. **Show Contract Renewals**
   - Navigate to Contract Renewals
   - Filter by "Auto Renewal"
   - Show 3 pending renewals
   - Explain HR's next steps

**Key Points to Emphasize:**
- ⚠️ Business type must match
- ⚠️ Transfer is atomic (all or nothing)
- ⚠️ Contract renewals require HR approval
- ⚠️ Cannot undo easily
- ✅ Complete audit trail

---

## Part 3: Hands-On Practice (20 minutes)

### Exercise 1: Basic Transfer (10 minutes)

**Objective:** Perform a simple employee transfer

**Setup:**
- Use test environment
- Business: "Training Store 1" (retail)
- Employees: 2 active employees
- Target: "Training Store 2" (retail)

**Tasks:**
1. Navigate to business management
2. Attempt to delete "Training Store 1"
3. Observe employee warning
4. Open transfer modal
5. Select "Training Store 2"
6. Review preview
7. Execute transfer
8. Verify success
9. Check target business employees
10. View contract renewals

**Success Criteria:**
- [ ] Transfer completes without errors
- [ ] 2 employees now in Training Store 2
- [ ] 2 contract renewals created
- [ ] Delete button now enabled

**Common Mistakes:**
- Clicking wrong target business
- Not reading preview carefully
- Closing modal too quickly
- Forgetting to verify results

---

### Exercise 2: No Compatible Target (5 minutes)

**Objective:** Handle scenario with no compatible businesses

**Setup:**
- Business: "Training Restaurant 1" (restaurant)
- Employees: 1 active employee
- No other restaurants exist

**Tasks:**
1. Attempt to delete "Training Restaurant 1"
2. Click "Transfer Employees"
3. Observe "No compatible businesses found"
4. Read error message
5. Click "Cancel"
6. Create new restaurant business
7. Return to deletion
8. Try transfer again
9. Complete successfully

**Success Criteria:**
- [ ] Recognize error message
- [ ] Create new business correctly
- [ ] Retry transfer successfully

**Learning Points:**
- Must create target business first
- Business type must match exactly
- Alternative: deactivate employees

---

### Exercise 3: Large Transfer (5 minutes)

**Objective:** Transfer many employees efficiently

**Setup:**
- Business: "Training Store 3" (retail)
- Employees: 15 active employees
- Target: "Training Store 4" (retail)

**Tasks:**
1. Delete "Training Store 3"
2. Transfer all 15 employees
3. Note transfer duration
4. Verify all 15 transferred
5. Check 15 renewals created

**Success Criteria:**
- [ ] Transfer completes in <5 seconds
- [ ] All 15 employees transferred
- [ ] No errors or timeouts

**Performance Notes:**
- 1-10 employees: ~2 seconds
- 10-50 employees: ~5 seconds
- 50+ employees: ~10 seconds

---

## Part 4: Common Scenarios (10 minutes)

### Scenario 1: Consolidating Regional Stores

**Business Context:**
- Company closing 3 regional stores
- Consolidating into 1 flagship store
- Need to transfer all employees

**Steps:**
1. Identify all employees across 3 stores
2. Create list for tracking
3. Transfer Store 1 employees → Flagship
4. Transfer Store 2 employees → Flagship
5. Transfer Store 3 employees → Flagship
6. Delete empty stores
7. Notify HR of 3 batches of renewals
8. Monitor renewal processing

**Tips:**
- Transfer one store at a time
- Document each transfer
- Track renewal records
- Communicate with HR frequently
- Verify payroll updates

---

### Scenario 2: Business Type Change

**Business Context:**
- Restaurant converting to retail store
- Employees need to move
- Old entity will be deleted

**Steps:**
1. Create new retail business
2. Set up business details
3. Transfer employees from restaurant to retail
4. **Problem:** Business types don't match!
5. **Solution:** 
   - Create temporary business of same type
   - Transfer to temp business
   - Update temp business type
   - OR: Manually update employee assignments
6. Delete old business

**Lesson:** Business type validation is strict - plan conversions carefully

---

### Scenario 3: Partial Employee Transfer

**Business Context:**
- Moving some employees to new location
- Other employees staying
- Not deleting business

**Current Limitation:**
- Transfer is ALL or NOTHING during deletion
- Cannot select individual employees

**Workaround:**
1. **Option A: Deactivate & Transfer**
   - Deactivate employees who should stay
   - Transfer active employees
   - Reactivate staying employees
   - Reassign to original business

2. **Option B: Manual Process**
   - Don't use deletion transfer
   - Manually update each employee:
     - Change primary business
     - Update business assignments
     - Create contract renewals manually

3. **Option C: Wait for Update**
   - Feature request: individual selection
   - Coming in future version

---

### Scenario 4: Emergency Rollback

**Business Context:**
- Transfer executed by mistake
- Wrong target business selected
- Need to reverse quickly

**Rollback Steps:**
1. **Don't panic** - data is recoverable
2. **Document current state:**
   - How many employees transferred
   - Source and target business IDs
   - Timestamp of transfer
3. **Check audit log:**
   ```sql
   SELECT * FROM audit_log 
   WHERE action = 'EMPLOYEE_TRANSFER'
   ORDER BY created_at DESC LIMIT 1;
   ```
4. **Manual rollback process:**
   ```sql
   -- For each employee
   UPDATE employees 
   SET primary_business_id = '[original-business-id]'
   WHERE id IN ('[emp-id-1]', '[emp-id-2]', ...);
   
   -- Reverse assignments
   UPDATE employee_business_assignments
   SET is_primary = true, is_active = true
   WHERE employee_id = '[emp-id]' 
     AND business_id = '[original-business-id]';
   
   UPDATE employee_business_assignments
   SET is_primary = false, is_active = false
   WHERE employee_id = '[emp-id]'
     AND business_id = '[wrong-target-business-id]';
   
   -- Delete incorrect renewals
   DELETE FROM contract_renewals
   WHERE id IN (
     SELECT id FROM contract_renewals
     WHERE employee_id = '[emp-id]'
       AND is_auto_renewal = true
       AND created_at > NOW() - INTERVAL '1 hour'
   );
   ```
5. **Verify rollback:**
   - Check employee primary business
   - Verify assignments
   - Confirm renewals deleted
6. **Document incident:**
   - What happened
   - How it was fixed
   - Lessons learned
7. **Prevent future issues:**
   - Double-check target selection
   - Use preview screen carefully
   - Consider requiring confirmation

**Prevention:**
- Always review preview before confirming
- Verify target business name carefully
- Ask colleague to verify if uncertain
- Use test environment for practice

---

## Part 5: Troubleshooting (10 minutes)

### Issue 1: Transfer Button Disabled

**Symptoms:**
- "Transfer Employees" button grayed out
- Cannot click button

**Diagnosis:**
```sql
-- Check employee count
SELECT COUNT(*) FROM employees 
WHERE primary_business_id = '[business-id]' 
  AND is_active = true;

-- Check user permissions
SELECT is_system_admin FROM users WHERE id = '[user-id]';
```

**Solutions:**
1. **No active employees** → Proceed with deletion directly
2. **Not system admin** → Log in with admin account
3. **UI bug** → Refresh page
4. **Already transferred** → Check employee list

---

### Issue 2: "No compatible businesses found"

**Symptoms:**
- Transfer modal shows empty list
- Error message about no compatible businesses

**Diagnosis:**
```sql
-- Check for businesses of same type
SELECT id, name, type, is_active 
FROM businesses 
WHERE type = (SELECT type FROM businesses WHERE id = '[source-id]')
  AND id != '[source-id]'
  AND is_active = true;
```

**Solutions:**
1. **No businesses of same type exist:**
   - Create new business
   - Set type to match source
   - Return to transfer
2. **All same-type businesses inactive:**
   - Reactivate a business
   - Or create new business
3. **Source business has null type:**
   - Update source business type
   - Or manually handle transfer

---

### Issue 3: Transfer Fails with Transaction Error

**Symptoms:**
- Transfer starts but fails
- Error: "Failed to transfer employees"
- No employees moved

**Diagnosis:**
```sql
-- Check database connections
SELECT * FROM pg_stat_activity 
WHERE datname = current_database();

-- Check for locks
SELECT * FROM pg_locks 
WHERE NOT granted;

-- Check recent errors
SELECT * FROM audit_log 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

**Solutions:**
1. **Database connection issue:**
   - Wait 1 minute
   - Retry transfer
2. **Lock contention:**
   - Check for other operations on same employees
   - Wait for completion
   - Retry
3. **Data integrity issue:**
   - Check employee records are valid
   - Verify target business exists
   - Check database constraints
4. **Timeout:**
   - For large transfers (50+), increase timeout
   - Or transfer in batches (manually)

---

### Issue 4: Contract Renewals Not Created

**Symptoms:**
- Transfer succeeds
- Employees moved
- But no renewal records

**Diagnosis:**
```sql
-- Check if renewals were created
SELECT * FROM contract_renewals
WHERE employee_id IN ('[emp-id-1]', '[emp-id-2]')
  AND created_at > NOW() - INTERVAL '1 hour';

-- Check employees have active contracts
SELECT e.id, e.full_name, 
       COUNT(ec.id) as contract_count
FROM employees e
LEFT JOIN employee_contracts ec ON ec.employee_id = e.id
WHERE e.id IN ('[emp-id-1]', '[emp-id-2]')
  AND ec.status = 'active'
GROUP BY e.id, e.full_name;
```

**Possible Causes:**
1. **Employees had no active contracts:**
   - This is normal behavior
   - No renewal needed without contract
   - Solution: Create contracts first if needed

2. **Renewal creation failed silently:**
   - Check application logs
   - Check database constraints
   - Manually create renewals:
   ```sql
   INSERT INTO contract_renewals (
     employee_id, contract_id, status, due_date,
     is_auto_renewal, renewal_reason
   )
   SELECT 
     ec.employee_id,
     ec.id,
     'pending',
     NOW() + INTERVAL '7 days',
     true,
     'Business Transfer - Manual Creation'
   FROM employee_contracts ec
   WHERE ec.employee_id IN ('[emp-id-1]', '[emp-id-2]')
     AND ec.status = 'active';
   ```

---

### Issue 5: Employees Appear in Wrong Business

**Symptoms:**
- Transfer succeeded
- But employees in unexpected business
- Or still in old business

**Diagnosis:**
```sql
-- Check employee primary business
SELECT id, full_name, primary_business_id
FROM employees
WHERE id IN ('[emp-id-1]', '[emp-id-2]');

-- Check business assignments
SELECT employee_id, business_id, is_primary, is_active
FROM employee_business_assignments
WHERE employee_id IN ('[emp-id-1]', '[emp-id-2]')
ORDER BY employee_id, is_primary DESC;
```

**Solutions:**
1. **Browser cache:**
   - Clear cache
   - Hard refresh (Ctrl+F5)
   - Relogin

2. **Wrong target selected:**
   - Verify audit log
   - If wrong target, perform rollback
   - Transfer again to correct target

3. **Partial transaction:**
   - Check if transaction fully committed
   - Look for incomplete updates
   - Manual fix or full rollback

---

## Part 6: Q&A and Assessment (10 minutes)

### Knowledge Check Questions

**Question 1:** What permission level is required to transfer employees?
- A) Business Owner
- B) Business Admin
- C) System Administrator ✓
- D) HR Manager

**Question 2:** Can you transfer employees between a retail store and a restaurant?
- A) Yes, any time
- B) Yes, but with approval
- C) No, business types must match ✓
- D) Only if they're in the same umbrella

**Question 3:** What happens to employee contracts during transfer?
- A) Deleted and recreated
- B) Automatically updated
- C) Remain unchanged, renewals created ✓
- D) Archived immediately

**Question 4:** How long does HR have to approve contract renewals?
- A) 24 hours
- B) 3 days
- C) 7 days ✓
- D) 30 days

**Question 5:** Can you undo a transfer easily?
- A) Yes, just click "Undo"
- B) Yes, through settings
- C) No, manual rollback required ✓
- D) No, impossible to undo

### Practical Assessment

**Assessment Task:**
Transfer 5 employees from "Assessment Store A" to "Assessment Store B"

**Criteria:**
- [ ] Navigate to correct location
- [ ] Identify employee count
- [ ] Open transfer modal
- [ ] Select correct target business
- [ ] Review preview carefully
- [ ] Execute transfer successfully
- [ ] Verify results
- [ ] Locate contract renewals
- [ ] Explain next steps to HR

**Pass/Fail:** Must complete all steps correctly

---

## Quick Reference Card

### Transfer Checklist

**Before Transfer:**
- [ ] Verify target business exists (same type)
- [ ] Check employee count
- [ ] Notify HR of upcoming renewals
- [ ] Backup database (if critical)

**During Transfer:**
- [ ] Review employee list
- [ ] Confirm target business
- [ ] Read preview carefully
- [ ] Don't close browser

**After Transfer:**
- [ ] Verify employee count
- [ ] Check target business
- [ ] Confirm renewals created
- [ ] Notify HR

### Common SQL Queries

**Check employee count:**
```sql
SELECT COUNT(*) FROM employees 
WHERE primary_business_id = '[business-id]' AND is_active = true;
```

**Find compatible businesses:**
```sql
SELECT * FROM businesses 
WHERE type = '[type]' AND is_active = true AND id != '[source-id]';
```

**View recent transfers:**
```sql
SELECT * FROM audit_log 
WHERE action = 'EMPLOYEE_TRANSFER' 
ORDER BY created_at DESC LIMIT 5;
```

**Check pending renewals:**
```sql
SELECT * FROM contract_renewals 
WHERE status = 'pending' AND is_auto_renewal = true
ORDER BY due_date;
```

### Emergency Contacts

- **Database Issues:** DBA Team
- **Application Errors:** Dev Team
- **HR Questions:** HR Manager
- **Urgent Support:** System Admin Lead

---

## Additional Resources

### Documentation
- User Guide: `docs/USER_GUIDE_EMPLOYEE_TRANSFER.md`
- API Docs: `docs/API_EMPLOYEE_TRANSFER.md`
- Testing Guide: `EMPLOYEE_TRANSFER_UAT_GUIDE.md`
- Implementation: `EMPLOYEE_TRANSFER_PHASE4_SUMMARY.md`

### Video Tutorials (Future)
- Basic Transfer Walkthrough
- Troubleshooting Common Issues
- Advanced Scenarios
- HR Contract Renewal Processing

### Practice Environment
- URL: `https://test.yourdomain.com`
- Username: `admin@test.com`
- Password: `[Contact IT for password]`
- Note: Reset weekly

---

## Training Completion

**Congratulations!** You've completed the Employee Transfer training.

**Next Steps:**
1. Practice in test environment
2. Review documentation as needed
3. Assist with first real transfer (supervised)
4. Become confident with the process
5. Help train future administrators

**Certification:**
- [ ] Attended full training session
- [ ] Completed hands-on exercises
- [ ] Passed knowledge check (4/5 correct)
- [ ] Completed practical assessment
- [ ] Reviewed all documentation

**Certified By:** ________________  
**Date:** ________________  
**Valid For:** 12 months

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Trainer:** Development Team  
**Contact:** support@yourdomain.com
