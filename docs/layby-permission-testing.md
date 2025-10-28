# Layby Management - Permission Integration Testing

## Overview
This document provides comprehensive testing procedures for role-based access control (RBAC) in the Layby Management Module.

## Permission System

### Primary Permission
**`canManageLaybys`** - Required for all layby management operations

### Permission Sources
1. **User Permissions**: Direct assignment via `Users.canManageLaybys`
2. **Role Permissions**: Inherited via `Roles.canManageLaybys`
3. **Business Membership**: User must be member of business

### Implementation
```typescript
// Used in all layby pages and API routes
const canManageLaybys = hasUserPermission(session?.user, 'canManageLaybys')
```

## Test Scenarios

### 1. Page Access Control

#### Test 1.1: Layby List Page
**Location**: `/business/laybys/page.tsx:144`

**Test Cases**:
- ✅ User with `canManageLaybys` = true → Can access page
- ❌ User with `canManageLaybys` = false → See permission denied message
- ❌ User not logged in → Redirect to login
- ❌ User member of Business A, viewing Business B laybys → No access

**Expected Behavior**:
```typescript
if (!canManageLaybys) {
  return (
    <div className="card p-12 text-center">
      <p className="text-secondary">You don&apos;t have permission to manage laybys</p>
    </div>
  )
}
```

#### Test 1.2: New Layby Page
**Location**: `/business/laybys/new/page.tsx:86`

**Test Cases**:
- ✅ User with permission → Can create laybys
- ❌ User without permission → Permission denied message
- ✅ User with permission → Can select customers from current business only
- ❌ User with permission → Cannot create layby for different business

#### Test 1.3: Layby Detail Page
**Location**: `/business/laybys/[id]/page.tsx:244`

**Test Cases**:
- ✅ User with permission → Can view and manage layby
- ❌ User without permission → Permission denied message
- ❌ User with permission → Cannot access laybys from different business
- ✅ User with permission → Can perform all actions (payment, complete, cancel, hold, reactivate)

#### Test 1.4: Business Rules Page
**Location**: `/business/laybys/rules/page.tsx`

**Test Cases**:
- ✅ User with permission → Can view business rules
- ❌ User without permission → Permission denied message
- ✅ Rules displayed match business type
- ✅ Cannot modify rules (view-only)

#### Test 1.5: Automation Page
**Location**: `/business/laybys/automation/page.tsx:14`

**Test Cases**:
- ✅ User with permission → Can view automation monitor
- ❌ User without permission → Permission denied message
- ✅ Can view job history for current business only
- ✅ Can trigger manual run for current business only

### 2. API Endpoint Access Control

#### Test 2.1: List Laybys API
**Endpoint**: `GET /api/laybys`

**Test Cases**:
- ✅ Valid user-id header with permission → Returns laybys
- ❌ Missing user-id header → 401 Unauthorized
- ❌ Invalid user-id → 401 Unauthorized
- ❌ User without permission → 403 Forbidden
- ✅ User with permission → Only sees laybys from their businesses

**Test Request**:
```bash
curl -X GET http://localhost:3000/api/laybys?businessId={id} \
  -H "x-user-id: {userId}"
```

#### Test 2.2: Create Layby API
**Endpoint**: `POST /api/laybys`

**Test Cases**:
- ✅ User with permission, valid data → Creates layby
- ❌ User without permission → 403 Forbidden
- ❌ User creating layby for different business → 403 Forbidden
- ❌ User with permission, invalid data → 400 Bad Request with validation errors

**Test Request**:
```bash
curl -X POST http://localhost:3000/api/laybys \
  -H "Content-Type: application/json" \
  -H "x-user-id: {userId}" \
  -d '{
    "businessId": "{businessId}",
    "customerId": "{customerId}",
    "items": [...],
    "depositPercent": 20
  }'
```

#### Test 2.3: Record Payment API
**Endpoint**: `POST /api/laybys/{id}/payments`

**Test Cases**:
- ✅ User with permission → Can record payment
- ❌ User without permission → 403 Forbidden
- ❌ User from different business → Cannot record payment
- ✅ Payment creates BusinessTransaction with correct userId

#### Test 2.4: Complete Layby API
**Endpoint**: `POST /api/laybys/{id}/complete`

