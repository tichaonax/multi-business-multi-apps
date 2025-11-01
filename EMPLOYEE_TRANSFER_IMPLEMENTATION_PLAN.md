# Employee Transfer Feature - Implementation Plan

**Feature:** Transfer employees to new primary business during deletion  
**Start Date:** November 1, 2025  
**Status:** 🚧 In Progress

---

## 📋 Implementation Checklist

### Phase 1: Backend Infrastructure
**Estimated Time:** 3-4 days | **Status:** Not Started

#### 1.1 Employee Transfer Service
- [ ] Create `src/lib/employee-transfer-service.ts`
- [ ] Implement `getTransferableEmployees(businessId)` function
  - [ ] Fetch active employees with primaryBusinessId = businessId
  - [ ] Include employee details: name, number, job title, contract info
  - [ ] Return structured employee data with contract status
- [ ] Implement `getCompatibleTargetBusinesses(businessId)` function
  - [ ] Fetch active businesses of same type
  - [ ] Exclude the source business being deleted
  - [ ] Return business list with employee counts
- [ ] Implement `validateTransfer(sourceBusinessId, targetBusinessId, employeeIds)` function
  - [ ] Validate target business exists and is active
  - [ ] Validate business types match
  - [ ] Validate all employees exist and are active
  - [ ] Validate employees' primaryBusinessId matches source
  - [ ] Return validation result with detailed errors
- [ ] Implement `transferEmployeesToBusiness(sourceBusinessId, targetBusinessId, employeeIds, userId)` function
  - [ ] Use Prisma transaction for atomicity
  - [ ] For each employee:
    - [ ] Update employee.primaryBusinessId
    - [ ] Fetch active contract
    - [ ] Create contract_renewal record (status: pending, isAutoRenewal: true)
    - [ ] Update/create employee_business_assignment
    - [ ] Mark old business assignment as inactive
  - [ ] Create audit log entry
  - [ ] Return transfer result with counts and details
- [ ] Add comprehensive error handling
  - [ ] Handle transaction rollback
  - [ ] Log detailed errors
  - [ ] Return user-friendly error messages
- [ ] Add TypeScript interfaces for all return types

#### 1.2 API Endpoints
- [ ] Create `src/app/api/admin/businesses/[id]/transferable-employees/route.ts`
  - [ ] GET endpoint to fetch transferable employees
  - [ ] Auth check: system admin only
  - [ ] Return employee list with contract details
- [ ] Create `src/app/api/admin/businesses/[id]/compatible-targets/route.ts`
  - [ ] GET endpoint to fetch compatible target businesses
  - [ ] Auth check: system admin only
  - [ ] Filter by business type
  - [ ] Return business list with metadata
- [ ] Create `src/app/api/admin/businesses/[id]/transfer-preview/route.ts`
  - [ ] POST endpoint to preview transfer impact
  - [ ] Accept: targetBusinessId, employeeIds
  - [ ] Return: validation results, impact summary
- [ ] Create `src/app/api/admin/businesses/[id]/transfer-employees/route.ts`
  - [ ] POST endpoint to execute transfer
  - [ ] Accept: targetBusinessId, employeeIds
  - [ ] Call transferEmployeesToBusiness service
  - [ ] Return: success status, transferred counts
- [ ] Update `src/app/api/admin/businesses/[id]/route.ts` DELETE endpoint
  - [ ] Add check for active employees before deletion
  - [ ] Return error if employees exist without transfer
  - [ ] Support optional transfer execution before deletion

#### 1.3 Database Schema Review
- [ ] Review `employees` table - primaryBusinessId field
- [ ] Review `employee_contracts` table - primaryBusinessId field
- [ ] Review `contract_renewals` table - all required fields
- [ ] Review `employee_business_assignments` table - isPrimary field
- [ ] Confirm foreign key constraints
- [ ] Test cascade behavior

#### 1.4 Unit Tests
- [ ] Test `getTransferableEmployees()` - various scenarios
- [ ] Test `getCompatibleTargetBusinesses()` - filtering logic
- [ ] Test `validateTransfer()` - all validation cases
- [ ] Test `transferEmployeesToBusiness()` - success case
- [ ] Test transaction rollback on partial failure
- [ ] Test with no employees to transfer
- [ ] Test with inactive employees (should skip)
- [ ] Test with mismatched business types
- [ ] Test with non-existent target business
- [ ] Test audit log creation

---

### Phase 2: UI Components
**Estimated Time:** 2-3 days | **Status:** Not Started

#### 2.1 Business Selector Component
- [ ] Create `src/components/business/business-selector.tsx`
- [ ] Props interface: businesses, onSelect, selectedId
- [ ] Display business cards with:
  - [ ] Business name and type
  - [ ] Employee count
  - [ ] Active status
  - [ ] Selection indicator
