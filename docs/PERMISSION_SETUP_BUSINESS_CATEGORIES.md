# Business Expense Categories - Permission Setup Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-26
**For:** System Administrators

---

## Overview

This guide explains how to configure user permissions for the Business Expense Categories system. Six new permissions have been added to control access to category and subcategory management.

---

## New Permissions Added

### Permission Group: `businessExpenseCategories`

| Permission Key | Label | Description |
|---------------|-------|-------------|
| `canCreateBusinessCategories` | Create Categories | Allows creating new expense categories |
| `canEditBusinessCategories` | Edit Categories | Allows modifying existing categories |
| `canDeleteBusinessCategories` | Delete Categories | Allows deleting categories (with validation) |
| `canCreateBusinessSubcategories` | Create Subcategories | Allows creating new subcategories |
| `canEditBusinessSubcategories` | Edit Subcategories | Allows modifying existing subcategories |
| `canDeleteBusinessSubcategories` | Delete Subcategories | Allows deleting subcategories (with validation) |

---

## Database Schema Changes

### 1. Update `UserPermissions` Table

The following permissions have been added to the `UserPermissions` type definition:

```typescript
// src/types/permissions.ts
export interface UserPermissions {
  // ... existing permissions

  // Business Expense Categories (NEW)
  canCreateBusinessCategories?: boolean;
  canEditBusinessCategories?: boolean;
  canDeleteBusinessCategories?: boolean;
  canCreateBusinessSubcategories?: boolean;
  canEditBusinessSubcategories?: boolean;
  canDeleteBusinessSubcategories?: boolean;
}
```

### 2. Database Migration

**Migration File:** `prisma/migrations/20251024164645_add_emoji_lookup_table/migration.sql`

A new `emoji_lookup` table has been created:

```sql
CREATE TABLE "emoji_lookup" (
  "id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "source" TEXT NOT NULL,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "emoji_lookup_emoji_idx" ON "emoji_lookup"("emoji");
CREATE INDEX "emoji_lookup_name_idx" ON "emoji_lookup"("name");
CREATE INDEX "emoji_lookup_source_idx" ON "emoji_lookup"("source");
```

**Seed Migration:** `prisma/migrations/20251026102753_seed_emoji_lookup_database/migration.sql`

Initial emoji data has been seeded for common use cases.

---

## Granting Permissions

### Option 1: Through Admin UI

1. Navigate to **Admin** → **User Management**
2. Click on a user to edit
3. Scroll to **Business Expense Categories** section
4. Check the desired permissions:
   - ☑️ Create Categories
   - ☑️ Edit Categories
   - ☑️ Delete Categories
   - ☑️ Create Subcategories
   - ☑️ Edit Subcategories
   - ☑️ Delete Subcategories
5. Click **Save Changes**

### Option 2: Direct Database Update

```sql
-- Grant all category permissions to a user
UPDATE "UserPermissions"
SET
  "canCreateBusinessCategories" = true,
  "canEditBusinessCategories" = true,
  "canDeleteBusinessCategories" = true,
  "canCreateBusinessSubcategories" = true,
  "canEditBusinessSubcategories" = true,
  "canDeleteBusinessSubcategories" = true
WHERE "userId" = 'user-id-here';
```

### Option 3: Bulk Grant via SQL

```sql
-- Grant to all managers
UPDATE "UserPermissions" up
SET
  "canCreateBusinessCategories" = true,
  "canEditBusinessCategories" = true,
  "canDeleteBusinessCategories" = true,
  "canCreateBusinessSubcategories" = true,
  "canEditBusinessSubcategories" = true,
  "canDeleteBusinessSubcategories" = true
FROM "Users" u
WHERE up."userId" = u.id
AND u.role = 'manager';
```

---

## Permission Scenarios

### Scenario 1: Finance Manager (Full Access)

**Role:** Manages expense structure for entire organization

**Permissions:**
- ✅ Create Categories
- ✅ Edit Categories
- ✅ Delete Categories
- ✅ Create Subcategories
- ✅ Edit Subcategories
- ✅ Delete Subcategories

**Use Case:** Can fully manage the expense category hierarchy

---

### Scenario 2: Department Lead (Limited Access)

**Role:** Can add subcategories to existing categories

