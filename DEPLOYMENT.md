# Multi-Business Management Platform - Deployment Guide

**Last Updated:** 2025-11-05
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Fresh Installation](#fresh-installation)
4. [Updating Existing Installation](#updating-existing-installation)
5. [Windows Service Management](#windows-service-management)
6. [Environment Configuration](#environment-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Overview

This platform uses an **automated deployment system** with:
- Smart git hooks for automatic updates
- Windows service for production hosting
- Automatic database migrations
- Environment-based configuration using `.env.local`
- Peer-to-peer synchronization between servers

**Key Features:**
- Zero-configuration fresh installs via `npm run setup`
- Automatic category seeding (20 categories, 59 subcategories)
- Smart git hooks detect changes and rebuild appropriately
- Windows service handles migrations automatically on startup

---

## Prerequisites

### System Requirements
- **OS**: Windows Server (any recent version)
- **Node.js**: v18 or higher
- **PostgreSQL**: v12 or higher
- **Git**: Latest version
- **Administrator Access**: Required for Windows service operations

### Network Requirements
- Port **8080**: Main application (HTTP)
- Port **8765**: Sync service (mDNS discovery)
- Firewall configured to allow these ports

---

## Fresh Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/multi-business-multi-apps.git
cd multi-business-multi-apps
```

### Step 2: Configure Environment

Create `.env.local` in the root directory:

```bash
# Copy from example
cp .env.example .env.local

# Edit with your settings
notepad .env.local
```

**Critical Settings to Configure:**

```env
# ================================
# DATABASE CONFIGURATION
# ================================
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/multi_business_db"

# ================================
# AUTHENTICATION
# ================================
NEXTAUTH_URL="http://localhost:8080"
NEXTAUTH_SECRET="generate-unique-secret-here"

# ================================
# SYNC CONFIGURATION (Server-Specific)
# ================================
# Generate unique node ID for this server
SYNC_NODE_ID="a1b2c3d4e5f6g7h8"

# Use server hostname or identifier
SYNC_NODE_NAME="sync-node-server1"

# MUST BE SAME ON ALL SERVERS for peer authentication
SYNC_REGISTRATION_KEY="b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"

# Service ports
SYNC_SERVICE_PORT=8765
SYNC_HTTP_PORT=8080
PORT=8080
```

**Generate Unique Values:**

*Git Bash / Linux / macOS:*
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"     # SYNC_NODE_ID
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"    # SYNC_REGISTRATION_KEY (same on ALL servers)
```

*PowerShell / Command Prompt:*
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"     # SYNC_NODE_ID
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"    # SYNC_REGISTRATION_KEY (same on ALL servers)
```

**Note:** The commands work in all shells. Copy the generated value and paste into your `.env.local` file.

### Step 3: Install Git Hooks (Optional but Recommended)

```bash
npm run hooks:install
```

**What this does:**
- Installs post-merge hook for automatic updates
- Detects fresh install vs update scenarios
- Provides specific setup instructions automatically

### Step 4: Run Fresh Installation

```bash
npm run setup
```

**What this does automatically:**
1. Installs all dependencies (`npm install`)
2. Creates database if it doesn't exist
3. Sets up database schema
4. Applies all migrations
5. Seeds ~128 reference data records
6. **Seeds business categories** (20 categories, 59 subcategories)
   - Clothing: 5 categories, 17 subcategories
   - Hardware: 5 categories, 14 subcategories
   - Grocery: 6 categories, 15 subcategories
   - Restaurant: 4 categories, 13 subcategories
7. Builds Next.js application
8. Builds Windows service
9. Creates admin user: `admin@business.local` / `admin123`

**Expected Output:**

```
✅ FRESH INSTALL SETUP COMPLETED!

📊 Database Summary:
  ✓ Database created and migrations applied
  ✓ ~128 reference data records seeded
  ✓ 20 categories, 59 subcategories seeded
  ✓ Admin user created: admin@business.local / admin123

📖 NEXT STEPS:
  1. Install Windows service (as Administrator):
     npm run service:install

  2. Start the service (as Administrator):
     npm run service:start

  3. Access the application:
     http://localhost:8080
```

### Step 5: Install Windows Service

**Run as Administrator:**

```powershell
npm run service:install
```

### Step 6: Start Service

**Run as Administrator:**

```powershell
npm run service:start
```

### Step 7: Verify Installation

1. **Check service status:**
   ```bash
   npm run service:status
   ```

2. **Access application:**
   - URL: `http://localhost:8080`
   - Login: `admin@business.local` / `admin123`

3. **Verify sync connection** (if multi-server):
   - Navigate to: `http://localhost:8080/admin/sync`
   - Check connection to peer servers

---

## Updating Existing Installation

### Option A: Automatic Updates (With Git Hooks)

If you installed git hooks (`npm run hooks:install`):

```bash
git pull
```

**What happens automatically:**
1. Git pulls latest code
2. Post-merge hook detects what changed
3. Runs appropriate rebuild workflow:
   - Dependencies updated if `package.json` changed
   - Prisma client regenerated if schema changed
   - Service rebuilt if service files changed
4. Shows instructions for service restart

**Then restart service:**

```powershell
# Run as Administrator
npm run service:restart
```

### Option B: Manual Updates (Without Git Hooks)

```bash
# 1. Pull latest code
git pull

# 2. Run update script
npm run setup:update

# 3. Restart service (as Administrator)
npm run service:restart
```

**What `npm run setup:update` does:**
- Updates dependencies
- Regenerates Prisma client
- Rebuilds application
- Rebuilds Windows service
- **Does NOT run migrations** (handled by service restart)

### What Happens During Service Restart

The Windows service automatically performs:
1. Loads environment variables from `.env.local`
2. Validates database connectivity
3. **Runs pending migrations** (`npx prisma migrate deploy`)
4. **Seeds new reference data** if needed
5. Starts sync service
6. Starts Next.js application on port 8080

---

## Windows Service Management

### Service Commands

**All commands require Administrator privileges**

```powershell
# Install service
npm run service:install

# Start service
npm run service:start

# Stop service
npm run service:stop

# Restart service
npm run service:restart

# Check status
npm run service:status

# Diagnose issues
npm run service:diagnose

# Uninstall service
npm run service:uninstall
```

### Service Behavior

The Windows service wrapper (`windows-service/service-wrapper-hybrid.js`):
- Loads environment from `.env.local` on startup
- Runs both sync service and Next.js app
- Handles automatic migrations
- Provides health check endpoint on port 8766
- Logs to `logs/service.log` and `windows-service/daemon/service.log`

---

## Environment Configuration

### Environment File: `.env.local`

**Important:** The service loads `.env.local` (NOT `.env` or `config/service.env`)

Reference: `windows-service/service-wrapper-hybrid.js:13`

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:8080` |
| `NEXTAUTH_SECRET` | Auth secret key | Generated 32-byte base64 string |
| `PORT` | Main app port | `8080` |

### Sync-Specific Variables (Multi-Server Only)

| Variable | Description | Per Server | Example |
|----------|-------------|------------|---------|
| `SYNC_NODE_ID` | Unique node identifier | ✅ Different | `a1b2c3d4e5f6g7h8` |
| `SYNC_NODE_NAME` | Server name | ✅ Different | `sync-node-server1` |
| `SYNC_REGISTRATION_KEY` | Peer authentication | ❌ Same on all | `b3f1c9d7a5e4...` |
| `SYNC_SERVICE_PORT` | mDNS port | Same | `8765` |
| `SYNC_HTTP_PORT` | HTTP API port | Same | `8080` |
| `SYNC_INTERVAL` | Sync frequency (ms) | Same | `30000` |

### Security Notes

1. **Never commit `.env.local`** to version control (it's in `.gitignore`)
2. **Use unique `NEXTAUTH_SECRET`** on each server
3. **Use strong database passwords**
4. **Keep `SYNC_REGISTRATION_KEY` secret** but same on all peer servers
5. **Configure firewall** for sync ports (8765, 8080)

---

## Troubleshooting

### Issue: Service Won't Start

**Check logs:**

```bash
# Service wrapper logs
cat windows-service/daemon/service.log

# Application logs
cat logs/service.log
cat logs/service-error.log
```

**Common causes:**
1. **DATABASE_URL not loaded** - Verify `.env.local` exists
2. **Port conflict** - Check if port 8080 or 8765 is in use
3. **Database not accessible** - Verify PostgreSQL is running
4. **Prisma client outdated** - Run `npx prisma generate`

**Solution:**

```bash
# Rebuild everything
npm run setup:update

# Restart service
npm run service:restart
```

### Issue: Environment Variables Not Loading

**Symptoms:** Service logs show "DATABASE_URL not found"

**Check:**
1. Verify `.env.local` exists in project root
2. Check file has correct variables
3. Verify file is readable (not locked)

**File Location:**
```
C:\apps\multi-business-multi-apps\.env.local
```

**The service looks for `.env.local` specifically** (not `.env` or `config/service.env`)

### Issue: Migrations Fail

**Check migration status:**

```bash
npx prisma migrate status
```

**Manual migration:**

```bash
npx prisma migrate deploy
```

**If stuck:**

```bash
# Check for lock
ls -la prisma/.prisma-migration-lock

# Remove if exists
rm prisma/.prisma-migration-lock

# Retry
npx prisma migrate deploy
```

### Issue: Port 8080 Already in Use

**Find process using port:**

```powershell
Get-NetTCPConnection -LocalPort 8080 | Select-Object -ExpandProperty OwningProcess
```

**Kill process:**

```powershell
$pid = Get-NetTCPConnection -LocalPort 8080 | Select-Object -ExpandProperty OwningProcess
Stop-Process -Id $pid -Force
```

**Restart service:**

```powershell
npm run service:restart
```

### Issue: Database Connection Failed

**Test connection:**

```bash
npm run diagnose:database
```

**Check PostgreSQL status:**

```powershell
# Check if running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-14
```

**Verify credentials in `.env.local`:**

```bash
# Test connection manually
psql postgresql://user:pass@localhost:5432/multi_business_db -c "SELECT 1"
```

### Issue: Sync Service Not Connecting Peers

**Check:**
1. Same `SYNC_REGISTRATION_KEY` on all servers
2. Firewall allows ports 8765, 8080
3. Servers are on same network or have network connectivity

**Verify sync status:**

```bash
# Check sync events
node debug-sync-events.js

# Check sync status
node check-sync-status.js
```

### Issue: EPERM Errors During Prisma Operations

**Cause:** Windows service holds file locks on Prisma client files

**Solution:**

```bash
# Stop service
npm run service:stop

# Clean Prisma cache
rm -rf node_modules/.prisma/client

# Regenerate
npx prisma generate

# Rebuild and restart
npm run build:service
npm run service:start
```

---

## Maintenance

### Database Backups

**Manual backup:**

```powershell
# Create backup
pg_dump -U postgres -d multi_business_db > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# Verify backup created
ls -l backup_*.sql
```

**Automated backups:**

```bash
npm run backup:database
```

### Log Management

**Log locations:**
- Application logs: `logs/service.log`, `logs/service-error.log`
- Service wrapper logs: `windows-service/daemon/service.log`
- Sync logs: `logs/sync-service.log`

**Rotate logs:**

```bash
npm run rotate:logs
```

**View recent logs:**

```bash
# Last 100 lines
cat logs/service.log | tail -100

# Follow in real-time
tail -f logs/service.log
```

### Monitoring Service

**Check service health:**

```bash
# Service status
npm run service:status

# Detailed diagnostics
npm run service:diagnose

# Monitor continuously
npm run monitor:service
```

**Health check endpoint:**

```bash
# Sync service health
curl http://localhost:8766/health
```

### Database Operations

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Check migration status
npx prisma migrate status

# Apply migrations manually
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## Success Checklist

### Fresh Installation
- [ ] `.env.local` configured with all required variables
- [ ] Database created and accessible
- [ ] `npm run setup` completed successfully
- [ ] Categories seeded (20 categories, 59 subcategories)
- [ ] Windows service installed
- [ ] Service started successfully
- [ ] Application accessible at http://localhost:8080
- [ ] Admin login works (`admin@business.local` / `admin123`)
- [ ] Git hooks installed (optional but recommended)

### Updates
- [ ] Code pulled from repository
- [ ] `npm run setup:update` completed
- [ ] Service restarted
- [ ] No errors in logs
- [ ] Application accessible
- [ ] Existing data intact

### Multi-Server Sync
- [ ] Same `SYNC_REGISTRATION_KEY` on all servers
- [ ] Unique `SYNC_NODE_ID` per server
- [ ] Firewall configured (ports 8765, 8080)
- [ ] Sync connection visible in admin panel
- [ ] Sync events logging properly

---

## Quick Reference

### Common Commands

```bash
# Fresh install
npm run setup
npm run service:install
npm run service:start

# Update
git pull
npm run setup:update
npm run service:restart

# Service management
npm run service:status
npm run service:stop
npm run service:start
npm run service:restart

# Troubleshooting
npm run service:diagnose
npm run diagnose:database
npx prisma migrate status

# Logs
cat logs/service.log
tail -f logs/service.log
cat windows-service/daemon/service.log

# Database
npm run db:studio
npx prisma generate
npx prisma migrate deploy
```

### Important Paths

```
.env.local                           # Environment configuration
windows-service/service-wrapper-hybrid.js   # Service wrapper
logs/service.log                     # Application logs
windows-service/daemon/service.log   # Service wrapper logs
prisma/schema.prisma                 # Database schema
scripts/setup-fresh-install.js       # Fresh install script
scripts/setup-after-pull.js          # Update script
```

### Support Resources

- **Prisma Guide**: See `PRISMA_GUIDE.md` for Prisma-specific operations
- **Service Logs**: Check `logs/` directory for detailed error messages
- **Git Hooks**: Run `npm run hooks:install` for automatic update handling

---

**For detailed Prisma migration workflows and best practices, see `PRISMA_GUIDE.md`**

---

**Document Version:** 2.0
**Last Updated:** 2025-11-05
**Deployment Status:** ✅ Production Ready
**Environment File:** `.env.local` (loaded by service-wrapper-hybrid.js)
