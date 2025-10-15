# Multi-Business Multi-Apps - Server Deployment Guide

## 🎯 **OVERVIEW**

This guide covers deploying the Multi-Business Management Platform to a second server with peer-to-peer synchronization. The deployment process has been enhanced with smart automation and intelligent setup detection.

---

## 📋 **DEPLOYMENT INFRASTRUCTURE IMPROVEMENTS**

### ✅ **What's Been Fixed**
- **Smart Service Management**: Proper stop-and-wait logic prevents build conflicts
- **Build Version Preservation**: Version information survives deployments
- **Intelligent Rebuilds**: Only rebuilds when service files actually change
- **Environment-Based Config**: Server-specific settings now use environment variables
- **Smart Git Hooks**: Automatic detection of fresh installs vs. updates
- **Database Safety**: Setup operations never drop existing data

### 🔧 **Key Features**
- **Zero-Configuration Git Pulls**: Hooks provide setup guidance automatically
- **Safe Database Operations**: `setup:update` preserves all existing data
- **Smart Service Reinstalls**: Detects when Windows service needs reinstalling
- **Environment Templates**: Comprehensive `.env.example` with all settings

---

## 🚀 **DEPLOYMENT TO SECOND SERVER**

### **STEP 1: Initial Server Setup**

#### 1.1 Prerequisites
```bash
# Ensure these are installed:
- Git
- Node.js (v18 or higher)
- PostgreSQL
- Administrator access for Windows service installation
```

#### 1.2 Clone Repository
```bash
git clone https://github.com/tichaonax/multi-business-multi-apps.git
cd multi-business-multi-apps
```

### **STEP 2: Smart Hook Installation** (Recommended)

Install the smart git hooks for automatic deployment guidance:

```bash
node scripts/install-git-hooks.js --smart
```

**What this does:**
- Installs a post-merge hook that runs after every `git pull`
- Automatically detects fresh installs vs. updates
- Provides specific setup instructions for each scenario
- Makes deployments foolproof

### **STEP 3: Environment Configuration**

#### 3.1 Create Environment File
```bash
copy .env.example .env
```

#### 3.2 Configure Server-Specific Settings

Edit `.env` file with these **CRITICAL** settings:

```bash
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
# SYNC CONFIGURATION (SERVER-SPECIFIC)
# ================================
# Generate unique node ID for this server
SYNC_NODE_ID="$(node -e "console.log(require('crypto').randomBytes(8).toString('hex'))")"

# Use server hostname or identifier
SYNC_NODE_NAME="sync-node-server2"

# MUST BE SAME ON ALL SERVERS for peer authentication
SYNC_REGISTRATION_KEY="b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"

# Service ports (usually same on all servers)
SYNC_SERVICE_PORT=8765
SYNC_HTTP_PORT=8080
```

#### 3.3 Generate Unique Values

**Generate unique NextAuth secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Generate unique sync node ID:**
```bash
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"
```

**⚠️ IMPORTANT**: Use the **SAME** `SYNC_REGISTRATION_KEY` on all servers for peer authentication!

#### 3.4 Validate Configuration
```bash
node scripts/env-config.js validate
```

### **STEP 4: Database Setup**

**✅ Database Creation is Now Automatic!**

The fresh install process will automatically:
- Create the database if it doesn't exist
- Apply all migrations
- Set up the schema

**Manual Step Only Required:**
- Ensure PostgreSQL server is running
- Verify database credentials in `.env` are correct
- Ensure PostgreSQL user has CREATE DATABASE privileges

**Note:** You no longer need to manually run `createdb multi_business_db`

### **STEP 5: Fresh Installation**

Run the fresh install process:

```bash
npm run setup
```

