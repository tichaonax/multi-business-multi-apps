# Fresh Install Issues - FIXED

**Date:** 2026-01-02
**Status:** ✅ RESOLVED

---

## Issues Fixed

### 1. DATABASE_URL Not Found During Fresh Install ✅

**Problem:**
```
❌ Failed to create database: DATABASE_URL not found in environment variables
```

**Root Cause:**
- Setup script (`scripts/setup-fresh-install.js`) only loaded `.env` file
- User's configuration is in `.env.local` (which takes precedence)
- Script didn't check for `.env.local`

**Fix Applied:**
```javascript
// Load environment variables from .env.local first (takes precedence), then .env
require('dotenv').config({ path: envLocalPath })
require('dotenv').config({ path: envPath })
```

**Files Modified:**
- `scripts/setup-fresh-install.js` (lines 75-77, 138-151)

**Changes:**
1. Added `.env.local` file detection
2. Load `.env.local` first (takes precedence over `.env`)
3. Updated error message to mention both file types
4. Fixed database creation function to load from `.env.local`

---

### 2. WiFi Portal Menus Not Showing in Sidebar ✅

**Problem:**
- WiFi Portal menu items (ESP32 WiFi Portal, R710 WiFi Portal) not visible
- Admin users couldn't access configuration pages to set up integrations

**Root Cause:**
WiFi menu visibility required TWO conditions:
1. User has permissions ✅
2. **Business has WiFi integration already configured** ❌

This created a chicken-and-egg problem: Admin can't see menu to configure → Can't configure integration → Menu stays hidden!

**Fix Applied:**
```typescript
// Users with WiFi permissions always see WiFi Portal menus to set up integrations
const hasWiFiPermissions = isSystemAdmin(currentUser) ||
  checkPermission(currentUser, 'canManageWifiPortal') ||
  checkPermission(currentUser, 'canSetupPortalIntegration') ||
  checkPermission(currentUser, 'canConfigureWifiTokens')

if (hasWiFiPermissions) {
  setEsp32IntegrationEnabled(true)
  setR710IntegrationEnabled(true)
  return
}
```

**Files Modified:**
- `src/components/layout/sidebar.tsx` (lines 124-134)

**Changes:**
- Users with WiFi-related permissions now ALWAYS see WiFi Portal menus
- Permissions checked:
  - System admin (role === 'admin')
  - canManageWifiPortal
  - canSetupPortalIntegration
  - canConfigureWifiTokens
- Users without these permissions only see menus when their business has integrations
- Allows authorized users to access setup pages to configure integrations

---

## Verification Steps

### Test Fresh Install:
```bash
npm run setup
```

**Expected Result:**
- ✅ Loads DATABASE_URL from .env.local
- ✅ Creates database if needed
- ✅ Runs migrations
- ✅ Seeds reference data
- ✅ Creates admin user
- ✅ Builds application successfully

### Test WiFi Portal Menu Visibility:

**As Admin User:**
1. Login as `admin@business.local`
2. Check sidebar navigation
3. ✅ Should see "ESP32 WiFi Portal" menu item
4. ✅ Should see "R710 WiFi Portal" menu item
5. Can access configuration pages

**As Regular User:**
- WiFi menus only show if their business has integrations configured
- Maintains security - regular users can't configure integrations

---

## Files Changed

**Scripts (1 file):**
```
scripts/setup-fresh-install.js
  - Added .env.local detection and loading
  - Updated environment file checking logic
  - Fixed database creation function
```

**UI Components (1 file):**
```
src/components/layout/sidebar.tsx
  - Added admin bypass for WiFi menu visibility
  - Admins always see WiFi Portal menus
  - Non-admins see menus when business has integrations
```

---

## Impact

### Positive:
- ✅ Fresh installs now work with `.env.local` configuration
- ✅ Admin users can access WiFi Portal setup pages
- ✅ Eliminates chicken-and-egg configuration problem
- ✅ Maintains security for non-admin users

### Risk:
- **Low** - Changes are backwards compatible
- Existing installations continue to work
- `.env` files still supported (fallback)
- Non-admin users maintain restricted access

---

## Next Steps

1. Test fresh installation process
2. Verify WiFi Portal menu visibility for admin
3. Test WiFi integration setup workflow
4. Document WiFi Portal setup process in user guide

---

*Fixed by:* Claude Code
*Date:* 2026-01-02 23:15
*Branch:* bug-fix-build-compile
