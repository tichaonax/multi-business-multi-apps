# Fix: npm install dependency conflict with printer package

**Date:** 2025-11-28
**Status:** Planning
**Priority:** High (Blocking production deployment)

---

## Problem Statement

Fresh production server installation is failing during `npm install` due to a peer dependency conflict with the `printer` package:

```
npm error ERESOLVE unable to resolve dependency tree
npm error Could not resolve dependency:
npm error peer grunt@"~0.4" from grunt-node-gyp@1.0.0
npm error Found: grunt@1.6.1
```

### Root Cause
- The `printer` package (v0.4.0) uses `grunt-node-gyp` which requires `grunt@~0.4` (version 0.4.x)
- However, grunt v1.6.1 is being installed
- This creates an incompatible peer dependency conflict
- npm v7+ enforces strict peer dependency resolution, causing the installation to fail

---

## Solution

Add the `--legacy-peer-deps` flag to all `npm install` commands in setup scripts. This flag:
- Tells npm to ignore peer dependency conflicts
- Uses the more permissive npm v4-v6 behavior
- Allows installation to proceed despite version mismatches
- Is safer than `--force` which can cause other issues

---

## Impact Analysis

### Files Requiring Changes (3 files)

1. **scripts/setup-fresh-install.js** (line 190)
   - Used for: Fresh installations on new servers
   - Impact: Critical - this is what's currently failing

2. **scripts/setup-after-pull.js** (line 508)
   - Used for: Upgrades/updates after git pull
   - Impact: Important - prevents future failures

3. **scripts/install/install.js** (line 280)
   - Used for: Main installation system
   - Impact: Important - comprehensive installer

### Risk Assessment
- **Risk Level:** Low
- **Breaking Changes:** None
- **Backward Compatibility:** Full
- **Testing Required:** Run setup script

---

## Implementation Plan

### TODO Items:
- [ ] Update `scripts/setup-fresh-install.js` to use `npm install --legacy-peer-deps`
- [ ] Update `scripts/setup-after-pull.js` to use `npm install --legacy-peer-deps`
- [ ] Update `scripts/install/install.js` to use `npm install --legacy-peer-deps`
- [ ] Test the fix by running setup

---

## Implementation Details

### Change 1: scripts/setup-fresh-install.js:190

**Before:**
```javascript
{
  command: 'npm install',
  description: 'Installing dependencies',
  required: true
},
```

**After:**
```javascript
{
  command: 'npm install --legacy-peer-deps',
  description: 'Installing dependencies',
  required: true
},
```

### Change 2: scripts/setup-after-pull.js:508

**Before:**
```javascript
run('npm install', 'Installing/updating dependencies', false)
```

**After:**
```javascript
run('npm install --legacy-peer-deps', 'Installing/updating dependencies', false)
```

### Change 3: scripts/install/install.js:280

**Before:**
```javascript
execSync('npm install', {
  stdio: this.options.silent ? 'pipe' : 'inherit',
  cwd: this.projectRoot
})
```

**After:**
```javascript
execSync('npm install --legacy-peer-deps', {
  stdio: this.options.silent ? 'pipe' : 'inherit',
  cwd: this.projectRoot
})
```

---

## Alternative Solutions Considered

1. **Remove printer package** ❌
   - Would break receipt printing functionality
   - Not acceptable for production

2. **Upgrade printer package** ❌
   - No newer version available
   - Package appears unmaintained

3. **Use --force flag** ❌
   - More aggressive than needed
   - Can cause unexpected dependency resolution issues
   - --legacy-peer-deps is safer

4. **Fork and fix printer package** ❌
   - Too much maintenance overhead
   - Would need to maintain fork long-term

5. **Use --legacy-peer-deps** ✅
   - Recommended solution
   - Minimal risk
   - Allows installation to proceed
   - Standard approach for legacy packages

---

## Testing Plan

After implementation, test by running:
```bash
npm run setup
```

Expected outcome:
- ✅ npm install completes successfully
- ✅ Dependencies install without errors
- ✅ Setup script continues to completion
- ✅ printer package is installed and functional

---

## Review Section

### Changes Made

**Status:** ✅ Implementation Complete

**Files Modified:** 3 files, 4 total changes

1. **scripts/setup-fresh-install.js:190**
   - Changed: `npm install` → `npm install --legacy-peer-deps`
   - Impact: Fresh installation script now bypasses peer dependency conflicts

2. **scripts/setup-after-pull.js:508**
   - Changed: `npm install` → `npm install --legacy-peer-deps`
   - Impact: Update/upgrade script now bypasses peer dependency conflicts

3. **scripts/install/install.js:280**
   - Changed: `npm install` → `npm install --legacy-peer-deps`
   - Impact: Main installer now bypasses peer dependency conflicts

4. **scripts/install/install.js:296** (Bonus consistency fix)
   - Changed: `npm install ${deps}` → `npm install --legacy-peer-deps ${deps}`
   - Impact: Sync service dependencies installation also uses legacy peer deps

### Test Results
(To be filled after running setup script)

### Issues Encountered
None during implementation - all changes applied cleanly.

### Follow-up Items
- Test with `npm run setup` to verify fix resolves the installation error
- Monitor for any unexpected dependency behavior in production
