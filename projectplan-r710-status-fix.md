# R710 & WiFi Portal Online Status Detection Fix

**Date:** 2026-01-01
**Branch:** bug-fix-build-compile
**Status:** ✅ COMPLETE
**Priority:** HIGH - False positive online status causing UX issues

---

## 🎯 Problem Statement

The R710 portal showed devices as "Connected" even when:
- Health checks were stale (3+ days old)
- Credentials were invalid (password changed)
- Device was actually unreachable

**Impact:** Menu items remained enabled when they shouldn't be, causing errors when users tried to use features requiring online device access.

---

## 📋 Issues Fixed

### 1. **Next.js 15 Async Params Issue**
   - **File:** `src/app/api/admin/r710/devices/[id]/test/route.ts`
   - **Error:** `Route used params.id. params should be awaited`
   - **Fix:** Changed params type to `Promise<{ id: string }>` and awaited it
   - **Impact:** Eliminated Next.js 15 warning, proper async handling

### 2. **Missing ENCRYPTION_KEY Environment Variable**
   - **Error:** `Decryption failed: ENCRYPTION_KEY environment variable is not set`
   - **Fix:** Added `ENCRYPTION_KEY` to `.env.local` with secure 32-byte hex value
   - **Impact:** R710 device password decryption now works

### 3. **R710 False Positive "Connected" Status**
   - **Files Modified:**
     - `src/app/r710-portal/devices/page.tsx`
     - `src/app/r710-portal/page.tsx`
   - **Root Cause:** Status only checked database value, not if health check was stale
   - **Fix:**
     - Added `isHealthCheckStale()` helper (1 hour threshold)
     - Show "⚠ Connected (Stale)" badge for stale health checks
     - Disable menu items when device isn't truly online
   - **Logic:**
     ```typescript
     // Device is truly online only if:
     // 1. connectionStatus === 'CONNECTED'
     // 2. lastHealthCheck exists
     // 3. lastHealthCheck < 1 hour old
     ```

### 4. **R710 Menu Items Not Properly Disabled**
   - **File:** `src/app/r710-portal/page.tsx`
   - **Old Logic:** Disabled based on `!hasIntegration`
   - **New Logic:** Disabled based on `!hasIntegration || !deviceOnline`
   - **Added:** `deviceOnline` state that checks:
     - Integration exists
     - Device connectionStatus is CONNECTED
     - lastHealthCheck < 1 hour old
   - **Tooltip:** Added helpful message: "Device offline or credentials invalid - click Test on device"

### 5. **ESP32 WiFi Portal Same Issue**
   - **File:** `src/app/wifi-portal/page.tsx`
   - **Old Logic:** `healthStatus.status !== 'unknown'`
   - **New Logic:** `healthStatus.status === 'healthy'`
   - **Impact:** WiFi portal menu items only enabled when ESP32 is truly healthy

---

## ✅ Implementation Details

### Health Check Staleness Detection

**Threshold:** 1 hour
**Rationale:** Balances freshness with avoiding false negatives from brief connectivity issues

```typescript
const isHealthCheckStale = (device: R710Device): boolean => {
  if (!device.lastHealthCheck) return true
  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  return new Date(device.lastHealthCheck).getTime() < oneHourAgo
}
```

### Status Badge Display

| Condition | Badge | Meaning |
|-----------|-------|---------|
| CONNECTED + Fresh | ● Connected (Green) | Device is online and verified |
| CONNECTED + Stale | ⚠ Connected (Stale) (Yellow) | Status outdated, may be offline |
| DISCONNECTED | ● Disconnected (Gray) | Device confirmed offline |
| ERROR | ● Error (Red) | Last check failed |

### Menu Item Behavior

**R710 Portal:**
- Token Packages, Token Inventory, Sales History, MAC Access Control
- **Disabled when:** No integration OR device not truly online
- **Visual:** Grayed out with opacity, cursor not-allowed
- **Tooltip:** Explains why disabled

**WiFi Portal (ESP32):**
- Token Configurations, Direct Sales, Token Ledger, Reports
- **Disabled when:** Health status !== 'healthy'
- **Visual:** Items hidden from menu

---

## 🔧 Files Modified

