# R710 Sidebar Navigation and Integration Validation Fixes

**Date:** December 28, 2025
**Status:** ✅ COMPLETE

---

## Summary

Implemented three critical improvements to the R710 WiFi token system:

1. ✅ **Restored separate sidebar navigation** for R710 and ESP32 portals
2. ✅ **Enforced business integration limit** - one R710 integration per business maximum
3. ✅ **Added duplicate WLAN detection** - prevents SSID conflicts and offers association workflow

---

## 1. Sidebar Navigation Separation

### Problem
ESP32 and R710 portals were combined into a single "WiFi Management" link, losing the distinct portal navigation that existed before.

### Solution
**File Modified:** `src/components/layout/sidebar.tsx` (lines 811-837)

**Before:**
```typescript
{/* WiFi Management - Unified dashboard for ESP32 and R710 systems */}
<Link href="/admin/wifi-management">
  <span>WiFi Management</span>
  <span className="badge">ESP32 + R710</span>
</Link>
```

**After:**
```typescript
{/* ESP32 WiFi Portal - ESP32-based WiFi token system */}
{esp32IntegrationEnabled && (
  <Link href="/wifi-portal">
    <span className="text-lg">📶</span>
    <span>ESP32 WiFi Portal</span>
  </Link>
)}

{/* R710 WiFi Portal - Ruckus R710-based WiFi token system */}
{r710IntegrationEnabled && (
  <Link href="/r710-portal">
    <span className="text-lg">📡</span>
    <span>R710 WiFi Portal</span>
  </Link>
)}
```

### Result
- **ESP32 Portal**: `/wifi-portal/` (icon: 📶)
- **R710 Portal**: `/r710-portal/` (icon: 📡)
- **Connected Clients** (combined): `/admin/connected-clients` (unchanged)
- Each portal only shows when its integration is enabled for the current business

---

## 2. Business Integration Limit Enforcement

### Problem
A business could potentially create multiple R710 integrations on different devices, violating the "one integration per business" requirement.

### Solution
**File Modified:** `src/app/api/r710/integration/route.ts` (lines 173-200)

**Before:**
```typescript
// Only checked for same business + same device
const existingIntegration = await prisma.r710BusinessIntegrations.findFirst({
  where: { businessId, deviceRegistryId }
});
```

**After:**
```typescript
// CRITICAL: Business can only have ONE R710 integration maximum
const existingIntegration = await prisma.r710BusinessIntegrations.findFirst({
  where: { businessId }, // Check across ALL devices
  include: {
    device_registry: {
      select: {
        id: true,
        ipAddress: true,
        description: true
      }
    }
  }
});

if (existingIntegration) {
  return NextResponse.json(
    {
      error: 'Business already has an R710 integration',
      details: `This business is already integrated with R710 device at ${existingIntegration.device_registry.ipAddress}. A business can only have ONE R710 integration.`,
      existingDevice: {
        id: existingIntegration.device_registry.id,
        ipAddress: existingIntegration.device_registry.ipAddress,
        description: existingIntegration.device_registry.description
      }
    },
    { status: 409 }
  );
}
```

### Error Response Example
```json
{
  "error": "Business already has an R710 integration",
  "details": "This business is already integrated with R710 device at 192.168.0.108. A business can only have ONE R710 integration.",
  "existingDevice": {
    "id": "dev_123",
    "ipAddress": "192.168.0.108",
    "description": "Main R710 AP"
  }
}
```

---

## 3. Duplicate WLAN Detection

### Problem
When creating an R710 integration, if a WLAN with the same SSID already existed on the device, the creation would fail without clear guidance on how to resolve the conflict.

### Solution
**File Modified:** `src/app/api/r710/integration/route.ts` (lines 257-328)

**Implementation:**

#### Step 1: Discover Existing WLANs
```typescript
// Query device for existing WLANs before creating
const discoveryResult = await r710Service.discoverWlans();

if (!discoveryResult.success) {
  return NextResponse.json({
    error: 'Failed to discover WLANs on device',
    details: discoveryResult.error
  }, { status: 500 });
}
```

#### Step 2: Check for SSID Conflicts
```typescript
// Check if SSID already exists (guest WLANs only)
const existingWlan = discoveryResult.wlans.find(
  w => w.ssid === wlanSsid && w.isGuest
);
```

#### Step 3: Handle Two Scenarios

