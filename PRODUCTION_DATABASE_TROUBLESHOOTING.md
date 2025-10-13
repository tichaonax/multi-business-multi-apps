# Production Database Troubleshooting Guide

**Issue:** Service fails to start with "Database connectivity test timed out"

**Error Message:**
```
💥 Unhandled Rejection at: Promise {
  <rejected> Error: Database connectivity test timed out - check if DATABASE_URL is accessible
      at Timeout._onTimeout (C:\Users\ticha\apps\multi-business-multi-apps\windows-service\service-wrapper-hybrid.js:858:18)
```

---

## Quick Diagnosis

Run the database diagnostic tool:
```bash
npm run diagnose:database
```

This will:
- Check all environment files (`.env`, `.env.local`, `config/service.env`)
- Parse DATABASE_URL from each file
- Test connection with each DATABASE_URL
- Provide specific error messages and recommendations

---

## Common Causes & Solutions

### 1. PostgreSQL Service Not Running

**Check if PostgreSQL is running:**

**Windows:**
```bash
# Check service status
sc query postgresql-x64-14

# Or check Services GUI
services.msc
```

**Linux:**
```bash
sudo systemctl status postgresql
```

**Fix:**

**Windows:**
```bash
# Start PostgreSQL service
net start postgresql-x64-14

# Or use Services GUI (services.msc)
```

**Linux:**
```bash
sudo systemctl start postgresql
```

---

### 2. DATABASE_URL Not Configured

**The service loads DATABASE_URL from `.env.local` NOT `.env`!**

**Check if `.env.local` exists:**
```bash
ls -la | grep "\.env"
```

**Create `.env.local` if missing:**
```bash
cp .env .env.local
```

**Or manually create `.env.local`:**
```env
DATABASE_URL="postgresql://postgres:YourPassword@localhost:5432/multi_business_db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:8080"
```

**Also update `config/service.env`:**
```env
DATABASE_URL=postgresql://postgres:YourPassword@localhost:5432/multi_business_db
SYNC_PORT=8765
SKIP_MIGRATIONS=false
SKIP_DB_PRECHECK=false
```

---

### 3. Wrong Database Host/Port

**Production servers often use different database servers.**

**Common scenarios:**

#### Scenario A: Database on Different Server
```env
# Instead of localhost
DATABASE_URL="postgresql://postgres:pass@db.production.com:5432/multi_business_db"
```

#### Scenario B: Database on Non-Standard Port
```env
# Instead of 5432
DATABASE_URL="postgresql://postgres:pass@localhost:15432/multi_business_db"
```

#### Scenario C: Database Using IP Address
```env
# Use IP instead of hostname
DATABASE_URL="postgresql://postgres:pass@192.168.1.100:5432/multi_business_db"
```

**Test manually:**
```bash
psql "postgresql://postgres:password@localhost:5432/multi_business_db"
```

---

### 4. Database Doesn't Exist Yet

**Check if database exists:**
```bash
psql -U postgres -l | grep "multi_business_db"
```

**Create database:**
```bash
psql -U postgres -c "CREATE DATABASE multi_business_db;"
```

**Or use createdb:**
```bash
createdb -U postgres multi_business_db
```

---

### 5. Wrong Credentials

**Check current credentials:**
```bash
# View DATABASE_URL
cat .env.local | grep DATABASE_URL

# Test connection
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/multi_business_db"
```

**Reset PostgreSQL password (if needed):**

**Windows:**
```bash
# Login as postgres
psql -U postgres

# Reset password
ALTER USER postgres PASSWORD 'new_password';
```

**Linux:**
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
```

---

### 6. Firewall Blocking Connections

**Check if port 5432 is open:**

**Windows:**
```bash
netsh advfirewall firewall show rule name=all | findstr "5432"
```

**Linux:**
```bash
sudo ufw status | grep 5432
```

**Allow PostgreSQL through firewall:**

**Windows:**
```bash
# Add firewall rule
netsh advfirewall firewall add rule name="PostgreSQL" dir=in action=allow protocol=TCP localport=5432
```

**Linux:**
```bash
sudo ufw allow 5432/tcp
```

---

### 7. PostgreSQL Not Accepting Connections

**Check `pg_hba.conf` (PostgreSQL Host-Based Authentication):**

**Location:**
- **Windows**: `C:\Program Files\PostgreSQL\14\data\pg_hba.conf`
- **Linux**: `/etc/postgresql/14/main/pg_hba.conf`

**Ensure localhost is allowed:**
```conf
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
host    all             all             localhost               md5

# Allow from same machine
local   all             all                                     trust
```

**Check `postgresql.conf` (PostgreSQL Configuration):**

**Location:**
- **Windows**: `C:\Program Files\PostgreSQL\14\data\postgresql.conf`
- **Linux**: `/etc/postgresql/14/main/postgresql.conf`

**Ensure PostgreSQL listens on localhost:**
```conf
listen_addresses = 'localhost,127.0.0.1'
# Or to accept all connections:
# listen_addresses = '*'

