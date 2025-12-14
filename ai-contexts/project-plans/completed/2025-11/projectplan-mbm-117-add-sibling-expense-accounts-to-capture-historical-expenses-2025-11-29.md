# Project Plan: MBM-117 Add Sibling Expense Accounts to Capture Historical Expenses

**Ticket:** MBM-117  
**Feature:** Add sibling expense accounts to capture historical expenses  
**Date:** 2025-11-29  
**Status:** Approved and Locked (2025-11-29)  

## Current Progress

### ✅ Phase 1: Database Schema & Core Types - COMPLETE
All database schema changes, TypeScript types, permissions, and utility functions have been successfully implemented and tested.

### ✅ Phase 2: API Development - COMPLETE
All API endpoints for sibling account management have been created with proper permission checks, validation, and transaction safety.

### ✅ Phase 3: UI Components - COMPLETE
All UI components for sibling account management have been successfully implemented and tested.

### ✅ Phase 4: Permission Integration - COMPLETE
All permission integration for sibling accounts has been successfully implemented and tested.

### ✅ Phase 5: Testing & Validation - COMPLETE
All testing and validation of sibling account functionality has been completed successfully.

### ✅ Phase 6: Documentation & Deployment - COMPLETE
Sibling expense accounts project is now complete and ready for production deployment.

## Files Affected

### Database Schema Changes
- `prisma/schema.prisma` - Add sibling relationship fields to ExpenseAccounts model
- `prisma/migrations/` - New migration file for schema changes

### API Endpoints (New/Modified)
- `src/app/api/expense-account/` - Add sibling account creation endpoint
- `src/app/api/expense-account/[accountId]/sibling/` - New sibling management endpoints
- `src/app/api/expense-account/[accountId]/merge/` - New merge endpoint
- `src/app/api/expense-account/[accountId]/payments/` - Modify to support historical dates

### Type Definitions
- `src/types/expense-account.ts` - Add sibling account types and merge types
- `src/types/permissions.ts` - Add new sibling account permissions

### UI Components (New/Modified)
- `src/components/expense-account/create-sibling-modal.tsx` - New component
- `src/components/expense-account/account-list.tsx` - Modify to show sibling relationships
- `src/components/expense-account/payment-form.tsx` - Add date picker and sibling indicators
- `src/components/expense-account/merge-account-modal.tsx` - New component
- `src/components/expense-account/sibling-account-indicator.tsx` - New component

### Utility Functions
- `src/lib/expense-account-utils.ts` - Add sibling account utilities
- `src/lib/permissions.ts` - Add sibling permission checks

### Permission Management
- Update permission templates to include new sibling permissions
- Update permission UI components to show new permissions

## Impact Analysis

### Database Impact
- **New Fields:** `parentAccountId`, `siblingNumber`, `isSibling`, `canMerge`
- **New Indexes:** For efficient sibling account queries
- **Migration Required:** All schema changes must use Prisma migrations (no db push)
- **Production Safety:** Migration-based changes ensure safe production deployment
- **Data Migration:** Existing accounts remain unchanged

### API Impact
- **New Endpoints:** 4 new API routes for sibling management
- **Modified Endpoints:** Payment creation with historical dates
- **Permission Checks:** Admin users bypass all permission checks
- **Backward Compatibility:** All existing APIs remain functional

### UI Impact
- **New Modals:** Sibling creation and merge confirmation
- **Modified Components:** Account list, payment forms
- **Custom Hooks:** Use `useAlert()` and `useConfirm()` instead of browser dialogs
- **Date Handling:** Global settings-compliant date formatting and input
- **Visual Changes:** Color coding for sibling accounts

### Permission Impact
- **New Permissions:** 3 new granular permissions
- **Existing Permissions:** Unchanged, additive only

## To-Do Checklist

### Phase 1: Database Schema & Core Types
- [x] **1.1** Update ExpenseAccounts model with sibling fields (`parentAccountId`, `siblingNumber`, `isSibling`, `canMerge`)
- [x] **1.2** Create Prisma migration for schema changes (production-safe, no db push)
- [x] **1.3** Test migration on development database
- [x] **1.4** Update TypeScript types for sibling accounts
- [x] **1.5** Add sibling account permissions to permission types (admin bypass logic)
- [x] **1.6** Create utility functions for sibling account operations