**Permissions:**
- ❌ Create Categories
- ❌ Edit Categories
- ❌ Delete Categories
- ✅ Create Subcategories
- ✅ Edit Subcategories
- ❌ Delete Subcategories

**Use Case:** Can organize subcategories within existing structure but cannot modify top-level categories

---

### Scenario 3: Data Entry Clerk (No Access)

**Role:** Only records expenses using existing categories

**Permissions:**
- ❌ All permissions disabled

**Use Case:** Can view all categories for expense coding but cannot modify them

---

### Scenario 4: System Administrator (Auto-Grant)

**Role:** Full system access

**Permissions:**
- ✅ All permissions (automatic via `isSystemAdmin` flag)

**Use Case:** Can perform any operation without explicit permission grants

---

## Permission Enforcement

### Frontend (UI Level)

- Action buttons (Add, Edit, Delete) are conditionally rendered
- Users without permissions see only the category hierarchy
- Permission checks use `hasUserPermission()` function

**Implementation:**
```typescript
// Example from src/app/business/categories/page.tsx
const canCreateCategories = hasUserPermission(session?.user, 'canCreateBusinessCategories');
const canEditCategories = hasUserPermission(session?.user, 'canEditBusinessCategories');
const canDeleteCategories = hasUserPermission(session?.user, 'canDeleteBusinessCategories');

{canCreateCategories && (
  <button onClick={handleCreate}>Add Category</button>
)}
```

### Backend (API Level)

- All API routes enforce server-side permission checks
- Returns HTTP 403 (Forbidden) if permission missing
- System admins bypass all permission checks

**Implementation:**
```typescript
// Example from src/app/api/business/categories/route.ts
if (!hasUserPermission(user, 'canCreateBusinessCategories')) {
  return NextResponse.json(
    { error: 'Forbidden' },
    { status: 403 }
  );
}
```

---

## Verifying Permission Setup

### Test 1: Check Permission Visibility

1. Log in as a test user
2. Navigate to **Business Categories**
3. Verify buttons match granted permissions:
   - No permissions = View-only mode
   - Create permissions = "Add" buttons visible
   - Edit permissions = "Edit" buttons visible
   - Delete permissions = "Delete" buttons visible

### Test 2: API Access Test

```bash
# Test with curl (replace with your session token)
curl -X POST https://your-domain.com/api/business/categories \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "domainId": "domain-id",
    "name": "Test Category",
    "emoji": "📁",
    "color": "#3B82F6"
  }'

# Expected responses:
# - With permission: 200 OK + created category
# - Without permission: 403 Forbidden
```

### Test 3: Permission Hierarchy

1. Grant only `canCreateBusinessCategories`
2. Verify user can create categories but not delete them
3. Verify subcategory buttons are hidden (need subcategory permissions)

---

## Troubleshooting

### Problem: User has permission but can't see buttons

**Solutions:**
1. Clear browser cache and reload
2. Check database: `SELECT * FROM "UserPermissions" WHERE "userId" = 'user-id'`
3. Verify session is current (log out and back in)
4. Check browser console for JavaScript errors

### Problem: Permission changes not taking effect

**Solutions:**
1. User needs to log out and log back in (new session)
2. Verify database update was successful
3. Check for typos in permission key names
4. Ensure user is not a system admin (they bypass checks)

### Problem: API returns 403 but user has permission

**Solutions:**
1. Check exact permission key being tested
2. Verify backend is checking correct permission
3. Review server logs for permission check failures
4. Confirm user record has `UserPermissions` entry

---

## Best Practices

### 1. Principle of Least Privilege

- Grant only the minimum permissions needed for each role
- Start with view-only access and add permissions as needed
- Regularly review and audit user permissions

### 2. Role-Based Assignment

Create standard permission sets for common roles:

```sql
-- Create a function to grant standard roles
CREATE OR REPLACE FUNCTION grant_finance_manager_permissions(user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE "UserPermissions"
  SET
    "canCreateBusinessCategories" = true,
    "canEditBusinessCategories" = true,
    "canDeleteBusinessCategories" = true,
    "canCreateBusinessSubcategories" = true,
    "canEditBusinessSubcategories" = true,
    "canDeleteBusinessSubcategories" = true
  WHERE "userId" = user_id;
END;
$$ LANGUAGE plpgsql;
```

### 3. Documentation

