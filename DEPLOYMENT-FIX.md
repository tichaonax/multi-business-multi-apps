# 🚨 Remote Server Deployment Fix

## Issue

Build fails on remote server with error:
```
Error: <Html> should not be imported outside of pages/_document.
Error occurred prerendering page "/404"
Export encountered an error on /_error: /404
```

## Root Cause

The remote server still has old **Pages Router** files (`pages/_error.tsx` and `pages/404.tsx`) that were deleted from git but remain as untracked files on the server. These files conflict with the **App Router** architecture.

## Solution

Run the cleanup script to remove legacy files and rebuild.

---

## Quick Fix (Run on Remote Server)

### Option 1: Using the Cleanup Script (Recommended)

```bash
# Pull latest code
git pull origin main

# Run cleanup script
node scripts/cleanup-pages-router.js

# Rebuild
npm run build
```

### Option 2: Manual Cleanup

```bash
# Pull latest code
git pull origin main

# Remove legacy Pages Router files
rm pages/_error.tsx
rm pages/404.tsx

# Remove pages directory if empty
rmdir pages 2>/dev/null || true

# Clean build cache
rm -rf .next

# Rebuild
npm run build
```

### Option 3: Windows Command Prompt

```cmd
# Pull latest code
git pull origin main

# Remove legacy files
del pages\_error.tsx
del pages\404.tsx

# Remove pages directory if empty
rd pages 2>nul

# Clean build cache
rd /s /q .next

# Rebuild
npm run build
```

---

## Why This Happened

1. **Files were deleted from git** in commit `deb3ac7`
2. **Git pull doesn't delete untracked files** - it only updates tracked files
3. **Old files remain on remote server** as untracked files
4. **Next.js build detects both routing systems** and fails

---

## Verification

After running the cleanup, verify:

```bash
# Should show no files
ls pages/

# Should not exist
ls pages/_error.tsx
ls pages/404.tsx

# Should exist (App Router error handling)
ls src/app/error.tsx
ls src/app/not-found.tsx
```

---

## Expected Build Output

After cleanup, build should succeed with:
```
✓ Compiled successfully
✓ Generating static pages (335/335)
Finalizing page optimization ...
```

---

## Prevention

To avoid this in future deployments:

1. **Always check for untracked files** after pulling:
   ```bash
   git status
   ```

2. **Clean untracked files** if git reports deleted files still present:
   ```bash
   git clean -fd  # Remove untracked files and directories
   ```

3. **Use the cleanup script** when deploying this fix:
   ```bash
   node scripts/cleanup-pages-router.js
   ```

---

## Support

If the issue persists after cleanup:

1. Check for any custom modifications in the `pages/` directory
2. Verify `.next` directory was fully deleted
3. Ensure you're on the latest commit: `git log -1` should show commit `deb3ac7` or later
4. Try a fresh clone in a new directory

---

## Technical Details

**Project Architecture:**
- Uses **Next.js 15 App Router** exclusively
- Error handling: `src/app/error.tsx` (error boundary)
- 404 handling: `src/app/not-found.tsx` (not found page)
- No Pages Router files should exist

**Deleted Files (commit deb3ac7):**
- `pages/_error.tsx` - Legacy error page (replaced by `src/app/error.tsx`)
- `pages/404.tsx` - Legacy 404 page (replaced by `src/app/not-found.tsx`)

**Why Build Failed:**
Next.js detected files in both `/pages` and `/src/app` directories, attempted to build both routing systems, and failed when trying to generate the Pages Router manifest.
