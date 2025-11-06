# Multi-Business Multi-Apps Setup Guide

This guide covers the complete setup process for fresh installations and after pulling updates from Git.

## Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** database running and accessible
- **Windows** (for the sync service - optional)
- **Git** for version control

## Fresh Installation (New Machine)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd multi-business-multi-apps
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/multi_business"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:8080"
NEXTAUTH_SECRET="your-secret-key-here"

# Application Settings
NODE_ENV="development"
PORT=8080
```

**Important**: Replace the database credentials and generate a secure `NEXTAUTH_SECRET`.

### 3. Run Automated Setup

```bash
npm run setup
```

**What this does automatically:**
1. Installs all dependencies
2. Creates database if it doesn't exist
3. Generates Prisma client
4. Applies all database migrations
5. Seeds reference data (~128 records)
6. Seeds business categories (20 categories, 59 subcategories)
7. Creates admin user (`admin@business.local` / `admin123`)
8. Builds the Next.js application
9. Builds the Windows service

### 4. Choose Your Runtime

**For Development:**
```bash
npm run dev
# Access at http://localhost:8080
```

**For Production (Windows Service):**

First, install the service as Administrator:
```bash
npm run service:install
```

Then start the service:
```bash
npm run service:start
```

This command:
- Handles any pending database migrations
- Rebuilds if needed (use `--force-build` flag to force)
- Starts the Windows service
- Starts the Next.js application on port 8080

### 5. Access the Application

The application will be available at `http://localhost:8080`.

**Default Admin Credentials:**
- Email: `admin@business.local`
- Password: `admin123`

---

## Windows Sync Service Installation (Optional - For Multi-Machine Sync)

**⚠️ READ FIRST**: See [SYNC-ONE-TIME-SETUP.md](SYNC-ONE-TIME-SETUP.md) for complete one-time setup guide including firewall configuration and environment variables.

If you need the background sync service for database synchronization between multiple machines:

### 1. Build the Service

```bash
npm run build:service
```

This compiles the TypeScript service files to JavaScript in the `dist/` folder.

### 2. Install the Windows Service

**Run as Administrator:**

```bash
npm run service:install
```

**IMPORTANT**: The service installs but does NOT auto-start. You must manually start it:

```bash
npm run service:start
```

This is intentional to allow you to configure firewall rules and environment variables first.

### 3. Manage the Service

```bash
# Check service status
npm run service:status

# Stop the service
npm run service:stop

# Restart the service
npm run service:restart

# Uninstall the service
npm run service:uninstall
```

---

## After Pulling Updates from Git

**Every time you pull new code**, run these steps:

### 1. Update Dependencies

```bash
npm install
```

### 2. Regenerate Prisma Client

**CRITICAL**: Always regenerate after pulling schema changes:

```bash
npx prisma generate
```

### 3. Run Database Migrations

Apply any new database schema changes:

```bash
npx prisma migrate deploy
```

### 4. Rebuild the Application

```bash
npm run build
```

### 5. If Using Windows Service: Rebuild and Reinstall

```bash
# Build the service
npm run build:service

# Reinstall (this stops, uninstalls, rebuilds, and reinstalls)
npm run service:install
```

---

## Quick Setup Script

For convenience, you can run the automated setup script:

```bash
# Fresh installation
npm run setup

# After pulling updates
npm run setup:update
```

These scripts automate all the steps above.

---

## Common Issues

### Issue: "EPERM: operation not permitted" when generating Prisma client

**Cause**: Windows file lock - the query engine file is locked by:
- Running development server (`npm run dev`)
- Open Prisma Studio
- Antivirus software
- Previous Prisma processes

**Solution**:
```bash
# Option 1: Use the automated cleanup script
npm run setup:clean

# Option 2: Manual cleanup
# 1. Stop the development server (Ctrl+C)
# 2. Close Prisma Studio if open
# 3. Kill processes on port 8080
powershell "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force"
# 4. Delete the .prisma folder
rmdir /s /q node_modules\.prisma
# 5. Reinstall and run setup
npm install
npm run setup
```

### Issue: "Module has no exported member 'SyncOperation'"

**Cause**: Prisma client not generated or out of sync with schema.

**Solution**: Run `npx prisma generate`

### Issue: "Cannot find module '@prisma/client'"

**Cause**: Dependencies not installed or Prisma client not generated.

**Solution**:
```bash
npm install
npx prisma generate
```

### Issue: Service fails to build with TypeScript errors

**Cause**: Prisma client types are outdated.

**Solution**:
```bash
npx prisma generate
npm run build:service
```

### Issue: Database connection errors

**Cause**: Database not running or incorrect credentials in `.env`.

**Solution**:
1. Verify PostgreSQL is running
2. Check `DATABASE_URL` in `.env`
3. Test connection: `npx prisma db pull`

### Issue: "Payroll period for this month already exists"

**Cause**: Attempting to create duplicate payroll periods.

**Solution**: Check existing periods or delete the conflicting period first.

---

## Development Workflow

### 1. Database Schema Changes

When you modify `prisma/schema.prisma`:

```bash
# Create a migration
npx prisma migrate dev --name description_of_change

# Generate updated Prisma client
npx prisma generate
```

### 2. Seeding Data

After database resets:

```bash
# Seed employee reference data
cd scripts
node seed-all-employee-data.js

# Create admin user
cd ..
npm run create-admin
```

### 3. Running Tests

```bash
npm test
```

---

## Production Deployment

### 1. Build for Production

```bash
npm run build
```

### 2. Database Migration

```bash
npx prisma migrate deploy
```

### 3. Start the Production Server

```bash
npm start
```

**Note**: Set `NODE_ENV=production` in your `.env` file.

---

## Support

For issues or questions, refer to:
- Project documentation in `/docs`
- CLAUDE.md for development guidelines
- GitHub Issues for bug reports

---

## Important Reminders

- ✅ **Always run `npx prisma generate` after pulling code**
- ✅ **Always run `npx prisma migrate deploy` after schema changes**
- ✅ **Never commit generated files** (`node_modules/.prisma/`, `node_modules/@prisma/client/`)
- ✅ **Run `npm run setup:update` after every git pull** for a complete update
