# WiFi Portal v3.4 Enhancement - Implementation Plan

## Executive Summary
The ESP32 Portal API v3.4 introduces significant device tracking capabilities. This plan outlines database changes, API updates, and UI enhancements needed to leverage these new features.

---

## 🔍 Impact Analysis

### New API Capabilities (v3.4)
1. **Device Information Capture**
   - Hostname detection (e.g., "iPhone-ABC123")
   - Device type classification (iOS, Android, Windows, Linux, macOS)
   - First seen / Last seen timestamps
   - Real-time online status per device

2. **Enhanced Token Info Response**
   ```json
   {
     "hostname": "iPhone-ABC123",
     "device_type": "Apple iOS",
     "first_seen": 1703123456,
     "last_seen": 1703123500,
     "devices": [
       {
         "mac": "AA:BB:CC:DD:EE:FF",
         "online": true,
         "current_ip": "192.168.4.100"
       }
     ]
   }
   ```

3. **Batch Token Info Endpoint**
   - `/api/token/batch_info?tokens=ABC123,DEF456,...` (up to 50)
   - Enables efficient bulk sync of visible tokens

4. **Enhanced Extend Endpoint**
   - Now requires `additional_duration` parameter
   - Allows specifying exact extension time

---

## 📊 Database Schema Changes

### Migration: `add_device_tracking_to_wifi_tokens`

```sql
-- Add device tracking columns to wifi_tokens table
ALTER TABLE wifi_tokens
ADD COLUMN hostname VARCHAR(255),
ADD COLUMN device_type VARCHAR(100),
ADD COLUMN first_seen TIMESTAMP,
ADD COLUMN last_seen TIMESTAMP,
ADD COLUMN device_count INTEGER DEFAULT 0,
ADD COLUMN primary_mac VARCHAR(17);

-- Create index for device lookups
CREATE INDEX idx_wifi_tokens_primary_mac ON wifi_tokens(primary_mac);
CREATE INDEX idx_wifi_tokens_hostname ON wifi_tokens(hostname);
CREATE INDEX idx_wifi_tokens_last_seen ON wifi_tokens(last_seen DESC);
```

### New Table: `wifi_token_devices`

```sql
CREATE TABLE wifi_token_devices (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  wifi_token_id VARCHAR(36) NOT NULL REFERENCES wifi_tokens(id) ON DELETE CASCADE,
  mac_address VARCHAR(17) NOT NULL,
  is_online BOOLEAN DEFAULT false,
  current_ip VARCHAR(15),
  first_seen TIMESTAMP NOT NULL,
  last_seen TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(wifi_token_id, mac_address)
);

CREATE INDEX idx_wifi_token_devices_token_id ON wifi_token_devices(wifi_token_id);
CREATE INDEX idx_wifi_token_devices_mac ON wifi_token_devices(mac_address);
CREATE INDEX idx_wifi_token_devices_online ON wifi_token_devices(is_online);
```

### Updated Prisma Schema

```prisma
model WifiTokens {
  // ... existing fields ...

  // New device tracking fields
  hostname      String?  @db.VarChar(255)
  deviceType    String?  @db.VarChar(100) @map("device_type")
  firstSeen     DateTime? @map("first_seen")
  lastSeen      DateTime? @map("last_seen")
  deviceCount   Int      @default(0) @map("device_count")
  primaryMac    String?  @db.VarChar(17) @map("primary_mac")

  // Relations
  devices       WifiTokenDevices[]

  @@index([primaryMac], map: "idx_wifi_tokens_primary_mac")
  @@index([hostname], map: "idx_wifi_tokens_hostname")
  @@index([lastSeen], map: "idx_wifi_tokens_last_seen")
}

model WifiTokenDevices {
  id           String    @id @default(uuid())
  wifiTokenId  String    @map("wifi_token_id")
  macAddress   String    @map("mac_address") @db.VarChar(17)
  isOnline     Boolean   @default(false) @map("is_online")
  currentIp    String?   @map("current_ip") @db.VarChar(15)
  firstSeen    DateTime  @map("first_seen")
  lastSeen     DateTime  @map("last_seen")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  wifiToken    WifiTokens @relation(fields: [wifiTokenId], references: [id], onDelete: Cascade)

  @@unique([wifiTokenId, macAddress])
  @@index([wifiTokenId], map: "idx_wifi_token_devices_token_id")
  @@index([macAddress], map: "idx_wifi_token_devices_mac")
  @@index([isOnline], map: "idx_wifi_token_devices_online")
  @@map("wifi_token_devices")
}
```

