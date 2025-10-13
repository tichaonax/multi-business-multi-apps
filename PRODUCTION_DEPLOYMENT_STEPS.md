# Production Deployment - Service Spawn Fix

**Date:** 2025-10-13
**Status:** ✅ LOCAL TESTING PASSED - Ready for Production

---

## Pre-Deployment Checklist

- ✅ Fix tested locally and working
- ✅ Port 8080 accessible after service restart
- ✅ Git hooks will auto-rebuild service after pull
- ✅ Comprehensive logging added for troubleshooting

---

## Production Deployment Steps

### Step 1: Connect to Production Server

```bash
# SSH or RDP into production server
# Navigate to application directory
cd /path/to/multi-business-multi-apps
```

### Step 2: Stop Service Before Git Pull (Optional but Recommended)

```powershell
# Run as Administrator
npm run service:stop
```

**Why stop first?**
- Releases file locks on service files
- Prevents "file in use" errors during git pull
- Clean state for git hook to run

### Step 3: Pull Latest Code

```bash
git pull origin main
```

**Expected Output:**
```
remote: Counting objects...
Unpacking objects: 100% (X/X), done.
From https://github.com/your-repo/multi-business-multi-apps
   23f49c1..abc1234  main -> origin/main
Updating 23f49c1..abc1234
Fast-forward
 windows-service/service-wrapper-hybrid.js | 150 +++++++++++++++++++++++---
 1 file changed, 135 insertions(+), 15 deletions(-)

🔍 Analyzing changes for automatic updates...
✓ Source files changed: src/
✓ Service wrapper modified: windows-service/service-wrapper-hybrid.js

🔨 Running quick rebuild...
🧹 Cleaning Prisma client files...
🔄 Regenerating Prisma client...
✅ Prisma client generated

🔧 Rebuilding Windows sync service...
✅ Sync service rebuilt successfully!

⚠️  REMINDER: If the service is running, restart it:
   npm run service:restart (as Administrator)
```

### Step 4: Verify Git Hook Ran Successfully

Check that the hook rebuilt the service:

```bash
# Check service-wrapper-hybrid.js timestamp (should be recent)
ls -la windows-service/service-wrapper-hybrid.js

# Check dist/service/ rebuild timestamp
ls -la dist/service/sync-service-runner.js
```

### Step 5: Restart Service (Requires Administrator)

```powershell
# Open PowerShell as Administrator
cd "C:\path\to\multi-business-multi-apps"

# Restart the service
npm run service:restart
```

**Expected Output:**
```
Running: sc.exe stop multibusinesssyncservice.exe
[SC] ControlService SUCCESS

SERVICE_NAME: multibusinesssyncservice.exe
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 3  STOP_PENDING
        WIN32_EXIT_CODE    : 0  (0x0)

Waiting 3 seconds before starting...

Running: sc.exe start multibusinesssyncservice.exe

SERVICE_NAME: multibusinesssyncservice.exe
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 2  START_PENDING
        WIN32_EXIT_CODE    : 0  (0x0)

✅ Service restarted successfully
```

### Step 6: Monitor Service Logs

```bash
# Watch service startup logs in real-time
tail -f logs/service.log
```

**Look for these key log entries:**

```
🚀 Starting Multi-Business Sync Service (Hybrid Mode)...
✅ All production validation checks passed
✅ Sync service started with PID: 12345

🚀 Starting Multi-Business Next.js application...
✅ Next.js binary found.
📝 Spawning: node C:\path\to\node_modules\next\dist\bin\next start
📂 Working directory: C:\path\to\multi-business-multi-apps
🔌 PORT: 8080
📌 Next.js process spawned with PID: 67890

[Next.js] ▲ Next.js 15.5.4
[Next.js] - Local:        http://localhost:8080
[Next.js] - Network:      http://192.168.x.x:8080

🔍 Verifying Next.js is listening on the configured port...
✅ Next.js is now listening on port 8080.
🚀 SERVICE STARTUP COMPLETE: Next.js application started successfully!
🌐 Application available at: http://localhost:8080
```

### Step 7: Verify Port 8080 is Listening

```powershell
# Check if port 8080 is listening
powershell -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue"
```

**Expected Output:**
```
LocalAddress  LocalPort  RemoteAddress  RemotePort  State       OwningProcess
------------  ---------  -------------  ----------  -----       -------------
0.0.0.0       8080       0.0.0.0        0           Listen      67890
```

### Step 8: Test HTTP Response

```bash
# Test from production server
curl http://localhost:8080

# Test from remote machine (replace with actual server IP)
curl http://your-server-ip:8080
```

**Expected Response:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Multi-Business Management</title>
  ...
