# Remote Server Diagnostic Steps

**Issue:** Remote server still showing errors after git pull and service restart

**Created:** 2025-10-13

---

## Quick Diagnostic Commands

Run these commands **on the remote server** to diagnose the issue:

### 1. Verify Code is Up-to-Date

```bash
cd /path/to/multi-business-multi-apps

# Check current git commit
git log -1 --oneline

# Expected output should show commit e528f6a or later:
# e528f6a fix: Windows service now spawns Next.js directly without npm layer
```

**If commit is older than e528f6a:**
```bash
git pull origin main
```

### 2. Run Service Wrapper Verification

```bash
npm run verify:service-wrapper
```

**Expected Output:**
```
✅ SERVICE WRAPPER HAS ALL FIXES APPLIED
✅ Old code has been removed
```

**If verification fails:**
- The file hasn't been updated correctly
- Need to verify git pull actually updated the file

### 3. Check Service Wrapper File Directly

```bash
# Check file modification time
ls -la windows-service/service-wrapper-hybrid.js

# Check file size (should be around 46KB)
wc -c windows-service/service-wrapper-hybrid.js

# Search for the fix signature
grep -n "async startApplication()" windows-service/service-wrapper-hybrid.js

# Check if old code still exists (should return nothing)
grep -n "spawn(npmCmd, \['run', 'start'\]" windows-service/service-wrapper-hybrid.js
```

### 4. Check What Error is Still Occurring

```bash
# View recent service errors
cat logs/service-error.log | tail -50

# View recent service logs
cat logs/service.log | tail -100

# Look for specific error patterns
grep -i "error" logs/service.log | tail -20
```

---

## Common Issues and Solutions

### Issue 1: Git Pull Didn't Update the File

**Symptoms:**
- `git log` shows commit e528f6a
- But `verify:service-wrapper` still fails
- File modification time is old

**Possible Causes:**
- File merge conflict
- File permissions issue
- Git cache issue

**Solution:**
```bash
# Check git status
git status

# If file shows as modified, check diff
git diff windows-service/service-wrapper-hybrid.js

# If there's a merge conflict, resolve it
# Or force reset to remote
git fetch origin
git reset --hard origin/main

# Verify fix is now present
npm run verify:service-wrapper
```

### Issue 2: Service Still Using Old Wrapper

**Symptoms:**
- Verification passes
- But service logs show old behavior
- Port 8080 still not accessible

**Possible Causes:**
- Service not actually restarted
- Service running old cached version
- Multiple service instances running

**Solution:**
```powershell
# Check if service is actually running
sc.exe query multibusinesssyncservice.exe

# Force stop the service
sc.exe stop multibusinesssyncservice.exe

# Wait 10 seconds
timeout /t 10

# Check no node processes on ports
powershell -Command "Get-NetTCPConnection -LocalPort 8080,8765 -ErrorAction SilentlyContinue"

# If processes still exist, kill them
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess -Force"
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue).OwningProcess -Force"

# Wait another 5 seconds
timeout /t 5

# Start service fresh
sc.exe start multibusinesssyncservice.exe

# Or use npm command
npm run service:start
```

### Issue 3: Environment Variables Not Set

**Symptoms:**
- Service starts but app doesn't spawn
- Logs show: "SYNC_START_APP_AFTER_SERVICE=0: skipping main app start"

**Solution:**
```bash
# Check environment variables
cat .env.local | grep SYNC_START_APP_AFTER_SERVICE
cat config/service.env | grep SYNC_START_APP_AFTER_SERVICE

# If set to 0, either remove or set to 1
# Edit .env.local or config/service.env and remove the line or set:
# SYNC_START_APP_AFTER_SERVICE=1

# Restart service
npm run service:restart
```

### Issue 4: Next.js Build Missing

**Symptoms:**
- Service logs show: "Build verification failed"
- Or: ".next directory not found"

**Solution:**
```bash
# Check if Next.js build exists
ls -la .next/BUILD_ID

# If missing, build Next.js
npm run build

# Verify build completed
ls -la .next/BUILD_ID

# Restart service
npm run service:restart
```

### Issue 5: Next.js Binary Not Found

**Symptoms:**
- Logs show: "Next.js binary not found"
- Or: "ENOENT: no such file or directory"

**Solution:**
```bash
# Check if Next.js is installed
ls -la node_modules/next/dist/bin/next

# If missing, reinstall dependencies
npm install

# Verify Next.js binary exists
ls -la node_modules/next/dist/bin/next

# Restart service
npm run service:restart
```

### Issue 6: Port 8080 Already in Use

**Symptoms:**
- Logs show: "Port 8080 is already in use"
- Or: "EADDRINUSE"

**Solution:**
```powershell
# Find process using port 8080
powershell -Command "Get-NetTCPConnection -LocalPort 8080 | Select-Object LocalPort, State, OwningProcess"

# Kill the process
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force"

# Restart service
npm run service:restart
```

---

## Full Diagnostic Workflow

Run this complete diagnostic sequence on the remote server:

