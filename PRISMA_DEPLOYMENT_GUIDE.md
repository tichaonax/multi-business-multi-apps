# Prisma Deployment Guide

## Issue: Schema File Keeps Getting Modified on Production

If `prisma/schema.prisma` keeps getting modified every time you do a `git pull` on the production server, this guide will help you prevent it.

## Root Causes

1. **Wrong Prisma commands in deployment scripts**
2. **Database introspection running automatically**
3. **Environment differences**
4. **Auto-formatting tools**

## ✅ Safe Prisma Commands for Production

```bash
# SAFE - Generate Prisma client only
npx prisma generate

# SAFE - Apply pending migrations
npx prisma migrate deploy

# SAFE - Check migration status
npx prisma migrate status
```

## ❌ Commands to AVOID in Production

```bash
# DANGEROUS - Will modify schema.prisma file
npx prisma db pull

# DANGEROUS - Pushes schema without migrations
npx prisma db push

# DANGEROUS - Creates new migrations
npx prisma migrate dev
```

## Deployment Checklist

### 1. Check Your Deployment Scripts

Look for these files and ensure they only use safe commands:
- `package.json` scripts
- Docker files
- CI/CD pipeline files
- Manual deployment scripts

### 2. Proper Migration Workflow

**Development:**
```bash
# 1. Modify schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive-name
# 3. Test locally
# 4. Commit schema.prisma AND migration files
```

**Production:**
```bash
# 1. Pull latest code (including migrations)
git pull origin main
# 2. Apply migrations
npx prisma migrate deploy
# 3. Regenerate client
npx prisma generate
```

### 3. Lock Down Production Schema (Optional)

Make the schema file read-only in production:
```bash
# Linux/Mac
chmod 444 prisma/schema.prisma

# Windows (PowerShell as Admin)
Set-ItemProperty -Path "prisma/schema.prisma" -Name IsReadOnly -Value $true
```

### 4. Environment Variables

Ensure your production `.env` file has:
```env
# Production database URL
DATABASE_URL="postgresql://..."

# Optional: Disable Prisma telemetry
CHECKPOINT_DISABLE=1
```

## Troubleshooting

### If Schema Keeps Changing

1. **Check what's actually changing:**
   ```bash
   git diff prisma/schema.prisma
   ```

2. **Find the culprit command:**
   - Search your deployment scripts for `prisma db pull`
   - Check if any build processes run database introspection
   - Look for automated formatting tools

3. **Check Prisma version consistency:**
   ```bash
   npx prisma --version
   ```

### Common Deployment Script Issues

**❌ Bad example:**
```json
{
  "scripts": {
    "deploy": "prisma db pull && prisma generate && npm start"
  }
}
```

**✅ Good example:**
```json
{
  "scripts": {
    "deploy": "prisma migrate deploy && prisma generate && npm start"
  }
}
```

## Windows Service Specific Notes

If you're using the Windows service wrapper, ensure your service startup script uses:
```bash
# In your service startup
npx prisma generate  # Only generate client
node server.js       # Start your app
```

## Monitoring

Add logging to track when Prisma commands run:
```bash
echo "$(date): Running prisma generate" >> prisma.log
npx prisma generate
```

## Recovery

If your schema gets modified accidentally:
```bash
# Discard changes and restore from git
git checkout HEAD -- prisma/schema.prisma

# Or reset to last commit
git reset --hard HEAD
```

---

**Remember:** The schema file should only be modified during development, then committed to git. Production should only apply migrations, never modify the schema.