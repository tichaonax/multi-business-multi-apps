# Critical Fixes Deployment Guide

## Issues Found & Fixed

### 1. ❌ Invalid SyncOperation Error
**Error**: `Invalid value for argument 'operation'. Expected SyncOperation.`

**Root Cause**: The `UPSERT` value was not in the `SyncOperation` enum in Prisma schema.

**Fix**:
- Added `UPSERT` to `SyncOperation` enum
- Created migration: `20251111130349_add_upsert_to_sync_operation`
- Regenerated Prisma client

### 2. ❌ Too Many Database Connections
**Error**: `FATAL: sorry, too many clients already`

**Root Cause**: Multiple simultaneous initial loads were allowed, exhausting connection pool.

**Fix**:
- Added check for running sessions before starting new load
- Returns 409 Conflict if load already in progress
- Shows current session details to user

### 3. ⚠️  HXI Bhero Inventory Not Appearing
**Status**: Partially diagnosed with comprehensive logging added.

**Next Steps**: After deploying these fixes, the logging will show:
- Which businesses are being transferred
- How many products per business
- Any transfer failures with details

## Deployment Instructions

### ⚠️  CRITICAL: Must deploy to BOTH servers

### On Target Server (192.168.0.114):
```bash
# 1. Pull latest code (commit a274e2a)
git pull

# 2. Install dependencies
npm install

# 3. Generate Prisma client with UPSERT enum
npx prisma generate

# 4. Apply migration to add UPSERT enum
npx prisma migrate deploy

# 5. Build application
npm run build

# 6. Restart service
npm run service:restart

# 7. Verify service is running
npm run service:status
```

### On Source Server (192.168.0.112):
```bash
# 1. Pull latest code (commit a274e2a)
git pull

# 2. Install dependencies
npm install

# 3. Generate Prisma client with UPSERT enum
npx prisma generate

# 4. Apply migration to add UPSERT enum
npx prisma migrate deploy

# 5. Build application
npm run build

# 6. Restart service
npm run service:restart

# 7. Verify service is running
npm run service:status
```

## Testing After Deployment

### 1. Verify Both Servers Are Ready
- Source: http://localhost:8080 (on 192.168.0.112)
- Target: http://192.168.0.114:8080

### 2. Run Initial Load
1. Open browser on source server (192.168.0.112)
2. Navigate to: http://localhost:8080/admin/sync
3. Click "Initial Load" tab
4. Select target peer: 192.168.0.114
5. Click "Start Initial Load"

### 3. Monitor Progress
Watch the console/logs for:

```
=== BUSINESS FILTERING ===
Total businesses in database: 5
  ✅ INCLUDED: HXI Bhero (actual-business-id-here)
  ❌ FILTERED: demo-business (demo-id-here)

📦 Starting transfer for 5 non-demo businesses
Business IDs to transfer: id1, id2, id3...

=== TRANSFERRING PRODUCTS ===
Querying products for business IDs: id1, id2, id3...
Found 1074 products to transfer

Products per business:
  HXI Bhero ID: 1074 products

Progress: 10/2500 records (0%)
Progress: 20/2500 records (1%)
...
Progress: 2500/2500 records (100%)

=== TRANSFER COMPLETE ===
✅ Successfully transferred 2500 records
📊 Total data: 5242880 bytes
📦 Businesses: 5

Table counts:
  businesses: 5 records
  categories: 50 records
  products: 1074 records
  ...
```

### 4. Verify Data on Target
After transfer completes:
1. Login to target server: http://192.168.0.114:8080
2. Login as admin
3. Navigate to HXI Bhero business
4. Check inventory departments:
   - Should see 10 departments
   - Should see 1,074 total products
   - Products should be distributed across departments

### 5. Check for Errors
If you see any of these:
- ❌ `TRANSFER FAILED` - Shows which record and why
- ⚠️  `WARNING: No products found` - Products not being queried correctly
- ❌ `FILTERED: HXI Bhero` - Business being incorrectly filtered

## What's Fixed

✅ **UPSERT Operation**
- Initial load is now re-runnable
- No duplicates on re-run
- Updates existing records

✅ **Concurrency Control**
- Only one initial load at a time
- UI shows error if already running
- Prevents connection exhaustion

✅ **Comprehensive Logging**
- Shows which businesses are transferred
- Shows product counts per business
- Shows transfer progress
- Shows detailed errors

## What's Next

### If Initial Load Still Fails:
1. **Check logs** for the specific error
2. **Identify** which phase fails (filtering, transfer, receive)
3. **Share logs** showing:
   - `=== BUSINESS FILTERING ===` section
   - `=== TRANSFERRING PRODUCTS ===` section
   - Any `❌ TRANSFER FAILED` errors

### Remaining TODO:
- [ ] Add progress bar UI (visual feedback)
- [ ] Fix identified HXI Bhero issue based on logs
- [ ] Test re-runnability (run initial load twice)
- [ ] Verify periodic sync picks up changes

## Commits Included

- `67a03d5` - Deployment and sync flow documentation
- `2ace30e` - Comprehensive logging for diagnosis
- `a274e2a` - UPSERT enum and concurrency fixes

## Migration Notes

The migration `20251111130349_add_upsert_to_sync_operation` is safe to run multiple times:
```sql
ALTER TYPE "SyncOperation" ADD VALUE IF NOT EXISTS 'UPSERT';
```

The `IF NOT EXISTS` clause prevents errors if UPSERT already exists.
