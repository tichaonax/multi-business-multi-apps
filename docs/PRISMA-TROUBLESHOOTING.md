# Prisma Setup Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: EPERM Errors During Setup

**Symptom:**
```
❌ File locking error detected (EPERM)
❌ Max retries reached. Prisma generate failed.
```

**What This Means:**
Another process is holding locks on Prisma DLL files in `node_modules/.prisma/client/`, preventing regeneration.

**Solution Steps:**

#### Step 1: Try Standard Retry (Already Automatic)
The `prisma-generate-safe.js` script automatically:
- Detects EPERM errors
- Cleans up temp files
- Unlocks Prisma files
- Retries up to 3 times

If this succeeds, no action needed.

#### Step 2: Manual Nuclear Cleanup (If Retries Fail)

**⚠️ IMPORTANT:** Only use nuclear cleanup when:
- Standard retries have failed
- No production services are running
- You're prepared for ALL Node processes to be killed

**Run Nuclear Cleanup:**
```powershell
# This will kill ALL Node.js processes and remove .prisma directory
node scripts/prisma-nuclear-cleanup.js

# Then retry setup
npm run setup
```

#### Step 3: Production Server (Services Running)

**⚠️ DO NOT use nuclear cleanup on production with running services!**

Instead:
```powershell
# 1. Stop all services first
npm run sync-service:stop
sc.exe stop "electricity-tokens.exe"

# 2. Run safe setup
npm run setup:production-safe

# 3. Restart services after
npm run sync-service:start
sc.exe start "electricity-tokens.exe"
```

### Issue 2: Setup Stops After Prisma Generation

**Symptom:**
Setup completes Prisma generation but doesn't continue with migrations, seeding, or building.

**Cause:**
You may have manually run setup with `--nuclear` flag, which kills the parent setup process.

**Solution:**
```powershell
# Use standard setup (no --nuclear flag)
npm run setup

# Only use nuclear cleanup manually if standard retry fails:
# 1. Stop the failed setup (Ctrl+C)
# 2. Run: node scripts/prisma-nuclear-cleanup.js
# 3. Run setup again: npm run setup
```

### Issue 3: Services Won't Stop

**Symptom:**
```powershell
sc.exe stop "electricity-tokens.exe"
# Returns error or service won't stop
```

**Solutions:**

**Option 1: Force Stop**
```powershell
sc.exe stop "electricity-tokens.exe" /force
```

**Option 2: Task Manager**
1. Open Task Manager
2. Find "electricity-tokens.exe" or "node.exe" processes
3. End the process
4. Verify with: `sc.exe query "electricity-tokens.exe"`

**Option 3: Restart Server**
```powershell
# Last resort if services are stuck
shutdown /r /t 0
```

### Issue 4: "Nuclear Cleanup" Killed My Setup Script

**Why This Happens:**
Nuclear cleanup kills ALL Node.js processes except itself. If setup script calls nuclear cleanup, setup gets killed.

**Solution:**
Don't use `--nuclear` flag in setup scripts. Use it only as a standalone command:

```powershell
# ❌ WRONG - This will kill the setup process
node scripts/setup-fresh-install.js --nuclear

# ✅ CORRECT - Let setup use standard retry logic
npm run setup

# If setup fails with EPERM after retries, THEN run nuclear cleanup separately:
node scripts/prisma-nuclear-cleanup.js
npm run setup
```

## Recommended Workflow

### Development Machine (No Services Running)

```powershell
# Standard setup with automatic retry
npm run setup

# If that fails with EPERM after 3 retries:
node scripts/prisma-nuclear-cleanup.js
npm run setup
```

### Production Server (Services Running)

```powershell
# 1. Stop services
npm run sync-service:stop
sc.exe stop "electricity-tokens.exe"

# 2. Verify services stopped
npm run sync-service:status
sc.exe query "electricity-tokens.exe"

# 3. Run production-safe setup
npm run setup:production-safe

# 4. Restart services
npm run sync-service:start
sc.exe start "electricity-tokens.exe"

# 5. Verify services running
npm run sync-service:status
sc.exe query "electricity-tokens.exe"
```

## Prevention Tips

### 1. Always Stop Services Before Setup

On production servers, always stop services that use Prisma before running setup.

### 2. Don't Run Multiple Setups Simultaneously

Only run one setup process at a time. Multiple concurrent setups can cause lock conflicts.

### 3. Close Development Servers

Before running setup, stop any running dev servers:
```powershell
# Stop dev server (Ctrl+C in the terminal running it)
# Or find and kill the process in Task Manager
```

### 4. Avoid Manual Prisma Commands During Setup

Let setup scripts handle Prisma operations. Don't run manual `prisma generate` during setup.

### 5. Use Production-Safe Script on Servers

Always use `npm run setup:production-safe` on production servers - it checks for running services.

## Quick Reference

| Scenario | Command |
|----------|---------|
| Fresh setup (dev, no services) | `npm run setup` |
| Fresh setup (production, with services) | `npm run setup:production-safe` |
| Manual nuclear cleanup | `node scripts/prisma-nuclear-cleanup.js` |
| Check locked files | `node scripts/cleanup-prisma-locks.js --manual` |
| Stop sync service | `npm run sync-service:stop` |
| Stop electricity service | `sc.exe stop "electricity-tokens.exe"` |
| Start sync service | `npm run sync-service:start` |
| Start electricity service | `sc.exe start "electricity-tokens.exe"` |

## When to Contact Support

Contact support if:
- EPERM errors persist after nuclear cleanup
- Services won't stop even with force
- Setup consistently fails on a specific step
- You see database connection errors
- Migrations fail repeatedly

## Additional Resources

- [PRODUCTION-SETUP.md](./PRODUCTION-SETUP.md) - Production deployment guide
- [prisma-windows-locking-fix.md](./prisma-windows-locking-fix.md) - Technical details on Windows locking
