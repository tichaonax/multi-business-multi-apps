# Multi-Business Management Platform - Production Installation Guide

Complete guide for installing and setting up the Multi-Business Management Platform on a new machine for production use.

## System Requirements

### Minimum Hardware Requirements
- **CPU**: 2+ cores (4+ cores recommended)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 10GB free disk space
- **Network**: Stable internet connection

### Software Requirements
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v13.0 or higher
- **Git**: Latest version
- **npm**: v8.0.0 or higher (comes with Node.js)

### Operating System Support
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Ubuntu 20.04+
- ✅ CentOS 8+
- ✅ Amazon Linux 2
- ✅ Docker (any platform)

## Installation Steps

### Step 1: Install Prerequisites

#### 🟢 **Node.js Installation**

**Windows:**
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Verify installation:
```bash
node --version
npm --version
```

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node

# Or download from nodejs.org
```

**Linux (Ubuntu/Debian):**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Linux (CentOS/RHEL):**
```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

#### 🐘 **PostgreSQL Installation**

**Windows:**
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer
3. Remember the postgres user password
4. Note the port (default: 5432)

**macOS:**
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Create postgres user if needed
createuser -s postgres
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set postgres user password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_password';"
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set postgres user password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_password';"
```

#### 🐳 **Docker Alternative (Optional)**

If you prefer using Docker for PostgreSQL:
```bash
# Install Docker (follow official Docker installation guide)
# Run PostgreSQL in Docker
docker run --name postgres-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=business_platform \
  -p 5432:5432 \
  -d postgres:15

# Verify PostgreSQL is running
docker ps
```

### Step 2: Clone and Setup Application

#### Clone the Repository
```bash
# Clone the project
git clone <your-repository-url> multi-business-platform
cd multi-business-platform

# Or if you have the source code as a zip file
unzip multi-business-platform.zip
cd multi-business-platform
```

#### Install Dependencies
```bash
# Install all Node.js dependencies
npm install

# This will install all production and development dependencies
# Takes 1-3 minutes depending on internet speed
```

### Step 3: Database Configuration

#### Create Database
```bash
# Method 1: Using psql command line
psql -U postgres -h localhost
CREATE DATABASE business_platform;
\q

# Method 2: Using createdb command
createdb -U postgres business_platform

# Method 3: Using GUI tool like pgAdmin
# Connect to PostgreSQL and create database named "business_platform"
```

#### Configure Environment Variables
```bash
# Create environment file
cp .env.example .env

# Or create .env file manually with these contents:
```

Create a `.env` file in the project root:
```env
# Database Configuration
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/business_platform"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:8080"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Application Configuration
NODE_ENV="production"
PORT=8080

# Optional: Advanced Configuration
LOG_LEVEL="info"
MAX_FILE_SIZE="10mb"
ALLOWED_FILE_TYPES="image/*,application/pdf"
```

**🔒 Security Notes:**
- Replace `your_password` with your actual PostgreSQL password
- Generate a secure `NEXTAUTH_SECRET` using: `openssl rand -base64 32`
- Use environment-specific values for production

### Step 4: Database Setup and Migration

#### Initialize Database Schema
```bash
# Generate Prisma client
npx prisma generate

# Apply database migrations (creates all tables)
npx prisma migrate deploy

# Verify database schema
npx prisma db pull
```

#### Seed Database with Production Data
```bash
# Run the comprehensive production setup script
node scripts/production-setup.js
```

This script will:
- ✅ Create all required database tables
- ✅ Seed ID format templates (5 countries)
- ✅ Seed phone number templates (7 countries)
- ✅ Seed date format templates (5 formats)
- ✅ Seed driver license templates (4 countries)
- ✅ Seed job titles (29 positions)
- ✅ Seed compensation types (15 types)
- ✅ Seed benefit types (28 benefits)
- ✅ Seed project types (20+ types across all business types)
- ✅ Seed default personal finance categories (14 categories)
- ✅ Create system administrator account
- ✅ Verify all data was created successfully

### Step 5: Build and Start Application

#### Development Mode (for testing)
```bash
# Start development server
npm run dev

# Application will be available at:
# http://localhost:8080
```

#### Production Mode
```bash
# Build the application for production
npm run build

# Start production server
npm start

# Application will be available at:
# http://localhost:3000 (or your configured PORT)
```

## Post-Installation Setup

### Step 1: Login and Change Admin Password

1. **Open your browser** and navigate to `http://localhost:8080`
2. **Login with default credentials:**
   - Email: `admin@business.local`
   - Password: `admin123`
3. **Change the default password immediately!**
   - Go to Profile Settings
   - Update your password to something secure

### Step 2: System Configuration

1. **Create Your First Business:**
   - Go to Admin → Businesses
   - Click "Create Business"
   - Fill in your business details

2. **Create Additional Users:**
   - Go to Admin → Users
   - Click "Create User"
   - Assign appropriate permissions

3. **Configure System Settings:**
   - Set default date format
   - Configure phone number format
   - Set up ID templates for your region

### Step 3: Verify Everything Works

