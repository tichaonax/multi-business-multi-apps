# Deployment Guide - Multi-Business Management Platform

## Overview

This guide covers fresh deployment and upgrade procedures for Windows servers.

**Key Design Principle**: The Windows service handles ALL database operations (migrations, seeding) automatically when enabled.

---

## Fresh Deployment (New Server)

Follow these steps to deploy the application on a fresh Windows server.

### Prerequisites

- Windows Server (any recent version)
- PostgreSQL 12+ installed and running
- Node.js 18+ installed
- Git installed
- Administrator access for Windows Service installation

### Step 1: Clone Repository

```powershell
cd C:\apps
git clone <repository-url> multi-business-multi-apps
cd multi-business-multi-apps
```

### Step 2: Configure Environment

```powershell
# Copy environment template
copy .env.example .env

# Edit .env file with your settings
notepad .env
```

**Required settings:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_URL` - Your application URL
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `RUN_MIGRATIONS_ON_START=true` - **CRITICAL**: Enables automatic migrations

### Step 3: Fresh Database Setup (One-Time Only)

For a completely fresh database, run these two steps ONCE:

```powershell
# Step 1: Create database and deploy schema
node scripts/setup-database-schema.js

# Step 2: Seed reference data (runs in separate process)
node scripts/production-setup.js
```

**Why two steps?** Windows locks Prisma DLL files when loaded. Running seeding in a separate process avoids DLL lock issues.

**Note**: After this initial setup, ALL future migrations and seeding are handled automatically by the service.

### Step 4: Install Dependencies & Build

```powershell
npm install
npm run build
npm run build:service
```

### Step 5: Install Windows Service

```powershell
# Run as Administrator
npm run service:install
```

### Step 6: Enable Automatic Migrations (IMPORTANT)

Add this to your `.env` file:

```
RUN_MIGRATIONS_ON_START=true
```

This tells the service wrapper to automatically run migrations and seeding on startup.

### Step 7: Start Service

```powershell
# Run as Administrator
npm run service:start
```

**What happens automatically:**
- Service checks migration status
- Runs pending migrations (`prisma migrate deploy`)
- Seeds reference data (`npm run seed:migration`)
- Starts sync service
- Starts main application

### Step 8: Verify Installation

```powershell
# Check service status
npm run service:status

# Test login
# Navigate to: http://localhost:8080
# Login: admin@business.local / admin123
```

---

## Upgrade Deployment (Existing Server)

Follow these steps to upgrade an existing installation.

### Step 1: Stop Service

```powershell
# Run as Administrator
npm run service:stop
```

### Step 2: Backup Database (CRITICAL)

```powershell
# Create backup directory if needed
mkdir backups

# Backup database
pg_dump -h localhost -U postgres -d multi_business_db > backups\backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### Step 3: Pull Latest Code

```powershell
git pull origin main
```

**What happens automatically:**
- Post-merge git hook runs `npm run setup:update`
- Dependencies are updated (`npm install`)
- Prisma client is regenerated (`npx prisma generate`)
- Application is rebuilt (`npm run build`)
- Service files are rebuilt (`npm run build:service`)

**NOT done by hook:** Database migrations (handled by service restart)

### Step 4: Restart Service

```powershell
# Run as Administrator
npm run service:restart
```

**What happens automatically during service startup:**
- Service wrapper checks migration status
- Applies any pending migrations
- Seeds any new reference data
- Starts sync service
- Starts main application

### Step 5: Verify Upgrade

```powershell
# Check service status
npm run service:status

# Test application
# Navigate to: http://localhost:8080
```

---

## How Automatic Migrations Work

### Environment Variable Control

Set `RUN_MIGRATIONS_ON_START=true` in your `.env` file to enable automatic migrations.

### Service Startup Flow

When the service starts (see `windows-service/service-wrapper-hybrid.js`):

1. **Migration Status Check** (`prisma migrate status`)
   - Determines if database is up to date
   - Checks for pending migrations
   - Detects if initial schema is needed

2. **Smart Migration Strategy**:
   - **Up to date**: Skip migrations, run seeding only
   - **Pending migrations**: Run `prisma migrate deploy`
   - **Fresh database**: Run `prisma db push`

3. **Automatic Seeding** (`npm run seed:migration`)
   - Runs after migrations complete
   - Idempotent - won't duplicate data
   - Creates/updates reference data

4. **Process Isolation**:
   - Migrations run in separate spawned process
   - Avoids Windows DLL file locking issues
   - Migration lock prevents concurrent runs

### Migration Lock

The service uses a `.migration.lock` file to prevent concurrent migrations:
- Created before migrations start
- Automatically removed when complete
- 2-minute timeout if lock gets stuck

---

## Manual Setup (If Automated Setup Fails)

### Fresh Install:

```powershell
# Install dependencies
npm install

# Setup database schema (no seeding)
node scripts/setup-database-schema.js

# Seed reference data (separate process)
node scripts/production-setup.js

# Build application
npm run build
npm run build:service

# Install and start service
npm run service:install
npm run service:start
```

### Upgrade:

```powershell
# Stop service
npm run service:stop

# Pull code
git pull origin main

# Install/update dependencies
npm install

# Regenerate Prisma client
npx prisma generate

# Rebuild application
npm run build
npm run build:service

# Restart service (handles migrations automatically)
npm run service:restart
```