**Test Cases**:
- ✅ User with permission, layby fully paid → Completes successfully
- ❌ User without permission → 403 Forbidden
- ❌ Layby with outstanding balance → 400 Bad Request
- ✅ Order created has correct userId in metadata

#### Test 2.5: Cancel Layby API
**Endpoint**: `POST /api/laybys/{id}/cancel`

**Test Cases**:
- ✅ User with permission → Can cancel layby
- ❌ User without permission → 403 Forbidden
- ❌ User from different business → Cannot cancel
- ✅ Cancellation fields (cancelledAt, reason) populated correctly

#### Test 2.6: Hold Layby API
**Endpoint**: `POST /api/laybys/{id}/hold`

**Test Cases**:
- ✅ User with permission → Can put layby on hold
- ❌ User without permission → 403 Forbidden
- ❌ Already completed/cancelled layby → 400 Bad Request

#### Test 2.7: Reactivate Layby API
**Endpoint**: `POST /api/laybys/{id}/reactivate`

**Test Cases**:
- ✅ User with permission, layby on hold → Can reactivate
- ❌ User without permission → 403 Forbidden
- ❌ Active layby → 400 Bad Request

### 3. Business Membership Validation

#### Test 3.1: Cross-Business Access Prevention
**Scenario**: User A is member of Business 1, tries to access Business 2 laybys

**Test Cases**:
- ❌ List laybys from Business 2 → Empty result or 403
- ❌ Create layby for Business 2 → 403 Forbidden
- ❌ View layby detail from Business 2 → 404 or 403
- ❌ Record payment on Business 2 layby → 403 Forbidden

#### Test 3.2: Multi-Business User
**Scenario**: User B is member of Business 1 AND Business 2

**Test Cases**:
- ✅ Can list laybys from Business 1
- ✅ Can list laybys from Business 2
- ✅ Can create laybys for either business
- ✅ Can manage laybys from either business

### 4. Role-Based Permission Inheritance

#### Test 4.1: Admin Role
**Setup**: User has Role with `canManageLaybys` = true

**Test Cases**:
- ✅ User.canManageLaybys = false, Role.canManageLaybys = true → Has permission
- ✅ Can access all layby pages
- ✅ Can perform all layby operations

#### Test 4.2: Staff Role
**Setup**: User has Role with `canManageLaybys` = false

**Test Cases**:
- ❌ User.canManageLaybys = false, Role.canManageLaybys = false → No permission
- ❌ Cannot access layby pages (shows permission denied)

#### Test 4.3: Direct Permission Override
**Setup**: User.canManageLaybys = true, Role.canManageLaybys = false

**Test Cases**:
- ✅ Direct permission takes precedence
- ✅ User can access all layby functionality

### 5. Audit Trail Verification

#### Test 5.1: Creator Tracking
**Fields**: `createdBy` in CustomerLayby

**Test Cases**:
- ✅ New layby has correct `createdBy` userId
- ✅ Creator can be looked up via Users relation
- ✅ Creator information visible in layby details

#### Test 5.2: Payment Processor Tracking
**Fields**: `processedBy` in CustomerLaybyPayment

**Test Cases**:
- ✅ Payment record has correct `processedBy` userId
- ✅ Payment history shows who processed each payment
- ✅ Multiple payments can have different processors

#### Test 5.3: Item Release Tracking
**Fields**: `itemsReleasedBy` in CustomerLayby

**Test Cases**:
- ✅ When layby completed, `itemsReleasedBy` set to userId
- ✅ `itemsReleasedAt` timestamp recorded
- ✅ Release information visible in layby history

## Test Data Setup

### Create Test Users

```sql
-- Admin with direct permission
INSERT INTO users (id, name, email, "canManageLaybys")
VALUES ('test-admin-1', 'Admin User', 'admin@test.com', true);

-- Staff without permission
INSERT INTO users (id, name, email, "canManageLaybys")
VALUES ('test-staff-1', 'Staff User', 'staff@test.com', false);

-- User with permission via role
INSERT INTO users (id, name, email, "canManageLaybys", "roleId")
VALUES ('test-role-user-1', 'Role User', 'role@test.com', false, 'role-with-permission');

-- Multi-business user
INSERT INTO users (id, name, email, "canManageLaybys")
VALUES ('test-multi-1', 'Multi Business', 'multi@test.com', true);
```

