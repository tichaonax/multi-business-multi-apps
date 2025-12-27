# R710 Device Registry Architecture

## Overview

The R710 integration uses a **centralized device registry** pattern where R710 devices are registered globally by administrators, and businesses select from the available devices when creating their integration.

## Key Design Principles

### 1. **One IP Address = One Set of Credentials**
- Each R710 device has exactly ONE admin username and password
- Credentials are stored in the global `r710_device_registry` table
- No duplicate credentials across businesses

### 2. **Shared Device Model**
- Multiple businesses can use the same R710 device
- Each business gets its own WLAN on the shared device
- Sessions are shared efficiently across businesses using the same device

### 3. **Admin-Managed Device Registry**
- Only admins can register/update R710 devices
- Admins manage global device pool (IP addresses + credentials)
- Credential updates propagate to all businesses using that device

## Database Schema

### R710DeviceRegistry (Global Device Pool)
```prisma
model R710DeviceRegistry {
  id                       String @id @default(uuid())
  ipAddress                String @unique          // Unique per device
  adminUsername            String
  encryptedAdminPassword   String                  // AES-256 encrypted
  firmwareVersion          String?
  model                    String @default("R710")
  description              String?                 // Admin notes
  isActive                 Boolean @default(true)
  lastHealthCheck          DateTime?
  connectionStatus         R710ConnectionStatus
  createdBy                String                  // Admin who registered
  createdAt                DateTime
  updatedAt                DateTime
}
```

**Purpose**: Central registry of all R710 devices
**Access**: Admin-only
**Uniqueness**: One record per IP address

### R710BusinessIntegrations (Business-to-Device Links)
```prisma
model R710BusinessIntegrations {
  id               String @id
  businessId       String
  deviceRegistryId String                         // References R710DeviceRegistry
  isActive         Boolean @default(true)
  createdAt        DateTime
  updatedAt        DateTime

  @@unique([businessId, deviceRegistryId])        // Business can use device once
}
```

**Purpose**: Links businesses to devices they use
**Access**: Business users + Admins
**Uniqueness**: Business can select each device only once

### R710Wlans (Business-Specific WLANs)
```prisma
model R710Wlans {
  id                String @id
  businessId        String
  deviceRegistryId  String                         // Which device hosts this WLAN
  wlanId            String                         // ID from R710 API
  guestServiceId    String
  ssid              String                         // "BusinessName Guest WiFi"
  ...

  @@unique([deviceRegistryId, wlanId])            // Each WLAN unique to device
}
```

**Purpose**: Business-specific WLANs on shared devices
**Access**: Business users + Admins

## User Workflows

### Admin Workflow: Register R710 Device

```
1. Admin navigates to: /admin/r710/devices
2. Admin clicks "Register New Device"
3. Admin enters:
   - IP Address: 192.168.0.108
   - Admin Username: admin
   - Admin Password: ••••••••
   - Description: "Main Office R710"
4. System validates:
   ✓ IP address is unique
   ✓ Can connect to device
   ✓ Firmware version is 200.15.6.12.304
5. System encrypts password and saves to r710_device_registry
6. Device appears in global device pool
```

### Business Workflow: Create WiFi Integration

```
1. Business user navigates to: /[business-type]/wifi-portal/setup
2. User sees "Select R710 Device" dropdown:
   - 192.168.0.108 - Main Office R710 (CONNECTED)
   - 192.168.0.109 - Branch Office R710 (CONNECTED)
3. User selects existing device (NO credential entry!)
4. System automatically:
   - Retrieves credentials from device registry
   - Creates WLAN for this business: "BusinessName Guest WiFi"
   - Creates business-specific token configuration
   - Creates R710 expense account for token sales
5. Integration complete - business can now sell WiFi tokens
```

### Admin Workflow: Update Device Credentials

```
1. Admin navigates to: /admin/r710/devices
2. Admin selects device: 192.168.0.108
3. Admin clicks "Update Credentials"
4. Admin enters new password
5. System:
   - Invalidates cached session for this IP
   - Updates encrypted password in registry
   - All businesses using this device get new credentials automatically
6. Next API call re-authenticates with new credentials
```

## Session Management

### Simplified Session Pooling

**Before** (incorrect design):
```
Session Key: r710:{IP}:{username}
Problem: Allowed duplicate credentials per IP
```

**After** (correct design):
```
Session Key: r710:{IP}
Benefit: One session per device, shared across all businesses
```

### Example Session Sharing

```
Device: 192.168.0.108 (admin / password123)
├── Session: r710:192.168.0.108 (created once, shared by all)
│
Business Usage:
├── Business A (HXI Eats)      → Reuses session
├── Business B (Hardware Shop) → Reuses session
└── Business C (Grocery Store) → Reuses session

Result: Only ONE authentication to the R710 device, efficient!
```

## Security Benefits