---

## 🔧 API Client Updates

### File: `src/lib/wifi-portal/api-client.ts`

#### 1. Update Interfaces

```typescript
export interface TokenInfoResponse extends TokenResponse {
  // ... existing fields ...

  // New device tracking fields (v3.4)
  hostname?: string;              // Device hostname
  deviceType?: string;            // Device OS/type
  firstSeen?: number;             // Unix timestamp
  lastSeen?: number;              // Unix timestamp
  devices?: DeviceInfo[];         // Connected devices array
}

export interface DeviceInfo {
  mac: string;                    // MAC address
  online: boolean;                // Currently connected
  currentIp?: string;             // Current IP if online
}

export interface BatchTokenInfoParams {
  tokens: string[];               // Array of token codes (max 50)
}

export interface BatchTokenInfoResponse {
  success: boolean;
  tokens: TokenInfoResponse[];   // Array of token info
  error?: string;
}
```

#### 2. New Method: `batchGetTokenInfo()`

```typescript
/**
 * Get information for multiple tokens in a single request
 *
 * @param params Batch query parameters
 * @returns Array of token information
 * @throws PortalAPIError, PortalNetworkError, PortalValidationError
 */
async batchGetTokenInfo(params: BatchTokenInfoParams): Promise<BatchTokenInfoResponse> {
  if (!params.tokens || params.tokens.length === 0) {
    throw new PortalValidationError('At least one token is required', 'tokens');
  }

  if (params.tokens.length > 50) {
    throw new PortalValidationError('Maximum 50 tokens per batch request', 'tokens');
  }

  // Validate all tokens
  params.tokens.forEach(token => this.validateToken(token));

  const tokensParam = params.tokens.join(',');
  const url = `/api/token/batch_info?api_key=${encodeURIComponent(this.config.apiKey)}&tokens=${encodeURIComponent(tokensParam)}`;

  return this.request<BatchTokenInfoResponse>('GET', url);
}
```

#### 3. ✅ ExtendToken Already Correct

**Note:** The extend token implementation is already correct. It only requires `token` parameter and resets to original duration. No changes needed.

```typescript
export interface ExtendTokenParams {
  token: string;                 // Token to reset
}

async extendToken(params: ExtendTokenParams): Promise<TokenResponse> {
  this.validateToken(params.token);

  const formData = new URLSearchParams({
    api_key: this.config.apiKey,
    token: params.token,
  });

  return this.request<TokenResponse>('POST', '/api/token/extend', formData);
}
```

#### 4. Update MAC Filtering Methods

```typescript
// Update blacklist/whitelist to accept single MAC instead of token
export interface MacFilterParams {
  mac: string;                    // MAC address to filter
  reason?: string;                // Blacklist reason (max 31 chars)
  note?: string;                  // Whitelist note (max 31 chars)
}

async blacklistMac(params: MacFilterParams): Promise<MacFilterResponse> {
  if (!params.mac || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(params.mac)) {
    throw new PortalValidationError('Invalid MAC address format', 'mac');
  }

  const formData = new URLSearchParams({
    api_key: this.config.apiKey,
    mac: params.mac.toUpperCase(),
  });

  return this.request<MacFilterResponse>('POST', '/api/mac/blacklist', formData);
}

async whitelistMac(params: MacFilterParams): Promise<MacFilterResponse> {
  if (!params.mac || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(params.mac)) {
    throw new PortalValidationError('Invalid MAC address format', 'mac');
  }

  const formData = new URLSearchParams({
    api_key: this.config.apiKey,
    mac: params.mac.toUpperCase(),
  });

  return this.request<MacFilterResponse>('POST', '/api/mac/whitelist', formData);
}
```

---

## 🌐 Backend API Updates

### 1. New Endpoint: `POST /api/wifi-portal/tokens/sync-batch`

**Purpose:** Sync multiple tokens from portal in one request

```typescript
// File: src/app/api/wifi-portal/tokens/sync-batch/route.ts

export async function POST(request: NextRequest) {
  // 1. Get token IDs from request body (max 50)
  // 2. Fetch tokens from database
  // 3. Call portal batch_info API
  // 4. Update database with device info
  // 5. Create/update wifi_token_devices records
  // 6. Return synced tokens
}
```