### Create Test Roles

```sql
-- Role with layby permission
INSERT INTO roles (id, name, "canManageLaybys")
VALUES ('role-with-permission', 'Layby Manager', true);

-- Role without permission
INSERT INTO roles (id, name, "canManageLaybys")
VALUES ('role-no-permission', 'Cashier', false);
```

### Create Test Business Memberships

```sql
-- User in Business 1 only
INSERT INTO business_users (id, "businessId", "userId")
VALUES ('mem-1', 'business-1', 'test-admin-1');

-- User in Business 2 only
INSERT INTO business_users (id, "businessId", "userId")
VALUES ('mem-2', 'business-2', 'test-staff-1');

-- Multi-business user
INSERT INTO business_users (id, "businessId", "userId")
VALUES ('mem-3', 'business-1', 'test-multi-1');
INSERT INTO business_users (id, "businessId", "userId")
VALUES ('mem-4', 'business-2', 'test-multi-1');
```

## Automated Test Script

```typescript
// tests/integration/layby-permissions.test.ts

describe('Layby Permission Integration', () => {
  let adminUser: User
  let staffUser: User
  let business1: Business
  let business2: Business

  beforeAll(async () => {
    // Setup test data
    adminUser = await createTestUser({ canManageLaybys: true })
    staffUser = await createTestUser({ canManageLaybys: false })
    business1 = await createTestBusiness({ type: 'clothing' })
    business2 = await createTestBusiness({ type: 'hardware' })

    await addUserToBusiness(adminUser.id, business1.id)
    await addUserToBusiness(staffUser.id, business2.id)
  })

  describe('Page Access', () => {
    it('should allow user with permission to access layby list', async () => {
      const session = { user: adminUser }
      const canAccess = hasUserPermission(session.user, 'canManageLaybys')
      expect(canAccess).toBe(true)
    })

    it('should deny user without permission', async () => {
      const session = { user: staffUser }
      const canAccess = hasUserPermission(session.user, 'canManageLaybys')
      expect(canAccess).toBe(false)
    })
  })

  describe('API Access', () => {
    it('should allow creating layby with valid permission', async () => {
      const response = await fetch('/api/laybys', {
        method: 'POST',
        headers: {
          'x-user-id': adminUser.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId: business1.id,
          customerId: 'customer-1',
          items: [{ productVariantId: 'variant-1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
          depositPercent: 20
        })
      })
      expect(response.status).toBe(201)
    })

    it('should deny creating layby without permission', async () => {
      const response = await fetch('/api/laybys', {
        method: 'POST',
        headers: {
          'x-user-id': staffUser.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId: business2.id,
          customerId: 'customer-2',
          items: [{ productVariantId: 'variant-2', quantity: 1, unitPrice: 100, totalPrice: 100 }],
          depositPercent: 20
        })
      })
      expect(response.status).toBe(403)
    })

    it('should prevent cross-business access', async () => {
      // Admin from business1 tries to access business2 layby
      const response = await fetch(`/api/laybys?businessId=${business2.id}`, {
        headers: { 'x-user-id': adminUser.id }
      })
      const data = await response.json()
      expect(data.data).toHaveLength(0) // Should not see business2 laybys
    })
  })

  describe('Audit Trail', () => {
    it('should track layby creator', async () => {
      const layby = await createLayby({
        businessId: business1.id,
        userId: adminUser.id
      })
      expect(layby.createdBy).toBe(adminUser.id)
    })

    it('should track payment processor', async () => {
      const layby = await createLayby({ businessId: business1.id, userId: adminUser.id })
      const payment = await recordPayment({
        laybyId: layby.id,
        userId: adminUser.id,
        amount: 50
      })
      expect(payment.processedBy).toBe(adminUser.id)
    })

    it('should track item release', async () => {
      const layby = await createLayby({ businessId: business1.id, userId: adminUser.id })
      await completeLayby({ laybyId: layby.id, userId: adminUser.id })
      const updated = await prisma.customerLayby.findUnique({ where: { id: layby.id } })
      expect(updated?.itemsReleasedBy).toBe(adminUser.id)
      expect(updated?.itemsReleasedAt).toBeTruthy()
    })
  })
})
```

