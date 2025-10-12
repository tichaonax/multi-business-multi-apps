# Deployment Guide - Multi-Business Management Platform

## Overview

This guide covers fresh deployment and upgrade procedures for Windows servers.

**IMPORTANT**: Database setup uses a two-step process to avoid Windows DLL file locking issues with Prisma.

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

### Step 3: Install Dependencies

```powershell
npm install
```

### Step 4: Setup Database Schema (Step 1 of 2)

```powershell
node scripts/setup-database-schema.js
```

**What this does:**
- Creates database if it doesn't exist
- Generates Prisma client
- Deploys all migrations to database

### Step 5: Seed Reference Data (Step 2 of 2)

```powershell
node scripts/production-setup.js
```

**What this does:**
- Seeds all reference data (ID templates, job titles, compensation types, etc.)
- Creates admin user: `admin@business.local` / `admin123`
- Verifies setup completion

**Why two steps?** Windows locks Prisma DLL files when loaded, preventing regeneration. Running seeding in a separate process avoids this issue.

### Step 6: Build Application

```powershell
npm run build
npm run build:service
```

### Step 7: Install Windows Service (Optional)

```powershell
# Run as Administrator
npm run service:install
npm run service:start
```

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

### Step 1: Stop Service (if running)

```powershell
# Run as Administrator
npm run service:stop
```

### Step 2: Backup Database

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
- Dependencies are updated
- Prisma client is regenerated
- Database migrations are applied
- Reference data is seeded (idempotent - won't duplicate)
- Application is rebuilt
- Service files are rebuilt

### Step 4: Restart Service

```powershell
# Run as Administrator
npm run service:restart
```

### Step 5: Verify Upgrade

```powershell
# Check service status
npm run service:status

# Test application
# Navigate to: http://localhost:8080
```

---

## Manual Setup (If Automated Setup Fails)

If the automated post-merge hook fails, run these commands manually:

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

# Restart service
npm run service:restart
```

### Upgrade:

```powershell
# Install/update dependencies
npm install

# Regenerate Prisma client
npx prisma generate

# Run pending migrations
npx prisma migrate deploy

# Seed any new reference data (idempotent)
node scripts/production-setup.js

# Rebuild application
npm run build
npm run build:service

# Restart service
npm run service:restart
```

---

## Troubleshooting

### Issue: "EPERM: operation not permitted" during Prisma generate

**Cause:** Windows DLL file locking when Prisma client is already loaded in memory.

**Solution:** Run seeding in a separate process:
```powershell
node scripts/setup-database-schema.js   # First (schema only)
node scripts/production-setup.js         # Second (seeding only)
```

### Issue: "Model not found on Prisma client"

**Cause:** Prisma client wasn't regenerated after schema changes.

**Solution:**
```powershell
npx prisma generate
node scripts/production-setup.js
```

### Issue: Migration conflicts

**Cause:** Database schema doesn't match migration history.

**Solution:**
```powershell
# Check migration status
npx prisma migrate status

# If needed, resolve conflicts
npx prisma migrate resolve --applied <migration_name>
```

### Issue: Admin user not created

**Cause:** Seeding script didn't run or failed.

**Solution:**
```powershell
node scripts/production-setup.js
# OR
npm run create-admin
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

1. **DLL File Locking**: Prisma query engine DLL files are locked by Node.js processes. Always run seeding in a separate process after schema setup.

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
- Runs appropriate setup commands
- Rebuilds the application
- Reminds you to restart the service

**To install git hooks:**
```powershell
npm run hooks:install
```

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
npm run setup:fresh-db   # Setup database only
npm run check:db-state   # Check database state
```

### Service Management

```powershell
npm run service:install   # Install Windows service
npm run service:uninstall # Uninstall Windows service
npm run service:start     # Start service
npm run service:stop      # Stop service
npm run service:restart   # Restart service
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
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Database schema setup (`node scripts/setup-database-schema.js`)
- [ ] Reference data seeded (`node scripts/production-setup.js`)
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
- [ ] Service restarted
- [ ] Application tested and verified

---

## Support

For issues or questions:
1. Check this documentation first
2. Review error logs in `logs/` directory
3. Check service logs: `npm run service:status`
4. Consult the troubleshooting section above

---

**Last Updated:** 2025-01-11
