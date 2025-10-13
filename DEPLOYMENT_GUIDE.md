# Deployment Guide - Multi-Business Multi-Apps

**Last Updated:** 2025-10-13
**Status:** Complete with automated migrations

---

## Table of Contents
1. [Overview](#overview)
2. [Clean Install (New Server)](#clean-install-new-server)
3. [Update Existing Deployment](#update-existing-deployment)
4. [Git Hooks Configuration](#git-hooks-configuration)
5. [Manual Operations](#manual-operations)
6. [Troubleshooting](#troubleshooting)

---

## Overview

This application has **intelligent automated setup** that detects whether you're doing a clean install or an update:

- **Clean Install**: Automatically sets up database, runs migrations, and seeds data
- **Update**: Automatically rebuilds code; service handles migrations on restart
- **Git Hooks**: Automatically trigger appropriate workflows after `git pull`

---

## Clean Install (New Server)

### Prerequisites
- Node.js 18+ installed
- PostgreSQL/MySQL server running
- Git installed
- Administrator privileges (for Windows service)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd multi-business-multi-apps
```

### Step 2: Configure Environment
Create `.env` file in root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/multi_business_db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:8080"
```

Create `config/service.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/multi_business_db
SYNC_PORT=8765
SKIP_MIGRATIONS=false
SKIP_DB_PRECHECK=false
```

### Step 3: Install Git Hooks (One-Time Setup)
```bash
npm run hooks:install
```

**What this does:**
- Configures Git to use `.githooks/` directory
- Sets up `post-merge` hook to run automatically after `git pull`
- Makes hooks executable (Unix/Linux/Mac)

**Output:**
```
=============================================================
✅ GIT HOOKS INSTALLED SUCCESSFULLY!
=============================================================

📖 Installed hooks:
   • post-merge: Automatically rebuilds service after git pull

💡 The hooks will run automatically on relevant git operations.
   To disable: git config core.hooksPath .git/hooks
```

### Step 4: Run Setup
```bash
npm run setup
```

**What this does:**
1. Runs `npm install`
2. Generates Prisma client
3. Builds Next.js application
4. Builds Windows sync service
5. **Detects this is a clean install**
6. Automatically runs database setup:
   - Creates database schema
   - Runs all migrations
   - Seeds ~128 reference data records
   - Creates admin user (admin@business.local / admin123)
   - Validates UI compatibility

**Output:**
```
=============================================================
✅ FRESH INSTALL SETUP COMPLETED!
=============================================================

📊 Database Summary:
  ✓ Database created and migrations applied
  ✓ ~128 reference data records seeded
  ✓ Admin user created: admin@business.local / admin123

📖 NEXT STEPS (MANUAL):
  1. Install Windows service (as Administrator):
     npm run service:install

  2. Start the service (as Administrator):
     npm run service:start

  3. Access the application:
     http://localhost:8080
```

### Step 5: Install Windows Service (As Administrator)
```bash
npm run service:install
```

### Step 6: Start Service (As Administrator)
```bash
npm run service:start
```

### Step 7: Verify Installation
1. Open browser: `http://localhost:8080`
2. Login with: `admin@business.local` / `admin123`
3. Verify dashboard loads without errors

---

## Update Existing Deployment

### Option A: Using Git Pull (Automatic via Hook)

```bash
git pull
```

**What happens automatically:**
1. Git pulls latest code
2. `.githooks/post-merge` hook detects changes
3. Hook intelligently determines what changed:
   - **If package.json, migrations, or schema changed**: Runs `npm run setup:update`
   - **If only source files changed**: Quick rebuild
   - **If nothing significant changed**: Skips rebuild

**Automatic workflow when significant changes detected:**
```
=============================================================
🚀 Running full intelligent setup workflow...
=============================================================

1. npm install (if package.json changed)
2. npx prisma generate
3. npm run build
4. npm run build:service

✅ Build completed

⚠️  IMPORTANT: Service restart will handle:
   • Database migrations (automatic)
   • Reference data seeding (automatic)
   • Schema updates (automatic)
   • UI relations validation (automatic)

🚀 To apply all changes, restart the service:
   npm run service:restart (as Administrator)
```

### Option B: Manual Update Workflow

```bash
# Update code
git pull

# Run setup script
npm run setup:update

# Restart service (as Administrator)
npm run service:restart
```

### Service Restart Workflow

When you run `npm run service:restart`, the service performs:

1. **Stop service** gracefully
2. **Start service** with automatic operations:
   - Load `config/service.env` environment variables
   - Validate DATABASE_URL (source + format)
   - Database connectivity check (with retries)
   - **Run migrations**: `npx prisma migrate deploy` (automatic)
   - **Seed reference data** if needed (automatic)
   - Initialize sync service
   - Start health check endpoint

**Service logs show:**
```
[INFO] DATABASE_URL loaded from: process.env (loaded from config/service.env)
[INFO] Database connectivity check passed
[INFO] Running database migrations...
[INFO] Migration output: { ... }
[INFO] Database migrations completed successfully
[INFO] Multi-Business Sync Service started successfully
```

---

## Git Hooks Configuration

### Installed Hooks

#### `post-merge` (Runs after `git pull` or `git merge`)

**Location:** `.githooks/post-merge`

**Intelligent Detection Logic:**
```bash
# Detects what changed
PACKAGE_CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep "package.json")
MIGRATIONS_CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep "prisma/migrations/")
SCHEMA_CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep "prisma/schema.prisma")
SRC_CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep "src/")

# Full setup if critical files changed
if PACKAGE_CHANGED or MIGRATIONS_CHANGED or SCHEMA_CHANGED:
    npm run setup:update

# Quick rebuild if only source changed
elif SRC_CHANGED:
    npx prisma generate
    npm run build:service
    echo "Service rebuilt - restart needed"

# Skip if nothing significant changed
else:
    echo "No significant changes - skipping rebuild"
```

**Benefits:**
- ✅ Automatic rebuilds after `git pull`
- ✅ Intelligent detection avoids unnecessary work
- ✅ Prevents forgetting to rebuild after updates
- ✅ Consistent deployment workflow

### Hook Management

**View current hooks configuration:**
```bash
git config core.hooksPath
# Output: .githooks
```

**Disable hooks temporarily:**
```bash
git config core.hooksPath .git/hooks
```

**Re-enable hooks:**
```bash
npm run hooks:install
```

---

## Manual Operations

### Database Operations

**Run migrations manually:**
```bash
npx prisma migrate deploy
```

**Seed reference data manually:**
```bash
npm run seed:migration
```

**Create admin user:**
```bash
npm run create-admin
```

**Check database state:**
```bash
npm run check:db-state
```

### Service Operations

**Check service status:**
```bash
npm run service:status
```

**Stop service:**
```bash
npm run service:stop
```

**Start service:**
```bash
npm run service:start
```

**Restart service:**
```bash
npm run service:restart
```

**Rebuild service only:**
```bash
npm run build:service
```

**Uninstall service:**
```bash
npm run service:uninstall
```

### Development Operations

**Start development server:**
```bash
npm run dev
# Runs on http://localhost:8080
```

**Build production:**
```bash
npm run build
```

**Run type checking:**
```bash
npm run type-check
```

**Open Prisma Studio:**
```bash
npm run db:studio
```

---

## Service Startup Flow (Automatic)

When the Windows service starts, it automatically performs:

```
1. Load environment variables
   └─ Read config/service.env
   └─ Load DATABASE_URL, SYNC_PORT, etc.

2. Validate DATABASE_URL
   └─ Check URL exists
   └─ Log source (service.env vs service-config.json)
   └─ Validate format (must be PostgreSQL URL)
   └─ Fail fast if invalid

3. Database precheck
   └─ Connect to database
   └─ Test with SELECT 1
   └─ Retry 3 times with exponential backoff
   └─ Fail if cannot connect

4. Run migrations (NEW - Automatic)
   └─ Execute: npx prisma migrate deploy
   └─ Log migration output
   └─ Continue even if migrations fail (with warning)
   └─ Skip if SKIP_MIGRATIONS=true

5. Initialize sync service
   └─ Create SyncService instance
   └─ Setup event handlers
   └─ Start sync operations

6. Create health check endpoint
   └─ HTTP server on port SYNC_PORT + 1 (8766)
   └─ GET /health returns service status

7. Service operational
   └─ Ready to accept requests
   └─ Migrations applied
   └─ Schema up-to-date
```

**Environment Variables (config/service.env):**
```env
# Database connection (required)
DATABASE_URL=postgresql://user:password@localhost:5432/multi_business_db

# Service port
SYNC_PORT=8765

# Skip migrations (for testing/CI)
SKIP_MIGRATIONS=false

# Skip database precheck (for testing/CI)
SKIP_DB_PRECHECK=false

# Database precheck settings
DB_PRECHECK_ATTEMPTS=3
DB_PRECHECK_BASE_DELAY_MS=500
```

---

## Pushing Code to GitHub

### Before Pushing

1. **Ensure all changes are committed:**
   ```bash
   git status
   ```

2. **Test locally:**
   ```bash
   npm run dev
   # Verify application works
   # Test admin login
   # Test key features
   ```

3. **Run type checking:**
   ```bash
   npm run type-check
   ```

### Push to GitHub

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "Your commit message"

# Push to GitHub
git push origin main
```

### What Team Members Need to Do After Pull

**First-time setup (one-time):**
```bash
git clone <repository-url>
cd multi-business-multi-apps
npm run hooks:install  # Install git hooks
npm run setup          # Automatic clean install
```

**After first-time setup:**
```bash
git pull               # Hooks automatically handle rebuild
npm run service:restart  # Apply changes (as Administrator)
```

**The git hook automatically:**
- Detects what changed
- Runs appropriate rebuild workflow
- Shows clear instructions for service restart

---

## Troubleshooting

### Issue: Git hook not running after pull

**Diagnosis:**
```bash
git config core.hooksPath
# Should output: .githooks
```

**Solution:**
```bash
npm run hooks:install
```

### Issue: Service won't start after update

**Check service logs:**
```bash
cat logs/service.log
cat logs/service-error.log
```

**Common causes:**
1. **DATABASE_URL not loaded**: Check `config/service.env` exists
2. **Migrations failed**: Check logs for migration errors
3. **Port conflict**: Check if port 8765 is already in use
4. **Prisma client not regenerated**: Run `npx prisma generate`

**Solution:**
```bash
# Rebuild everything
npm run setup:update

# Restart service
npm run service:restart
```

### Issue: Migration fails during service startup

**Service continues with warning:**
```
[ERROR] Migration execution failed
[WARN] Service will continue despite migration failure. Manual migration may be required.
```

**Manual fix:**
```bash
# Check migration status
npx prisma migrate status

# Run migrations manually
npx prisma migrate deploy

# Restart service
npm run service:restart
```

### Issue: EPERM errors during Prisma operations

**Cause:** Windows service holds file locks on Prisma client files

**Solution (automatic):**
The `setup-after-pull.js` script automatically:
1. Stops Windows service
2. Kills stale node processes
3. Cleans Prisma temp files
4. Runs Prisma generate
5. Rebuilds service

**Manual fix:**
```bash
# Stop service
npm run service:stop

# Clean Prisma files
rm -rf node_modules/.prisma/client

# Regenerate
npx prisma generate

# Rebuild and restart
npm run build:service
npm run service:start
```

### Issue: 401 errors after update

**Check admin user exists:**
```bash
npm run create-admin
```

**Verify session configuration:**
- Check `NEXTAUTH_SECRET` in `.env`
- Check `NEXTAUTH_URL` matches your domain

### Issue: UI shows "relation not found" errors

**Run UI validation:**
```bash
node scripts/validate-ui-relations.js
```

**Fix relation mismatches:**
- Check Prisma schema relation names
- Verify API routes use correct relation names
- Reference: `SERVICE_STARTUP_ISSUES_RESOLVED.md`

---

## Summary: What Runs When

### Clean Install (`npm run setup`)
- ✅ npm install
- ✅ npx prisma generate
- ✅ npm run build
- ✅ npm run build:service
- ✅ Database schema setup (automatic)
- ✅ Reference data seeding (automatic)
- ✅ Admin user creation (automatic)
- ⚠️ Service install (manual)
- ⚠️ Service start (manual)

### Update via Git Pull (`git pull`)
- ✅ Git hook detects changes (automatic)
- ✅ Rebuilds if needed (automatic)
- ⚠️ Service restart (manual)
- ✅ Migrations run on service start (automatic)
- ✅ Reference data seeding (automatic)

### Service Restart (`npm run service:restart`)
- ✅ Stop service
- ✅ Load environment variables
- ✅ Validate DATABASE_URL
- ✅ Database connectivity check
- ✅ Run migrations (automatic)
- ✅ Seed reference data if needed
- ✅ Start service
- ✅ Health check endpoint active

---

**For detailed issue resolution, see:**
- `SERVICE_STARTUP_ISSUES_RESOLVED.md` - Service startup problems
- `COMPLETE_FIX_SUMMARY_2025-10-13.md` - All recent fixes
- `PRISMA_API_FIX_SUMMARY.md` - Prisma model reference issues
- `SESSION_AUTH_FIX_SUMMARY.md` - Authentication issues

---

**Generated:** 2025-10-13
**Deployment Status:** ✅ Fully Automated
**Migration Framework:** ✅ Active
**Git Hooks:** ✅ Configured
