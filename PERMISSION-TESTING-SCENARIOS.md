# Permission Testing Scenarios - Expense Account System

## Overview
This document outlines all permission scenarios for the expense account management system.

## Permission Matrix

| Permission | Allows User To |
|------------|----------------|
| `canCreateExpenseAccount` | Create new expense accounts |
| `canAccessExpenseAccount` | View expense accounts and transactions |
| `canMakeExpenseDeposits` | Add deposits to expense accounts |
| `canMakeExpensePayments` | Create payments (single and batch) |
| `canViewExpenseReports` | View analytics and reports |

---

## Test Scenario 1: System Admin (Full Access)

### User Profile
- Role: ADMIN
- All expense account permissions: YES

### Expected Behavior

**Navigation:**
- ✅ Sees "Expense Accounts" menu item in sidebar
- ✅ Submenu shows "Create Account" and "All Reports"

**Account List Page (`/expense-accounts`):**
- ✅ Can view list of all accounts
- ✅ "Create Account" button visible
- ✅ Can click any account to view details

**Account Detail Page (`/expense-accounts/[accountId]`):**
- ✅ Sees all 4 tabs: Overview, Deposits, Payments, Transactions
- ✅ "View Reports" button visible in header
- ✅ Can perform all actions

**Deposits Tab:**
- ✅ Tab visible and accessible
- ✅ Can add manual deposits
- ✅ Can transfer from business

**Payments Tab:**
- ✅ Tab visible and accessible
- ✅ Can create single payments
- ✅ Can create batch payments
- ✅ Can create new payees on-the-fly

**Reports Page (`/expense-accounts/[accountId]/reports`):**
- ✅ Page accessible
- ✅ All charts and analytics visible

**Employee Detail Page (`/employees/[id]`):**
- ✅ "Expense Payments" tab visible
- ✅ PayeeExpenseSummary displays
- ✅ PayeePaymentsTable displays
- ✅ PayeeExpenseReport displays with charts

---

## Test Scenario 2: Finance Manager

### User Profile
- Role: USER
- Permissions:
  - `canAccessExpenseAccount`: YES
  - `canMakeExpensePayments`: YES
  - `canViewExpenseReports`: YES
  - `canCreateExpenseAccount`: NO
  - `canMakeExpenseDeposits`: NO

### Expected Behavior

**Navigation:**
- ✅ Sees "Expense Accounts" menu item in sidebar
- ❌ Submenu does NOT show "Create Account"
- ✅ Submenu shows "All Reports" (if exists)

**Account List Page:**
- ✅ Can view list of all accounts
- ❌ "Create Account" button NOT visible
- ✅ Can click accounts to view details

**Account Detail Page:**
- ✅ Sees Overview tab
- ❌ Deposits tab NOT visible
- ✅ Payments tab visible
- ✅ Transactions tab visible
- ✅ "View Reports" button visible

**Deposits Tab:**
- ❌ Tab not rendered in navigation
- ❌ Direct URL access to deposits redirects or shows error

**Payments Tab:**
- ✅ Can create single payments
- ✅ Can create batch payments
- ✅ Can create new payees
- ⚠️ May encounter "insufficient funds" if cannot add deposits

**Reports Page:**
- ✅ Can access and view all reports

**Employee Detail Page:**
- ✅ "Expense Payments" tab visible
- ✅ PayeeExpenseSummary displays
- ✅ PayeePaymentsTable displays
- ✅ PayeeExpenseReport displays

**Test Actions:**
1. Try to navigate to `/expense-accounts/new` → Should redirect to list page
2. Try to navigate to `/expense-accounts/[id]/deposits` → Tab should not exist
3. Create payment successfully
4. View reports successfully

---

## Test Scenario 3: Payments Officer

### User Profile
- Role: USER
- Permissions:
  - `canAccessExpenseAccount`: YES
  - `canMakeExpensePayments`: YES
  - `canViewExpenseReports`: NO
  - `canCreateExpenseAccount`: NO
  - `canMakeExpenseDeposits`: NO

### Expected Behavior

**Navigation:**
- ✅ Sees "Expense Accounts" menu item
- ❌ No submenu items (no create, no reports)

