# Sync Service - One-Time Setup Guide

This guide covers the complete one-time setup required on EACH machine where you want to enable database synchronization.

## Why Service Doesn't Auto-Start

**BY DESIGN**: The Windows service installation does NOT automatically start the service. This is intentional to allow you to:
1. Verify the installation
2. Configure environment variables
3. Set up firewall rules
4. Manually start when ready

After installation, you MUST manually start the service once.

---

## Prerequisites (One-Time Per Machine)

### 1. Windows Firewall Configuration

**CRITICAL**: The sync service requires network access for peer discovery and data synchronization.

#### Option A: Automated Firewall Setup (PowerShell as Administrator)

```powershell
# Allow sync service through Windows Firewall
New-NetFirewallRule -DisplayName "Multi-Business Sync Service" -Direction Inbound -Protocol TCP -LocalPort 8765 -Action Allow
New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery" -Direction Inbound -Protocol UDP -LocalPort 5353 -Action Allow
```

#### Option B: Manual Firewall Setup

1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. **Rule Type**: Port
4. **Protocol**: TCP, **Specific local ports**: 8765
5. **Action**: Allow the connection
6. **Profile**: Check all (Domain, Private, Public)
7. **Name**: Multi-Business Sync Service
8. Repeat steps 2-7 for UDP port 5353 (name it "Multi-Business Sync Discovery")

### 2. Environment Variables Configuration

Add these to your **system environment variables** or `.env` file:

```bash
# REQUIRED: Unique registration key for sync security
# MUST BE THE SAME on all machines you want to sync
SYNC_REGISTRATION_KEY=your-secure-unique-key-change-this

# Optional: Sync service port (default: 8765)
SYNC_PORT=8765

# Optional: How often to sync in milliseconds (default: 30000 = 30 seconds)
SYNC_INTERVAL=30000

# Optional: Log level (info, debug, warn, error)
LOG_LEVEL=info

# Optional: Directory for sync data and logs
SYNC_DATA_DIR=./data/sync
```

**⚠️ SECURITY WARNING**:
- Change `SYNC_REGISTRATION_KEY` from the default!
- Use the SAME key on all machines that should sync together
- Do NOT use the default value in production

#### To Set System Environment Variables (Windows):

1. Press `Win + X` → System
2. Click **Advanced system settings**
3. Click **Environment Variables**
4. Under **System variables**, click **New**
5. Add each variable above

OR use PowerShell (as Administrator):

```powershell
[System.Environment]::SetEnvironmentVariable('SYNC_REGISTRATION_KEY', 'your-secure-key-here', 'Machine')
[System.Environment]::SetEnvironmentVariable('SYNC_PORT', '8765', 'Machine')
```

---

## Complete Setup Workflow (Run on Each Machine)

### Step 1: Fresh Install the Application

```bash
# Pull latest code
git pull

# Run fresh installation
npm run setup
```

### Step 2: Build the Sync Service

```bash
npm run build:service
```

This compiles the TypeScript sync service to `dist/service/`.

### Step 3: Install Windows Service

**Run as Administrator:**

```bash
npm run service:install
```

**Expected Output:**
```
✅ Hybrid service installed successfully!
📋 Service Details:
   Name: MultiBusinessSyncService
   Description: Background database synchronization service...

🚀 Usage:
   Start:        npm run service:start
   Stop:         npm run service:stop
   Status:       npm run service:status
```

**⚠️ NOTE**: The service is installed but NOT started automatically!

### Step 4: Start the Service (REQUIRED)

**Run as Administrator:**

```bash
npm run service:start
```

**Expected Output:**
```
Service started successfully
```

### Step 5: Verify Service is Running

```bash
npm run service:status
```

**Expected Output:**
```
Service Status: RUNNING
Configuration:
  - Port: 8765
  - Registration Key: [configured]
  - Sync Interval: 30000ms
```

---

## Multi-Machine Sync Setup

To enable synchronization between multiple machines:

### Machine 1 (Primary)

1. Complete all steps above
2. Set `SYNC_REGISTRATION_KEY=my-shared-secret-key`
3. Note the machine's IP address: `ipconfig` → IPv4 Address
4. Start the service: `npm run service:start`

### Machine 2 (Secondary)

1. Complete all steps above
2. **Use the SAME** `SYNC_REGISTRATION_KEY=my-shared-secret-key`
3. Start the service: `npm run service:start`
4. Wait 30-60 seconds for peer discovery

### Verify Machines Can See Each Other

On either machine, run:

```bash
npm run service:status
```

Look for:
```
Peers Connected: 1
Sync Status: Active
```

If "Peers Connected: 0", troubleshoot network connectivity.