</html>
```

### Step 9: Verify Both Services Running

```bash
# Check service status
npm run service:status
```

**Expected Output:**
```
Service Status: {
  isRunning: true,
  pid: 12345,
  restartAttempts: 0,
  maxRestartAttempts: 5,
  isShuttingDown: false
}
```

```powershell
# Check both ports are listening
powershell -Command "Get-NetTCPConnection -LocalPort 8765,8080 -ErrorAction SilentlyContinue | Select-Object LocalPort, State, OwningProcess"
```

**Expected Output:**
```
LocalPort  State   OwningProcess
---------  -----   -------------
8765       Listen  12345  (Sync Service)
8080       Listen  67890  (Next.js App)
```

### Step 10: Access Application in Browser

```
http://your-production-server:8080
```

**Should see:**
- ✅ Login page or dashboard
- ✅ No connection errors
- ✅ Assets loading correctly

---

## Rollback Plan (If Issues Occur)

### If Service Fails to Start:

1. **Check error logs:**
   ```bash
   cat logs/service-error.log | tail -100
   ```

2. **Check if database is accessible:**
   ```bash
   npm run diagnose:database
   ```

3. **Verify Next.js binary exists:**
   ```bash
   ls -la node_modules/next/dist/bin/next
   ```

4. **Check if build exists:**
   ```bash
   ls -la .next/BUILD_ID
   ```

5. **If build missing, run:**
   ```bash
   npm run build
   ```

### If App Not Accessible on Port 8080:

1. **Check if process is running:**
   ```powershell
   Get-NetTCPConnection -LocalPort 8080
   ```

2. **Check firewall rules:**
   ```powershell
   netsh advfirewall firewall show rule name=all | findstr "8080"
   ```

3. **Verify PORT environment variable:**
   ```bash
   # Check .env.local
   cat .env.local | grep PORT

   # Check config/service.env
   cat config/service.env | grep PORT
   ```

### Emergency Rollback:

```bash
# Stop service
npm run service:stop

# Rollback to previous commit
git log --oneline -5  # Find previous commit hash
git checkout <previous-commit-hash>

# Rebuild service
npm run build:service

# Restart service
npm run service:restart
```

---

## Post-Deployment Verification

### ✅ Deployment Success Checklist:

- [ ] Git pull completed without errors
- [ ] Git hook rebuilt service successfully
- [ ] Service restart completed without errors
- [ ] Service logs show successful startup
- [ ] Port 8765 (sync service) is listening
- [ ] Port 8080 (Next.js app) is listening
- [ ] `curl http://localhost:8080` returns HTML
- [ ] Application accessible in browser
- [ ] Login works correctly
- [ ] Dashboard loads without errors

---

## Monitoring After Deployment

### Watch for Issues:

```bash
# Monitor service logs continuously
tail -f logs/service.log

# Monitor error logs
tail -f logs/service-error.log

# Check for port availability issues
watch -n 5 'powershell -Command "Get-NetTCPConnection -LocalPort 8080,8765 -ErrorAction SilentlyContinue"'
```

### Key Metrics to Monitor:

1. **Service Uptime**: Should stay running without restarts
2. **Memory Usage**: `tasklist /FI "IMAGENAME eq node.exe"`
3. **Port Availability**: Both 8080 and 8765 should remain listening
4. **Application Response Time**: Pages should load quickly
5. **Error Logs**: No repeated errors in logs/service-error.log

---

## Troubleshooting Common Production Issues

### Issue 1: "Next.js binary not found"

**Cause:** node_modules not installed or incomplete

**Fix:**
```bash
npm install
npm run service:restart
```

### Issue 2: "Port 8080 already in use"

**Cause:** Previous Next.js process still running

**Fix:**
```powershell
# Find and kill process on port 8080
$pid = Get-NetTCPConnection -LocalPort 8080 | Select-Object -ExpandProperty OwningProcess
Stop-Process -Id $pid -Force

# Restart service
npm run service:restart
```

### Issue 3: "Build verification failed"

**Cause:** Next.js build missing or corrupt

**Fix:**
```bash
# Rebuild Next.js application
npm run build

# Restart service
npm run service:restart
```

### Issue 4: "Database connectivity test timed out"

**Cause:** PostgreSQL not running or DATABASE_URL incorrect

**Fix:**
```bash
# Check PostgreSQL service
sc query postgresql-x64-14

# Start if not running
net start postgresql-x64-14

# Verify DATABASE_URL
npm run diagnose:database
```

### Issue 5: Service starts but app still not accessible

**Cause:** Firewall blocking port 8080

**Fix:**
```powershell
# Add firewall rule for port 8080
netsh advfirewall firewall add rule name="Next.js App" dir=in action=allow protocol=TCP localport=8080

# Restart service
npm run service:restart
```

---

## Production Server Information

### Important Paths:
- **Application Root**: `/path/to/multi-business-multi-apps`
- **Service Logs**: `logs/service.log`
- **Error Logs**: `logs/service-error.log`
- **Wrapper Logs**: `windows-service/daemon/service.log`
- **Environment Config**: `.env.local`, `config/service.env`

### Service Information:
- **Service Name**: `multibusinesssyncservice.exe`
- **Sync Service Port**: 8765
- **Next.js App Port**: 8080
- **Health Check Port**: 8766 (sync service health endpoint)

### Key Commands:
```bash
# Service management
npm run service:start
npm run service:stop
npm run service:restart
npm run service:status

# Diagnostics
npm run diagnose:database
npm run service:diagnose

# Logs
cat logs/service.log | tail -100
cat logs/service-error.log
```

---

## Success Criteria

Deployment is successful when:

1. ✅ Git pull completes without errors
2. ✅ Service restarts without errors
3. ✅ Both ports (8080 and 8765) are listening
4. ✅ Service logs show "SERVICE STARTUP COMPLETE"
5. ✅ Application accessible at http://production-server:8080
6. ✅ Users can login and access features
7. ✅ No errors in service logs for 10 minutes after restart

---

**Generated:** 2025-10-13
**Fix Applied:** Direct Next.js spawn (no npm layer)
**Testing Status:** ✅ Passed locally
**Production Status:** 🚀 Ready for deployment

**Important:** Always run service commands as Administrator on Windows servers!

