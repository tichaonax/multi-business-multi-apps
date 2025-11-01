# Employee Transfer During Business Deletion - Impact Analysis

**Date:** November 1, 2025  
**Feature:** Transfer active employees to new primary business during deletion  
**Status:** Analysis Phase

## Overview

When deleting a business, allow administrators to transfer active employees (where the business is their primary) to a different business of the same type. This transfer should automatically create contract renewal records to update the primary business without changing other contract terms.

## Current System Understanding

### 1. Employee Structure
- **Primary Business Field:** `employees.primaryBusinessId` (String, required)
- **Business Relation:** Direct FK to `businesses.id`
- **Status Field:** `employees.isActive` (Boolean)
- **Key Attributes:**
  - `employeeNumber` (unique)
  - `fullName`
  - `jobTitleId`
  - `compensationTypeId`
  - `hireDate`
  - `employmentStatus`

### 2. Contract Structure
- **Model:** `employee_contracts`
- **Primary Business:** `primaryBusinessId` (String, required, FK to businesses)
- **Key Fields:**
  - `employeeId` (FK to employees)
  - `contractNumber` (unique)
  - `status` (draft, active, expired, terminated)
  - `startDate`, `endDate`
  - `baseSalary`, `compensationTypeId`
  - `jobTitleId`
  - `primaryBusinessId` ← **Must be updated**
  - `umbrellaBusinessId` (optional)
  - `additionalBusinesses` (array)

### 3. Contract Renewal System
- **Model:** `contract_renewals`
- **Purpose:** Track contract renewals and changes
- **Key Fields:**
  - `employeeId`
  - `originalContractId` (FK to employee_contracts)
  - `newContractId` (FK to employee_contracts, nullable until processed)
  - `status` (pending, approved, rejected, processed)
  - `isAutoRenewal` (Boolean)
  - `renewalDueDate` (DateTime, required)
  - `processedAt`, `processedBy`
  - `salaryChange`, `salaryChangeType`
  - `jobTitleChange`
  - `benefitChanges` (JSON)
  - `notes`

### 4. Business Assignments
- **Model:** `employee_business_assignments`
- **Purpose:** Track which businesses an employee works for
- **Key Fields:**
  - `employeeId`, `businessId`
  - `isPrimary` (Boolean) ← Can track primary status
  - `isActive` (Boolean)
  - `role`, `startDate`, `endDate`

## Proposed Feature Flow

### Phase 1: Pre-Deletion Check
1. Fetch all active employees with `primaryBusinessId = deletingBusinessId`
2. Display count and list in deletion modal
3. If active employees exist:
   - Show warning: "X active employees have this as primary business"
   - Offer two options:
     - **Option A:** Cancel deletion
     - **Option B:** Transfer employees to another business

### Phase 2: Business Selection
1. Fetch all active businesses of the **same type** (excluding the one being deleted)
2. Display business selector dropdown/list
3. Show business details: name, type, employee count
4. Require admin to select target business before proceeding

### Phase 3: Transfer Preview
1. Show transfer impact summary:
   - Source business: Name, Type
   - Target business: Name, Type
   - Employees to transfer: Count, Names
   - Contracts to flag for renewal: Count
2. Confirm that:
   - Employee `primaryBusinessId` will change
   - Contract renewal records will be created
   - Existing contract terms remain unchanged
   - Business assignments will be updated

### Phase 4: Execute Transfer (Within Transaction)
1. **For each active employee:**
   ```sql
   -- Step 1: Update employee primary business
   UPDATE employees 
   SET primaryBusinessId = <newBusinessId>, 
       updatedAt = NOW()
   WHERE id = <employeeId>

   -- Step 2: Get employee's active contract
   SELECT * FROM employee_contracts 
   WHERE employeeId = <employeeId> 
     AND status = 'active'
     AND primaryBusinessId = <oldBusinessId>
   ORDER BY startDate DESC 
   LIMIT 1

   -- Step 3: Create contract renewal record
   INSERT INTO contract_renewals (
     id,
     employeeId,
     originalContractId,
     status,
     isAutoRenewal,
     renewalDueDate,
     notes,
     createdAt,
     updatedAt
   ) VALUES (
     <uuid>,
     <employeeId>,
     <activeContractId>,
     'pending',
     true,
     NOW() + INTERVAL '7 days',
     'Auto-generated due to business transfer from [OldBusiness] to [NewBusiness]',
     NOW(),
     NOW()
   )

   -- Step 4: Update or create business assignment
   INSERT INTO employee_business_assignments (
     id,
     employeeId,
     businessId,
     isPrimary,
     isActive,
     startDate,
     role,
     notes,
     createdAt,
     updatedAt
   ) VALUES (
     <uuid>,
     <employeeId>,
     <newBusinessId>,
     true,
     true,
     NOW(),
     'Transferred Employee',
     'Transferred from deleted business: [OldBusinessName]',
     NOW(),
     NOW()
   )
   ON CONFLICT (employeeId, businessId) 
   DO UPDATE SET 
     isPrimary = true,
     isActive = true,
     notes = 'Updated to primary due to business deletion',
     updatedAt = NOW()
   ```