```bash
#!/bin/bash
echo "=== MULTI-BUSINESS SERVICE DIAGNOSTIC ==="
echo ""

echo "Step 1: Git Status"
git log -1 --oneline
git status --short
echo ""

echo "Step 2: Verify Service Wrapper"
npm run verify:service-wrapper
echo ""

echo "Step 3: Check Service Status"
sc.exe query multibusinesssyncservice.exe
echo ""

echo "Step 4: Check Port Usage"
powershell -Command "Get-NetTCPConnection -LocalPort 8080,8765 -ErrorAction SilentlyContinue | Format-Table LocalPort, State, OwningProcess"
echo ""

echo "Step 5: Check Next.js Build"
ls -lah .next/BUILD_ID 2>/dev/null || echo "Build not found"
echo ""

echo "Step 6: Check Next.js Binary"
ls -lah node_modules/next/dist/bin/next 2>/dev/null || echo "Next.js binary not found"
echo ""

echo "Step 7: Recent Service Logs"
echo "--- Last 20 lines of service.log ---"
tail -20 logs/service.log
echo ""
echo "--- Last 10 errors from service-error.log ---"
tail -10 logs/service-error.log 2>/dev/null || echo "No error log"
echo ""

echo "=== DIAGNOSTIC COMPLETE ==="
```

Save this as `scripts/remote-diagnostic.sh` and run:
```bash
bash scripts/remote-diagnostic.sh > diagnostic-output.txt
cat diagnostic-output.txt
```

---

## Manual Verification of Fix

If automated verification doesn't help, manually check the file:

```bash
# Open the service wrapper file
nano windows-service/service-wrapper-hybrid.js
# or
vim windows-service/service-wrapper-hybrid.js

# Look for these signatures (should exist):
# 1. Around line 52: this.appProcess = null
# 2. Around line 981: async checkPortListening(port)
# 3. Around line 1001: async verifyNextJsStarted()
# 4. Around line 1026: async verifyNextJsAvailable()
# 5. Around line 1039: async startApplication()
# 6. Around line 1067: spawn('node', [nextPath, 'start']
# 7. Around line 1070: shell: false

# Look for old pattern (should NOT exist):
# spawn(npmCmd, ['run', 'start']
```

---

## What Error Message Are You Seeing?

### Error: "Database connectivity test timed out"

**This is a different issue** - not related to the spawn fix.

**Solutions:**
1. Run database diagnostic:
   ```bash
   npm run diagnose:database
   ```

2. Check PostgreSQL is running:
   ```bash
   sc query postgresql-x64-14
   ```

3. Verify DATABASE_URL:
   ```bash
   cat .env.local | grep DATABASE_URL
   cat config/service.env | grep DATABASE_URL
   ```

See: `PRODUCTION_DATABASE_TROUBLESHOOTING.md`

### Error: "Cannot read properties of undefined (reading 'registrationKey')"

**This is a sync service configuration issue** - not related to the spawn fix.

**Solutions:**
1. Check sync service config:
   ```bash
   cat config/service.env | grep SYNC_REGISTRATION_KEY
   ```

2. Add if missing:
   ```env
   SYNC_REGISTRATION_KEY=your-secure-key-here
   SYNC_ENCRYPTION_KEY=your-encryption-key-here
   ```

See: `CURRENT_SERVICE_STATUS.md` (lines 75-110)

### Error: "Port 8080 not listening" or "Next.js did not start"

**This is the spawn issue** - should be fixed.

**If still occurring after fix:**
1. Verify fix is applied: `npm run verify:service-wrapper`
2. Check service is restarted: `sc.exe query multibusinesssyncservice.exe`
3. Check Next.js logs in service.log: `grep "Next.js" logs/service.log`
4. Verify spawn command logged: `grep "Spawning:" logs/service.log`

### No Error - Service Starts Successfully But Can't Access App

**Check firewall and network:**

```powershell
# Check if port is listening locally
powershell -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue"

# Test from server itself
curl http://localhost:8080

# Check firewall rules
netsh advfirewall firewall show rule name=all | findstr "8080"

# Add firewall rule if needed
netsh advfirewall firewall add rule name="Next.js App" dir=in action=allow protocol=TCP localport=8080
```

---

## Expected Service Startup Sequence (After Fix)

When service starts successfully, logs should show:

```
🚀 Starting Multi-Business Sync Service (Hybrid Mode)...
✅ All production validation checks passed
✅ Sync service started with PID: 12345

🔨 Building Next.js application...
✅ Application build already exists, skipping build

🚀 Starting Multi-Business Next.js application...
✅ Next.js binary found.
Production build verified. Starting Next.js application directly...
📝 Spawning: node C:\...\node_modules\next\dist\bin\next start
📂 Working directory: C:\...\multi-business-multi-apps
🔌 PORT: 8080
📌 Next.js process spawned with PID: 67890
⏳ Waiting 5 seconds for Next.js to initialize...
[Next.js] ▲ Next.js 15.5.4
[Next.js] - Local:        http://localhost:8080
🔍 Verifying Next.js is listening on the configured port...
✅ Next.js is now listening on port 8080.
🚀 SERVICE STARTUP COMPLETE: Next.js application started successfully!
🌐 Application available at: http://localhost:8080
```

**If you don't see these exact log messages**, the fix is not applied or something else is wrong.

---

## Contact Support

If none of these steps resolve the issue, provide:

1. Output of `npm run verify:service-wrapper`
2. Git commit hash: `git log -1 --oneline`
3. Last 100 lines of service log: `tail -100 logs/service.log`
4. Exact error message you're seeing
5. Output of diagnostic script above

---

**Generated:** 2025-10-13
**Purpose:** Diagnose why remote server still has errors after fix
**Key Tool:** `npm run verify:service-wrapper`