### 2. Update: `POST /api/wifi-portal/tokens/[id]/sync`

**Enhancement:** Store device information

```typescript
// Update to save:
// - hostname
// - deviceType
// - firstSeen
// - lastSeen
// - deviceCount
// - primaryMac
// - devices[] to wifi_token_devices table
```

### 3. New Endpoint: `GET /api/wifi-portal/tokens/[id]/devices`

**Purpose:** Get real-time device status for a token

```typescript
// File: src/app/api/wifi-portal/tokens/[id]/devices/route.ts

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // 1. Fetch token from database
  // 2. Call portal getTokenInfo
  // 3. Return devices with online status
}
```

### 4. Update MAC Filtering Endpoints

Update to accept individual MAC addresses instead of token-based filtering:

- `POST /api/wifi-portal/integration/mac/blacklist` - Accept `mac` parameter
- `POST /api/wifi-portal/integration/mac/whitelist` - Accept `mac` parameter

---

## 🎨 UI Enhancements

### Tab 1: Database Ledger (Enhanced)

**New Features:**

1. **Auto-Sync on Page Load**
   ```typescript
   useEffect(() => {
     // Sync all visible tokens using batch API
     if (filteredTokens.length > 0) {
       const tokenIds = filteredTokens.slice(0, 50).map(t => t.id);
       handleBatchSync(tokenIds);
     }
   }, [activeTab, currentPage]);
   ```

2. **Device Information Display**
   - Show hostname badge (e.g., 🖥️ iPhone-ABC123)
   - Show device type icon (📱 iOS, 💻 Windows, 🤖 Android)
   - Display "Last seen: 5 minutes ago"
   - Show device count badge (2/2 devices)

3. **Online Status Indicators**
   - 🟢 Online (1 device)
   - 🔴 Offline
   - 🟡 Partially online (1/2 devices)

4. **Enhanced Table Columns**
   ```typescript
   <th>Token</th>
   <th>Package</th>
   <th>Status</th>
   <th>Device Info</th>  {/* NEW */}
   <th>Online Status</th> {/* NEW */}
   <th>Created</th>
   <th>Expires</th>
   <th>Usage</th>
   <th>Actions</th>
   ```

5. **Expandable Row Details**
   - Click token to expand
   - Show all connected devices
   - Display MAC addresses with online status
   - Show current IP addresses for online devices

### Tab 2: Portal Tokens (Enhanced)

**New Features:**

1. **Device Details Column**
   ```typescript
   <td>
     <div className="text-xs">
       <div className="font-semibold">{token.hostname || 'Unknown Device'}</div>
       <div className="text-gray-500">{token.deviceType || 'N/A'}</div>
       {token.devices?.map(device => (
         <div key={device.mac} className="mt-1">
           <span className={device.online ? 'text-green-600' : 'text-gray-400'}>
             {device.online ? '🟢' : '⚪'} {device.mac}
           </span>
           {device.currentIp && <span className="ml-2">({device.currentIp})</span>}
         </div>
       ))}
     </div>
   </td>
   ```

2. **Quick Actions per Device**
   - 🚫 Blacklist this device (MAC)
   - ⭐ Whitelist this device (MAC)
   - 🔄 Refresh device status (on-demand)

### Tab 3: MAC Filters (Enhanced)

**New Features:**

1. **Manual MAC Entry Form**
   ```typescript
   <div className="bg-white p-4 rounded-lg border mb-6">
     <h3>Add MAC Address Manually</h3>
     <input
       type="text"
       placeholder="XX:XX:XX:XX:XX:XX"
       pattern="^([0-9A-F]{2}:){5}[0-9A-F]{2}$"
     />
     <button onClick={handleBlacklist}>Blacklist</button>
     <button onClick={handleWhitelist}>Whitelist</button>
   </div>
   ```

2. **MAC Lookup/Interrogation**
   ```typescript
   <div className="bg-blue-50 p-4 rounded-lg mb-6">
     <h3>🔍 MAC Address Lookup</h3>
     <input placeholder="Enter MAC address to interrogate" />
     <button onClick={handleMacLookup}>Search</button>

     {macInfo && (
       <div className="mt-4">
         <p>Found in Token: {macInfo.token}</p>
         <p>Device: {macInfo.hostname}</p>
         <p>Type: {macInfo.deviceType}</p>
         <p>Status: {macInfo.online ? '🟢 Online' : '⚪ Offline'}</p>
         <p>Last Seen: {formatDateTime(macInfo.lastSeen)}</p>
       </div>
     )}
   </div>
   ```

