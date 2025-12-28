# R710 WLAN Registration Flow - Complete Implementation

## Overview

This document describes the proper WLAN registration flow that validates WLANs exist on the R710 device before creating database records.

## Problem Statement

Previously, the system allowed creating WLAN database records without verifying they exist on the R710 device, leading to:
- Orphaned database records for non-existent WLANs
- Failed token generation
- Confused state between database and device
- Customers unable to use purchased WiFi tokens

## Solution

Implemented a **Discovery-First Registration Flow** that:
1. Queries the R710 device to discover actual WLANs
2. Shows which WLANs are registered vs. unregistered
3. Validates WLAN exists on device before creating database record
4. Prevents orphaned records

---

## Architecture

### 1. Discovery API
**Endpoint**: `GET /api/r710/discover-wlans?deviceId={deviceId}`

**Purpose**: Query the R710 device to list all available WLANs

**Process**:
1. Admin-only endpoint (requires `isSystemAdmin()`)
2. Connects to R710 device via HTTPS
3. Authenticates with device credentials
4. Queries `/admin/_conf.jsp` with action='getconf'
5. Parses XML response to extract WLAN details
6. Checks each WLAN against database to mark as registered/unregistered
7. Returns comprehensive WLAN list with metadata

**Response**:
```json
{
  "success": true,
  "device": {
    "id": "device-id",
    "ipAddress": "192.168.0.108",
    "description": "Ground floor"
  },
  "wlans": [
    {
      "name": "HXI Fashions",
      "ssid": "HXI Fashions",
      "wlanId": "HXI Fashions",
      "description": "HXI Fashions",
      "usage": "user",
      "isGuest": false,
      "guestServiceId": "1",
      "enableFriendlyKey": false,
      "isActive": true,
      "registeredInDatabase": false
    }
  ],
  "totalWlans": 5,
  "guestWlans": 4,
  "registeredWlans": 0,
  "unregisteredWlans": 5
}
```

**Key Fields**:
- `wlanId`: The R710's internal WLAN identifier (NOT our database ID)
- `ssid`: The WiFi network name customers see
- `guestServiceId`: Links to captive portal configuration
- `registeredInDatabase`: Boolean indicating if this WLAN is in our database

---

### 2. Registration API
**Endpoint**: `POST /api/r710/register-wlan`

**Purpose**: Register a WLAN from the R710 device into the database

**Body**:
```json
{
  "businessId": "business-uuid",
  "deviceId": "device-uuid",
  "wlanId": "device-wlan-id",
  "ssid": "WiFi Network Name"
}
```

**Process**:
1. Validates admin permissions
2. **CRITICAL**: Connects to R710 device and queries for WLAN
3. Verifies WLAN exists by matching `wlanId` or `ssid`
4. If WLAN doesn't exist on device, returns 404 error
5. If WLAN exists, creates database record with device-sourced data
6. Returns registered WLAN details

**Validation Logic**:
```typescript
// Query device for WLANs
const wlansResponse = await fetch(deviceUrl, ...)
const wlansText = await wlansResponse.text()

// Find the specific WLAN
for (const wlanXml of wlanMatches) {
  const deviceWlanId = getAttribute('id')
  const deviceSsid = getAttribute('ssid')

  // Match by either WLAN ID or SSID
  if (deviceWlanId === wlanId || deviceSsid === ssid) {
    wlanData = extractWlanData(wlanXml)
    break
  }
}

// Only proceed if WLAN found on device
if (!wlanData) {
  return 404 error
}

// Create database record
await prisma.r710Wlans.create({ data: wlanData })
```

**Error Responses**:
- `404`: WLAN not found on device
- `409`: WLAN already registered
- `400`: Missing required fields
- `403`: Unauthorized (not admin)

---

### 3. Discovery UI Component
**File**: `src/components/r710/wlan-discovery-modal.tsx`

**Features**:
- Modal dialog for discovering and registering WLANs
- Device selection dropdown
- "Discover WLANs" button to query device
- List of discovered WLANs with status indicators
- Business selection for registration
- "Register" button for unregistered WLANs
- Visual differentiation between registered/unregistered
- Real-time feedback during discovery and registration

**Status Indicators**:
- ✓ Registered (green badge) - WLAN exists in database
- Guest (blue badge) - Guest access WLAN
- Unregistered (no badge) - Available to register

**Usage Flow**:
1. Admin clicks "Discover WLANs" button on WLAN list page
2. Selects R710 device from dropdown
3. Clicks "Discover WLANs from Device"
4. System queries device and shows all WLANs
5. For unregistered WLANs:
   - Select business from dropdown
   - Click "Register" button
6. System validates WLAN exists and creates database record
7. WLAN list refreshes automatically

---

### 4. Updated WLAN List Page
**File**: `src/app/r710-portal/wlans/page.tsx`

**Changes**:
- Added "Discover WLANs" button (admin only)
- Integrated `WLANDiscoveryModal` component
- Shows registered WLANs in main list
- Provides clear path to register new WLANs

---

### 5. Devices API
**Endpoint**: `GET /api/r710/devices`

**Purpose**: List all R710 devices for device selection in discovery modal