- [ ] Responsive grid layout
- [ ] Empty state when no compatible businesses
- [ ] Loading state
- [ ] Error state

#### 2.2 Employee Transfer Preview Component
- [ ] Create `src/components/business/employee-transfer-preview.tsx`
- [ ] Props: sourceBusinessId, targetBusinessId, employees
- [ ] Display sections:
  - [ ] Source business info
  - [ ] Target business info
  - [ ] Employee list with details
  - [ ] Impact summary (contract renewals, assignments)
  - [ ] Warning messages
- [ ] Styled with appropriate colors/icons
- [ ] Scrollable employee list

#### 2.3 Employee Transfer Modal
- [ ] Create `src/components/business/employee-transfer-modal.tsx`
- [ ] Multi-step flow:
  - [ ] Step 1: Show employee list, choose transfer or cancel
  - [ ] Step 2: Select target business
  - [ ] Step 3: Preview transfer impact
  - [ ] Step 4: Confirm with typed phrase
  - [ ] Step 5: Executing/Complete
- [ ] State management for steps
- [ ] Loading states between API calls
- [ ] Error handling and display
- [ ] Progress indicators
- [ ] Cancel at any step (before execution)

#### 2.4 Update Business Deletion Modal
- [ ] Update `src/components/business/business-deletion-modal.tsx`
- [ ] Add employee check in getDeletionImpact
- [ ] If activeEmployees > 0:
  - [ ] Show employee warning section
  - [ ] Disable deletion unless transfer selected
  - [ ] Add "Transfer Employees First" button
  - [ ] Launch employee transfer modal
- [ ] After transfer completes:
  - [ ] Refresh deletion impact
  - [ ] Allow deletion to proceed
- [ ] Update UI to show transfer option
- [ ] Add employee details section (already done)

#### 2.5 Update Manage Page
- [ ] Update `src/app/business/manage/page.tsx`
- [ ] Import EmployeeTransferModal
- [ ] Add state for showTransferModal
- [ ] Add transfer completion handler
- [ ] Integrate with deletion flow
- [ ] Show success message after transfer

---

### Phase 3: Integration & Flow
**Estimated Time:** 1-2 days | **Status:** Not Started

#### 3.1 Deletion Flow Integration
- [ ] Update deletion service to check for employees
- [ ] Block deletion if active employees exist without transfer
- [ ] Support transfer-then-delete flow
- [ ] Ensure proper transaction ordering
- [ ] Add audit logging for combined operations

#### 3.2 Contract Renewal Integration
- [ ] Verify renewal records appear in contract renewal list
- [ ] Test renewal processing workflow
- [ ] Ensure HR can process transferred employee renewals
- [ ] Add filters to show "transfer renewals"
- [ ] Document renewal approval process

#### 3.3 Employee Management Integration
- [ ] Verify employees appear in new business employee list
- [ ] Test employee detail page shows correct primary business
- [ ] Verify business assignments are correct
- [ ] Test employee contract history shows transfer note

#### 3.4 Payroll Integration Check
- [ ] Verify transferred employees appear in target business payroll
- [ ] Test payroll period assignments
- [ ] Check payroll export includes transferred employees
- [ ] Document any manual payroll steps required

---

### Phase 4: Testing
**Estimated Time:** 2 days | **Status:** Not Started

#### 4.1 Unit Testing
- [ ] Employee transfer service tests (10+ test cases)
- [ ] API endpoint tests (authentication, validation, errors)
- [ ] Component rendering tests
- [ ] State management tests

#### 4.2 Integration Testing
- [ ] Full transfer flow: start to finish
- [ ] Transfer + deletion combined flow
- [ ] Multiple employees transfer
- [ ] Single employee transfer
- [ ] Transfer with no active contracts
- [ ] Transfer with multiple business assignments
- [ ] Concurrent transfer attempts (locking)

#### 4.3 Edge Case Testing
- [ ] Employee with no active contract
- [ ] Employee assigned to multiple businesses
- [ ] Employee on probation
- [ ] Employee with pending leave requests
- [ ] Target business in same umbrella
- [ ] All employees inactive (none to transfer)
- [ ] Target business deleted before renewal processed
- [ ] Transfer fails mid-transaction (rollback test)

#### 4.4 Business Logic Testing
- [ ] Business type validation (reject mismatches)
- [ ] Active status validation
- [ ] Permission checks (admin only)
- [ ] Audit log verification
- [ ] Contract renewal record creation
- [ ] Business assignment updates
- [ ] Primary flag updates

