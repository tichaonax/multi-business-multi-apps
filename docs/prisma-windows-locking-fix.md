# Prisma Windows File Locking Fix

## Problem

On Windows, fresh installations sometimes fail with this error:

```
EPERM: operation not permitted, rename 'C:\...\node_modules\.prisma\client\query_engine-windows.dll.node.tmp10172' -> 'C:\...\node_modules\.prisma\client\query_engine-windows.dll.node'
```

### Root Cause

Windows locks DLL files when they're in use by any process. When Prisma tries to regenerate its client, it can't replace the query engine DLL if:
- A Node.js process is still running (dev server, background task, etc.)
- The Windows service is running
- A previous installation didn't clean up properly
- File handles weren't released properly

Previously, the only solution was to reboot Windows to clear the locks.

## Solution

We've implemented an automatic cleanup and retry system:

### 1. Cleanup Script (`scripts/cleanup-prisma-locks.js`)

**Features:**
- Detects locked Prisma files
- Identifies Node.js processes holding the locks
- Distinguishes between project-related and other processes
- Can automatically stop processes
- Cleans up temporary files

**Usage:**
```bash
# Check for locks (manual)
node scripts/cleanup-prisma-locks.js

# Automatic cleanup (recommended)
node scripts/cleanup-prisma-locks.js --auto

# Force kill all Node.js processes (last resort)
node scripts/cleanup-prisma-locks.js --force
```

**Example Output:**
```
🧹 Prisma Lock Cleanup Tool

✅ Cleaned up 9 temporary file(s)

🔍 Checking for locked Prisma files...

✅ No locked Prisma files detected

✅ Ready to run: npx prisma generate
```

### 2. Safe Prisma Generate (`scripts/prisma-generate-safe.js`)

**Features:**
- Wraps `prisma generate` with retry logic
- Automatically detects file locking errors
- Runs cleanup between retries
- 3 retry attempts with 3-second delays
- Verbose mode for debugging

**Usage:**
```bash
# Normal mode
node scripts/prisma-generate-safe.js

# Verbose mode
node scripts/prisma-generate-safe.js --verbose
```

**Retry Logic:**
1. **Attempt 1**: Try to generate client
2. **On EPERM**: Clean up temp files and unlock processes
3. **Wait 3 seconds**: Allow file handles to release
4. **Attempt 2**: Retry generation
5. **Repeat** up to 3 times total

### 3. Integration

The safe generate script is automatically used in:
- `scripts/fresh-install.js`
- `scripts/setup-fresh-install.js`
- All installation workflows

## Manual Troubleshooting

If the automatic fix doesn't work:

### Step 1: Check for Running Processes
```bash
node scripts/cleanup-prisma-locks.js
```

### Step 2: Stop All Node.js Processes
```bash
# Close all terminals
# Stop any dev servers (npm run dev)
# Stop Windows services

# Or use force cleanup
node scripts/cleanup-prisma-locks.js --force
```

### Step 3: Clean Temp Files
```bash
# Remove .prisma temp files
node scripts/cleanup-prisma-locks.js --auto
```

### Step 4: Try Again
```bash
node scripts/prisma-generate-safe.js --verbose
```

### Last Resort
If all else fails:
1. Close ALL applications using Node.js
2. Stop the Windows service if installed
3. Restart Windows
4. Run setup again

## Prevention

To avoid locking issues in the future:

1. **Always stop the dev server** before running setup scripts
2. **Stop the Windows service** before installations
3. **Close all terminals** before fresh installs
4. **Use the safe scripts** instead of direct `prisma generate`

## Technical Details

### Why Windows Locks DLLs

Windows locks DLL files while they're loaded in memory because:
- Multiple processes can share the same DLL
- The OS needs to ensure the file doesn't change while in use
- This prevents corruption and crashes

### Our Solution

We work around this by:
1. **Detection**: Check if files are locked before attempting operations
2. **Cleanup**: Stop processes that are holding locks
3. **Retry**: Wait for locks to clear, then retry
4. **Temp Cleanup**: Remove stale temporary files that may cause issues

### File Locations

Prisma stores its query engine DLL at:
```
node_modules/.prisma/client/query_engine-windows.dll.node
```

Temporary files during generation:
```
node_modules/.prisma/client/*.tmp*
```

## Testing

To test the fix:

```bash
# 1. Start a process that loads Prisma
npm run dev

# 2. In another terminal, try to generate (should work now)
node scripts/prisma-generate-safe.js

# 3. Verify it detects and handles the lock
node scripts/cleanup-prisma-locks.js
```

## Related Files

- `scripts/cleanup-prisma-locks.js` - Lock detection and cleanup
- `scripts/prisma-generate-safe.js` - Safe generate with retry
- `scripts/fresh-install.js` - Updated to use safe generate
- `scripts/setup-fresh-install.js` - Updated to use safe generate

## FAQ

**Q: Do I need to reboot after every failed install?**
A: No! The safe generate script should handle it automatically.

**Q: What if the script can't unlock the files?**
A: Run with `--auto` flag or manually close Node.js processes.

**Q: Will this work on Linux/Mac?**
A: The locking issue is Windows-specific, but the scripts are cross-platform compatible.

**Q: Can I just use `prisma generate` directly?**
A: Yes, but you may encounter locking issues. Use `prisma-generate-safe.js` instead.

## Summary

✅ **Before**: Fresh installs failed with EPERM errors, requiring Windows reboot
✅ **After**: Automatic detection, cleanup, and retry - no reboot needed
