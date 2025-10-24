# Service Spawn Issue - Next.js App Not Starting

**Date:** 2025-10-13
**Status:** 🔴 CRITICAL - App not accessible on port 8080 when started via Windows service

---

## Problem Statement

The Windows service wrapper successfully starts the sync service (port 8765) but **fails to spawn the Next.js application on port 8080**. The app only works when manually started with `npm run start`.

### Symptoms:
- ✅ Service starts without errors
- ✅ Database connectivity confirmed
- ✅ Sync service operational on port 8765
- ❌ Next.js app NOT accessible on http://localhost:8080
- ❌ Port 8080 NOT listening
- ✅ Manual `npm run start` works perfectly

---

## Root Cause

**Location:** `windows-service/service-wrapper-hybrid.js` line 165

### Current Broken Pattern:
```javascript
const appSpawn = spawn(npmCmd, ['run', 'start'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true  // Problematic
});
```

**Problems:**
1. **Spawns npm, not node directly** - Extra layer that fails under Windows service
2. **Uses detached: true** - Process doesn't stay attached to service wrapper
3. **No build verification** - Doesn't check if `.next` build exists before spawning
4. **No port verification** - Doesn't verify app is listening after spawn
5. **Minimal logging** - Hard to debug what's happening

---

## Working Reference Implementation

**Source:** `C:/electricity-app/electricity-tokens/scripts/windows-service/service-wrapper-hybrid.js` lines 991-1097

### Key Differences:

#### 1. Build Verification Before Spawn (lines 995-1007):
```javascript
// Check if a rebuild is needed BEFORE doing anything else
const needsRebuild = await this.checkIfRebuildNeeded();

if (needsRebuild) {
  this.log('Build is stale or missing. Rebuild required.', 'WARN');
  await this.ensureProductionBuild();
  await this.verifyBuildCompletion();
} else {
  this.log('✅ Build is current. No rebuild needed.');
}
```

#### 2. Direct Node Execution (lines 1022-1037):
```javascript
// Start Next.js directly using node, not npm
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
    PORT: process.env.PORT || 8080,
  },
});
```

#### 3. Port Verification After Spawn (lines 936-989):
```javascript
async verifyNextJsStarted() {
  this.log('Verifying Next.js is listening on the configured port...');
  const port = process.env.PORT || 8080;
  const maxRetries = 10;
  const retryDelay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const isListening = await this.checkPortListening(port);
      if (isListening) {
        this.log(`✅ Next.js is now listening on port ${port}.`);
        return true;
      }
    } catch (error) {
      // Retry
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }

  throw new Error(`Next.js did not start listening on port ${port} after ${maxRetries * retryDelay / 1000} seconds`);
}
```

#### 4. Comprehensive Logging Throughout:
```javascript
this.log('Starting Electricity Tokens Tracker service (Hybrid Mode)...');
this.log('Production build and database verified. Starting Next.js application directly...');
this.log(`Next.js: ${output}`);
this.log(`🚀 SERVICE STARTUP COMPLETE: Next.js process started with PID ${this.appProcess.pid}`);
```

---

## Required Fix

### Files to Modify:
- `windows-service/service-wrapper-hybrid.js`

### Changes Needed:

1. **Add Build Verification Methods:**
   - `checkIfRebuildNeeded()` - Check BUILD_ID and git commit
   - `verifyBuildCompletion()` - Verify `.next` directory exists
   - `verifyNextJsAvailable()` - Check Next.js binary exists

2. **Add Port Verification Methods:**
   - `checkPortListening(port)` - Test if port is listening
   - `verifyNextJsStarted()` - Wait for port with retries

3. **Replace App Spawn Section (lines 159-186):**
   - Remove npm layer
   - Spawn node directly with Next.js binary path
   - Remove `detached: true`
   - Set `shell: false`
   - Use PORT environment variable (8080 for multi-business)

4. **Add Comprehensive Logging:**
   - Log build verification status
   - Log app spawn attempt with full command
   - Log Next.js stdout/stderr output
   - Log port verification results
   - Log startup completion

---

## Implementation Steps

### Step 1: Add Build Verification Methods
Based on electricity-tokens lines 831-863:
```javascript
async checkIfRebuildNeeded() {
  const buildIdPath = path.join(this.appRoot, '.next', 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    return true; // No build exists
  }

  // Check if build is current (compare with git commit or timestamp)
  return false;
}

async verifyBuildCompletion() {
  const buildIdPath = path.join(this.appRoot, '.next', 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    throw new Error('.next/BUILD_ID not found - build failed or incomplete');
  }

  this.log('✅ Production build verified.');
  return true;
}

async verifyNextJsAvailable() {
  const nextPath = path.join(this.appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!fs.existsSync(nextPath)) {
    throw new Error('Next.js binary not found at ' + nextPath);
  }

  this.log('✅ Next.js binary found.');
  return true;
}
```