**Account Detail Page:**
- ✅ Sees Overview tab
- ❌ Deposits tab NOT visible
- ✅ Payments tab visible
- ✅ Transactions tab visible
- ❌ "View Reports" button NOT visible

**Reports Page:**
- ❌ Cannot access `/expense-accounts/[id]/reports`
- ❌ Redirects to account detail page

**Employee Detail Page:**
- ✅ "Expense Payments" tab visible
- ✅ PayeeExpenseSummary displays
- ✅ PayeePaymentsTable displays
- ❌ PayeeExpenseReport does NOT display (requires canViewExpenseReports)

**Test Actions:**
1. Try to access reports URL → Should redirect
2. Check employee detail page → Charts hidden
3. Can still create payments

---

## Test Scenario 4: Auditor/Viewer

### User Profile
- Role: USER
- Permissions:
  - `canAccessExpenseAccount`: YES
  - `canViewExpenseReports`: YES
  - `canMakeExpensePayments`: NO
  - `canMakeExpenseDeposits`: NO
  - `canCreateExpenseAccount`: NO

### Expected Behavior

**Navigation:**
- ✅ Sees "Expense Accounts" menu item
- ✅ Submenu shows "All Reports" (if exists)

**Account Detail Page:**
- ✅ Sees Overview tab
- ❌ Deposits tab NOT visible
- ❌ Payments tab NOT visible
- ✅ Transactions tab visible (read-only)
- ✅ "View Reports" button visible

**Payments Tab:**
- ❌ Tab not rendered
- ❌ Cannot create any payments

**Reports Page:**
- ✅ Full access to all reports and analytics

**Employee Detail Page:**
- ✅ "Expense Payments" tab visible
- ✅ All three components display (summary, table, charts)
- ✅ Full read-only view of payee expenses

**Test Actions:**
1. Verify read-only access to all data
2. Confirm no action buttons appear
3. Can view but not modify

---

## Test Scenario 5: Regular Employee

### User Profile
- Role: USER
- Permissions:
  - All expense account permissions: NO

### Expected Behavior

**Navigation:**
- ❌ "Expense Accounts" menu item NOT visible in sidebar

**Direct URL Access:**
- ❌ `/expense-accounts` → Redirects to dashboard
- ❌ `/expense-accounts/[id]` → Redirects to dashboard (403)
- ❌ `/expense-accounts/new` → Redirects to dashboard (403)
- ❌ `/expense-accounts/[id]/reports` → Redirects to dashboard (403)

**Employee Detail Page (Own Profile):**
- ✅ Can view own employee detail page
- ❌ "Expense Payments" tab NOT visible
- ✅ Can still view other tabs (Profile, Contracts, etc.)

**Test Actions:**
1. Confirm menu item hidden
2. Try all direct URLs → All should redirect
3. Check own employee page → No expense tab

---

## Test Scenario 6: Custom Permissions Mix

### User Profile
- Role: USER
- Permissions:
  - `canAccessExpenseAccount`: YES
  - `canMakeExpenseDeposits`: YES
  - `canMakeExpensePayments`: NO
  - `canViewExpenseReports`: NO
  - `canCreateExpenseAccount`: NO

### Expected Behavior

**Navigation:**
- ✅ Sees "Expense Accounts" menu item

**Account Detail Page:**
- ✅ Sees Overview tab
- ✅ Deposits tab visible (can add deposits)
- ❌ Payments tab NOT visible
- ✅ Transactions tab visible

**Deposits Tab:**
- ✅ Can add manual deposits
- ✅ Can transfer from business
- ✅ Balance increases after deposit

**Use Case:**
- This user can fund accounts but not spend from them
- Useful for treasury/funding role

---

## Test Scenario 7: Account Creator Only

### User Profile
- Role: USER
- Permissions:
  - `canCreateExpenseAccount`: YES
  - All other permissions: NO

### Expected Behavior

**Navigation:**
- ❌ "Expense Accounts" menu item likely NOT visible
  - Because no `canAccessExpenseAccount`

**Direct URL Access:**
- ❌ Cannot view accounts after creating them
- ⚠️ Edge case: Can create but not view

**Recommendation:**
- Always grant `canAccessExpenseAccount` with `canCreateExpenseAccount`
- Creating without viewing makes no practical sense

---

## API Permission Testing

