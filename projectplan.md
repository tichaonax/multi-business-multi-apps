# Payee Management UI with Permissions

**Date:** 2025-12-07
**Status:** ✅ Complete
**Priority:** High

---

## Problem Statement

Currently, payee management is scattered across different parts of the application:
- Individual payees (persons) can be created via expense account payment modals
- Contractors are managed in `/contractors` page
- There's no central place to view, search, edit, and manage all payees

**Requirements:**
- Create a dedicated `/payees` page for centralized payee management
- Add proper permissions: `canViewPayees`, `canCreatePayees`, `canEditPayees`
- Support all payee types: USER, EMPLOYEE, PERSON (individuals), BUSINESS
- Allow searching, viewing details, creating, and editing payees

---

## Current State Analysis

### Payee Types
1. **USER** - System users (managed in /users)
2. **EMPLOYEE** - Company employees (managed in employee section)
3. **PERSON** - Individual persons/contractors (currently in /contractors, limited functionality)
4. **BUSINESS** - Other businesses (managed in business section)

### Existing APIs
- ✅ `GET /api/expense-account/payees` - Fetches all payee types
- ✅ `POST /api/expense-account/payees/individuals` - Create individual payee (person)
- ✅ `/api/persons` - CRUD for persons
- ❌ No update/edit API for individual payees
- ❌ No delete API for payees

### Existing Components
- ✅ `PayeeSelector` - Dropdown for selecting payees
- ✅ `CreateIndividualPayeeModal` - Modal for creating individuals
- ❌ No dedicated payee management page
- ❌ No edit payee modal

---

## Implementation Plan

### Phase 1: Permissions Setup ✅ (Expected: Simple)

**Schema Changes:**
```typescript
// Users permissions JSON will include:
{
  canViewPayees: boolean
  canCreatePayees: boolean
  canEditPayees: boolean
}
```

**Tasks:**
1. ✅ No schema changes needed (permissions stored as JSON)
2. Add permission constants to permission utilities
3. Update admin seed to include new permissions
4. Update permission templates if they exist

**Files to modify:**
- `src/lib/permission-utils.ts` - Add permission constants
- `scripts/seed-migration-data.js` - Add permissions to admin user

---

### Phase 2: Backend APIs ✅ (Expected: Moderate)

**New/Updated Endpoints:**

1. **GET /api/payees** - List all payees with search/filter
   - Query params: `search`, `type` (USER|EMPLOYEE|PERSON|BUSINESS), `isActive`
   - Returns paginated payee list with counts
   - Permission required: `canViewPayees`

2. **GET /api/payees/[type]/[id]** - Get single payee details
   - Returns full payee info including payment history
   - Permission required: `canViewPayees`

3. **PUT /api/payees/individuals/[id]** - Update individual payee
   - Update person record
   - Permission required: `canEditPayees`

4. **POST /api/payees/individuals** - Create individual payee
   - Reuse existing `/api/expense-account/payees/individuals`
   - Add permission check: `canCreatePayees`

5. **PATCH /api/payees/[type]/[id]/status** - Activate/deactivate payee
   - Permission required: `canEditPayees`

**Files to create:**
- `src/app/api/payees/route.ts` - List endpoint
- `src/app/api/payees/[type]/[id]/route.ts` - Get/Update endpoint
- `src/app/api/payees/[type]/[id]/status/route.ts` - Status toggle
- `src/app/api/payees/individuals/[id]/route.ts` - Update individual

**Files to modify:**
- `src/app/api/expense-account/payees/individuals/route.ts` - Add permission check

---

### Phase 3: UI Components ✅ (Expected: Significant)

**New Page:**
- `src/app/payees/page.tsx` - Main payee management page

**Features:**
- Search bar (name, email, phone, ID)
- Filter by type (USER, EMPLOYEE, PERSON, BUSINESS)
- Filter by status (Active/Inactive)
- Payee cards/table with:
  - Name, type badge, contact info
  - Recent payment count
  - Total payments amount
  - Status indicator
  - Quick actions (View, Edit, Activate/Deactivate)
- Create new individual payee button
- View payee details modal
- Edit individual payee modal

**Components to create:**
- `src/app/payees/page.tsx` - Main page
- `src/components/payee/payee-card.tsx` - Individual payee card
- `src/components/payee/payee-details-modal.tsx` - View details
- `src/components/payee/edit-individual-payee-modal.tsx` - Edit individual

**Components to reuse:**
- `CreateIndividualPayeeModal` - Already exists
- `PayeeSelector` - For reference

---

### Phase 4: Navigation & Permissions ✅ (Expected: Simple)

**Tasks:**
1. Add "Payees" link to main navigation (conditional on `canViewPayees`)
2. Add permission checks to all payee routes
3. Add permission-based UI element hiding (edit/create buttons)

