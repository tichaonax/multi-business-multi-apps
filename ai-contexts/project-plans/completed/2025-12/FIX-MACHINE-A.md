# Fix One-Way Peer Discovery - Instructions for Machine A (DESKTOP-GC8RGAN)

**Machine:** DESKTOP-GC8RGAN (the machine that Machine B cannot see)
**Date:** 2025-11-06
**Issue:** One-way peer discovery - Machine B cannot discover Machine A

## Problem

- ✅ Machine A CAN see Machine B (dell-hwandaza)
- ❌ Machine B CANNOT see Machine A
- Root Cause: Windows Firewall on Machine A is blocking incoming UDP multicast on port 5353

## Step-by-Step Fix

### Step 1: Check Current Firewall Rules

Open PowerShell (regular, not admin yet) and run:

```powershell
cd C:\Users\[YOUR_USERNAME]\apps\multi-business-multi-apps
node scripts/check-sync-firewall.js
```

Look for rules named "Multi-Business Sync Discovery". If you see "No sync-related firewall rules found", proceed to Step 2.

### Step 2: Check Network Interface

Still in PowerShell, run:

```powershell
node scripts/check-network-interfaces.js
```

**Verify:**
- You should see Wi-Fi or Ethernet with Priority 100 marked as "HIGHEST (Will be selected)"
- The IP address should be 192.168.0.x (same subnet as Machine B: 192.168.0.114)
- If you see Tailscale or VPN as highest priority, temporarily disable it

**Expected Output:**
```
✅ SELECTED INTERFACE
   Name: Wi-Fi (or Ethernet)
   IP Address: 192.168.0.XXX
   Priority: 100
   🟢 HIGHEST (Will be selected)
```

### Step 3: Add Firewall Rules

**IMPORTANT: Open PowerShell as Administrator**
- Press Windows Key
- Type "PowerShell"
- Right-click "Windows PowerShell"
- Select "Run as administrator"

Run these commands:

```powershell
# Navigate to project directory
cd C:\Users\[YOUR_USERNAME]\apps\multi-business-multi-apps

# Add inbound rule for UDP multicast discovery (port 5353)
New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery" `
  -Direction Inbound -Protocol UDP -LocalPort 5353 -Action Allow

# Add inbound rule for TCP sync data transfer (port 8765)
New-NetFirewallRule -DisplayName "Multi-Business Sync Data" `
  -Direction Inbound -Protocol TCP -LocalPort 8765 -Action Allow

# Add outbound rule for completeness
New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery Out" `
  -Direction Outbound -Protocol UDP -RemotePort 5353 -Action Allow
```

**Expected Output:**
```
Name                  : Multi-Business Sync Discovery
DisplayName           : Multi-Business Sync Discovery
Description           :
DisplayGroup          :
Group                 :
Enabled               : True
Profile               : Any
Platform              : {}
Direction             : Inbound
Action                : Allow
...
```

### Step 4: Verify Firewall Rules Were Added

```powershell
node scripts/check-sync-firewall.js
```

**Expected Output:**
```
✅ Found firewall rules:
Rule Name:                            Multi-Business Sync Discovery
LocalPort:                            5353
...
```

### Step 5: Restart Sync Service

```powershell
npm run sync-service:restart
```

**Expected Output:**
```
Stopping sync service...
Service stopped successfully
Starting sync service...
Service started successfully
```

### Step 6: Check Sync Service Logs

Wait 30 seconds, then check the logs:

```powershell
tail -50 data/sync/sync-service.log
```

**Look for:**
- `"Selected IP 192.168.0.XXX from interface Wi-Fi"` - Should show your Wi-Fi IP
- `"Joining multicast group 224.0.0.251"` - Should show successful join
- `"Broadcasting presence"` - Should show regular broadcasts

### Step 7: Verify Bidirectional Discovery

After 1-2 minutes, check if Machine B discovered you:

On **Machine B** (dell-hwandaza), someone should run:
```bash
tail -50 data/sync/sync-service.log | grep "Discovered new peer"
```

**Success looks like:**
```
{"message":"Discovered new peer: sync-node-DESKTOP-GC8RGAN (node-id-here)"}
```

## Testing (Optional but Recommended)

### Test 1: Send Multicast from Machine A

On Machine A, open a PowerShell terminal:

```powershell
# Stop sync service first to free port 5353
npm run sync-service:stop

