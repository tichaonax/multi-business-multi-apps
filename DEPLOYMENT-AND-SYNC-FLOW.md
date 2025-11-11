# Deployment and Sync Flow

## Deployment Process (AUTOMATIC)

### What Happens During Deployment
1. **Code Update**: `git pull` gets latest code
2. **Dependencies**: `npm install` updates packages
3. **Database Schema**: `npx prisma generate` regenerates Prisma client
4. **Build**: `npm run build` builds Next.js application
5. **Service Restart**: Service restarts with new code

### What DOES NOT Happen
- ❌ Initial load does NOT run automatically
- ❌ No data transfer occurs
- ❌ No sync operations are triggered
- ❌ No API calls to `/api/admin/sync/initial-load`

## Initial Load (MANUAL ONLY)

### When to Run Initial Load
- **After deployment completes** on the target server
- **Only when you want to** sync data from source to target
- **Run from the Admin UI** on the SOURCE machine (the one WITH data)

### How to Trigger Initial Load

#### Option 1: From Web UI (Recommended)
1. Open browser on SOURCE machine (has the data)
2. Navigate to: `http://localhost:8080/admin/sync`
3. Click "Initial Load" tab
4. Select target peer from list
5. Click "Start Initial Load" button
6. Monitor progress in real-time

#### Option 2: From API (Advanced)
```bash
curl -X POST http://localhost:8080/api/admin/sync/initial-load \
  -H "Content-Type: application/json" \
  -d '{
    "action": "initiate",
    "targetPeer": {
      "nodeId": "target-node-id",
      "ipAddress": "192.168.0.114"
    }
  }'
```

## Correct Deployment Flow

### On Target Server (NEW empty database)
```bash
# 1. Deploy code
git pull
npm install
npx prisma generate
npm run build

# 2. Restart service
npm run service:restart

# 3. Verify service is running
npm run service:status

# 4. DO NOT run initial load here
# Initial load is triggered FROM the source machine
```

### On Source Server (HAS data to sync)
```bash
# 1. Ensure code is up to date (optional)
git pull
npm install
npx prisma generate
npm run build
npm run service:restart

# 2. Wait for target server to be ready
# Verify target is accessible: http://192.168.0.114:8080

# 3. Trigger initial load from UI
# Open http://localhost:8080/admin/sync
# Click "Initial Load" tab
# Select target peer
# Click "Start Initial Load"
```

## What Triggers Initial Load?

Initial load ONLY triggers when:
1. ✅ User clicks "Start Initial Load" button in Admin UI
2. ✅ API call to POST `/api/admin/sync/initial-load` with `action: "initiate"`
3. ❌ NEVER during deployment
4. ❌ NEVER during service startup
5. ❌ NEVER automatically

## Common Mistakes

### ❌ WRONG: Running initial load during deployment
```bash
# DO NOT DO THIS
git pull && npm run service:restart && curl -X POST .../initial-load
```

### ✅ CORRECT: Sequential deployment then manual sync
```bash
# Step 1: Deploy on target
ssh target-server
git pull && npm install && npm run build && npm run service:restart

# Step 2: Wait for target to be ready
# Check: http://192.168.0.114:8080

# Step 3: Trigger sync from source UI
# Open browser on source: http://localhost:8080/admin/sync
# Click "Start Initial Load"
```

## Error You Saw

The error you saw:
```
📦 Starting transfer for 5 businesses
Background transfer error: Error [PrismaClientValidationError]:
Invalid `prisma.businessOrderItems.count()` invocation:
...where: { order: { businessId: ...
```

This means:
1. **Old deployed code** - Server has code with the schema bug (fixed in commit 44c9738)
2. **Someone triggered initial load** - Either:
   - You clicked "Start Initial Load" in the UI, OR
   - An API call was made to the endpoint, OR
   - A test script called the endpoint

## Solution

### Immediate Fix
1. Pull latest code: `git pull` (gets commit 17b855f with all fixes)
2. Install dependencies: `npm install`
3. Generate Prisma: `npx prisma generate`
4. Build: `npm run build`
5. Restart: `npm run service:restart`
6. **Wait for service to fully start**
7. **Then** go to Admin UI and manually trigger initial load

### Verify No Auto-Triggering
```bash
# Check no scripts automatically call initial load
grep -r "initial-load" scripts/

# Should only find test scripts, not deployment scripts
```

## Summary

- **Deployment**: Automatic, safe, no data transfer
- **Initial Load**: Manual only, triggered from Admin UI after deployment
- **Never** mix deployment and data sync in one operation
- Always deploy first, verify, then sync