### Step 2: Add Port Verification Methods
Based on electricity-tokens lines 936-989:
```javascript
async checkPortListening(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const cmd = process.platform === 'win32'
      ? `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`
      : `lsof -i :${port} -t`;

    exec(cmd, (error, stdout) => {
      if (!error && stdout.trim()) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

async verifyNextJsStarted() {
  this.log('Verifying Next.js is listening on the configured port...');
  const port = process.env.PORT || 8080;
  const maxRetries = 10;
  const retryDelay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const isListening = await this.checkPortListening(port);
      if (isListening) {
        this.log(`✅ Next.js is now listening on port ${port}.`);
        return true;
      }
    } catch (error) {
      this.log(`Retry ${i + 1}/${maxRetries}: Port ${port} not yet listening...`, 'WARN');
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }

  throw new Error(`Next.js did not start listening on port ${port} after ${maxRetries * retryDelay / 1000} seconds`);
}
```

### Step 3: Replace App Spawn Logic
Replace lines 159-186 with:
```javascript
async startApplication() {
  try {
    this.log('Starting Multi-Business application (Hybrid Mode)...');

    // Check if a rebuild is needed BEFORE doing anything else
    const needsRebuild = await this.checkIfRebuildNeeded();

    if (needsRebuild) {
      this.log('Build is stale or missing. Rebuild required.', 'WARN');
      // Optionally run npm run build here
      await this.verifyBuildCompletion();
    } else {
      this.log('✅ Build is current. No rebuild needed.');
    }

    // Verify Next.js binary is available
    await this.verifyNextJsAvailable();

    this.log('Production build verified. Starting Next.js application directly...');

    // Start Next.js directly using node, not npm
    const nextPath = path.join(
      this.appRoot,
      'node_modules',
      'next',
      'dist',
      'bin',
      'next'
    );

    this.log(`Spawning: node ${nextPath} start`);
    this.log(`Working directory: ${this.appRoot}`);
    this.log(`PORT: ${process.env.PORT || 8080}`);

    this.appProcess = spawn('node', [nextPath, 'start'], {
      cwd: this.appRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8080,
      },
    });

    this.appProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`Next.js: ${output}`);
      }
    });

    this.appProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`Next.js ERROR: ${output}`, 'ERROR');
      }
    });

    this.appProcess.on('error', (err) => {
      this.log(`Failed to start Next.js process: ${err.message}`, 'ERROR');
    });

    this.appProcess.on('exit', (code, signal) => {
      this.log(`Next.js process exited with code ${code} and signal ${signal}`, 'ERROR');
    });

    // Wait a moment for process to initialize
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify port is listening
    await this.verifyNextJsStarted();

    this.log(`🚀 SERVICE STARTUP COMPLETE: Next.js process started with PID ${this.appProcess.pid}`);
  } catch (error) {
    this.log(`Failed to start application: ${error.message}`, 'ERROR');
    throw error;
  }
}
```

---

## Testing Plan

1. **Stop current service:**
   ```bash
   npm run service:stop
   ```

2. **Rebuild service with fixes:**
   ```bash
   npm run build:service
   ```

3. **Restart service:**
   ```bash
   npm run service:restart
   ```

4. **Check logs:**
   ```bash
   cat logs/service.log | tail -50
   ```

5. **Verify port 8080:**
   ```bash
   powershell -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue"
   curl http://localhost:8080
   ```

6. **Check service status:**
   ```bash
   npm run service:status
   ```

---

## Expected Log Output After Fix

```
[INFO] Starting Multi-Business application (Hybrid Mode)...
[INFO] ✅ Build is current. No rebuild needed.
[INFO] ✅ Next.js binary found.
[INFO] Production build verified. Starting Next.js application directly...
[INFO] Spawning: node C:\Users\ticha\apps\multi-business-multi-apps\node_modules\next\dist\bin\next start
[INFO] Working directory: C:\Users\ticha\apps\multi-business-multi-apps
[INFO] PORT: 8080
[INFO] Next.js: ▲ Next.js 15.5.4
[INFO] Next.js: - Local:        http://localhost:8080
[INFO] Verifying Next.js is listening on the configured port...
[INFO] ✅ Next.js is now listening on port 8080.
[INFO] 🚀 SERVICE STARTUP COMPLETE: Next.js process started with PID 12345
```

---

## Related Files

- **Service Wrapper:** `windows-service/service-wrapper-hybrid.js`
- **Reference Implementation:** `C:/electricity-app/electricity-tokens/scripts/windows-service/service-wrapper-hybrid.js`
- **Package Scripts:** `package.json` (lines 42-44 for service commands)
- **Service Logs:** `logs/service.log`

---

**Status:** Ready for implementation
**Priority:** CRITICAL
**Estimated Time:** 30-60 minutes

---

**Generated:** 2025-10-13
**Issue Type:** Service Startup Bug
**Impact:** App completely inaccessible when started via Windows service