### Manual Migration (Emergency Only):

```powershell
# Check migration status
npx prisma migrate status

# Deploy pending migrations
npx prisma migrate deploy

# Seed reference data
node scripts/production-setup.js

# Restart service
npm run service:restart
```

---

## Troubleshooting

### Issue: "EPERM: operation not permitted" during Prisma generate

**Cause:** Windows DLL file locking when Prisma client is already loaded in memory.

**Solution:** The service wrapper handles this automatically by running migrations in separate processes.

### Issue: "Model not found on Prisma client"

**Cause:** Prisma client wasn't regenerated after schema changes.

**Solution:**
```powershell
npx prisma generate
npm run service:restart
```

### Issue: Migrations not running automatically

**Cause:** `RUN_MIGRATIONS_ON_START` not set in `.env` file.

**Solution:**
```powershell
# Add to .env file
echo RUN_MIGRATIONS_ON_START=true >> .env

# Restart service
npm run service:restart
```

### Issue: Migration lock timeout

**Cause:** Previous migration crashed and left lock file.

**Solution:**
```powershell
# Remove lock file
del .migration.lock

# Restart service
npm run service:restart
```

### Issue: Service won't start after upgrade

**Cause:** Service files weren't rebuilt or service is locked.

**Solution:**
```powershell
# Rebuild service files
npm run build:service

# Force restart service
npm run service:stop
timeout /t 5
npm run service:start
```

---

## Important Notes

### Windows-Specific Considerations

1. **DLL File Locking**: The service wrapper automatically handles Prisma DLL locking by running migrations in separate processes.

2. **Administrator Rights**: Service installation, start, stop, and restart require Administrator privileges.

3. **File Paths**: Use Windows path format (`C:\apps\...`) not Unix format (`/c/apps/...`).

4. **PowerShell**: Use PowerShell (not CMD) for better script compatibility.

### Database Safety

1. **Never use `prisma migrate reset` in production** - This destroys all data.

2. **Always backup before major changes** - Use `pg_dump` to create backups.

3. **Test migrations in development first** - Never apply untested migrations to production.

4. **Migrations are forward-only** - Plan schema changes carefully.

### Git Hooks

The repository includes a post-merge hook (`.githooks/post-merge.ps1`) that automatically:
- Detects what changed (dependencies, migrations, source code)
- Updates dependencies
- Regenerates Prisma client
- Rebuilds the application
- Rebuilds service files
- **Does NOT run migrations** (handled by service startup)

**To install git hooks:**
```powershell
npm run hooks:install
```

### Service Lifecycle

**Service Install** (`npm run service:install`):
- Installs Windows service
- Does NOT start service
- Does NOT run migrations

**Service Start** (`npm run service:start`):
- Starts Windows service
- **Automatically runs migrations** (if `RUN_MIGRATIONS_ON_START=true`)
- **Automatically seeds data**
- Starts sync service
- Starts main application

**Service Restart** (`npm run service:restart`):
- Stops service
- Starts service (with automatic migrations)
- Best way to apply code and database changes

---

## Available Commands

### Database

```powershell
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create new migration (dev only)
npm run db:deploy        # Deploy migrations (production)
npm run db:studio        # Open Prisma Studio GUI
npm run db:pull          # Pull schema from database
npm run db:push          # Push schema to database (dev only)
```

### Setup

```powershell
npm run setup            # Fresh install setup
npm run setup:update     # Update after git pull
npm run hooks:install    # Install git hooks
```

### Service Management

```powershell
npm run service:install   # Install Windows service
npm run service:uninstall # Uninstall Windows service
npm run service:start     # Start service (runs migrations automatically)
npm run service:stop      # Stop service
npm run service:restart   # Restart service (best for updates)
npm run service:status    # Check service status
```

### Admin User

```powershell
npm run create-admin     # Create admin user
```

**Default credentials:**
- Email: `admin@business.local`
- Password: `admin123`

**IMPORTANT**: Change the default password after first login!

---

## Deployment Checklist

### Fresh Deployment

- [ ] PostgreSQL installed and running
- [ ] Node.js 18+ installed
- [ ] Repository cloned
- [ ] `.env` file configured with `RUN_MIGRATIONS_ON_START=true`
- [ ] Database schema setup (`node scripts/setup-database-schema.js`)
- [ ] Reference data seeded (`node scripts/production-setup.js`)
- [ ] Dependencies installed (`npm install`)
- [ ] Application built (`npm run build && npm run build:service`)
- [ ] Service installed (`npm run service:install`)
- [ ] Service started (`npm run service:start`)
- [ ] Admin user created and password changed
- [ ] Application accessible at configured URL

### Upgrade Deployment

- [ ] Database backed up
- [ ] Service stopped
- [ ] Code pulled (`git pull`)
- [ ] Setup completed (automatic via post-merge hook)
- [ ] Service restarted (`npm run service:restart`)
- [ ] Migrations applied (automatic on service start)
- [ ] Application tested and verified

---

## Support

For issues or questions:
1. Check this documentation first
2. Review error logs in `logs/` directory
3. Check service logs: `npm run service:status`
4. Check Windows service logs in `windows-service/daemon/service.log`
5. Consult the troubleshooting section above

---

**Last Updated:** 2025-01-11
