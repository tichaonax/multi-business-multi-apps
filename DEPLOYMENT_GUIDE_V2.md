# Multi-Business Multi-Apps - Server Deployment Guide

## 🎯 **OVERVIEW**

This guide covers deploying the Multi-Business Management Platform to a second server with peer-to-peer synchronization. The deployment process has been enhanced with smart automation and intelligent setup detection.

---

## ⚡ **QUICK START - COMPLETE WORKFLOW**

For a fresh server installation:

```bash
# 1. Clone repository
git clone https://github.com/tichaonax/multi-business-multi-apps.git
cd multi-business-multi-apps

# 2. Install smart hooks (recommended)
node scripts/install-git-hooks.js --smart

# 3. Configure environment
copy .env.example .env
# Edit .env with your settings (DATABASE_URL, SYNC_NODE_ID, etc.)

# 4. Run fresh installation
npm run setup

# 5. Seed business categories (REQUIRED)
npm run seed:categories

# 6. Install and start Windows service (as Administrator)
npm run service:install
npm run service:start

# 7. Access application at http://localhost:8080
# Admin login: admin@business.local / admin123
```

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
- Seeds initial data (~128 reference data records)
- Builds the application
- Creates admin user: `admin@business.local` / `admin123`

> **⚠️ IMPORTANT:** After setup completes, you must seed business categories separately. See [Post-Deployment: Seed Business Categories](#post-deployment-seed-business-categories) below.

**✅ No Manual Database Creation Required!**
The setup script will automatically create the database using the credentials in your `.env` file.

---

## 📦 **POST-DEPLOYMENT: SEED BUSINESS CATEGORIES**

### **STEP 5.1: Seed Default Inventory Categories**

After fresh installation completes, you **must** seed business categories. The system requires default inventory categories for each business type (clothing, hardware, grocery, restaurant).

#### Run Category Seeding

```bash
npm run seed:categories
```

Or directly:

```bash
node scripts/seed-type-categories.js
```

#### What This Seeds

**Categories are shared by business type** (not by individual businesses):

- **Clothing**: 5 categories, 17 subcategories
  - Men's Fashion (Shirts, Pants, Suits, Outerwear)
  - Women's Fashion (Dresses, Tops, Bottoms, Outerwear)
  - Kids Fashion (Boys, Girls, Baby)
  - Footwear (Casual, Formal, Sports)
  - Accessories (Bags, Jewelry, Watches)

- **Hardware**: 5 categories, 14 subcategories
  - Hand Tools (Hammers, Screwdrivers, Wrenches, Measuring)
  - Power Tools (Drills, Saws, Sanders)
  - Building Materials (Lumber, Cement, Paint)
  - Plumbing (Pipes, Fittings)
  - Electrical (Wire, Switches)

- **Grocery**: 6 categories, 15 subcategories
  - Fresh Produce (Fruits, Vegetables, Herbs)
  - Meat & Seafood (Beef, Chicken, Seafood)
  - Dairy Products (Milk, Cheese, Yogurt)
  - Bakery (Bread, Pastries)
  - Beverages (Soft Drinks, Juices)
  - Pantry & Canned Goods (Canned Goods, Pasta)

- **Restaurant**: 4 categories, 13 subcategories
  - Appetizers (Salads, Soups, Finger Foods)
  - Main Courses (Meat, Seafood, Vegetarian, Pasta)
  - Desserts (Cakes, Ice Cream)
  - Beverages (Hot, Cold, Alcoholic)

**Total**: 20 categories, 59 subcategories across 4 business types

#### Expected Output

```bash
🌱 Starting Type-Level Category Seeding...

📦 Processing clothing business type...
   ✅ Created category: Men's Fashion
      └─ Created 4 subcategories
   ✅ Created category: Women's Fashion
      └─ Created 4 subcategories
   ...

====================================================================
✅ SEEDING COMPLETE
====================================================================
📊 Categories created: 20
📊 Subcategories created: 59

📋 Final Category Count by Business Type:
   clothing: 5 categories
   hardware: 5 categories
   grocery: 6 categories
   restaurant: 4 categories

✅ Done!
```

#### Prerequisites

- Database must be migrated (all migrations applied ✅ done by setup)
- **At least one business of each type should exist**
- If no business exists for a type, categories for that type will be skipped

#### Important Notes

- **Run once per deployment** - Categories only need seeding once
- **Shared by type** - All businesses of same type share these categories
- **Idempotent** - Safe to re-run; skips existing categories
- See [FRESH_DEPLOYMENT_GUIDE.md](FRESH_DEPLOYMENT_GUIDE.md) for detailed category information

---

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

### **Category Seeding Issues**

**"No business exists yet for type X":**
- **Problem**: Trying to seed categories before creating businesses
- **Solution**: 
  1. Create at least one business first (via admin UI)
  2. Then run `npm run seed:categories`

**"Categories already exist" or script skips types:**
- **Problem**: Categories detected, seeding skipped
- **Solution**: This is normal. Categories only need seeding once per business type.

**Duplicate key error (P2002):**
- **Problem**: Category with same name already exists
- **Solution**: Script automatically handles this. No action needed.

**To verify seeding worked:**
```sql
SELECT businessType, name, emoji 
FROM business_categories 
WHERE isUserCreated = false 
ORDER BY businessType, displayOrder;
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
- [ ] **Business categories seeded** (`npm run seed:categories`)
- [ ] Windows service installed and running
- [ ] Application accessible at http://localhost:8080
- [ ] Admin login works (admin@business.local)
- [ ] Sync connection visible in admin panel
- [ ] Smart git hooks installed (optional but recommended)

### Verify Categories Were Seeded

Run this SQL query to confirm categories:

```sql
SELECT businessType, COUNT(*) as category_count
FROM business_categories
WHERE isUserCreated = false
GROUP BY businessType;
```

Expected results:
- `clothing`: 5 categories
- `hardware`: 5 categories
- `grocery`: 6 categories
- `restaurant`: 4 categories

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