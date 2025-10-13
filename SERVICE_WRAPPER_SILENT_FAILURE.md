# Service Wrapper Silent Failure Investigation

**Issue:** Service starts but logs only show 2 `sc.exe query` entries, then nothing
**Status:** Investigation in progress

---

## Problem Analysis

### What We Know:

1. ✅ Service verification passed (`npm run verify:service-wrapper`)
2. ✅ Code is up-to-date on remote server
3. ✅ Service starts successfully (`sc.exe start` returns success)
4. ❌ **But wrapper logs only show**:
   ```
   [2025-10-13T19:13:59.615Z] [INFO] sc command succeeded for candidate "MultiBusinessSyncService"
   [2025-10-13T19:14:00.954Z] [INFO] sc command succeeded for candidate "MultiBusinessSyncService"
   ```
5. ❌ No startup sequence logs
6. ❌ No sync service PID logged
7. ❌ No Next.js spawn logged
8. ❌ Port 8080 NOT listening

### What This Means:

The service wrapper **starts but crashes or fails silently** before reaching the `start()` method.

The `sc command succeeded` logs come from `hybrid-service-manager.js:56`, which runs during service installation checks, NOT during normal startup.

---

## Possible Causes

### 1. JavaScript Syntax Error
- Wrapper has syntax error that crashes on load
- Would prevent any logging from occurring

### 2. Missing Dependency
- Required module not found
- Crashes immediately on `require()`

### 3. Environment Variable Issue
- `loadEnvironmentVariables()` function (line 12-40) crashes
- Happens before any logging setup

### 4. File Path Issue
- Can't resolve paths to `.env.local` or other files
- Fails silently

### 5. Permission Issue
- Wrapper starts but can't write to log files
- All console.log output lost

---

## Diagnostic Commands (Run on Remote Server)

### Step 1: Test Wrapper Directly

```bash
# This will attempt to run the wrapper outside of Windows service
npm run test:service-wrapper
```

**This will show:**
- Any syntax errors in the wrapper
- Actual error messages if wrapper crashes
- Full startup sequence if wrapper works

### Step 2: Check Wrapper Logs Location

```bash
# Check if daemon directory exists
ls -la windows-service/daemon/

# Check if log file exists and has content
ls -la windows-service/daemon/service.log

# View wrapper logs
cat windows-service/daemon/service.log

# Check if logs directory exists
ls -la logs/

# View service logs
cat logs/service.log
```

### Step 3: Check Environment File

```bash
# Verify .env.local exists
ls -la .env.local

# Check if readable
cat .env.local | head -5

# Check if DATABASE_URL is set
cat .env.local | grep DATABASE_URL
```

### Step 4: Test Node.js Can Load Wrapper

```bash
# Try to load the wrapper file
node -e "require('./windows-service/service-wrapper-hybrid.js')"

# This should either:
# a) Start the wrapper (good)
# b) Show an error (helps diagnose)
```

### Step 5: Check Service Event Log

**Windows Event Viewer:**
1. Open Event Viewer as Administrator
2. Navigate to: Windows Logs → Application
3. Filter for Source: "multibusinesssyncservice"
4. Look for error entries at service start time

**PowerShell:**
```powershell
# Check last 50 application events
Get-EventLog -LogName Application -Newest 50 | Where-Object {$_.Source -like "*multi*" -or $_.Source -like "*node*"}
```

### Step 6: Check if .next Build Exists

```bash
# The wrapper checks for .next build
ls -la .next/BUILD_ID

# If missing, build it
npm run build
```

---

## Expected Behavior vs Actual

### Expected Wrapper Logs (if working):

```
🚀 Starting Multi-Business Sync Service (Hybrid Mode)...
🔒 Running production validation and safety checks...
🔍 Validating environment configuration...
✅ Environment configuration validated
🔍 Validating database connectivity...
✅ Database connectivity validated
✅ Required dependencies validated
✅ File permissions validated
✅ Sync port 8765 is available
✅ Application port 8080 is available
✅ All production validation checks passed

🔧 Checking sync service build...
✅ Service build already exists, skipping build
✅ Sync service started with PID: 12345

🔨 Building Next.js application...
✅ Application build already exists, skipping build

🚀 Starting Multi-Business Next.js application...
✅ Next.js binary found.
📝 Spawning: node C:\...\node_modules\next\dist\bin\next start
📂 Working directory: C:\...
🔌 PORT: 8080
📌 Next.js process spawned with PID: 67890
```

### Actual Wrapper Logs (broken):

```
[2025-10-13T19:13:59.615Z] [INFO] sc command succeeded for candidate "MultiBusinessSyncService"
[2025-10-13T19:14:00.954Z] [INFO] sc command succeeded for candidate "MultiBusinessSyncService"
```

**The wrapper never reaches its main code!**

---

## Troubleshooting Steps

### If Test Shows Syntax Error:

```bash
# Check git status
git status

# If wrapper is modified locally, restore it
git restore windows-service/service-wrapper-hybrid.js

# Verify fix applied
npm run verify:service-wrapper

# Restart service
npm run service:restart
```

### If Test Shows Missing Dependency:

```bash
# Reinstall dependencies
npm install

# Restart service
npm run service:restart
```

### If Test Shows Environment Error:

```bash
# Check .env.local format
cat .env.local

# Ensure no special characters or syntax issues
# Each line should be: KEY=value or KEY="value"

# Restart service
npm run service:restart
```

### If Test Shows File Permission Error:

```powershell
# Run as Administrator
# Grant full control to logs and daemon directories
icacls logs /grant Everyone:F
icacls windows-service\daemon /grant Everyone:F

# Restart service
npm run service:restart
```

### If Test Works But Service Doesn't:

This means the wrapper works standalone but fails under Windows service context.

**Possible causes:**
1. Different working directory when run as service
2. Different environment variables
3. Different user permissions (LocalSystem vs current user)

**Solution:**
```powershell
# Reinstall service to ensure correct configuration
npm run service:install  # as Administrator

# Check service configuration
sc.exe qc multibusinesssyncservice.exe

# Start service
npm run service:start
```

---

## Quick Fix Workflow

```bash
# On remote server

# 1. Test wrapper directly
npm run test:service-wrapper

# 2. If error shown, note the error message

# 3. Fix the error (see troubleshooting above)

# 4. Verify fix applied
npm run verify:service-wrapper

# 5. Restart service
npm run service:restart

# 6. Check logs
tail -f logs/service.log
```

---

## What to Share for Support

If issue persists, provide:

1. **Output of test command:**
   ```bash
   npm run test:service-wrapper > test-output.txt 2>&1
   cat test-output.txt
   ```

2. **Git status:**
   ```bash
   git log -1 --oneline
   git status
   ```

3. **Environment file check:**
   ```bash
   ls -la .env.local
   # DO NOT share actual DATABASE_URL values
   ```

4. **Windows Event Log:**
   ```powershell
   Get-EventLog -LogName Application -Newest 20 | Where-Object {$_.Source -like "*multi*"}
   ```

5. **Service configuration:**
   ```powershell
   sc.exe qc multibusinesssyncservice.exe
   ```

---

## Key Discovery

The 2 log entries are from **service installation checks**, not from actual service startup.

This means:
- Service is configured correctly
- Service can start the wrapper file
- **But wrapper crashes before logging anything**

The `npm run test:service-wrapper` command will reveal the actual error.

---

**Generated:** 2025-10-13
**Purpose:** Diagnose silent failure of service wrapper on remote server
**Key Command:** `npm run test:service-wrapper`
**Expected Result:** Will show actual error preventing wrapper from starting