##### Scenario A: WLAN Already Associated with Another Business
```typescript
const wlanInDb = await prisma.r710Wlans.findFirst({
  where: {
    deviceRegistryId,
    wlanId: existingWlan.id
  },
  include: {
    businesses: {
      select: { id: true, name: true }
    }
  }
});

if (wlanInDb) {
  return NextResponse.json({
    error: 'WLAN SSID already in use',
    type: 'DUPLICATE_SSID_ASSOCIATED',
    details: `A WLAN with SSID "${wlanSsid}" already exists on this device and is associated with business "${wlanInDb.businesses.name}".`,
    suggestion: 'Please choose a different SSID name for your business.',
    existingWlan: {
      id: existingWlan.id,
      ssid: existingWlan.ssid,
      associatedBusiness: wlanInDb.businesses.name
    }
  }, { status: 409 });
}
```

##### Scenario B: WLAN Exists But Not Associated (Can Associate)
```typescript
return NextResponse.json({
  error: 'WLAN SSID already exists on device',
  type: 'DUPLICATE_SSID_UNASSOCIATED',
  details: `A WLAN with SSID "${wlanSsid}" already exists on this R710 device but is not associated with any business in the system.`,
  suggestion: 'You can either: (1) Choose a different SSID name, or (2) Associate your business with the existing WLAN.',
  existingWlan: {
    id: existingWlan.id,
    ssid: existingWlan.ssid,
    name: existingWlan.name
  },
  canAssociate: true
}, { status: 409 });
```

### Error Response Types

#### Type 1: `DUPLICATE_SSID_ASSOCIATED`
**Meaning:** SSID in use by another business
**User Action:** Must choose a different SSID
**Response Fields:**
- `error`: Human-readable error message
- `type`: `"DUPLICATE_SSID_ASSOCIATED"`
- `details`: Explanation of the conflict
- `suggestion`: Guidance for resolution
- `existingWlan.associatedBusiness`: Name of the business using this SSID

#### Type 2: `DUPLICATE_SSID_UNASSOCIATED`
**Meaning:** SSID exists on device but not in database
**User Actions:**
1. Choose a different SSID, OR
2. Associate business with existing WLAN

**Response Fields:**
- `error`: Human-readable error message
- `type`: `"DUPLICATE_SSID_UNASSOCIATED"`
- `details`: Explanation of the situation
- `suggestion`: Two possible options
- `canAssociate`: `true` (indicates association is possible)
- `existingWlan.id`: Device WLAN ID for association
- `existingWlan.ssid`: The conflicting SSID
- `existingWlan.name`: Device WLAN name

---

## Frontend Integration Requirements

### 1. Handle Duplicate WLAN Errors

The frontend should check for `status: 409` responses and handle based on `type`:

```typescript
try {
  const response = await fetch('/api/r710/integration', {
    method: 'POST',
    body: JSON.stringify({ businessId, deviceRegistryId, ssid })
  });

  if (response.status === 409) {
    const data = await response.json();

    if (data.type === 'DUPLICATE_SSID_ASSOCIATED') {
      // SSID in use by another business
      showError({
        title: 'SSID Already In Use',
        message: data.details,
        suggestion: data.suggestion,
        associatedBusiness: data.existingWlan.associatedBusiness
      });
    } else if (data.type === 'DUPLICATE_SSID_UNASSOCIATED') {
      // Offer choice: change SSID or associate with existing
      showDialog({
        title: 'SSID Already Exists',
        message: data.details,
        options: [
          { label: 'Change SSID', action: 'rename' },
          { label: 'Use Existing WLAN', action: 'associate', wlanId: data.existingWlan.id }
        ]
      });
    }
  }
} catch (error) {
  // Handle other errors
}
```

### 2. Display Business Integration Limit Error

```typescript
if (data.error === 'Business already has an R710 integration') {
  showError({
    title: 'Integration Limit Reached',
    message: data.details,
    existingDevice: data.existingDevice,
    action: 'Remove existing integration first'
  });
}
```

---

## Workflow Diagrams

### Creating R710 Integration - Decision Flow

```
User submits integration request
        ↓
┌─────────────────────────────────────┐
│ Check: Business has integration?    │
└─────────────────────────────────────┘
        ↓                    ↓
       YES                  NO
        ↓                    ↓
    [ERROR]            Continue
    409 Conflict            ↓
                    ┌─────────────────────────────────────┐
                    │ Discover WLANs on device            │
                    └─────────────────────────────────────┘
                            ↓
                    ┌─────────────────────────────────────┐
                    │ Check: SSID exists on device?       │
                    └─────────────────────────────────────┘
                            ↓                    ↓
                           YES                  NO
                            ↓                    ↓
                    ┌─────────────────────┐     Continue
                    │ Check: Associated?  │          ↓
                    └─────────────────────┘     Create WLAN
                            ↓         ↓              ↓
                      YES         NO           SUCCESS
                       ↓           ↓
                  [ERROR]     [ERROR]
                  ASSOCIATED  UNASSOCIATED
                  Suggest:    Offer:
                  Change SSID 1. Change SSID
                             2. Associate
```