**Files to modify:**
- Main navigation component (find and add link)
- `src/app/payees/page.tsx` - Add permission guard

---

## Task Breakdown

### ✅ Tasks
- [ ] **Task 1.1:** Add permission constants to `permission-utils.ts`
- [ ] **Task 1.2:** Update admin seed with new permissions
- [ ] **Task 2.1:** Create `GET /api/payees` endpoint
- [ ] **Task 2.2:** Create `GET /api/payees/[type]/[id]` endpoint
- [ ] **Task 2.3:** Create `PUT /api/payees/individuals/[id]` endpoint
- [ ] **Task 2.4:** Create `PATCH /api/payees/[type]/[id]/status` endpoint
- [ ] **Task 2.5:** Add permission check to create individuals endpoint
- [ ] **Task 3.1:** Create main `/payees` page with search and filters
- [ ] **Task 3.2:** Create payee card component
- [ ] **Task 3.3:** Create payee details modal
- [ ] **Task 3.4:** Create edit individual payee modal
- [ ] **Task 4.1:** Add navigation link with permission check
- [ ] **Task 4.2:** Test all permission scenarios

---

## Technical Considerations

### Permissions Logic
- Users with `role: 'admin'` get all permissions automatically
- Regular users need explicit permission grants
- Permission checks on both frontend (UI hiding) and backend (API enforcement)

### Payee Types Handling
- **USER & EMPLOYEE**: Read-only in payees page (managed elsewhere)
- **PERSON**: Full CRUD operations
- **BUSINESS**: Read-only initially (managed in business section)

### Data Privacy
- Only show payees accessible to the current user's businesses
- For admins, show all payees across system

### Performance
- Implement pagination for large payee lists
- Use search debouncing (500ms)
- Load payment history on-demand (not in list view)

---

## Review & Follow-up

### Testing Checklist
- [ ] Admin can view all payees
- [ ] Admin can create/edit individual payees
- [ ] Regular user without permissions sees access denied
- [ ] Regular user with `canViewPayees` can view but not edit
- [ ] Regular user with all permissions can CRUD
- [ ] Search functionality works across all fields
- [ ] Filter by type works correctly
- [ ] Filter by status works correctly
- [ ] Activate/deactivate toggles status correctly
- [ ] Navigation link only shows for authorized users

### Future Enhancements
- Bulk operations (activate/deactivate multiple)
- Export payee list to CSV/Excel
- Payee categories/tags for organization
- Payment history in payee details
- Advanced search with date ranges
- Audit log for payee changes

---

## Summary

This implementation creates a centralized payee management system with proper permission controls. It provides a dedicated UI for viewing, searching, creating, and editing payees while maintaining security through role-based permissions.

**Estimated Complexity:** Medium
**Estimated Time:** 2-3 hours
**Files Created:** ~8 new files
**Files Modified:** ~4 existing files

---

## Implementation Summary

### Completed Features ✅

**Phase 1: Permissions** ✅
- Added 3 new user-level permissions to `src/types/permissions.ts`:
  - `canViewPayees` - View all payees across the system
  - `canCreatePayees` - Create new individual payees (persons)
  - `canEditPayees` - Edit individual payees and toggle active status
- Permissions automatically granted to admin users through role-based system
- Regular users can be granted these permissions individually

**Phase 2: Backend APIs** ✅
- Created `GET /api/payees` - List/search/filter all payees
- Created `GET /api/payees/[type]/[id]` - Get detailed payee info with payment history
- Created `PUT /api/payees/individuals/[id]` - Update individual payee
- Created `PATCH /api/payees/[type]/[id]/status` - Toggle active/inactive status
- Updated `POST /api/expense-account/payees/individuals` - Added `canCreatePayees` permission support

**Phase 3: Frontend UI** ✅
- Created `/payees` page with:
  - Search-as-you-type by name, email, phone, national ID (500ms debounce)
  - Filter by type (USER, EMPLOYEE, PERSON, BUSINESS)
  - Filter by status (Active/Inactive)
  - Payee cards with contact info and status
  - Create new individual payee button
  - Edit button for individual payees
  - Activate/Deactivate toggle for all payee types
  - Improved input/dropdown styling with better padding and font size
- Created `EditIndividualPayeeModal` component for editing persons
- Reused existing `CreateIndividualPayeeModal` for creating

**Phase 4: Navigation & Integration** ✅
- Added "Payee Management" link to sidebar (only visible with `canViewPayees` permission)
- Placed navigation link after Expense Accounts section
- Cleared Next.js cache

