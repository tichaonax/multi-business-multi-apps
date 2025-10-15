# 🚀 Quick Deployment Reference Card

## **FRESH SERVER SETUP** (3 minutes)
```bash
# 1. Clone and navigate
git clone https://github.com/tichaonax/multi-business-multi-apps.git
cd multi-business-multi-apps

# 2. Install smart hooks (recommended)
node scripts/install-git-hooks.js --smart

# 3. Configure environment
copy .env.example .env
# Edit .env with server-specific settings (see guide)

# 4. Run setup (creates database automatically!)
npm run setup

# 5. Install service (as Administrator)
npm run service:install
npm run service:start
```

## **EXISTING SERVER MIGRATION** (2 minutes)
```bash
# If you have legacy config files, git pull will guide you:
git pull
# Follow the migration instructions shown

# Or manually run migration:
node scripts/migrate-environment.js migrate
npm run setup:update
```

## **UPDATE EXISTING SERVER** (2 minutes)
```bash
# With smart hooks installed:
git pull
# Follow automatic guidance

# Without hooks:
git pull
npm run setup:update
npm run service:restart  # (as Administrator)
```

## **CRITICAL ENVIRONMENT VARIABLES**
```bash
# Generate unique values for each server:
SYNC_NODE_ID="$(node -e "console.log(require('crypto').randomBytes(8).toString('hex'))")"
NEXTAUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"

# MUST BE SAME on all servers:
SYNC_REGISTRATION_KEY="b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"

# Server-specific:
SYNC_NODE_NAME="sync-node-server2"  # Unique name for this server
DATABASE_URL="postgresql://postgres:password@localhost:5432/multi_business_db"
NEXTAUTH_URL="http://localhost:8080"
```

## **ESSENTIAL COMMANDS**
```bash
# Service Management
npm run service:status      # Check if running
npm run service:restart     # Restart service
npm run service:diagnose    # Detailed diagnostics

# Sync Status
node check-sync-status.js   # View sync health
node debug-sync-events.js   # Debug sync issues

# Environment
node scripts/env-config.js validate           # Check configuration
node scripts/migrate-environment.js status    # Check migration status
node scripts/migrate-environment.js migrate   # Migrate legacy configs
```

## **TROUBLESHOOTING**
- **Service won't start**: Run as Administrator
- **Peers not connecting**: Check firewall, ports 8765 & 8080
- **Database creation fails**: Check PostgreSQL running & credentials
- **Migration issues**: Run `node scripts/migrate-environment.js status`
- **Build errors**: Run `npm run build:service`

## **ACCESS POINTS**
- **Main App**: http://localhost:8080
- **Admin**: admin@business.local / admin123
- **Sync Status**: http://localhost:8080/admin/sync