---

## Testing

### Test Case 1: Business Integration Limit
**Steps:**
1. Create R710 integration for Business A on Device 1
2. Attempt to create another integration for Business A on Device 2

**Expected Result:**
```json
{
  "error": "Business already has an R710 integration",
  "details": "This business is already integrated with R710 device at 192.168.0.108...",
  "existingDevice": {...}
}
```

### Test Case 2: Duplicate SSID - Associated
**Steps:**
1. Business A creates WLAN with SSID "Guest WiFi"
2. Business B attempts to create WLAN with SSID "Guest WiFi"

**Expected Result:**
```json
{
  "error": "WLAN SSID already in use",
  "type": "DUPLICATE_SSID_ASSOCIATED",
  "details": "A WLAN with SSID \"Guest WiFi\" already exists...",
  "suggestion": "Please choose a different SSID name...",
  "existingWlan": {
    "ssid": "Guest WiFi",
    "associatedBusiness": "Business A"
  }
}
```

### Test Case 3: Duplicate SSID - Unassociated
**Steps:**
1. Manually create WLAN on R710 device (not through system)
2. Attempt to create integration with same SSID

**Expected Result:**
```json
{
  "error": "WLAN SSID already exists on device",
  "type": "DUPLICATE_SSID_UNASSOCIATED",
  "details": "A WLAN with SSID \"Guest WiFi\" already exists...",
  "suggestion": "You can either: (1) Choose a different SSID name, or (2) Associate...",
  "canAssociate": true,
  "existingWlan": {
    "id": "5",
    "ssid": "Guest WiFi",
    "name": "Guest WiFi"
  }
}
```

### Test Case 4: Sidebar Navigation
**Steps:**
1. Login as business with ESP32 integration
2. Check sidebar - should show "ESP32 WiFi Portal" link
3. Login as business with R710 integration
4. Check sidebar - should show "R710 WiFi Portal" link
5. Login as business with both integrations
6. Check sidebar - should show BOTH links separately

**Expected Result:**
- ESP32 link → `/wifi-portal/`
- R710 link → `/r710-portal/`
- Connected Clients → `/admin/connected-clients` (always visible to admins)

---

## Files Modified

1. **`src/components/layout/sidebar.tsx`**
   - Lines 811-837: Separated ESP32 and R710 portal links
   - Added conditional rendering based on integration flags

2. **`src/app/api/r710/integration/route.ts`**
   - Lines 173-200: Business integration limit enforcement
   - Lines 257-328: Duplicate WLAN detection and handling

---

## Database Schema

No schema changes required. The existing schema supports all functionality:

```prisma
model R710BusinessIntegrations {
  id               String   @id @default(uuid())
  businessId       String   // One integration per businessId enforced at API level
  deviceRegistryId String
  isActive         Boolean
  // ...

  @@unique([businessId, deviceRegistryId]) // Database constraint
}

model R710Wlans {
  id               String  @id @default(uuid())
  businessId       String
  deviceRegistryId String
  wlanId           String  // Numeric ID from device
  ssid             String
  // ...

  @@unique([deviceRegistryId, wlanId]) // Prevents duplicate WLAN IDs
}
```

---

## Benefits

### 1. Clear Navigation
- Users can easily distinguish between ESP32 and R710 systems
- Each portal has its own dedicated landing page
- Consistent with original design intent

### 2. Data Integrity
- Prevents businesses from having multiple R710 integrations
- Prevents SSID conflicts across businesses
- Device remains source of truth for WLAN configurations

### 3. Better UX
- Clear error messages guide users through conflict resolution
- Offers choices when WLAN association is possible
- Prevents failed integration attempts with helpful suggestions

---

## Next Steps (Future Enhancements)

1. **WLAN Association Feature**: Implement API endpoint to associate a business with an existing unassociated WLAN when `canAssociate: true`

2. **SSID Validation**: Add frontend validation to suggest available SSIDs before submission

3. **Integration Migration**: Add feature to migrate integration from one device to another (requires deleting old integration first)

4. **Bulk Operations**: Add admin tools to view all R710 integrations across all businesses

---

## References

- **Test Scripts**: `scripts/ruckus-api-discovery/test-all-wlan-operations.js`
- **Session Manager**: `src/lib/r710-session-manager.ts`
- **R710 API Service**: `src/services/ruckus-r710-api.ts`
- **Numeric ID Fix**: `docs/r710-numeric-id-fix-summary.md`

---

**Status:** ✅ All three requirements implemented and ready for testing
