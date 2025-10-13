# Service App Spawn Fix - Complete Summary

**Date:** 2025-10-13
**Status:** ✅ READY FOR TESTING (Requires Administrator)

---

## Problem Summary

The Windows service wrapper successfully started the sync service (port 8765) but **failed to spawn the Next.js application on port 8080**. The root cause was using `npm run start` instead of spawning Node.js directly.

### Root Cause:
- **Old pattern**: `spawn('npm.cmd', ['run', 'start'])` - Extra npm layer that failed under Windows service
- **Used detached mode**: Process didn't stay attached to service wrapper
- **No port verification**: Didn't confirm app was listening after spawn
- **Minimal logging**: Hard to debug what was happening

---

## Solution Applied

Implemented the working pattern from `electricity-tokens` app that spawns Next.js directly using Node.js.

### Files Modified:

#### 1. `windows-service/service-wrapper-hybrid.js`

**Changes Made:**

1. **Updated Constructor** (lines 49-65):
   - Added `this.appProcess = null` property to track Next.js app process
   - Added `this.appRoot = path.join(__dirname, '..')` for consistent path references

2. **Replaced App Spawn Logic** (lines 159-165):
   ```javascript
   // OLD (REMOVED):
   const appSpawn = spawn(npmCmd, ['run', 'start'], {
     detached: true,  // Problematic
     shell: true
   });

   // NEW (ADDED):
   await this.startApplication();  // Calls new method
   ```

3. **Added New Methods** (lines 976-1116):

   **a. `checkPortListening(port)`** - Check if port is listening using PowerShell:
   ```javascript
   async checkPortListening(port) {
     // Uses Get-NetTCPConnection on Windows
     // Returns true if port is listening
   }
   ```

   **b. `verifyNextJsStarted()`** - Wait for Next.js to be listening:
   ```javascript
   async verifyNextJsStarted() {
     // Retries 15 times with 2 second delay
     // Throws error if port not listening after 30 seconds
     // Logs detailed progress
   }
   ```

   **c. `verifyNextJsAvailable()`** - Check Next.js binary exists:
   ```javascript
   async verifyNextJsAvailable() {
     // Checks node_modules/next/dist/bin/next exists
     // Throws error if not found
   }
   ```

   **d. `startApplication()`** - Main app spawn method:
   ```javascript
   async startApplication() {
     // 1. Verify Next.js binary exists
     // 2. Spawn node directly: spawn('node', [nextPath, 'start'])
     // 3. Set shell: false (no shell layer)
     // 4. Not detached (stays with service)
     // 5. Log all stdout/stderr
     // 6. Wait 5 seconds for initialization
     // 7. Verify port 8080 is listening
     // 8. Log success with URL
   }
   ```

4. **Updated stop() Method** (lines 1118-1191):
   - Now stops both appProcess AND childProcess
   - Stops Next.js app first, then sync service
   - Graceful shutdown with 10 second timeout
   - Force kills if needed

---

## Key Improvements

### 1. Direct Node Execution
```javascript
// Spawn Next.js directly without npm layer
const nextPath = path.join(
  this.appRoot,
  'node_modules',
  'next',
  'dist',
  'bin',
  'next'
);

this.appProcess = spawn('node', [nextPath, 'start'], {
  cwd: this.appRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,  // KEY: No shell
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '8080',
  },
});
```

### 2. Comprehensive Logging
```javascript
console.log(`📝 Spawning: node ${nextPath} start`);
console.log(`📂 Working directory: ${this.appRoot}`);
console.log(`🔌 PORT: ${appPort}`);
console.log(`📌 Next.js process spawned with PID: ${this.appProcess.pid}`);

// Real-time output logging
this.appProcess.stdout.on('data', (data) => {
  console.log(`[Next.js] ${data.toString().trim()}`);
});

this.appProcess.stderr.on('data', (data) => {
  console.error(`[Next.js ERROR] ${data.toString().trim()}`);
});
```

### 3. Port Verification
```javascript
// Wait for port to be listening (15 retries × 2 seconds = 30 seconds max)
await this.verifyNextJsStarted();

// PowerShell-based port check
Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
```

### 4. Process Lifecycle Management
```javascript
// Track app process in constructor
this.appProcess = null;

// Stop app on service shutdown
async stop() {
  if (this.appProcess) {
    this.appProcess.kill('SIGTERM');
    // Wait for graceful shutdown or force kill after 10 seconds
  }
  if (this.childProcess) {
    this.childProcess.kill('SIGTERM');
  }
}
```

---

## Expected Log Output After Fix

When the service starts successfully, you should see:

```
🚀 Starting Multi-Business Sync Service (Hybrid Mode)...
🔒 Running production validation and safety checks...
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
Production build verified. Starting Next.js application directly...
📝 Spawning: node C:\Users\ticha\apps\multi-business-multi-apps\node_modules\next\dist\bin\next start
📂 Working directory: C:\Users\ticha\apps\multi-business-multi-apps
🔌 PORT: 8080
📌 Next.js process spawned with PID: 67890
⏳ Waiting 5 seconds for Next.js to initialize...
[Next.js] ▲ Next.js 15.5.4
[Next.js] - Local:        http://localhost:8080
[Next.js] - Network:      http://169.254.83.107:8080
🔍 Verifying Next.js is listening on the configured port...
✅ Next.js is now listening on port 8080.
🚀 SERVICE STARTUP COMPLETE: Next.js application started successfully!
🌐 Application available at: http://localhost:8080
```