Test key functionality:
- ✅ User login/logout
- ✅ Create a test project
- ✅ Add a personal expense
- ✅ Create a contractor
- ✅ Generate a basic report

## Production Deployment Options

### Option 1: Windows Service Deployment (Recommended for Windows)

The Multi-Business Management Platform includes a sophisticated Windows service deployment with database replication capabilities.

#### Windows Service Features:
- ✅ **Background Database Synchronization** - Automatic peer discovery and conflict resolution
- ✅ **Hybrid Service Architecture** - Direct process execution with comprehensive PID management
- ✅ **Production Migration Support** - Safe updates with backup/rollback capabilities
- ✅ **Multi-Instance Replication** - Synchronizes data between multiple deployments
- ✅ **Automatic Recovery** - Self-healing service with restart capabilities
- ✅ **Security Management** - Encrypted peer authentication and audit logging

#### Installation Steps:

1. **Build the Service:**
   ```bash
   npm run build:service
   ```

2. **Set Environment Variables** (Important for Production):
   ```bash
   set SYNC_REGISTRATION_KEY=your-secure-production-key-here
   set SYNC_PORT=8765
   set SYNC_INTERVAL=30000
   set LOG_LEVEL=info
   set DATABASE_URL=postgresql://user:pass@host:5432/database
   ```

3. **Install as Windows Service** (Run as Administrator):
   ```bash
   npm run service:install
   ```

4. **Start the Service:**
   ```bash
   npm run service:start
   ```

5. **Verify Installation:**
   ```bash
   npm run service:diagnose
   ```

#### Service Management Commands:
```bash
# Core service management
npm run service:install    - Install as Windows service
npm run service:start      - Start the service
npm run service:stop       - Stop the service
npm run service:restart    - Restart the service
npm run service:diagnose   - Comprehensive health check

# Production updates
npm run service:update     - Update service with backup/rollback
npm run service:rollback   - Rollback to previous version

# Legacy commands (still available)
npm run sync-service:status    - Check service status
npm run sync-service:uninstall - Remove the service
```

#### Multi-Instance Setup:

For database replication between multiple machines:

1. **Each machine must have the same SYNC_REGISTRATION_KEY**
2. **Ensure network connectivity** between machines on the sync port
3. **Start services on all machines** - they will automatically discover each other
4. **Monitor sync status** with `npm run service:diagnose`

#### Production Migration Workflow:

```bash
# 1. Test the update process (creates backup automatically)
npm run service:update

# 2. If something goes wrong, rollback immediately
npm run service:rollback

# 3. Verify everything works
npm run service:diagnose
```

#### Troubleshooting:

- **Service won't start**: Run `npm run service:diagnose` for detailed diagnostics
- **Peer discovery issues**: Check SYNC_REGISTRATION_KEY matches across instances
- **Permission errors**: Ensure running as Administrator for service operations
- **Build errors**: Ensure sync schema is properly set up in Prisma

### Option 2: Traditional Server Deployment

```bash
# Install PM2 for process management
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'business-platform',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster'
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 2: Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
## Safe Windows Service Install (step-by-step)

Important: the steps below modify Windows Services and should be run in a staging environment first. Commands that change system services require Administrator privileges.

0) Open an elevated shell (PowerShell recommended)

- Right-click Start → "Windows PowerShell (Admin)" or run:
```powershell
Start-Process PowerShell -Verb RunAs
```

1) Prepare environment variables and configuration

PowerShell (temporary vars):
```powershell
$env:DATABASE_URL = "postgresql://user:pass@localhost:5432/mydb"
$env:SYNC_REGISTRATION_KEY = "replace-with-secure-key"
$env:SYNC_PORT = "8765"
$env:HEALTH_PORT = "3002"
```

Bash (if you prefer):
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
export SYNC_REGISTRATION_KEY="replace-with-secure-key"
export SYNC_PORT=8765
export HEALTH_PORT=3002
```

2) Backup DB and configs (SAFETY)

Use the repository backup script if available:
```bash
npm run backup:database
```

Or create a pg_dump manually:
```bash
pg_dump "$DATABASE_URL" -F c -f ./backups/pre-install-$(date +%Y%m%d%H%M%S).dump
```

Also back up important config files:
```bash
cp config/service-config.json config/service-config.json.bak
```

3) Run non-destructive checks (safe)

Skip DB precheck if you don't want to connect to the DB yet:
```bash
SKIP_DB_PRECHECK=true npm run service:smoke-check
```

Run the detailed diagnostic:
```bash
npm run service:diagnose
# or via shim
node scripts/service-cmd.js diagnose
```

4) Install the Windows service (Administrator required)

Run this in the elevated PowerShell session:
```powershell
npm run service:install
```

What this does: registers the "Multi-Business Sync Service" and creates wrapper/daemon files. If it fails with permissions errors, make sure the shell is elevated.

5) Verify installation and status (non-destructive)

```bash
npm run service:status
# or
npm run sync-service:status
```

Or use the Windows `sc` tool:
```powershell
sc query "Multi-Business Sync Service"
```

6) Start the service (Admin)

```powershell
npm run service:start
# or
sc start "Multi-Business Sync Service"
```

7) View logs