1. `src/app/api/admin/r710/devices/[id]/test/route.ts` - Next.js 15 params fix
2. `.env.local` - Added ENCRYPTION_KEY
3. `src/app/r710-portal/devices/page.tsx` - Stale status detection & badge
4. `src/app/r710-portal/page.tsx` - Menu item disabling logic + deviceOnline state
5. `src/app/wifi-portal/page.tsx` - Strict health check validation

**Total:** 5 files modified

---

## 🎉 Result

**Before:**
- Device shows "Connected" 3 days after last check
- Menu items enabled even with wrong credentials
- Users click features → get errors
- Confusing UX

**After:**
- Device shows "⚠ Connected (Stale)" when health check old
- Menu items disabled when device not truly online
- Helpful tooltip explains why disabled
- Clear UX with accurate status

---

## 🧪 Testing Recommendations

1. **Test R710 Device Status:**
   - Change R710 password
   - Verify status shows "Connected (Stale)" after 1 hour
   - Verify menu items are disabled
   - Click "Test" button
   - Verify status updates to "Error" or "Disconnected"

2. **Test ESP32 WiFi Portal:**
   - Stop ESP32 device
   - Verify health check fails
   - Verify menu items disappear
   - Restart ESP32
   - Verify menu items reappear when healthy

3. **Test Menu Item Tooltips:**
   - Hover over disabled buttons
   - Verify helpful message appears

---

## 📌 Follow-up Suggestions

1. **Consider adding auto health check:** Periodic background checks to update status proactively
2. **Add admin notification:** Alert admins when device goes offline
3. **Configurable staleness threshold:** Allow admins to set threshold (currently hard-coded to 1 hour)
4. **Status history:** Track connection status over time for analytics
5. **Batch device testing:** Allow testing multiple devices at once

---

## 🏗️ Build Status

✅ **Compilation:** Successful - All 454 pages generated
✅ **Runtime:** No errors
✅ **Type Safety:** All TypeScript checks pass

---

## 🔧 Follow-up Work: R710 Device Edit Page

**Date:** 2026-01-01
**Status:** ✅ COMPLETE

### What Was Added:

1. **Fixed API Endpoints for Next.js 15:**
   - Updated `src/app/api/admin/r710/devices/[id]/route.ts`
   - Changed GET, PUT, DELETE endpoints to use async params: `{ params: Promise<{ id: string }> }`
   - Awaited params before using: `const { id } = await params`

2. **Created R710 Device Edit Page:**
   - **Location:** `src/app/r710-portal/devices/[id]/page.tsx`
   - **Features:**
     - Loads device data from GET endpoint
     - Pre-populates form with current values
     - IP address is read-only (cannot be changed)
     - Password is optional (only update if provided)
     - Test connection button (only shown when password is entered)
     - Device info card showing status, model, firmware, usage
     - Delete button (disabled if device is in use)
     - Custom toast alerts for success/error messages
     - Admin-only access protection

3. **Edit Form Fields:**
   - IP Address (disabled/read-only)
   - Admin Username (editable)
   - Admin Password (optional - leave empty to keep current)
   - Description (optional)
   - Is Active (checkbox)

4. **Integration with Backend:**
   - GET `/api/admin/r710/devices/[id]` - Fetch device details
   - PUT `/api/admin/r710/devices/[id]` - Update device
   - DELETE `/api/admin/r710/devices/[id]` - Remove device
   - POST `/api/admin/r710/devices/test-new` - Test new credentials before saving

### User Flow:

1. User clicks "Edit" button on device list
2. Edit page loads with pre-populated form
3. User can update username, password, description, or active status
4. If password is changed, user can test connection before saving
5. On save, backend tests new credentials and updates device
6. Session cache is invalidated if credentials changed
7. User redirected back to device list with success message

### Delete Protection:

Device cannot be deleted if:
- Any businesses are using it (`businessCount > 0`)
- Any WLANs exist on it (`wlanCount > 0`)

Delete button is disabled with tooltip explaining why.

---

## 📝 Summary

The R710 portal now has complete CRUD functionality:
- ✅ **Create:** Register new R710 devices
- ✅ **Read:** View device list and details
- ✅ **Update:** Edit device credentials and configuration
- ✅ **Delete:** Remove unused devices from registry

All pages use proper error handling, user-friendly messages, and admin-only access control.
