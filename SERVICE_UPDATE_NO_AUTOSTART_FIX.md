# Service Update - No Auto-Restart Fix

## Issue
The `npm run service:update` command and Git hooks workflow were automatically restarting the Windows service after updates, which:
- Caused file lock conflicts during update process
- Started service before user could verify updates were successful
- Prevented manual inspection of logs/status before restart

## Solution
Modified the service update workflow to **stop the service and leave it stopped**, allowing the user to manually restart after verifying the update.

## Files Changed

### 1. `windows-service/service-update.js`
**Changes:**
- Commented out `await this.startServiceSafely()` call
- Commented out `await this.validateUICompatibility()` (requires running service)
- Commented out `await this.verifyUpdate()` (requires running service)
- Added clear warning messages that service is STOPPED
- Added instruction to manually start service with `npm run service:start`

**Before:**
```javascript
// Step 7: Start service
await this.startServiceSafely();

// Step 8: Validate UI compatibility
await this.validateUICompatibility();

// Step 8: Verify update
await this.verifyUpdate();

this.log('✅ Service update completed successfully!');
return true;
```

**After:**
```javascript
// Step 7: Start service - DISABLED - User will manually restart after verifying update
// await this.startServiceSafely();
this.log('⚠️  Service remains stopped. Please manually restart after verifying update:', 'WARN');
this.log('   npm run service:start', 'INFO');

// Step 8: Validate UI compatibility - DISABLED - Requires running service
// await this.validateUICompatibility();

// Step 8: Verify update - DISABLED - Requires running service
// await this.verifyUpdate();

this.log('✅ Service update completed successfully!');
this.log('🛑 Service is STOPPED. Start it manually when ready:', 'WARN');
this.log('   npm run service:start', 'SUCCESS');
return true;
```

### 2. `scripts/post-merge-hook.js`
**Changes:**
- Updated `generateUpdateInstructions()` to clarify service will NOT auto-restart
- Changed instructions from `npm run setup:update && npm run service:restart` to `npm run service:update` then manual `npm run service:start`
- Added warning that service will be STOPPED for manual verification

**Before:**
```javascript
log('✓ Run the smart update (as Administrator):', 'INFO')
log('   npm run setup:update', 'SUCCESS')
log('   npm run service:restart', 'SUCCESS')
log('')
log('   This will:', 'INFO')
log('   • Stop the service safely', 'INFO')
log('   • Update dependencies', 'INFO')
log('   • Rebuild changed components', 'INFO')
log('   • Handle database migrations', 'INFO')
log('   • Restart the service', 'INFO')
```

**After:**
```javascript
log('✓ Run the smart update (as Administrator):', 'INFO')
log('   npm run service:update', 'SUCCESS')
log('')
log('   This will:', 'INFO')
log('   • Stop the service safely', 'INFO')
log('   • Update dependencies', 'INFO')
log('   • Rebuild changed components', 'INFO')
log('   • Handle database migrations', 'INFO')
log('   • Leave service STOPPED for manual verification', 'WARN')
log('')
log('✓ After verifying the update, manually start the service:', 'WARN')
log('   npm run service:start', 'SUCCESS')
```

## Updated Workflow

### Service Update Process (Now Fixed)
1. **Stop Service**: `npm run service:update` automatically stops the Windows service
2. **Git Pull**: Pulls latest changes from repository
3. **Install Dependencies**: Runs `npm install`
4. **Database Migration**: Runs Prisma migrations
5. **Build Service**: Compiles TypeScript and builds service
6. **Service Stopped**: Service remains STOPPED (no auto-restart)
7. **Manual Verification**: User can check logs, verify database, test in dev mode
8. **Manual Start**: User runs `npm run service:start` when ready

### Git Hooks (Already Working Correctly)
- **pre-commit**: Stops service before build (prevents file locks)
- **pre-push**: Stops service before push (prevents file locks)
- **post-merge**: Stops service after pull (prevents file locks), shows update instructions

## Benefits
✅ **No File Lock Conflicts**: Service stopped before any file operations
✅ **User Control**: Manual restart allows verification before going live
✅ **Safer Updates**: User can test in dev mode before production restart
✅ **Error Recovery**: If update fails, service stays stopped (not in broken state)
✅ **Log Inspection**: User can review update logs before restart

## Usage

### Updating the Service
```bash
# Run as Administrator
npm run service:update

# After successful update, verify logs
cat windows-service/daemon/update.log

# When ready, manually start service
npm run service:start
```

### Manual Service Control
```bash
# Stop service
npm run service:stop

# Start service
npm run service:start

# Restart service (stop + start)
npm run service:restart

# Check status
npm run service:status
```

## Rollback Support
If an update fails, the service will remain stopped and rollback will be attempted automatically:
```bash
# The update script will automatically attempt rollback on failure
# If rollback fails, service remains stopped for manual intervention
```

## Date
January 22, 2025

## Status
✅ **FIXED** - Service update workflow no longer auto-restarts service