port = 5432
```

**Restart PostgreSQL after changes:**

**Windows:**
```bash
net stop postgresql-x64-14
net start postgresql-x64-14
```

**Linux:**
```bash
sudo systemctl restart postgresql
```

---

## Step-by-Step Production Server Setup

### Step 1: Verify PostgreSQL is Installed

```bash
# Check version
psql --version

# Check service
sc query postgresql-x64-14  # Windows
sudo systemctl status postgresql  # Linux
```

**If not installed**, install PostgreSQL first.

### Step 2: Create Database

```bash
# Create database
createdb -U postgres multi_business_db

# Verify
psql -U postgres -l | grep multi_business_db
```

### Step 3: Test Connection Manually

```bash
# Test with psql
psql -U postgres -d multi_business_db

# If successful, you'll see:
# psql (14.x)
# Type "help" for help.
# multi_business_db=#
```

### Step 4: Create `.env.local` with Correct DATABASE_URL

```bash
cd /path/to/multi-business-multi-apps

# Create .env.local
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/multi_business_db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://your-domain.com:8080"
EOF
```

### Step 5: Update `config/service.env`

```bash
cat > config/service.env << 'EOF'
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/multi_business_db
SYNC_PORT=8765
SKIP_MIGRATIONS=false
SKIP_DB_PRECHECK=false
EOF
```

### Step 6: Run Database Diagnostic

```bash
npm run diagnose:database
```

**Expected output:**
```
✅ Connection successful from .env.local
✅ Connection successful from config/service.env
```

### Step 7: Run Setup

```bash
# For clean install
npm run setup

# For update
npm run setup:update
```

### Step 8: Start Service

```bash
npm run service:restart
```

---

## Advanced Troubleshooting

### Check Service Logs

```bash
# View recent service logs
cat logs/service.log | tail -n 100

# View error logs
cat logs/service-error.log | tail -n 100

# View wrapper daemon logs
cat windows-service/daemon/service.log | tail -n 100
```

### Manual Migration Test

```bash
# Test if migrations can run
npx prisma migrate status

# Run migrations manually
npx prisma migrate deploy
```

### Connection String Format

**Valid formats:**
```
postgresql://user:password@host:port/database
postgresql://user:password@host:port/database?schema=public
postgres://user:password@host:port/database
```

**Invalid formats:**
```
postgresql://localhost:5432/database  # Missing user
postgresql://:password@localhost:5432/database  # Missing user
postgresql://user@localhost/database  # Missing password and port
```

### Environment Variable Precedence

The service loads DATABASE_URL in this order:
1. `config/service.env` (preferred for Windows service)
2. `.env.local` (loaded by service wrapper)
3. `.env` (fallback)

**Recommendation:** Set DATABASE_URL in **both** `.env.local` and `config/service.env`

---

## Quick Fix Checklist

- [ ] PostgreSQL service is running
- [ ] Database `multi_business_db` exists
- [ ] `.env.local` file exists with DATABASE_URL
- [ ] `config/service.env` file exists with DATABASE_URL
- [ ] DATABASE_URL format is correct
- [ ] Credentials are correct (test with `psql`)
- [ ] PostgreSQL listening on correct port (default 5432)
- [ ] Firewall allows port 5432
- [ ] `pg_hba.conf` allows localhost connections
- [ ] Run `npm run diagnose:database` shows success

---

## Still Not Working?

### Collect Diagnostic Information

```bash
# 1. Run diagnostic
npm run diagnose:database > diagnostic-output.txt 2>&1

# 2. Check PostgreSQL logs
# Windows: C:\Program Files\PostgreSQL\14\data\log\
# Linux: /var/log/postgresql/

# 3. Check service logs
cat logs/service-error.log >> diagnostic-output.txt

# 4. Test Prisma directly
npx prisma migrate status >> diagnostic-output.txt 2>&1
```

### Contact Support

Provide:
1. Output from `npm run diagnose:database`
2. Service error logs (`logs/service-error.log`)
3. PostgreSQL version (`psql --version`)
4. Operating system
5. Any firewall or network configuration details

---

## Summary: Production vs Development

### Development (Your Machine)
- ✅ PostgreSQL running locally
- ✅ DATABASE_URL points to localhost:5432
- ✅ Direct database access
- ✅ Service starts without issues

### Production Server
- ⚠️ Need to verify PostgreSQL is running
- ⚠️ DATABASE_URL might need different host/port/credentials
- ⚠️ May have firewall restrictions
- ⚠️ May need to create database first

**Key Difference:** Production servers often require different DATABASE_URL configuration!

---

**Generated:** 2025-10-13
**Script Added:** `npm run diagnose:database`
**Related Docs:** DEPLOYMENT_GUIDE.md, SERVICE_STARTUP_ISSUES_RESOLVED.md