### Test with cURL

#### Test 1: No Authentication
```bash
curl http://localhost:8080/api/expense-account
```

**Expected:** 401 Unauthorized

#### Test 2: Authenticated but No Permission
```bash
# Login as employee with no permissions
curl -H "Cookie: session-token=..." \
  http://localhost:8080/api/expense-account
```

**Expected:** 403 Forbidden

#### Test 3: With Correct Permission
```bash
# Login as user with canAccessExpenseAccount
curl -H "Cookie: session-token=..." \
  http://localhost:8080/api/expense-account
```

**Expected:** 200 OK with account list

---

## Permission Enforcement Validation

### Checklist

For each permission scenario, verify:

**UI Level:**
- [ ] Menu items shown/hidden correctly
- [ ] Tabs shown/hidden correctly
- [ ] Action buttons shown/hidden correctly
- [ ] Forms accessible/blocked correctly

**API Level:**
- [ ] GET endpoints check permissions
- [ ] POST endpoints check permissions
- [ ] PUT endpoints check permissions
- [ ] DELETE endpoints check permissions
- [ ] Proper 403 errors returned

**Navigation Level:**
- [ ] Direct URLs redirect when no permission
- [ ] Links only appear when permitted
- [ ] Breadcrumbs respect permissions

**Component Level:**
- [ ] PayeeExpenseSummary auto-hides without permission
- [ ] PayeePaymentsTable auto-hides without permission
- [ ] PayeeExpenseReport auto-hides without permission

---

## Testing Script

### Setup Test Users

```sql
-- Create test users with different permission sets
-- (Adjust based on your auth system)

-- Admin user (all permissions)
-- Already exists

-- Finance Manager
UPDATE User SET permissions = jsonb_build_object(
  'canAccessExpenseAccount', true,
  'canMakeExpensePayments', true,
  'canViewExpenseReports', true
) WHERE email = 'finance@example.com';

-- Payments Officer
UPDATE User SET permissions = jsonb_build_object(
  'canAccessExpenseAccount', true,
  'canMakeExpensePayments', true
) WHERE email = 'payments@example.com';

-- Auditor
UPDATE User SET permissions = jsonb_build_object(
  'canAccessExpenseAccount', true,
  'canViewExpenseReports', true
) WHERE email = 'auditor@example.com';

-- Regular Employee
UPDATE User SET permissions = '{}'
WHERE email = 'employee@example.com';
```

### Test Each Scenario

1. Login as each test user
2. Follow the expected behavior checklist
3. Document any deviations
4. Verify API responses match UI behavior

---

## Common Issues & Fixes

### Issue 1: Menu Item Visible but Page Redirects
**Cause:** Permission check in navigation differs from page
**Fix:** Ensure consistent permission checks

### Issue 2: Tab Appears but Content Blocked
**Cause:** Tab visibility check differs from content check
**Fix:** Use same permission for both tab and content

### Issue 3: API Allows but UI Blocks
**Cause:** UI overly restrictive
**Fix:** Align UI permission checks with API

### Issue 4: API Blocks but UI Allows
**Cause:** Missing API permission check (SECURITY ISSUE!)
**Fix:** Add permission check to API route immediately

---

## Security Considerations

1. **Always check permissions server-side** (API routes)
2. **UI checks are for UX only**, not security
3. **Never trust client-side permission checks**
4. **Log permission denials** for audit trail
5. **Return 403, not 404** for unauthorized access (info disclosure)

---

## Automated Permission Testing

### Example Test (Conceptual)

```javascript
// test/permissions/expense-accounts.test.js
describe('Expense Account Permissions', () => {
  test('Admin can create account', async () => {
    const admin = await loginAsAdmin()
    const response = await admin.post('/api/expense-account', {...})
    expect(response.status).toBe(201)
  })

  test('Employee cannot create account', async () => {
    const employee = await loginAsEmployee()
    const response = await employee.post('/api/expense-account', {...})
    expect(response.status).toBe(403)
  })

  test('Finance manager can make payments', async () => {
    const manager = await loginAsFinanceManager()
    const response = await manager.post('/api/expense-account/[id]/payments', {...})
    expect(response.status).toBe(201)
  })
})
```

---

**End of Permission Testing Scenarios**