PowerShell (tail):
```powershell
Get-Content -Path data\sync\sync-service.log -Tail 200 -Wait
```

Bash (tail):
```bash
tail -n 200 -f data/sync/sync-service.log
```

8) Stop and uninstall (Admin)

```powershell
npm run service:stop
npm run service:uninstall
```

If the installer exposes `update`/`rollback` helpers, use them for safe updates:
```bash
npm run service:update
# if needed
npm run service:rollback
```

Troubleshooting quick checklist

- If `service:install` fails: confirm Administrator privileges and check `Event Viewer` → Application/System logs.
- If `sc start` fails: run `npm run service:diagnose` and inspect wrapper paths (`dist/service/sync-service-runner.js`).
- If DB fails: verify `DATABASE_URL` and network connectivity, then run smoke-check without SKIP.

Copyable summary (PowerShell elevated):
```powershell
# backup
npm run backup:database

# smoke-check
$env:SKIP_DB_PRECHECK='true'; npm run service:smoke-check; Remove-Item Env:\SKIP_DB_PRECHECK

# install (Admin)
npm run service:install

# status
npm run service:status

# start
npm run service:start

# view logs
Get-Content -Path data\sync\sync-service.log -Tail 200 -Wait

# stop
npm run service:stop

# uninstall (Admin)
npm run service:uninstall
```

---

If you'd like, I can add a PowerShell script `scripts/install-service-windows.ps1` that automates this flow (it would prompt for confirmation before each destructive step). I won't execute it without your go-ahead.
      - DATABASE_URL=postgresql://postgres:password@db:5432/business_platform
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=your-secret-key
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=business_platform
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Deploy with Docker:
```bash
# Build and start services
docker-compose up -d

# Run production setup (one time only)
docker-compose exec app node scripts/production-setup.js
```

### Option 3: Cloud Platform Deployment

#### Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel

# Configure environment variables in Vercel dashboard
# Add PostgreSQL database (Vercel Postgres or external)
```

#### Heroku
```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Configure environment variables
heroku config:set NEXTAUTH_SECRET="your-secret-key"
heroku config:set NEXTAUTH_URL="https://your-app-name.herokuapp.com"

# Deploy
git push heroku main

# Run production setup
heroku run node scripts/production-setup.js
```

## Backup and Maintenance

### Database Backup
```bash
# Create backup
pg_dump -U postgres -h localhost business_platform > backup.sql

# Restore backup
psql -U postgres -h localhost business_platform < backup.sql
```

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Apply any new migrations
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart application
pm2 restart business-platform
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Test connection
psql -U postgres -h localhost -c "SELECT version();"

# Check connection string format
echo $DATABASE_URL
```

#### Port Already in Use
```bash
# Find process using port 8080
netstat -tlnp | grep :8080  # Linux
lsof -ti:8080  # macOS

# Kill process
kill -9 <process_id>
```

#### Permission Errors
```bash
# Fix file permissions
chmod +x scripts/production-setup.js

# Fix npm permissions (if needed)
sudo chown -R $(whoami) ~/.npm
```

#### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

### Getting Help

1. **Check Application Logs:**
   ```bash
   # Development mode
   Check terminal output

   # Production mode with PM2
   pm2 logs business-platform

   # Docker mode
   docker-compose logs app
   ```

2. **Database Issues:**
   ```bash
   # Check database connectivity
   npx prisma db pull

   # Validate schema
   npx prisma validate
   ```

3. **Performance Issues:**
   - Monitor memory usage: `htop` or `top`
   - Check disk space: `df -h`
   - Monitor database: `pgAdmin` or database monitoring tools

## Security Checklist for Production

- [ ] Changed default admin password
- [ ] Generated secure NEXTAUTH_SECRET
- [ ] Configured HTTPS/SSL certificates
- [ ] Set up firewall rules
- [ ] Configured database access restrictions
- [ ] Set up regular backups
- [ ] Enabled application logging
- [ ] Updated all system packages
- [ ] Configured environment-specific settings
- [ ] Set up monitoring and alerts

## Performance Optimization

### Database Optimization
```sql
-- Add database indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX CONCURRENTLY idx_projects_business_type ON projects(business_type);
```

### Application Optimization
```bash
# Enable production optimizations in next.config.js
# Configure caching strategies
# Set up CDN for static assets
# Implement database connection pooling
```

---

## Quick Start Summary

For experienced developers, here's the quick setup:

```bash
# 1. Install prerequisites
node --version  # Ensure 18+
psql --version  # Ensure PostgreSQL installed

# 2. Clone and setup
git clone <repo> && cd multi-business-platform
npm install

# 3. Configure database
createdb -U postgres business_platform
echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/business_platform"' > .env
echo 'NEXTAUTH_SECRET="'$(openssl rand -base64 32)'"' >> .env
echo 'NEXTAUTH_URL="http://localhost:8080"' >> .env

# 4. Setup database
npx prisma generate
npx prisma migrate deploy
node scripts/production-setup.js

# 5. Start application
npm run build && npm start
```

Login at `http://localhost:3000` with `admin@business.local` / `admin123`

**🎉 You're ready to go!**