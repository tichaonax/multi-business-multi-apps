# Deployment Guide

## Overview

This document describes the automated deployment process for the Multi-Business Multi-Apps system, specifically focusing on the Windows sync service.

## Automated Deployment System

The project uses a multi-layered approach to ensure seamless deployments:

1. **Tracked Build Artifacts** - The `dist/` directory is tracked in git
2. **Post-Merge Git Hooks** - Automatically rebuild after `git pull`
3. **Setup Scripts** - Manual rebuild when needed

---

## 🚀 Quick Deployment (Remote Server)

### First-Time Setup

On the remote server, run these commands once:

```bash
# 1. Clone the repository
git clone <repository-url>
cd multi-business-multi-apps

# 2. Install git hooks (enables automatic rebuilds)
node scripts/install-git-hooks.js

# 3. Run initial setup
npm run setup:update
```

### Subsequent Deployments

After the initial setup, deployments are **automatic**:

```bash
# Pull latest changes
git pull

# The post-merge hook automatically:
# ✅ Detects changed files
# ✅ Rebuilds the sync service if needed
# ✅ Regenerates Prisma client if schema changed
# ✅ Runs full setup if package.json changed
```

**After pulling, restart the Windows service:**

```powershell
# As Administrator
npm run service:restart
```

---

## 📋 Deployment Components

### 1. Git Hooks

**Location:** `.githooks/post-merge` and `.githooks/post-merge.ps1`

**Purpose:** Automatically rebuild the service after `git pull`

**Behavior:**
- If `package.json` changed → Full setup (`npm run setup:update`)
- If `src/` files changed → Rebuild service only
- Otherwise → Skip rebuild

**Installation:**
```bash
node scripts/install-git-hooks.js
```

**Disable (if needed):**
```bash
git config core.hooksPath .git/hooks
```

### 2. Setup Script

**Location:** `scripts/setup-after-pull.js`

**Command:** `npm run setup:update`

**Steps Performed:**
1. Install/update dependencies (`npm install`)
2. Regenerate Prisma client (`npx prisma generate`)
3. Run database migrations (`npx prisma migrate deploy`)
4. Rebuild Next.js app (`npm run build`)
5. **Rebuild Windows sync service (`npm run build:service`)** ✨

**When to Use:**
- Manual deployments
- When git hooks are not configured
- After major dependency updates

### 3. Build Artifacts in Git

**Location:** `dist/` directory

**Purpose:** Pre-compiled TypeScript service files

**Why Tracked:**
- Ensures remote server has working code immediately after pull
- Fallback if rebuild fails
- Faster deployments (no compilation needed if unchanged)

**Build Command:**
```bash
npm run build:service
```

---

## 🔄 Deployment Workflows

### Scenario 1: Normal Code Update

```bash
# Developer commits and pushes changes
git add .
git commit -m "feat: update sync service logic"
git push

# Remote server deployment
git pull                    # Post-merge hook rebuilds automatically
npm run service:restart     # Restart service as Administrator
```

### Scenario 2: Dependency Update

```bash
# Developer updates dependencies
npm install some-package
git add package.json package-lock.json
git commit -m "deps: add some-package"
git push

# Remote server deployment
git pull                    # Post-merge hook runs full setup
npm run service:restart     # Restart service as Administrator
```

### Scenario 3: Database Schema Change

```bash
# Developer creates migration
npx prisma migrate dev --name add_new_field
git add prisma/
git commit -m "db: add new field"
git push

# Remote server deployment
git pull                    # Post-merge hook runs full setup
                           # Includes: prisma generate + migrate deploy
npm run service:restart     # Restart service as Administrator
```

### Scenario 4: Manual Deployment (No Git Hooks)

```bash
# Pull changes
git pull

# Run setup manually
npm run setup:update

# Restart service
npm run service:restart     # As Administrator
```

---

## 🛠️ Troubleshooting

### Issue: Service Fails After Deployment

**Error:** `ReferenceError: client_1 is not defined`

**Cause:** Outdated compiled files in `dist/`

**Solution:**
```bash
# Rebuild the service
npm run build:service

# Restart the service
npm run service:restart     # As Administrator
```

### Issue: Git Hooks Not Running

**Symptoms:** No rebuild messages after `git pull`

**Diagnosis:**
```bash
git config core.hooksPath
# Should output: .githooks
```

**Solution:**
```bash
node scripts/install-git-hooks.js
```

### Issue: Prisma Client Out of Sync

**Error:** `Unknown field` or schema-related errors

**Solution:**
```bash
npx prisma generate
npm run build:service
npm run service:restart     # As Administrator
```

### Issue: Permission Denied When Restarting Service

**Error:** `Access denied when stopping the service`

**Solution:**
- Open PowerShell as Administrator
- Run: `npm run service:restart`

---

## 📦 Package.json Scripts Reference

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `npm run setup:update` | Full post-pull setup (recommended) |
| `npm run build:service` | Rebuild sync service only |
| `npm run service:restart` | Restart Windows service |
| `npm run service:start` | Start Windows service |
| `npm run service:stop` | Stop Windows service |

### Git Hook Scripts

| Script | Purpose |
|--------|---------|
| `node scripts/install-git-hooks.js` | Install post-merge hook |

---

## 🔐 Production Best Practices

1. **Always Test Locally First**
   ```bash
   npm run build:service
   npm run sync-service:start:dev
   ```

2. **Use Git Hooks**
   - Ensures consistent deployments
   - Reduces human error
   - Automatic rebuild on pull

3. **Monitor Service Logs**
   ```bash
   npm run monitor:service
   ```

4. **Backup Before Major Changes**
   ```bash
   npm run backup:database
   ```

5. **Validate After Deployment**
   ```bash
   npm run service:smoke-check
   npm run validate:setup
   ```

---

## 🎯 Summary

### Developer Workflow
1. Make changes to code
2. Commit and push to git
3. Build artifacts are tracked in git

### Deployment Workflow (Remote Server)
1. `git pull` → Hooks run automatically
2. Service rebuilds if needed
3. `npm run service:restart` (as Admin)

### Manual Fallback
If hooks fail or aren't configured:
```bash
npm run setup:update
npm run service:restart
```

---

## 📚 Related Documentation

- `SETUP.md` - Initial system setup
- `README.md` - Project overview
- `docs/sync-service-setup.md` - Sync service details
- `.githooks/post-merge` - Hook implementation

---

**Last Updated:** 2025-01-XX
**Maintained By:** Development Team
