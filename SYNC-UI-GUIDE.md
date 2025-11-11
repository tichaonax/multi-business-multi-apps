# Sync UI Guide - Initial Load Explained

## Overview
The Sync Management page (`/admin/sync`) provides a comprehensive interface for managing data synchronization between multiple server nodes. The **Initial Load** feature is specifically designed for transferring all data from one server to another (usually when setting up a new server).

## Accessing the Sync UI

1. Navigate to: `http://localhost:8080/admin/sync`
2. Click on the **"Initial Load"** tab

---

## Understanding the Initial Load UI

### What is "Initial Load"?
**Initial Load** is a one-time, bulk data transfer operation that sends ALL your data from one server (source) to another server (target). This is different from regular sync which only transfers changes incrementally.

### When to Use Initial Load
- ✅ Setting up a new server that needs a complete copy of existing data
- ✅ Restoring data to a server that lost its database
- ✅ Creating a new replica/backup server

### When NOT to Use Initial Load
- ❌ For ongoing synchronization (use the automatic sync service instead)
- ❌ If both servers already have data (could cause duplicates)
- ❌ For transferring individual records (use regular sync)

---

## The UI Components Explained

### 1. **Target Peer Dropdown**
```
┌─────────────────────────────────────────────┐
│ Target Peer: sync-node-DESKTOP-GC8RGAN     │
│              (192.168.0.112) - Online       │
└─────────────────────────────────────────────┘
```

**What it means:**
- Lists all discovered peer servers on your network
- Shows their name, IP address, and online status
- **You select WHERE to send the data TO**

**Important:** The data flows FROM this machine (where you're viewing the UI) TO the selected peer.

### 2. **Description Text**
```
"Will send data from this machine to sync-node-DESKTOP-GC8RGAN"
```

**This clearly tells you the direction:**
- **Source:** THIS machine (where you're running the browser)
- **Target:** The selected peer server
- **Direction:** Source → Target (one-way transfer)

### 3. **Create Snapshot Button**
```
┌────────────────────────┐
│ 💾 Create Snapshot     │
└────────────────────────┘
```

**What it does:**
- Analyzes your current database
- Counts how many records you have
- Shows you what will be transferred
- **Does NOT transfer anything yet** - just prepares a report

**When to use:**
- Before initiating a load to see data size
- To verify what will be sent
- Optional - not required for the transfer

### 4. **Initiate Load Button**
```
┌─────────────────────────────────────────────────┐
│ ⬆️ Initiate Load to sync-node-DESKTOP-GC8RGAN │
└─────────────────────────────────────────────────┘
```

**What it does:**
- Starts the actual data transfer
- Sends ALL businesses (except demo data) to the target peer
- Includes product images with base64-encoded file content
- Runs in the background with progress tracking
- **This is the main action button**

**Disabled when:**
- No peer is selected
- Selected peer is offline/unreachable

---

## Step-by-Step: How to Do an Initial Load

### Scenario: You want to copy data from Server A to Server B

#### On Server B (EMPTY server that needs data):
1. Make sure the Next.js app is running
2. Verify it's reachable on port 8080
3. That's it! Server B just needs to be online and ready to receive

#### On Server A (HAS data - source):
1. Open browser and go to `http://SERVER_A_IP:8080/admin/sync`
2. Click the **"Initial Load"** tab
3. In the **Target Peer** dropdown, select **Server B**
   - Example: `sync-node-DESKTOP-GC8RGAN (192.168.0.112) - Online`
4. Verify the message says: "Will send data from this machine to [Server B]"
5. **(Optional)** Click **"Create Snapshot"** to preview what will be sent
6. Click **"Initiate Load to [Server B]"**
7. Watch the progress in real-time on the page

### What Gets Transferred?
- ✅ All **businesses** (excluding demo businesses)
- ✅ All **product images** (metadata + actual image files as base64)
- ✅ Business metadata (name, type, address, contact info)
- ❌ Demo businesses (filtered out automatically)
- ❌ User accounts (not transferred for security)
- ❌ Sync history and logs

---

## Progress Monitoring

Once initiated, you'll see a session card showing:

```
┌──────────────────────────────────────────────────────────┐
│ 🔄 TRANSFERRING                                          │
│ sync-node-dell-hwandaza → sync-node-DESKTOP-GC8RGAN     │
│                                                           │
│ Transferred 150 of 200 records                           │
│ [████████████████░░░░░░░░] 75%                          │
│                                                           │
│ Est. 2m 30s remaining                                    │
└──────────────────────────────────────────────────────────┘
```

**Status meanings:**
- **PREPARING** 🕐 - Gathering data from database
- **TRANSFERRING** 🔄 - Actively sending data to target
- **VALIDATING** ✓ - Verifying data integrity
- **COMPLETED** ✅ - Transfer successful
- **FAILED** ❌ - Error occurred (check error message)

---

## Important Notes

### 1. **Direction is Critical**
- Initial Load always sends FROM the machine running the UI TO the selected peer
- If you want to send data from Server A to Server B, run the UI on Server A
- Cannot "pull" data from a remote server (must "push" from source)

### 2. **Demo Data is Excluded**
The system automatically filters out demo businesses based on ID patterns:
- IDs ending with `-demo`
- IDs starting with `demo-`
- IDs containing `-demo-business`

### 3. **Network Requirements**
- Both servers must be on the same network (or have network connectivity)
- Target server must be accessible on port **8080**
- Firewalls should allow HTTP traffic between servers

### 4. **Database Impact**
- Source database: Read-only, no changes
- Target database: Records are inserted (could duplicate if data already exists)
- **Best used when target database is empty**

### 5. **Speed**
- Transfer speed depends on:
  - Number of records
  - Size of product images
  - Network bandwidth
  - Server performance
- Typical: 50-100 records per second
- With images: slower due to base64 encoding

---

## Troubleshooting

### "No sync peers found"
**Problem:** Target server isn't discovered
**Solutions:**
1. Ensure target server Next.js app is running
2. Check both servers are on same network
3. Verify sync service is running: `npm run service:status`
4. Check firewall settings

### "Peer is offline/disabled"
**Problem:** Selected peer is not responding
**Solutions:**
1. Restart target server
2. Check port 8080 is accessible
3. Verify no port conflicts

### Transfer stuck at 0%
**Problem:** Transfer started but no progress
**Solutions:**
1. Check target server logs for errors
2. Verify `/api/sync/receive` endpoint is working
3. Check SYNC_REGISTRATION_KEY matches on both servers
4. Review browser console for fetch errors

### Duplicate data on target
**Problem:** Running initial load multiple times
**Solution:** Initial load doesn't check for existing records - it always inserts. Clear target database before retrying.

---

## Quick Reference Commands

```bash
# Check sync service status
npm run service:status

# View recent sync sessions
node scripts/check-sync-peers.js

# Verify sync API is working
node scripts/verify-sync-ready.js

# Test connectivity to peer
node scripts/test-peer-api-status.js
```

---

## Summary

**To transfer data from Server A to Server B:**

1. Server B must be running (empty/ready to receive)
2. On Server A: Open `/admin/sync` → Initial Load tab
3. Select Server B from dropdown
4. Click "Initiate Load to [Server B]"
5. Monitor progress until COMPLETED

The UI always shows **from this machine → to selected peer**.