**Response**:
```json
{
  "devices": [
    {
      "id": "device-uuid",
      "ipAddress": "192.168.0.108",
      "description": "Ground floor",
      "model": "R710",
      "connectionStatus": "CONNECTED",
      "lastHealthCheck": "2025-12-28T...",
      "isActive": true
    }
  ]
}
```

---

## Cleanup Process

### Orphaned WLAN Cleanup Script
**File**: `scripts/cleanup-orphaned-wlan.js`

**Purpose**: Safely remove orphaned WLAN records that don't exist on device

**Features**:
- Shows detailed information about WLAN to be deleted
- Lists related records (token configs, tokens)
- Requires explicit confirmation ("yes")
- Cascade deletes related records
- Provides next steps after cleanup

**Usage**:
```bash
node scripts/cleanup-orphaned-wlan.js
```

**What it deletes**:
- The orphaned R710Wlans record
- CASCADE: Associated r710_token_configs
- CASCADE: Associated r710_tokens
- PRESERVES: r710_token_sales (for accounting)

---

## Workflow Diagram

```
┌─────────────────┐
│ Admin navigates │
│  to WLAN List   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Clicks "Discover"  │
│   WLANs Button  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Modal Opens    │
│  Select Device  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Click "Discover WLANs"  │
│  from Device            │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ API connects to R710     │
│ Queries /admin/_conf.jsp │
│ Parses XML response      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Display list of WLANs    │
│ Mark registered vs.      │
│ unregistered             │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ For unregistered WLAN:   │
│ 1. Select business       │
│ 2. Click "Register"      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Registration API:        │
│ 1. Query device again    │
│ 2. Verify WLAN exists    │
│ 3. Create DB record      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Success! WLAN registered │
│ List refreshes           │
│ Can now generate tokens  │
└──────────────────────────┘
```

---

## Key Principles

### 1. Device is Source of Truth
The R710 device is the authoritative source for what WLANs exist. Database records are secondary.

### 2. Validation Before Creation
**NEVER** create a database record without first verifying the WLAN exists on the device.

### 3. Discovery-First Approach
Admins discover what exists on the device, then register selected WLANs to businesses.

### 4. Fail-Safe Registration
If device validation fails during registration, the operation aborts. No orphaned records are created.

---

## Testing Checklist

- [ ] Run cleanup script to remove orphaned WLAN
- [ ] Navigate to /r710-portal/wlans
- [ ] Click "Discover WLANs" button
- [ ] Select R710 device from dropdown
- [ ] Click "Discover WLANs from Device"
- [ ] Verify all actual device WLANs are shown
- [ ] Verify registered WLANs show green badge
- [ ] For unregistered WLAN:
  - [ ] Select a business
  - [ ] Click "Register"
  - [ ] Verify success message
  - [ ] Verify WLAN appears in main list
  - [ ] Verify WLAN shows as registered in discovery modal
- [ ] Verify token generation works with registered WLAN

---

## Migration Path

### For Existing Systems:

1. **Backup database**
2. **Run investigation script**:
   ```bash
   node scripts/investigate-r710-wlan-integrity.js
   ```
3. **Review orphaned WLANs**
4. **Run cleanup script**:
   ```bash
   node scripts/cleanup-orphaned-wlan.js
   ```
5. **Discover and register actual WLANs**:
   - Navigate to /r710-portal/wlans
   - Click "Discover WLANs"
   - Register appropriate WLANs for each business
6. **Create token configurations** for registered WLANs
7. **Test token generation**

---

## Future Enhancements

### Possible improvements:
1. **Auto-sync**: Periodically sync database with device WLANs
2. **Conflict detection**: Warn when device WLAN deleted but DB record exists
3. **Bulk registration**: Register multiple WLANs at once
4. **WLAN creation**: Create new WLANs on device from UI
5. **Health monitoring**: Alert when registered WLANs disappear from device

---

## API Reference Summary

| Endpoint | Method | Purpose | Admin Only |
|----------|--------|---------|------------|
| `/api/r710/discover-wlans` | GET | Discover WLANs on device | ✓ |
| `/api/r710/register-wlan` | POST | Register WLAN to business | ✓ |
| `/api/r710/devices` | GET | List R710 devices | ✓ |
| `/api/r710/wlans` | GET | List registered WLANs | - |
| `/api/r710/wlans/[id]` | GET/PUT/DELETE | Manage WLAN record | - |

---

## Files Created/Modified

### Created:
- `src/app/api/r710/discover-wlans/route.ts` - Discovery API
- `src/app/api/r710/register-wlan/route.ts` - Registration API
- `src/app/api/r710/devices/route.ts` - Devices list API
- `src/components/r710/wlan-discovery-modal.tsx` - Discovery UI
- `scripts/cleanup-orphaned-wlan.js` - Cleanup script
- `scripts/investigate-r710-wlan-integrity.js` - Investigation script
- `docs/r710-wlan-registration-flow.md` - This document

### Modified:
- `src/app/r710-portal/wlans/page.tsx` - Added "Discover WLANs" button and modal
- `src/app/api/r710/wlans/route.ts` - Fixed response format
- `src/app/api/r710/wlans/[id]/route.ts` - Added GET method, fixed schema

---

## Conclusion

The new WLAN registration flow ensures data integrity by making the R710 device the source of truth. Admins discover what actually exists on the device and register selected WLANs to businesses, preventing orphaned records and ensuring token generation works reliably.
