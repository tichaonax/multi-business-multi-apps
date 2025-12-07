# Admin User Fixed ID - All Changes

## Problem
Admin user was being created with random UUIDs on each install, causing FK constraint violations during restore.

## Solution  
Changed all admin user creation to use fixed ID: `admin-system-user-default`

## Files Changed

### 1. scripts/install/install-database.js (Line 718)
```javascript
id: 'admin-system-user-default',  // Fixed ID for system admin
```

### 2. scripts/create-admin.js (Line 31)
```javascript
id: SYSTEM_ADMIN_ID,  // Fixed ID for system admin
```
Where `SYSTEM_ADMIN_ID = 'admin-system-user-default'`

### 3. scripts/seed-permission-templates.js (Line 168)
```javascript
id: 'admin-system-user-default',  // Fixed ID for system admin
```

### 4. scripts/seed-migration-data.js (Line 362) **JUST FIXED**
```javascript
id: 'admin-system-user-default',  // Fixed ID for system admin
```

## Testing Required
1. Delete database
2. Fresh install (creates admin with fixed ID)
3. Seed (creates data referencing fixed admin ID)
4. Backup
5. Delete database
6. Fresh install again (creates admin with SAME fixed ID)
7. Restore backup
8. Validate - should work!