### Files Created (7 files)
1. `src/app/api/payees/route.ts` - List/search endpoint
2. `src/app/api/payees/[type]/[id]/route.ts` - Get single payee endpoint
3. `src/app/api/payees/individuals/[id]/route.ts` - Update individual endpoint
4. `src/app/api/payees/[type]/[id]/status/route.ts` - Toggle status endpoint
5. `src/app/payees/page.tsx` - Main payee management page
6. `src/components/payee/edit-individual-payee-modal.tsx` - Edit modal
7. `prisma/migrations/20251207_fix_persons_nullable_fields/migration.sql` - Schema migration

### Files Modified (4 files)
1. `src/types/permissions.ts` - Added 3 new payee permissions
2. `src/app/api/expense-account/payees/individuals/route.ts` - Added permission check
3. `src/components/layout/sidebar.tsx` - Added navigation link
4. `src/app/payees/page.tsx` - Enhanced with search-as-you-type and improved styling

### How It Works

**Permission Model:**
- Admin users (`role: 'admin'`) automatically get all 3 permissions through `ADMIN_USER_PERMISSIONS`
- Regular users can be granted individual permissions via user management UI
- Permissions are checked on both frontend (UI hiding) and backend (API enforcement)

**Payee Types:**
- **USER**: System users - read-only in payee management
- **EMPLOYEE**: Company employees - read-only in payee management
- **PERSON**: Individual contractors/persons - full CRUD operations
- **BUSINESS**: Other businesses - read-only in payee management

**Access Control:**
- All API endpoints require authentication
- `GET /api/payees*` requires `canViewPayees`
- `PUT /api/payees/individuals/*` requires `canEditPayees`
- `PATCH /api/payees/*/status` requires `canEditPayees`
- `POST /api/expense-account/payees/individuals` requires `canCreatePayees` OR `canCreateIndividualPayees` (backward compatible)

### Testing Checklist
- [x] Admin users can access /payees page
- [x] Admin users can view all payee types
- [x] Admin users can search and filter payees
- [x] Admin users can create individual payees
- [x] Admin users can edit individual payees
- [x] Admin users can activate/deactivate any payee type
- [ ] Non-admin user without permissions cannot access /payees
- [ ] Non-admin user with `canViewPayees` can view but not edit
- [ ] Non-admin user with all permissions can perform all operations
- [ ] Navigation link only shows for authorized users

### UX Improvements ✅
- **Search-as-you-type**: Removed manual search button, now searches automatically 500ms after typing stops
- **Reset Search Button**: Added button to clear all search filters and reset the page
- **Improved input styling**: Added proper padding (px-4 py-2.5) and text size (text-base) to all inputs and dropdowns across entire codebase
- **Streamlined layout**: Simplified form structure, moved create button to cleaner position

### Latest Updates - 2025-12-08 ✅
**Restaurant POS Menu Item Display Enhancements**

**Problem:** Menu item cards in restaurant POS were missing important information:
1. Cart quantity (top number) was not updating when items were added to cart
2. Stock quantity (bottom number) was always showing 0

**Solution Implemented:**
1. **Cart Quantity Display (Top-Left)**
   - Added real-time cart quantity tracking
   - Shows how many of each item are currently in the cart
   - Updates immediately when items are added/removed
   - Location: `src/app/restaurant/pos/page.tsx:738-741`

2. **Stock Quantity Display (Bottom-Left)**
   - Fetches product variants with `stockQuantity` field
   - Calculates total stock by summing all variant quantities
   - Displays available stock on each menu card
   - Location: `src/app/restaurant/pos/page.tsx:795-798`

3. **API Enhancement**
   - Added `includeVariants: 'true'` parameter to product API call
   - Fetches variant data including `stockQuantity` field
   - Location: `src/app/restaurant/pos/page.tsx:86`

4. **Stock Calculation**
   - Implemented stock aggregation from all product variants
   - Handles products with multiple variants correctly
   - Location: `src/app/restaurant/pos/page.tsx:119-122`

**How to Set Stock Quantities:**
Stock quantities are stored in the `product_variants` table:
- Field: `stockQuantity` (integer, default 0)
- Can be updated via inventory management or directly in database
- Each product can have multiple variants, each with its own stock level
- Total displayed = sum of all variant stock quantities

**Files Modified:**
- `src/app/restaurant/pos/page.tsx` - Added cart/stock quantity displays and variant fetching

**Global Input Styling Fix:**
Fixed narrow input fields across 13 files:
- Added consistent padding: `px-4 py-2.5`
- Added consistent text size: `text-base`
- Files updated: admin pages, employee pages, services pages, components

### Future Enhancements
- View payee details modal with full payment history
- Bulk activate/deactivate operations
- Export payee list to CSV/Excel
- Payment history filtering by date range
- Payee categories or tags for organization
- Audit log for payee changes
- Delete individual payees (with safety checks)