### Phase 2: API Development - COMPLETE
- [x] **2.1** Create sibling account creation API endpoint (`POST /api/expense-account/[accountId]/sibling`)
- [x] **2.2** Create sibling account listing API endpoint (`GET /api/expense-account/[accountId]/sibling`)
- [x] **2.3** Modify payment creation to support historical dates with global formatting
- [x] **2.4** Create account merge API endpoint with validation (`POST /api/expense-account/[accountId]/merge`)
- [x] **2.5** Add permission checks for all sibling operations (admin bypass)
- [x] **2.6** Implement transaction rollback capability for failed merges

### Phase 3: UI Components - COMPLETE
- [x] **3.1** Create sibling account creation modal (use `useConfirm` hook)
- [x] **3.2** Modify account list to show sibling relationships and visual indicators
- [x] **3.3** Add `DateInput` component to payment forms with global date format compliance
- [x] **3.4** Create merge confirmation modal with multi-step confirmations (`useConfirm` hook)
- [x] **3.5** Add visual indicators for sibling accounts (color coding, badges)
- [x] **3.6** Implement success messages using toast notifications (`useAlert` hook)

### Phase 4: Permission Integration
- [x] **4.1** Update permission templates with sibling permissions (admin bypass)
- [x] **4.2** Update permission UI to display new permissions (admin always has access)
- [x] **4.3** Add permission checks to UI components with admin bypass logic
- [x] **4.4** Test permission enforcement across different user roles (including admin)

### ✅ Phase 5: Testing & Validation - COMPLETE
- [x] **5.1** Unit tests for sibling account utilities
- [x] **5.2** Integration tests for sibling account APIs
- [x] **5.3** E2E tests for sibling creation and merge workflow
- [x] **5.4** Permission testing for all new features
- [x] **5.5** UI testing for date picker and visual indicators

### ✅ Phase 6: Documentation & Deployment - COMPLETE
- [x] **6.1** Update user documentation for sibling accounts
- [x] **6.2** Add API documentation for new endpoints
- [x] **6.3** Create deployment checklist
- [x] **6.4** Test data migration on staging environment

## Risk Assessment

### High Risk
- **Data Loss During Merge:** Irreversible merge operation could cause data loss
  - **Mitigation:** Multi-step confirmation process, zero-balance validation, transaction rollback capability
- **Migration Failures:** Production database migration could fail
  - **Mitigation:** Comprehensive testing on staging, backup validation, rollback migration scripts

### Medium Risk
- **Historical Date Conflicts:** Payments with past dates could affect reporting
  - **Mitigation:** Date validation, chronological ordering, audit trail
- **UI Confusion:** Sibling accounts might confuse users
  - **Mitigation:** Clear visual indicators, contextual help, progressive disclosure
- **Global Date Format Compliance:** Date handling must follow app global settings
  - **Mitigation:** Use existing DateInput component, comprehensive testing

### Low Risk
- **Performance Impact:** Additional database queries for sibling relationships
  - **Mitigation:** Proper indexing, query optimization, caching where appropriate
- **Admin Permission Bypass:** Admin users have access to all functionality
  - **Mitigation:** Clear documentation, admin role validation, audit logging

## Testing Plan

### Unit Tests
- Sibling account creation logic
- Merge validation (zero balance check)
- Permission enforcement
- Date handling utilities

### Integration Tests
- Full sibling account workflow (create → populate → merge)
- API endpoint functionality
- Database relationship integrity

### E2E Tests
- User journey: Create sibling → Enter historical data → Merge
- Permission validation across different user roles
- Error handling and edge cases

### Manual Testing Checklist
- [ ] Sibling account creation with proper naming convention
- [ ] Historical date entry with date picker
- [ ] Visual indicators for sibling accounts
- [ ] Merge workflow with confirmations
- [ ] Permission enforcement
- [ ] Data integrity after merge
- [ ] Rollback scenarios

## Rollback Plan

### Database Rollback
1. **Migration Reversal:** `prisma migrate reset` to clean state (development only)
2. **Production Rollback:** Create and run down migration to remove sibling fields
3. **Data Backup:** Restore from pre-migration backup taken before deployment
4. **Schema Cleanup:** Remove sibling-related fields and indexes if needed

### Code Rollback
1. **Git Revert:** Revert all commits related to sibling accounts
2. **Feature Flags:** Add feature flags to disable sibling functionality
3. **Gradual Rollback:** Remove UI components first, then APIs, then database

### Data Recovery
1. **Transaction Logs:** Use database transaction logs for recovery
2. **Backup Restore:** Restore from backup taken before merge operations
3. **Manual Reconstruction:** Reconstruct data from audit logs if needed

## Review Summary

*To be completed after implementation*

### What Was Accomplished
- 

### Challenges Encountered
- 

### Lessons Learned
- 

### Recommendations for Future Work
- 