3. **Enhanced MAC Table**
   - Show associated token code
   - Display device hostname if known
   - Show last seen timestamp
   - Quick action: "View Token Details"

4. **Bulk Operations**
   - Select multiple MACs
   - Move blacklist → whitelist (or vice versa)
   - Export to CSV

### New Tab 4: Device Monitor (NEW)

**Purpose:** Real-time device tracking across all tokens

```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* Summary Cards */}
  <div className="bg-green-50 p-4 rounded-lg">
    <h3>🟢 Online Devices</h3>
    <p className="text-3xl font-bold">{onlineCount}</p>
  </div>

  <div className="bg-blue-50 p-4 rounded-lg">
    <h3>📱 Total Devices</h3>
    <p className="text-3xl font-bold">{totalDevices}</p>
  </div>

  <div className="bg-purple-50 p-4 rounded-lg">
    <h3>🔍 Unique Devices</h3>
    <p className="text-3xl font-bold">{uniqueDevices}</p>
  </div>
</div>

{/* Device List */}
<table>
  <thead>
    <tr>
      <th>Device</th>
      <th>Type</th>
      <th>MAC Address</th>
      <th>Token</th>
      <th>Status</th>
      <th>IP Address</th>
      <th>Last Seen</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {devices.map(device => (
      <tr>
        <td>{device.hostname}</td>
        <td>{getDeviceIcon(device.type)}</td>
        <td><code>{device.mac}</code></td>
        <td><code>{device.token}</code></td>
        <td>{device.online ? '🟢 Online' : '⚪ Offline'}</td>
        <td>{device.currentIp || 'N/A'}</td>
        <td>{formatRelativeTime(device.lastSeen)}</td>
        <td>
          <button onClick={() => blacklistMac(device.mac)}>🚫</button>
          <button onClick={() => whitelistMac(device.mac)}>⭐</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 🔄 Sync Strategy

### Automatic Sync (Database Ledger Tab)

```typescript
// Sync visible tokens when tab loads or page changes
const handleAutoSync = async () => {
  if (filteredTokens.length === 0) return;

  // Get token IDs for current page (max 50)
  const tokenIds = filteredTokens
    .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    .map(t => t.id);

  if (tokenIds.length === 0) return;

  setSyncing(true);
  try {
    const response = await fetch('/api/wifi-portal/tokens/sync-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIds }),
    });

    const data = await response.json();

    if (data.success) {
      // Update tokens in state with fresh data
      setTokens(prevTokens =>
        prevTokens.map(token => {
          const synced = data.tokens.find(t => t.id === token.id);
          return synced || token;
        })
      );

      setSuccessMessage(`Synced ${data.tokens.length} token(s)`);
    }
  } catch (error) {
    console.error('Auto-sync error:', error);
  } finally {
    setSyncing(false);
  }
};

useEffect(() => {
  if (activeTab === 'ledger' && autoSyncEnabled) {
    handleAutoSync();
  }
}, [activeTab, currentPage, filteredTokens]);
```

### On-Demand Sync

- Individual token sync button (existing)
- Batch sync selected tokens (new)
- Auto-refresh toggle (new)

---

## 🎯 New Functionality Opportunities

### 1. Abuse Detection Dashboard

Track devices that:
- Use multiple tokens
- Exceed bandwidth limits
- Share tokens across different device types
- Have suspicious hostname patterns

### 2. Device Type Analytics

Charts showing:
- iOS vs Android vs Windows usage
- Peak device connection times
- Average session duration by device type
- Bandwidth consumption by device type

### 3. Smart Alerts

Notify when:
- Same MAC appears on multiple tokens
- Device switches tokens frequently
- Token is shared across incompatible device types
- Blacklisted MAC attempts connection

### 4. Customer Insights

- Most common device types
- Average devices per token
- Connection patterns (time of day)
- Repeat customer identification (by MAC)

### 5. Extend/Reset Token UI Enhancement

Add clear "Reset Token" action with confirmation:
```typescript
<button
  onClick={async () => {
    const confirmed = await confirm({
      title: 'Reset Token',
      description: `Reset ${token.token} to its original duration (${token.durationMinutes} minutes)? This will reset usage counters and timer.`,
      confirmText: 'Reset Token',
    });

    if (confirmed) {
      await handleExtendToken(token);
    }
  }}
  className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