#### 4.5 UI/UX Testing
- [ ] Modal navigation (all steps)
- [ ] Loading states display correctly
- [ ] Error messages are clear
- [ ] Confirmation requires exact phrase
- [ ] Cancel works at all steps
- [ ] Success state shows correct info
- [ ] Responsive design on mobile
- [ ] Dark mode compatibility

#### 4.6 Performance Testing
- [ ] Transfer 50+ employees
- [ ] Transfer 100+ employees
- [ ] Large business list selection
- [ ] Concurrent deletions
- [ ] Database query optimization

---

### Phase 5: Documentation
**Estimated Time:** 1 day | **Status:** Not Started

#### 5.1 Technical Documentation
- [ ] Update API documentation with new endpoints
- [ ] Document employee transfer service functions
- [ ] Add code comments and JSDoc
- [ ] Document transaction flow diagram
- [ ] Add database schema notes

#### 5.2 User Documentation
- [ ] Create "How to Transfer Employees" guide
- [ ] Document business deletion with employees
- [ ] Add screenshots of transfer flow
- [ ] Create troubleshooting section
- [ ] Document contract renewal approval process

#### 5.3 Admin Training Materials
- [ ] Create admin training guide
- [ ] Document common scenarios
- [ ] Add FAQ section
- [ ] Create video walkthrough (optional)
- [ ] Document rollback procedures

#### 5.4 Testing Guide
- [ ] Update `BUSINESS_DELETION_TESTING_GUIDE.md`
- [ ] Add employee transfer test scenarios
- [ ] Document verification steps
- [ ] Add SQL queries for validation
- [ ] Include rollback testing

---

### Phase 6: Deployment
**Estimated Time:** 1 day | **Status:** Not Started

#### 6.1 Pre-Deployment
- [ ] Code review completion
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Staging environment ready
- [ ] Database backup plan confirmed

#### 6.2 Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Test with production-like data
- [ ] UAT with stakeholders
- [ ] Performance verification
- [ ] Fix any issues found

#### 6.3 Production Deployment
- [ ] Create deployment checklist
- [ ] Schedule maintenance window (if needed)
- [ ] Deploy database migrations (none needed)
- [ ] Deploy application code
- [ ] Run post-deployment tests
- [ ] Monitor error logs
- [ ] Monitor performance metrics

#### 6.4 Post-Deployment
- [ ] Verify feature works in production
- [ ] Monitor audit logs
- [ ] Check for errors in logs
- [ ] Gather user feedback
- [ ] Document any issues
- [ ] Create hotfix plan if needed

---

## 🎯 Success Criteria

### Technical Success
- ✅ All unit tests passing (>90% coverage)
- ✅ All integration tests passing
- ✅ No data integrity violations
- ✅ Transaction rollback works correctly
- ✅ Audit trail is complete and accurate
- ✅ Performance is acceptable (<2s for 50 employees)

### Business Success
- ✅ Employees transferred without data loss
- ✅ Contract renewals created correctly
- ✅ HR can process renewals normally
- ✅ Business deletion proceeds smoothly
- ✅ No manual intervention required
- ✅ Clear audit trail for compliance

### User Experience Success
- ✅ Transfer flow is intuitive and clear
- ✅ Error messages are helpful
- ✅ Loading states prevent confusion
- ✅ Confirmation prevents accidents
- ✅ Success feedback is clear
- ✅ Process completes in reasonable time

---

## 📊 Progress Tracking

### Overall Progress: 0/6 Phases Complete

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| Phase 1: Backend Infrastructure | 39 | 0 | ░░░░░░░░░░ 0% |
| Phase 2: UI Components | 29 | 0 | ░░░░░░░░░░ 0% |
| Phase 3: Integration & Flow | 13 | 0 | ░░░░░░░░░░ 0% |
| Phase 4: Testing | 32 | 0 | ░░░░░░░░░░ 0% |
| Phase 5: Documentation | 14 | 0 | ░░░░░░░░░░ 0% |
| Phase 6: Deployment | 17 | 0 | ░░░░░░░░░░ 0% |
| **TOTAL** | **144** | **0** | ░░░░░░░░░░ **0%** |

---

## 🚀 Next Steps

1. **Start with Phase 1.1** - Create employee transfer service
2. **Build incrementally** - Test each function before moving on
3. **Commit frequently** - Small, focused commits with clear messages
4. **Test as you go** - Don't wait until the end
5. **Update this checklist** - Mark tasks complete as we finish them

---

## 📝 Notes

- All API endpoints require system admin authentication
- Transactions ensure atomicity - all or nothing
- Contract renewals will be pending and require HR approval
- Existing contracts remain unchanged (historical records)
- Business type matching is strict requirement
- Audit logs track all transfer actions

---

**Last Updated:** November 1, 2025  
**Current Phase:** Phase 1 - Backend Infrastructure  
**Next Task:** Create employee-transfer-service.ts