2. **After all transfers complete:**
   - Proceed with normal business deletion
   - Audit log the transfer action

## Data Integrity Considerations

### Foreign Key Constraints
1. **employees.primaryBusinessId → businesses.id**
   - Must exist in businesses table
   - Transfer must happen BEFORE deleting source business

2. **employee_contracts.primaryBusinessId → businesses.id**
   - Existing contracts keep old primaryBusinessId (historical record)
   - Renewal system will create new contracts with new primaryBusinessId

3. **employee_business_assignments**
   - Should have assignment for both old and new business
   - Old business assignment can be marked inactive
   - New business assignment marked as primary

### Transaction Order
Critical sequence within a single database transaction:
```
BEGIN TRANSACTION;
  1. Validate target business exists and is active
  2. Validate target business type matches source business type
  3. For each active employee:
     a. Update employee.primaryBusinessId
     b. Fetch active contract
     c. Create contract_renewal record
     d. Update/create employee_business_assignment
  4. Create audit log entry
  5. Proceed with business deletion (soft or hard)
COMMIT;
```

## Affected Tables

### Primary Updates
1. **employees** - `primaryBusinessId` updated
2. **contract_renewals** - New records created
3. **employee_business_assignments** - Updated or created

### Secondary Impacts
4. **employee_contracts** - Existing contracts unchanged (historical)
5. **audit_logs** - Transfer action logged
6. **businesses** - Source business deleted

## Business Rules

### Transfer Eligibility
- ✅ Employee must be active (`isActive = true`)
- ✅ Employee's `primaryBusinessId` must equal deleting business ID
- ✅ Target business must be same type as source business
- ✅ Target business must be active (`isActive = true`)
- ❌ Cannot transfer if target business doesn't exist
- ❌ Cannot transfer if target business is also being deleted

### Contract Renewal Rules
- **Status:** `pending` (requires HR review)
- **isAutoRenewal:** `true` (system-generated)
- **renewalDueDate:** 7 days from transfer (configurable)
- **Notes:** Clear explanation of business transfer reason
- **Original Contract:** Remains unchanged (historical record)
- **New Contract:** Will be created when renewal is processed

### Business Assignment Rules
- Old business assignment:
  - `isActive = false`
  - `isPrimary = false`
  - `endDate = NOW()`
- New business assignment:
  - `isActive = true`
  - `isPrimary = true`
  - `startDate = NOW()`
  - Created if doesn't exist, updated if exists

## UI/UX Flow

### Deletion Modal Enhancement

**Step 1: Impact Detection**
```
┌──────────────────────────────────────┐
│ Delete Business: Construction Co.    │
├──────────────────────────────────────┤
│ ⚠️  Warning: Active Employees Found  │
│                                       │
│ 3 active employees have this as      │
│ their primary business:               │
│                                       │
│ • John Doe (#EMP001) - Active        │
│ • Jane Smith (#EMP002) - Active      │
│ • Bob Wilson (#EMP003) - Active      │
│                                       │
│ You must decide what to do with      │
│ these employees before deleting.      │
│                                       │
│ [ ] Cancel Deletion                   │
│ [✓] Transfer to Another Business      │
└──────────────────────────────────────┘
```

**Step 2: Business Selection**
```
┌──────────────────────────────────────┐
│ Transfer Employees To:                │
├──────────────────────────────────────┤
│ Select target business (same type):   │
│                                       │
│ ┌────────────────────────────────┐   │
│ │ 🏗️ Building Solutions Inc     │   │
│ │ Type: Construction              │   │
│ │ Current Employees: 12           │   │
│ │ Status: Active                  │   │
│ └────────────────────────────────┘   │
│                                       │
│ ┌────────────────────────────────┐   │
│ │ 🏗️ Elite Construction LLC     │   │
│ │ Type: Construction              │   │
│ │ Current Employees: 8            │   │
│ │ Status: Active                  │   │
│ └────────────────────────────────┘   │
│                                       │
│ [Cancel] [Next: Preview Transfer]    │
└──────────────────────────────────────┘
```

**Step 3: Transfer Confirmation**
```
┌──────────────────────────────────────┐
│ Confirm Employee Transfer             │
├──────────────────────────────────────┤
│ From: Construction Co. (Construction) │
│ To: Building Solutions Inc            │
│                                       │
│ What will happen:                     │
│ ✓ 3 employees will be transferred     │
│ ✓ Primary business will be updated    │
│ ✓ Contract renewals will be created   │
│ ✓ Existing contracts preserved        │
│ ✓ Business assignments updated        │
│                                       │
│ Employees being transferred:          │
│ • John Doe (#EMP001)                  │
│ • Jane Smith (#EMP002)                │
│ • Bob Wilson (#EMP003)                │
│                                       │
│ ⚠️  Contract renewals will be pending │
│ and require HR approval within 7 days.│
│                                       │
│ Type "TRANSFER AND DELETE" to confirm:│
│ ┌────────────────────────────────┐   │
│ │                                 │   │
│ └────────────────────────────────┘   │
│                                       │
│ [Cancel] [Execute Transfer & Delete]  │
└──────────────────────────────────────┘
```