---

## Network Requirements

### Same Local Network
- All machines must be on the same LAN/WiFi network
- Machines must be able to ping each other

### Firewall Ports Open
- **TCP 8765**: Sync data transfer
- **UDP 5353**: mDNS peer discovery (multicast)

### Router/Switch Configuration
- **mDNS/Multicast enabled** (usually default)
- **No AP isolation** (disable if using WiFi)
- **No VLAN separation** between machines

---

## Troubleshooting

### Issue: Service Won't Start

**Solution:**
```bash
# Check if service is installed
npm run service:status

# Rebuild and reinstall
npm run build:service
npm run service:install
npm run service:start
```

### Issue: Peers Not Discovering Each Other

**Checklist:**
1. ✅ Both machines have the **same** `SYNC_REGISTRATION_KEY`
2. ✅ Firewall rules added (UDP 5353, TCP 8765)
3. ✅ Both machines on the same network
4. ✅ Can ping between machines: `ping [other-machine-ip]`
5. ✅ Service running on both machines

**Test Firewall:**
```powershell
# From Machine 1, test if Machine 2's sync port is accessible
Test-NetConnection -ComputerName [machine-2-ip] -Port 8765
```

### Issue: Service Installed But Won't Start Automatically

**This is normal!** The service does not auto-start after installation.

**Solution:**
```bash
npm run service:start
```

To make it start on boot (after first manual start):
1. Open **services.msc**
2. Find "Multi-Business Sync Service"
3. Right-click → Properties
4. **Startup type**: Automatic
5. Click **OK**

### Issue: "EPERM" or "Access Denied" Errors

**Cause**: Not running as Administrator

**Solution**: Open PowerShell or Command Prompt as Administrator, then run commands.

---

## Verification Checklist

Before considering setup complete, verify:

- [ ] Service installed: `npm run service:status` shows "Installed: true"
- [ ] Service running: Status shows "RUNNING"
- [ ] Firewall rules added (TCP 8765, UDP 5353)
- [ ] `SYNC_REGISTRATION_KEY` configured and matches across all machines
- [ ] Can ping other machine: `ping [other-machine-ip]`
- [ ] Peers discovered: Status shows "Peers Connected: N" (where N > 0)
- [ ] Data syncing: Create a business on Machine 1, verify it appears on Machine 2

---

## Expected Sync Behavior

Once setup is complete:

1. **Automatic Discovery**: Machines find each other within 30-60 seconds
2. **Bi-directional Sync**: Changes on either machine sync to the other
3. **Conflict Resolution**: Last writer wins, with smart field-level merging
4. **Offline Support**: When a machine reconnects, it catches up on missed changes
5. **Background Operation**: Runs independently of the Next.js app

### Testing Sync

**On Machine 1:**
1. Login to the app: `http://localhost:8080`
2. Create a new business
3. Note the business name

**On Machine 2:**
1. Wait 30-60 seconds
2. Refresh the businesses page
3. The new business should appear

---

## Service Management Commands

```bash
# Check status
npm run service:status

# Start service
npm run service:start

# Stop service
npm run service:stop

# Restart service
npm run service:restart

# Reinstall service
npm run service:install

# Uninstall service
npm run service:uninstall

# View diagnostics
npm run service:diagnose
```

---

## Production Deployment Notes

### Security
- ✅ Change `SYNC_REGISTRATION_KEY` from default
- ✅ Use strong, unique registration keys
- ✅ Limit network access to trusted machines only
- ✅ Enable Windows Firewall on all machines

### Monitoring
- Check service status regularly
- Review logs in `data/sync/sync-service.log`
- Monitor sync conflicts in admin dashboard
- Set up alerts for service failures

### Backup Strategy
- The sync service provides redundancy, NOT backup
- Continue regular database backups on each machine
- Test restore procedures with multiple machines

---

## Summary: Steps in Order

1. **Install app**: `npm run setup`
2. **Configure firewall**: Add TCP 8765 and UDP 5353 rules
3. **Set environment variables**: Add `SYNC_REGISTRATION_KEY` (same on all machines)
4. **Build service**: `npm run build:service`
5. **Install service**: `npm run service:install` (as Admin)
6. **Start service**: `npm run service:start` (as Admin) ⚠️ **REQUIRED**
7. **Verify**: `npm run service:status`
8. **Test sync**: Create data on one machine, verify on another

---

## Need Help?

- **Documentation**: See `SYNC-SERVICE-SETUP.md` for detailed information
- **Logs**: Check `data/sync/sync-service.log`
- **Windows Event Viewer**: Look for service errors
- **Status Command**: `npm run service:status` provides diagnostics