>
  🔄 Reset
</button>
```

**Behavior:** Resets token to original duration/bandwidth limits, zeros out usage counters.

---

## 📋 Implementation Checklist

### Phase 1: Database & API Foundation
- [ ] Create Prisma migration for device tracking columns
- [ ] Create wifi_token_devices table migration
- [ ] Update Prisma schema
- [ ] Run migrations
- [ ] Update API client interfaces
- [ ] Add batchGetTokenInfo method
- [ ] Update extendToken method
- [ ] Update MAC filtering methods

### Phase 2: Backend APIs
- [ ] Create POST /api/wifi-portal/tokens/sync-batch
- [ ] Update POST /api/wifi-portal/tokens/[id]/sync
- [ ] Create GET /api/wifi-portal/tokens/[id]/devices
- [ ] Update MAC filtering endpoints
- [ ] Add MAC lookup endpoint

### Phase 3: UI Updates - Database Ledger
- [ ] Add auto-sync on page load
- [ ] Display device information badges
- [ ] Add online status indicators
- [ ] Create expandable row component
- [ ] Add batch sync functionality
- [ ] Implement pagination-aware syncing

### Phase 4: UI Updates - Portal Tokens
- [ ] Add device details column
- [ ] Display hostname and device type
- [ ] Show per-device online status
- [ ] Add quick MAC filtering actions

### Phase 5: UI Updates - MAC Filters
- [ ] Add manual MAC entry form
- [ ] Create MAC lookup/interrogation feature
- [ ] Enhance MAC table with device info
- [ ] Add bulk operations

### Phase 6: New Features
- [ ] Create Device Monitor tab
- [ ] Build abuse detection dashboard
- [ ] Add device type analytics
- [ ] Implement smart alerts
- [ ] Create extend token UI with duration selector

### Phase 7: Testing & Optimization
- [ ] Test batch sync with 50 tokens
- [ ] Test pagination sync
- [ ] Test device status updates
- [ ] Performance testing with large datasets
- [ ] Error handling validation

---

## 🚨 Breaking Changes

1. **MAC Filtering** endpoints changed from token-based to MAC-based
   - Old: POST /api/mac/blacklist with `token` parameter
   - New: POST /api/mac/blacklist with `mac` parameter
   - Update all existing MAC filtering calls

**Note:** ExtendToken API has NOT changed - it already works correctly (resets token to original duration).

---

## 📊 Estimated Timeline

- **Phase 1:** 2-3 hours (Database & API client)
- **Phase 2:** 3-4 hours (Backend APIs)
- **Phase 3:** 4-5 hours (Database Ledger UI)
- **Phase 4:** 2-3 hours (Portal Tokens UI)
- **Phase 5:** 3-4 hours (MAC Filters UI)
- **Phase 6:** 6-8 hours (New Features)
- **Phase 7:** 2-3 hours (Testing)

**Total:** ~22-30 hours

---

## 🎯 Quick Wins (Implement First)

1. **Batch Sync** - Immediate performance improvement
2. **Device Info Display** - High value, low effort
3. **Manual MAC Entry** - Frequently requested
4. **Online Status Indicators** - Visual impact

---

## ⚠️ Risks & Considerations

1. **Performance:** Batch sync of 50 tokens may be slow
   - Mitigation: Show progress indicator, allow cancellation

2. **Data Freshness:** Device status may become stale
   - Mitigation: Add "Last synced" timestamp, auto-refresh option

3. **Storage:** New device table could grow large
   - Mitigation: Add cleanup job for old device records

4. **API Rate Limits:** Batch requests may hit rate limits
   - Mitigation: Implement exponential backoff, queue system

---

## 🔐 Security Considerations

1. **MAC Address Privacy:** MACs are personally identifiable
   - Consider hashing or anonymizing old records

2. **Device Tracking:** Some jurisdictions require consent
   - Add privacy notice to portal

3. **Admin Access:** Device info is sensitive
   - Ensure proper permission checks on all endpoints

---

Ready for approval! Please review and let me know if you'd like me to:
1. Proceed with implementation
2. Adjust priorities
3. Add/remove features
4. Clarify any sections