## API Changes

### New Endpoint
```typescript
POST /api/admin/businesses/:businessId/transfer-employees
Body: {
  targetBusinessId: string
  employeeIds: string[]
}
Response: {
  success: boolean
  transferredCount: number
  contractRenewalsCreated: number
  employeeIds: string[]
  message: string
}
```

### Modified Endpoint
```typescript
DELETE /api/admin/businesses/:businessId
Query: {
  hardDelete?: boolean
  transferEmployees?: boolean
  targetBusinessId?: string
}
```

## Implementation Phases

### Phase 1: Backend Service (Priority: HIGH)
- [ ] Create `transferEmployeesToBusiness()` function
- [ ] Implement transaction logic
- [ ] Add validation for business type matching
- [ ] Create contract renewal records
- [ ] Update business assignments
- [ ] Add comprehensive error handling
- [ ] Create audit log entries

### Phase 2: API Integration (Priority: HIGH)
- [ ] Create employee transfer endpoint
- [ ] Modify deletion endpoint to support transfer
- [ ] Add transfer preview endpoint
- [ ] Implement rollback on failure

### Phase 3: UI Enhancement (Priority: MEDIUM)
- [ ] Update deletion modal with employee warning
- [ ] Create business selector component
- [ ] Add transfer preview step
- [ ] Implement transfer confirmation
- [ ] Add loading states and progress indicators

### Phase 4: Testing (Priority: HIGH)
- [ ] Unit tests for transfer logic
- [ ] Integration tests for full flow
- [ ] Test transaction rollback scenarios
- [ ] Test with multiple employees
- [ ] Test business type validation
- [ ] Test concurrent deletion prevention

## Risks & Mitigation

### Risk 1: Partial Transfer Failure
**Problem:** Some employees transfer successfully, others fail  
**Mitigation:** Use database transaction - all or nothing

### Risk 2: Contract Renewal Not Processed
**Problem:** Renewal record created but never processed  
**Mitigation:** 
- Set reminder notifications
- Add dashboard alert for pending renewals
- Auto-escalate after 7 days

### Risk 3: Wrong Business Type Selected
**Problem:** Employee transferred to incompatible business type  
**Mitigation:**
- Validate business types match
- Only show compatible businesses in selector
- Add confirmation warning

### Risk 4: Target Business Deleted Before Renewal
**Problem:** Target business deleted before contract renewal processed  
**Mitigation:**
- Prevent deletion of businesses with pending contract renewals
- Add check in deletion impact analysis

### Risk 5: Payroll Integration Issues
**Problem:** Transferred employees don't appear in new business payroll  
**Mitigation:**
- Update `payroll_entries` if needed
- Trigger payroll sync after transfer
- Document manual steps for payroll team

## Edge Cases

1. **Employee has no active contract**
   - Transfer primary business only
   - No renewal record needed
   - Log warning for HR review

2. **Employee assigned to multiple businesses**
   - Transfer primary designation only
   - Keep other assignments intact
   - Update `isPrimary` flags correctly

3. **Target business in same umbrella**
   - Preserve umbrella relationship
   - May not need full contract renewal
   - Just update primary business

4. **Employee on probation**
   - Transfer as normal
   - Flag renewal as "probation transfer"
   - HR review required

5. **Employee with pending actions**
   - Check for pending leave requests
   - Check for pending loans/deductions
   - Warn admin before transfer

## Success Criteria

- ✅ All active employees successfully transferred
- ✅ Contract renewal records created for all
- ✅ No data integrity violations
- ✅ Transaction completes or fully rolls back
- ✅ Audit trail is complete
- ✅ Business deletion proceeds normally
- ✅ Employees appear in new business immediately
- ✅ Contract renewals visible in pending queue

## Rollout Plan

### Stage 1: Development (Estimated: 3-4 days)
- Implement backend transfer service
- Create API endpoints
- Write comprehensive tests

### Stage 2: UI Development (Estimated: 2-3 days)
- Build transfer flow components
- Integrate with deletion modal
- Add confirmation dialogs

### Stage 3: Testing (Estimated: 2 days)
- QA testing with test data
- UAT with actual business data
- Performance testing with large employee counts

### Stage 4: Documentation (Estimated: 1 day)
- Update user guide
- Create admin training materials
- Document troubleshooting steps

### Stage 5: Deployment (Estimated: 1 day)
- Deploy to staging
- Run smoke tests
- Deploy to production
- Monitor for issues

---

## Conclusion

This feature adds significant value by:
1. **Preventing data loss** - Employees aren't orphaned
2. **Maintaining continuity** - Employment history preserved
3. **Ensuring compliance** - Contract changes documented
4. **Improving UX** - Clear, guided transfer process
5. **Protecting integrity** - Transaction-based safety

The implementation is feasible with the current schema and contract renewal system. The main technical challenge is ensuring atomicity of the multi-step transfer process, which is solved through database transactions.

**Recommendation:** Proceed with implementation following the phased approach outlined above.
