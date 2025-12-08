# Restore Failure Analysis

## Executive Summary
The backup is **valid** but restore fails due to **2 separate issues** that need fixing in the restore process.

---

## Issue 1: businessCategories Duplicates (2 records)

### Error
```
Unique constraint failed on (businessType, domainId, name)
```

### Root Cause
**Timeline of Events:**
1. **Before Dec 8**: Schema had `@@unique([businessType, name])`
2. **Dec 7-8**: Migration changed to `@@unique([businessType, domainId, name])`
3. **Dec 8**: Seeding scripts still used old constraint name `businessType_name`
4. **User created backup** containing data from mixed state

**How Duplicates Occurred:**
- Backup contains records with same (businessType, domainId, name) but different IDs
- These likely exist because:
  - Data was inserted when constraint was being transitioned
  - OR seeding scripts ran multiple times in inconsistent state
  - OR database had duplicates that violated new constraint but weren't cleaned up

### Current Restore Logic (BROKEN)
```javascript
// Line 280 in restore-clean.ts
await model.upsert({
  where: { id: recordId },  // ← Upserts by ID only
  create: record,
  update: record
})
```

**Why it fails:**
- Record A: `upsert(id=X)` → Creates X ✅
- Record B: `upsert(id=Y)` → Tries to create Y, but (businessType, domainId, name) already exists ❌

### Fix Required
Use composite unique key for upsert (like emojiLookup does):
```javascript
if (tableName === 'businessCategories') {
  await model.upsert({
    where: {
      businessType_domainId_name: {
        businessType: record.businessType,
        domainId: record.domainId,
        name: record.name
      }
    },
    create: record,
    update: record
  })
}
```

**Impact:** 2 duplicate records will be merged into 1 during restore

---

## Issue 2: productVariants Foreign Key Violations (MANY records)

### Error
```
Foreign key constraint violated: product_variants_productId_fkey
```

### Root Cause
**Restore Order Bug** - productVariants restored BEFORE their parent products

**Current table order in restore:**
```
1. ... (other tables)
2. productVariants  ← Tries to reference products that don't exist yet!
3. ... (more tables)
4. businessProducts ← Parent table restored AFTER children
```

### Expected Behavior
Dependencies must be restored in order:
```
1. businessProducts  ← Parent FIRST
2. productVariants   ← Children AFTER
```

### Fix Required
Check dependency order in `getTableDependencyOrder()` function in `restore-clean.ts`

**Impact:** All product variants fail to restore until dependency order is fixed

---

## Recommendations

### Immediate Fixes
1. ✅ **Add businessCategories special handling** (prevents duplicate errors)
2. ✅ **Fix table dependency order** (ensures parents before children)

### Data Cleanup (Optional)
- After fixing restore, consider running cleanup script to remove duplicate categories from backup data
- This is optional since the upsert fix will handle it

### Prevention
- ✅ Already fixed: Seeding scripts now use correct constraint (commit c8683c5)
- All new backups will not have this issue

---

## Backup Validity: ✅ VALID
The backup data is **structurally sound**. Issues are:
- 2 duplicate category records (can be merged via upsert)
- Restore process bug (wrong table order)

**Data loss risk:** NONE - All data is recoverable with proper restore logic
