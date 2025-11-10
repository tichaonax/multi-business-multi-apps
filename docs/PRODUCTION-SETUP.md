# Production Server Setup Guide

## Overview

This guide explains how to safely perform a fresh installation on a **production server** where multiple services are using Prisma.

## Important Notes

⚠️ **CRITICAL**: Your production server has multiple services running that use Prisma:
- Multi-Business Sync Service
- electricity-tokens service

These services **MUST** be stopped before running fresh installation to avoid Prisma file locking issues.

## Fresh Installation Procedure

### Step 1: Stop All Services

Before running setup, stop all services that use Prisma:

```powershell
# Stop Multi-Business Sync Service
npm run sync-service:stop

# Stop electricity-tokens service
sc stop "electricity-tokens"

# Verify services are stopped
npm run sync-service:status
sc query "electricity-tokens"
```

### Step 2: Pull Latest Code

```powershell
# Pull latest changes from repository
git pull origin main
```

### Step 3: Run Production-Safe Setup

Use the **production-safe setup script** which includes service checks:

```powershell
# Run production-safe setup
node scripts/production-safe-setup.js
```

This script will:
1. ✅ Check if services are stopped
2. ❌ **REFUSE to proceed** if services are running
3. ✅ Run fresh installation safely
4. ✅ Remind you to restart services

### Step 4: Restart Services

After setup completes successfully:

```powershell
# Start Multi-Business Sync Service
npm run sync-service:start

# Start electricity-tokens service
sc start "electricity-tokens"

# Verify services are running
npm run sync-service:status
sc query "electricity-tokens"
```

## Alternative: Manual Setup

If you prefer manual control:

```powershell
# 1. Stop services
npm run sync-service:stop
sc stop "electricity-tokens"

# 2. Run regular setup
node scripts/setup-fresh-install.js

# 3. Start services
npm run sync-service:start
sc start "electricity-tokens"
```

## Troubleshooting

### EPERM Errors During Setup

If you encounter `EPERM` errors even after stopping services:

```powershell
# 1. Verify NO services are running
npm run sync-service:status
sc query "electricity-tokens"

# 2. Check for any Node processes holding files
tasklist /FI "IMAGENAME eq node.exe"

# 3. If needed, restart the server
shutdown /r /t 0

# 4. After restart, run setup again
node scripts/production-safe-setup.js
```

### Services Won't Stop

If a service won't stop normally:

```powershell
# Force stop a service
sc stop "service-name" /force

# Or use Task Manager to end the process
```

### Setup Fails Midway

If setup fails:

```powershell
# 1. Check what went wrong
cat .next/trace

# 2. Clean up any locks
node scripts/cleanup-prisma-locks.js

# 3. Try setup again
node scripts/production-safe-setup.js
```

## DO NOT Use Nuclear Cleanup on Production

⚠️ **WARNING**: Do NOT use the nuclear cleanup option on production servers:

```powershell
# ❌ DO NOT RUN THIS ON PRODUCTION
node scripts/prisma-nuclear-cleanup.js
```

The nuclear cleanup kills ALL Node.js processes, which would:
- Stop your electricity-tokens service
- Stop your Multi-Business Sync Service
- Potentially disrupt other Node-based applications

## Best Practices

### Before Running Setup

1. ✅ Announce maintenance window
2. ✅ Stop all Prisma-using services
3. ✅ Verify services are stopped
4. ✅ Have a rollback plan

### During Setup

1. ✅ Monitor the setup process
2. ✅ Watch for EPERM errors
3. ✅ Check logs if anything fails

### After Setup

1. ✅ Verify database migrations applied
2. ✅ Test admin login
3. ✅ Restart all services
4. ✅ Verify services are running
5. ✅ Test service endpoints

## Adding New Services

If you add more services that use Prisma, update the service list in:

```javascript
// scripts/production-safe-setup.js
const PRISMA_SERVICES = [
  'Multi-Business Sync Service',
  'electricity-tokens',
  'your-new-service-name'  // Add here
]
```

## Quick Reference

### Check Service Status

```powershell
npm run sync-service:status
sc query "electricity-tokens"
```

### Stop All Services

```powershell
npm run sync-service:stop
sc stop "electricity-tokens"
```

### Start All Services

```powershell
npm run sync-service:start
sc start "electricity-tokens"
```

### Run Safe Setup

```powershell
node scripts/production-safe-setup.js
```

## Support

If you encounter issues:
1. Check this guide first
2. Review error logs
3. Verify all services are stopped
4. Try restarting the server
5. Contact support if needed