- Document which roles have which permissions
- Keep a changelog of permission grants
- Train users on what they can and cannot do

### 4. Testing

- Test permission combinations before granting to production users
- Create test accounts for each permission scenario
- Verify both UI and API enforcement

---

## Security Considerations

### Server-Side Enforcement

✅ **All API routes must check permissions server-side**
- Never trust client-side permission checks alone
- Always validate on the server before data modification

### Audit Logging

Consider implementing audit logs for:
- Category creation/modification/deletion
- Permission grants and revocations
- Failed permission attempts

```typescript
// Example audit log entry
await prisma.auditLog.create({
  data: {
    userId: user.id,
    action: 'DELETE_CATEGORY',
    resourceType: 'EXPENSE_CATEGORY',
    resourceId: categoryId,
    status: 'BLOCKED',
    reason: 'Missing permission: canDeleteBusinessCategories',
    timestamp: new Date(),
  },
});
```

### Rate Limiting

Consider implementing rate limits on API endpoints:
- Prevent abuse of create/delete operations
- Limit frequency of mass updates

---

## Migration Checklist

When deploying to production:

- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Verify `emoji_lookup` table created successfully
- [ ] Check seed data loaded: `SELECT COUNT(*) FROM emoji_lookup;`
- [ ] Grant initial permissions to administrators
- [ ] Test permission enforcement on staging environment
- [ ] Document organization's permission standards
- [ ] Train administrators on permission management
- [ ] Create test user accounts for validation
- [ ] Verify frontend buttons render correctly
- [ ] Test API endpoints with various permission combinations
- [ ] Monitor logs for permission-related errors

---

## Support Contacts

For permission-related issues:

- **Technical Issues:** IT Support Team
- **Permission Requests:** Department Managers
- **System Admin Issues:** System Administrator
- **Bug Reports:** Development Team

---

## Appendix A: Permission Keys Reference

```typescript
// Complete list of permission keys (copy for documentation)
export const BUSINESS_CATEGORY_PERMISSIONS = {
  CREATE_CATEGORY: 'canCreateBusinessCategories',
  EDIT_CATEGORY: 'canEditBusinessCategories',
  DELETE_CATEGORY: 'canDeleteBusinessCategories',
  CREATE_SUBCATEGORY: 'canCreateBusinessSubcategories',
  EDIT_SUBCATEGORY: 'canEditBusinessSubcategories',
  DELETE_SUBCATEGORY: 'canDeleteBusinessSubcategories',
} as const;
```

---

## Appendix B: SQL Queries for Common Tasks

### Check User's Current Permissions
```sql
SELECT
  u.name,
  u.email,
  up."canCreateBusinessCategories",
  up."canEditBusinessCategories",
  up."canDeleteBusinessCategories",
  up."canCreateBusinessSubcategories",
  up."canEditBusinessSubcategories",
  up."canDeleteBusinessSubcategories"
FROM "Users" u
LEFT JOIN "UserPermissions" up ON u.id = up."userId"
WHERE u.email = 'user@example.com';
```

### List All Users with Category Permissions
```sql
SELECT
  u.name,
  u.email,
  u.role,
  CASE
    WHEN up."canCreateBusinessCategories" THEN 'Create'
    ELSE '-'
  END AS create_perm,
  CASE
    WHEN up."canEditBusinessCategories" THEN 'Edit'
    ELSE '-'
  END AS edit_perm,
  CASE
    WHEN up."canDeleteBusinessCategories" THEN 'Delete'
    ELSE '-'
  END AS delete_perm
FROM "Users" u
LEFT JOIN "UserPermissions" up ON u.id = up."userId"
WHERE
  up."canCreateBusinessCategories" = true
  OR up."canEditBusinessCategories" = true
  OR up."canDeleteBusinessCategories" = true
ORDER BY u.name;
```

### Revoke All Category Permissions from User
```sql
UPDATE "UserPermissions"
SET
  "canCreateBusinessCategories" = false,
  "canEditBusinessCategories" = false,
  "canDeleteBusinessCategories" = false,
  "canCreateBusinessSubcategories" = false,
  "canEditBusinessSubcategories" = false,
  "canDeleteBusinessSubcategories" = false
WHERE "userId" = 'user-id-here';
```

---

**End of Permission Setup Guide**