## Manual Test Checklist

### Pre-Test Setup
- [ ] Create test users with different permission levels
- [ ] Create test roles with varied permissions
- [ ] Set up multiple test businesses
- [ ] Create business memberships for test users
- [ ] Verify test data is isolated from production

### Page Access Tests
- [ ] Access `/business/laybys` with permission (✅ expected)
- [ ] Access `/business/laybys` without permission (❌ expected)
- [ ] Access `/business/laybys/new` with permission (✅ expected)
- [ ] Access `/business/laybys/new` without permission (❌ expected)
- [ ] Access `/business/laybys/[id]` with permission (✅ expected)
- [ ] Access `/business/laybys/[id]` without permission (❌ expected)
- [ ] Access `/business/laybys/rules` with permission (✅ expected)
- [ ] Access `/business/laybys/automation` with permission (✅ expected)

### API Tests
- [ ] Create layby with permission (201 expected)
- [ ] Create layby without permission (403 expected)
- [ ] Create layby for different business (403 expected)
- [ ] Record payment with permission (200 expected)
- [ ] Record payment without permission (403 expected)
- [ ] Complete layby with permission (200 expected)
- [ ] Cancel layby with permission (200 expected)
- [ ] Hold layby with permission (200 expected)
- [ ] Reactivate layby with permission (200 expected)

### Cross-Business Tests
- [ ] User A cannot see User B's business laybys
- [ ] User A cannot create layby for User B's business
- [ ] User A cannot manage User B's business laybys
- [ ] Multi-business user can manage both businesses

### Role Inheritance Tests
- [ ] User with role permission can access laybys
- [ ] User without role permission cannot access laybys
- [ ] Direct permission overrides role permission
- [ ] Role change updates access immediately

### Audit Trail Tests
- [ ] Layby creator recorded correctly
- [ ] Payment processor recorded correctly
- [ ] Item release user recorded correctly
- [ ] Timestamps accurate on all operations

## Common Issues and Solutions

### Issue 1: Permission Check Not Working
**Symptom**: User without permission can access pages

**Check**:
1. Verify `hasUserPermission()` is called correctly
2. Check session data includes user permissions
3. Verify role permissions are loaded

**Solution**: Ensure session includes both user and role data:
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) return null
// Verify session.user includes canManageLaybys field
```

### Issue 2: Cross-Business Access
**Symptom**: User can see laybys from other businesses

**Check**:
1. Verify businessId filter in queries
2. Check business membership validation
3. Verify user business associations

**Solution**: Always filter by businessId and validate membership:
```typescript
const userBusinessIds = await getUserBusinessIds(userId)
if (!userBusinessIds.includes(businessId)) {
  throw new Error('User not member of business')
}
```

### Issue 3: API Returns 401 Instead of 403
**Symptom**: Authenticated user gets 401 on permission denial

**Check**:
1. Verify user-id header is present
2. Check authentication middleware runs before permission check
3. Verify error status codes

**Solution**: Separate auth (401) from authorization (403):
```typescript
// First: Check authentication
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Then: Check authorization
if (!canManageLaybys) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

## Regression Testing

When making permission-related changes, always verify:

1. **Existing Users**: Permissions remain unchanged
2. **New Users**: Inherit correct defaults
3. **Role Changes**: Immediately affect access
4. **Business Membership**: Adding/removing updates access
5. **Audit Trail**: All operations still tracked

## Security Checklist

- [ ] All pages check `canManageLaybys` permission
- [ ] All API endpoints validate user-id header
- [ ] All API endpoints check permission before operations
- [ ] Business membership validated on all operations
- [ ] No permission bypass via direct API calls
- [ ] Audit trail records all sensitive operations
- [ ] Error messages don't leak sensitive information
- [ ] Permission checks happen server-side (never client-only)
- [ ] Session includes latest permission data
- [ ] Database constraints prevent unauthorized data access

## Conclusion

This testing guide ensures the Layby Management Module properly enforces role-based access control across all entry points. Follow this guide during development, before deployment, and as part of regression testing after any permission-related changes.