**What this does:**
- Installs all dependencies
- **Creates database automatically** (if it doesn't exist)
- Sets up database schema
- Applies all migrations
- Seeds initial data
- Builds the application
- Creates admin user: `admin@business.local` / `admin123`

**✅ No Manual Database Creation Required!**
The setup script will automatically create the database using the credentials in your `.env` file.

### **STEP 6: Windows Service Installation**

**⚠️ Run as Administrator:**

```bash
# Install the Windows service
npm run service:install

# Start the service
npm run service:start
```

### **STEP 7: Verify Installation**

#### 7.1 Check Service Status
```bash
npm run service:status
```

#### 7.2 Access Application
- **Main App**: http://localhost:8080
- **Admin Login**: admin@business.local / admin123

#### 7.3 Verify Sync Connection
- Navigate to: http://localhost:8080/admin/sync
- Should show connection to first server
- Check sync activity logs

---

## 🔄 **UPDATING EXISTING SERVERS**

### **Environment Migration (One-time)**

**If you have an existing server with legacy config files:**

1. **Pull latest changes:**
   ```bash
   git pull
   ```

2. **Smart hooks will detect migration needed:**
   - Automatically shows migration instructions
   - Guides through config file migration

3. **Run environment migration:**
   ```bash
   # Preview migration (optional)
   node scripts/migrate-environment.js migrate --dry-run
   
   # Perform migration
   node scripts/migrate-environment.js migrate
   ```

4. **Complete the update:**
   ```bash
   npm run setup:update
   ```

### **Automatic Updates (Recommended)**

If smart hooks are installed and migration is complete:

1. **Pull changes:**
   ```bash
   git pull
   ```

2. **Follow automatic guidance:**
   - Hook detects update vs. fresh install vs. migration
   - Provides specific commands to run
   - Handles service management automatically

### **Manual Updates**

If hooks aren't installed:

1. **Pull and update:**
   ```bash
   git pull
   npm run setup:update
   ```

2. **Restart service (as Administrator):**
   ```bash
   npm run service:restart
   ```

**What `setup:update` does:**
- Stops service safely (waits for complete shutdown)
- Updates dependencies
- Rebuilds only if service files changed
- Handles service reinstall if needed
- Preserves all database data
- Never drops existing data

---

## 🔧 **ENVIRONMENT VARIABLES REFERENCE**

### **Critical Settings**
| Variable | Description | Example |
|----------|-------------|---------|
| `SYNC_NODE_ID` | Unique per server | `a1b2c3d4e5f6g7h8` |
| `SYNC_NODE_NAME` | Server identifier | `sync-node-server2` |
| `SYNC_REGISTRATION_KEY` | Same on all servers | `b3f1c9d7a5e4f2c3...` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `NEXTAUTH_SECRET` | Unique per server | Generated secret |

### **Common Settings** (Same on all servers)
| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_SERVICE_PORT` | `8765` | mDNS discovery port |
| `SYNC_HTTP_PORT` | `8080` | HTTP sync API port |
| `SYNC_INTERVAL` | `30000` | Sync interval (ms) |
| `PORT` | `8080` | Main app port |

---

## 🐛 **TROUBLESHOOTING**

### **Environment Migration Issues**

**Migration fails:**
```bash
# Check migration status
node scripts/migrate-environment.js status

# Rollback if needed
node scripts/migrate-environment.js rollback
```

**Config conflicts after migration:**
1. Check `.env` file has all required variables
2. Validate configuration: `node scripts/env-config.js validate`
3. Restart services: `npm run setup:update`

### **Database Creation Issues**

**"Database creation failed" error:**
1. Ensure PostgreSQL is running
2. Check DATABASE_URL credentials in `.env`
3. Verify PostgreSQL user has CREATE DATABASE privileges
4. Test connection manually

### **Service Issues**

**Service won't stop:**
```bash
# Force stop with proper wait
npm run sync-service:stop
```

**Service needs reinstall:**
```bash
npm run service:uninstall
npm run build:service
npm run service:install
```

### **Sync Issues**

**Peers not connecting:**
1. Check firewall (ports 8765, 8080)
2. Verify same `SYNC_REGISTRATION_KEY`
3. Check network connectivity

**Database sync not working:**
```bash
# Check sync events
node debug-sync-events.js

# Check sync status
node check-sync-status.js
```

### **Build Issues**

**TypeScript compilation errors:**
```bash
# Clean rebuild
npm run build:service
```

**Prisma client issues:**
```bash
npx prisma generate
```

---

## 📝 **MAINTENANCE COMMANDS**

### **Service Management**
```bash
npm run service:status      # Check service status
npm run service:restart     # Restart service
npm run service:diagnose    # Detailed diagnostics
```

### **Database Operations**
```bash
npm run db:migrate          # Apply new migrations
npm run db:studio           # Open Prisma Studio
npm run db:backup           # Create database backup
```

### **Sync Operations**
```bash
node check-sync-status.js   # Check sync status
node debug-sync-events.js   # Debug sync events
node manage-logs.js clean   # Clean old logs
```

### **Environment Management**
```bash
node scripts/env-config.js validate           # Validate .env
node scripts/env-config.js generate           # Generate legacy configs
node scripts/env-config.js show               # Show current config
node scripts/migrate-environment.js status    # Check migration status
node scripts/migrate-environment.js migrate   # Migrate legacy configs
node scripts/migrate-environment.js rollback  # Rollback migration
```

---

## 🔒 **SECURITY NOTES**

1. **Never commit `.env` files** to version control
2. **Use unique `NEXTAUTH_SECRET`** on each server
3. **Use strong database passwords**
4. **Keep `SYNC_REGISTRATION_KEY` secret** but same on all servers
5. **Run Windows service** with appropriate permissions
6. **Configure firewall** for sync ports (8765, 8080)

---

## 📊 **SUCCESS CHECKLIST**

- [ ] Environment variables configured correctly
- [ ] Database created and accessible
- [ ] `npm run setup` completed successfully
- [ ] Windows service installed and running
- [ ] Application accessible at http://localhost:8080
- [ ] Admin login works (admin@business.local)
- [ ] Sync connection visible in admin panel
- [ ] Smart git hooks installed (optional but recommended)

---

## 🆘 **SUPPORT**

If you encounter issues:

1. **Check service status**: `npm run service:diagnose`
2. **Review logs**: Check `logs/` directory
3. **Validate environment**: `node scripts/env-config.js validate`
4. **Test sync manually**: `node scripts/post-merge-hook.js`

**Common Issues:**
- **Admin privileges required** for service operations
- **Firewall blocking** sync ports
- **Database connection** issues
- **Duplicate node IDs** between servers

The deployment system is now robust and provides clear guidance for any scenario!