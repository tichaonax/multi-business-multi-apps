# Multi-Business Multi-Apps Setup Guide

This guide covers the complete setup process for fresh installations and after pulling updates from Git.

## Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** database running and accessible
- **Windows** (for the sync service - optional)
- **Git** for version control

## Fresh Installation (New Machine)

**⚠️ IMPORTANT: Fresh installation requires Administrator privileges**

The setup script installs a Windows service, which requires admin rights. Open PowerShell or Terminal as Administrator before proceeding.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd multi-business-multi-apps
```

### 2. Configure Environment Variables

Create a `.env` or `.env.local` file in the root directory with the following:

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

### 3. Run Automated Setup (As Administrator)

**The setup script now handles everything, including service installation:**

```bash
npm run setup
```

**What this does automatically:**
1. **Checks for Administrator privileges** (exits if not admin)
2. Installs all dependencies
3. Creates database if it doesn't exist
4. Generates Prisma client
5. Applies all database migrations
6. Seeds reference data (~128 records)
7. Seeds business categories (20 categories, 59 subcategories)
8. Creates admin user (`admin@business.local` / `admin123`)
9. Builds the Next.js application
10. Builds the Windows service
11. **Installs the Windows service** (NEW)

**If not running as Administrator:**

The script will exit with clear instructions:

```
❌ Administrator privileges required!

This setup script installs a Windows service, which requires admin rights.

To fix this:
  1. Close this terminal
  2. Open PowerShell as Administrator:
     - Right-click Start button
     - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"
  3. Navigate to project directory
  4. Run setup again: npm run setup
```

### 4. Start the Service

After setup completes, start the Windows service:

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

## Development Mode (Without Service)

If you want to run in development mode without the Windows service:

```bash
npm run dev
```

**Note:** This doesn't require Administrator privileges and is suitable for development work.

---

## Service Management

After installing the service via `npm run setup`, you can manage it with these commands:

```bash
# Check service status
npm run service:status

# Start the service
npm run service:start

# Stop the service
npm run service:stop

# Restart the service
npm run service:restart

# Uninstall the service (as Administrator)
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

## Quick Setup Commands

For convenience, automated setup scripts are available:

```bash
# Fresh installation (requires Administrator privileges)
npm run setup

# After pulling updates (does NOT require Administrator)
npm run setup:update
```

**Note:** Fresh installation requires Administrator privileges because it installs the Windows service. Updates do not require admin privileges.

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