# Run sender test
node scripts/test-udp-multicast-sender.js
```

**Expected Output:**
```
✅ Sent message 1 at [timestamp]
   From: 192.168.0.XXX (Wi-Fi)
   To: 224.0.0.251:5353
```

### Test 2: Receive on Machine B

On **Machine B**, have someone run:

```bash
# Stop sync service to free port 5353
npm run sync-service:stop

# Run receiver test
node scripts/test-udp-multicast-receiver.js
```

**Expected Output:**
```
✅ Received message 1 at [timestamp]
   From: 192.168.0.XXX:5353
   Type: test
   Sender: 192.168.0.XXX (Wi-Fi)
   Hostname: DESKTOP-GC8RGAN
```

If you see messages being received, **the fix worked!**

### Test 3: Restart Services

After testing, restart sync services on both machines:

**Machine A:**
```powershell
npm run sync-service:start
```

**Machine B:**
```bash
npm run sync-service:start
```

## Verification Checklist

After completing all steps, verify:

- [ ] Firewall rules added successfully (Step 4)
- [ ] Sync service restarted (Step 5)
- [ ] Machine A using correct network interface (Wi-Fi or Ethernet, 192.168.0.x)
- [ ] Machine B can see Machine A in logs (Step 7)
- [ ] Both machines showing "Sync completed" with data transfer (not just 0,0)
- [ ] Test data syncs between machines

## Success Criteria

When working correctly, you should see in the logs on **both machines**:

```json
{"message":"Discovered new peer: sync-node-[OTHER_MACHINE]"}
{"message":"Sync completed with sync-node-[OTHER_MACHINE]: sent X, received Y"}
```

Where X and Y are actual numbers when data changes.

## Troubleshooting

### Still not working after firewall rules?

1. **Check if VPN is interfering:**
   - Temporarily disable Tailscale/VPN
   - Restart sync service
   - Test again

2. **Check if on same network:**
   - Both machines should be on 192.168.0.x subnet
   - Both should be on same Wi-Fi network or same physical network

3. **Check router settings:**
   - Some routers block multicast by default
   - Look for "IGMP Snooping" settings (should be enabled)
   - Look for "AP Isolation" or "Client Isolation" (should be disabled)

4. **Check Windows Firewall profiles:**
   - Make sure the network is set to "Private" not "Public"
   - Public networks have stricter firewall rules

5. **Temporarily disable firewall for testing:**
   ```powershell
   # TESTING ONLY - Don't leave disabled!
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

   # Test sync discovery
   # ... test here ...

   # Re-enable firewall
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
   ```

### Get Help

If still having issues after all steps:

1. Run diagnostics and save output:
   ```powershell
   node scripts/check-sync-firewall.js > firewall-check.txt
   node scripts/check-network-interfaces.js > network-check.txt
   tail -100 data/sync/sync-service.log > sync-log.txt
   ```

2. Share the three .txt files for analysis

## Quick Reference

**Firewall Rules to Add:**
```powershell
New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery" -Direction Inbound -Protocol UDP -LocalPort 5353 -Action Allow
New-NetFirewallRule -DisplayName "Multi-Business Sync Data" -Direction Inbound -Protocol TCP -LocalPort 8765 -Action Allow
New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery Out" -Direction Outbound -Protocol UDP -RemotePort 5353 -Action Allow
```

**Check Firewall:**
```powershell
node scripts/check-sync-firewall.js
```

**Check Network:**
```powershell
node scripts/check-network-interfaces.js
```

**Restart Sync:**
```powershell
npm run sync-service:restart
```

**Check Logs:**
```powershell
tail -50 data/sync/sync-service.log
```

---

**Once Machine A is fixed, both machines should discover each other automatically within 30-60 seconds.**