---

## Testing Instructions

### 1. Rebuild Service (Already Done)
```bash
npm run build:service
# ✅ Completed successfully
```

### 2. Restart Service (Requires Administrator)
```powershell
# Open PowerShell as Administrator
# Navigate to project directory
cd "C:\Users\ticha\apps\multi-business-multi-apps"

# Restart the service
npm run service:restart
```

### 3. Check Service Logs
```bash
# View recent service startup logs
cat logs/service.log | tail -100

# Monitor logs in real-time
tail -f logs/service.log
```

### 4. Verify Port 8080 is Listening
```powershell
# Check if port 8080 is listening
powershell -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue"

# Test HTTP response
curl http://localhost:8080
```

### 5. Verify App is Accessible
```bash
# Open browser to:
http://localhost:8080

# Should see the Multi-Business dashboard
```

### 6. Check Service Status
```bash
npm run service:status
```

---

## Comparison: Before vs After

### Before (BROKEN):
```javascript
// windows-service/service-wrapper-hybrid.js line 165
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const appSpawn = spawn(npmCmd, ['run', 'start'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true  // ❌ Problematic
});
```

**Issues:**
- ❌ Extra npm layer
- ❌ Detached mode
- ❌ No port verification
- ❌ Minimal logging
- ❌ No binary verification

### After (FIXED):
```javascript
// windows-service/service-wrapper-hybrid.js lines 1037-1114
async startApplication() {
  await this.verifyNextJsAvailable();  // ✅ Check binary exists

  const nextPath = path.join(
    this.appRoot,
    'node_modules',
    'next',
    'dist',
    'bin',
    'next'
  );

  console.log(`📝 Spawning: node ${nextPath} start`);  // ✅ Detailed logging

  this.appProcess = spawn('node', [nextPath, 'start'], {
    cwd: this.appRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,  // ✅ No shell
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '8080',
    },
  });

  // ✅ Real-time logging
  this.appProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });

  // ✅ Wait for startup
  await new Promise(resolve => setTimeout(resolve, 5000));

  // ✅ Verify port is listening
  await this.verifyNextJsStarted();

  console.log(`🚀 SERVICE STARTUP COMPLETE`);
  console.log(`🌐 Application available at: http://localhost:${appPort}`);
}
```

**Improvements:**
- ✅ Direct node execution
- ✅ Not detached (proper lifecycle)
- ✅ Port verification with retries
- ✅ Comprehensive logging
- ✅ Binary verification
- ✅ Real-time output capture
- ✅ Error handling

---

## Troubleshooting

### If Port 8080 Still Not Accessible:

1. **Check logs for errors:**
   ```bash
   cat logs/service.log | grep ERROR
   ```

2. **Verify Next.js binary exists:**
   ```bash
   ls -la node_modules/next/dist/bin/next
   ```

3. **Check if build exists:**
   ```bash
   ls -la .next/BUILD_ID
   ```

4. **Verify PORT environment variable:**
   ```bash
   echo $PORT  # Should be 8080
   ```

5. **Check if another process is using port 8080:**
   ```powershell
   Get-NetTCPConnection -LocalPort 8080
   ```

### Common Issues:

1. **"Next.js binary not found"**
   - Run: `npm install` to ensure dependencies are installed

2. **"Build verification failed"**
   - Run: `npm run build` to create production build

3. **"Port 8080 already in use"**
   - Kill existing process: `taskkill /F /PID <pid>`

4. **Service won't restart**
   - Ensure PowerShell is running as Administrator
   - Check: `sc.exe query multibusinesssyncservice.exe`

---

## Reference Implementation

This fix is based on the working pattern from:
`C:/electricity-app/electricity-tokens/scripts/windows-service/service-wrapper-hybrid.js`

### Key Sections Referenced:
- Lines 991-1097: `startApplication()` method
- Lines 936-989: Port verification logic
- Lines 831-863: Build verification
- Lines 1022-1064: Direct node spawn pattern

---

## Related Documents

- **Issue Documentation**: `SERVICE_SPAWN_ISSUE.md`
- **Git Pull Workflow**: `GIT_PULL_WORKFLOW.md`
- **Current Status**: `CURRENT_SERVICE_STATUS.md`
- **Database Troubleshooting**: `PRODUCTION_DATABASE_TROUBLESHOOTING.md`

---

## Next Steps

1. **Test service restart** (requires Administrator PowerShell):
   ```powershell
   cd "C:\Users\ticha\apps\multi-business-multi-apps"
   npm run service:restart
   ```

2. **Verify port 8080 accessible**:
   ```bash
   curl http://localhost:8080
   ```

3. **Check service logs**:
   ```bash
   cat logs/service.log | tail -50
   ```

4. **Deploy to production server**:
   - Git pull on production server (auto-builds via hook)
   - Restart service: `npm run service:restart` (as Admin)
   - Verify both services running:
     - Sync service: Port 8765
     - Next.js app: Port 8080

---

**Status:** ✅ Fix Complete - Ready for Administrator Testing
**Priority:** CRITICAL
**Impact:** Resolves complete app inaccessibility when started via Windows service

---

**Generated:** 2025-10-13 at 19:30 UTC
**Fixed By:** Claude Code
**Testing Required:** Administrator privileges for service restart
**Expected Outcome:** Next.js app accessible on http://localhost:8080 after service restart