### 1. **No Credential Duplication**
- Credentials stored once in encrypted form
- Businesses never see/store credentials
- Reduces attack surface

### 2. **Centralized Credential Management**
- Password rotation updates all businesses instantly
- Audit trail shows who registered/modified devices
- Admin can disable device for all businesses at once

### 3. **Credential Isolation**
- Businesses cannot modify device credentials
- Businesses cannot see other businesses using same device
- Each business gets isolated WLAN (separate network)

## API Endpoints

### Admin Endpoints (Super Admin Only)

```
POST   /api/admin/r710/devices              Register new device
GET    /api/admin/r710/devices              List all devices
GET    /api/admin/r710/devices/[id]         Get device details
PUT    /api/admin/r710/devices/[id]         Update device (credentials)
DELETE /api/admin/r710/devices/[id]         Remove device
POST   /api/admin/r710/devices/[id]/test    Test connection
```

### Business Endpoints

```
GET    /api/r710/devices/available          List devices available for integration
POST   /api/r710/integration                Create integration (select device)
GET    /api/r710/integration                Get current integration
PUT    /api/r710/integration                Update integration settings
DELETE /api/r710/integration                Remove integration
```

## Migration Path

### From Old Schema to New Schema

```sql
-- 1. Create device registry from existing r710_devices
INSERT INTO r710_device_registry (id, ipAddress, adminUsername, encryptedAdminPassword, ...)
SELECT DISTINCT ON (ipAddress)
  gen_random_uuid(), ipAddress, adminUsername, encryptedAdminPassword, ...
FROM r710_devices
WHERE isActive = true;

-- 2. Create business integrations
INSERT INTO r710_business_integrations (businessId, deviceRegistryId)
SELECT d.businessId, r.id
FROM r710_devices d
JOIN r710_device_registry r ON d.ipAddress = r.ipAddress;

-- 3. Update WLANs to reference registry
UPDATE r710_wlans w
SET deviceRegistryId = r.id
FROM r710_devices d
JOIN r710_device_registry r ON d.ipAddress = r.ipAddress
WHERE w.deviceId = d.id;

-- 4. Drop old r710_devices table
DROP TABLE r710_devices;
```

## Benefits Summary

### ✅ For Admins
- Central device management dashboard
- Easy credential rotation (one place)
- View which businesses use which devices
- Health monitoring for all devices

### ✅ For Businesses
- Simple device selection (dropdown)
- No credential management burden
- Automatic credential updates
- Isolated WLANs for security

### ✅ For System
- Efficient session sharing
- Reduced database storage (no duplicate credentials)
- Simpler session manager code
- Better security audit trail

### ✅ For Developers
- Clear separation of concerns
- Simpler codebase (no credential validation logic)
- Easy to add new devices
- Scalable architecture

## Example Scenarios

### Scenario 1: Three Businesses, One Device

```
Device Registry:
└── 192.168.0.108 (admin / pass123)

Business Integrations:
├── Business A → 192.168.0.108 → WLAN: "HXI-Guest"
├── Business B → 192.168.0.108 → WLAN: "Hardware-Guest"
└── Business C → 192.168.0.108 → WLAN: "Grocery-Guest"

Sessions:
└── r710:192.168.0.108 (shared by A, B, C)

VLAN Count: 3 of 31 used ✓
```

### Scenario 2: One Business, Two Devices

```
Device Registry:
├── 192.168.0.108 (admin / pass123) - Main Office
└── 192.168.0.109 (admin / pass456) - Branch Office

Business Integrations:
├── Business A → 192.168.0.108 → WLAN: "HXI-Main"
└── Business A → 192.168.0.109 → WLAN: "HXI-Branch"

Sessions:
├── r710:192.168.0.108 (Business A - Main Office)
└── r710:192.168.0.109 (Business A - Branch Office)

VLAN Count: 2 of 31 used ✓
```

### Scenario 3: Password Rotation

```
Before:
Device: 192.168.0.108 (admin / oldpassword)
Session: r710:192.168.0.108 (authenticated with oldpassword)

Admin Updates Password:
Device: 192.168.0.108 (admin / newpassword)
System: Invalidates session r710:192.168.0.108

Next API Call from Any Business:
Session Manager: Re-authenticates with newpassword
Session: r710:192.168.0.108 (authenticated with newpassword)
All businesses automatically use new credentials ✓
```

## Conclusion

This architecture provides:
- ✅ **No credential duplication** - One source of truth
- ✅ **Admin-managed devices** - Centralized control
- ✅ **Business device selection** - Simple integration
- ✅ **Efficient session sharing** - One session per device
- ✅ **Automatic credential propagation** - Updates flow to all businesses
- ✅ **Security** - Encrypted credentials, isolated WLANs
- ✅ **Scalability** - Clean separation of concerns

Perfect for enterprise multi-tenant WiFi portal management!
