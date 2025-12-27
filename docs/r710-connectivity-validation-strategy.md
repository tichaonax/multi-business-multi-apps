# R710 Connectivity Validation Strategy

## Problem Statement

When database backups are restored across machines or sync services run between systems, the device registry may contain R710 devices that are **not accessible from the current system**.

### Example Scenario

**Machine A (Main Office - 192.168.0.x network):**
- R710 Device: 192.168.0.108 ✓ Accessible
- R710 Device: 192.168.0.109 ✓ Accessible

**Database Backup/Sync → Machine B (Branch Office - 10.0.0.x network):**
- R710 Device: 192.168.0.108 ❌ NOT Accessible (on Machine A's network)
- R710 Device: 192.168.0.109 ❌ NOT Accessible (on Machine A's network)
- R710 Device: 10.0.0.50 ✓ Accessible (local to Machine B)

**Problem:** If dropdown shows all devices, businesses will select unreachable devices → integration fails.

## Solution Architecture

### 1. Background Health Check Service

**Purpose:** Continuously monitor connectivity to all registered R710 devices

**Implementation:**
```typescript
// src/services/r710-health-monitor.ts
class R710HealthMonitor {
  private checkInterval = 5 * 60 * 1000; // 5 minutes

  async checkAllDevices() {
    const devices = await prisma.r710DeviceRegistry.findMany({
      where: { isActive: true }
    });

    for (const device of devices) {
      const status = await this.testDeviceConnectivity(device);

      await prisma.r710DeviceRegistry.update({
        where: { id: device.id },
        data: {
          connectionStatus: status.online ? 'CONNECTED' : 'DISCONNECTED',
          lastHealthCheck: new Date(),
          firmwareVersion: status.firmwareVersion || device.firmwareVersion
        }
      });
    }
  }

  async testDeviceConnectivity(device): Promise<{
    online: boolean;
    firmwareVersion?: string;
    error?: string;
  }> {
    try {
      const service = new RuckusR710ApiService({
        ipAddress: device.ipAddress,
        adminUsername: device.adminUsername,
        adminPassword: decrypt(device.encryptedAdminPassword)
      });

      const connectionTest = await service.testConnection();
      if (!connectionTest.online) {
        return { online: false, error: connectionTest.error };
      }

      const systemInfo = await service.getSystemInfo();
      return {
        online: true,
        firmwareVersion: systemInfo?.firmwareVersion
      };
    } catch (error) {
      return { online: false, error: error.message };
    }
  }
}
```

**Cron Job:**
```typescript
// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const monitor = new R710HealthMonitor();
  await monitor.checkAllDevices();
});
```

### 2. API Endpoint for Available Devices

**Endpoint:** `GET /api/r710/devices/available`

**Purpose:** Return ONLY devices that are currently accessible

**Implementation:**
```typescript
// src/app/api/r710/devices/available/route.ts
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get devices that have been checked recently and are connected
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const availableDevices = await prisma.r710DeviceRegistry.findMany({
    where: {
      isActive: true,
      connectionStatus: 'CONNECTED',
      lastHealthCheck: {
        gte: fiveMinutesAgo  // ✅ Only devices checked in last 5 minutes
      }
    },
    select: {
      id: true,
      ipAddress: true,
      description: true,
      model: true,
      firmwareVersion: true,
      connectionStatus: true,
      lastHealthCheck: true,
      _count: {
        select: {
          r710_business_integrations: true  // How many businesses using it
        }
      }
    },
    orderBy: {
      ipAddress: 'asc'
    }
  });

  return NextResponse.json({
    devices: availableDevices,
    lastUpdated: new Date(),
    note: 'Only showing devices accessible from this system'
  });
}
```

### 3. Real-Time Connectivity Test (Optional Enhancement)

**For critical integrations, test connectivity in real-time when dropdown loads:**

```typescript
// src/app/api/r710/devices/available/route.ts (enhanced version)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testRealTime = searchParams.get('testRealTime') === 'true';

  if (testRealTime) {
    // Real-time connectivity test (slower but more accurate)
    const devices = await prisma.r710DeviceRegistry.findMany({
      where: { isActive: true }
    });

    const availableDevices = [];

    for (const device of devices) {
      const service = new RuckusR710ApiService({
        ipAddress: device.ipAddress,
        adminUsername: device.adminUsername,
        adminPassword: decrypt(device.encryptedAdminPassword),
        timeout: 5000  // 5 second timeout
      });

      const result = await service.testConnection();

      if (result.online) {
        availableDevices.push({
          ...device,
          connectionStatus: 'CONNECTED',
          testedAt: new Date()
        });
      }
    }

    return NextResponse.json({
      devices: availableDevices,
      testedInRealTime: true,
      note: 'Devices tested for connectivity in real-time'
    });
  }

  // Default: Use cached health check results (faster)
  // ... (previous implementation)
}
```

### 4. Frontend Dropdown Component

**Smart dropdown that only shows accessible devices:**

```tsx
// src/components/r710/DeviceSelector.tsx
'use client';

import { useEffect, useState } from 'react';

interface AvailableDevice {
  id: string;
  ipAddress: string;
  description: string;
  connectionStatus: string;
  lastHealthCheck: string;
  _count: { r710_business_integrations: number };
}

export function R710DeviceSelector() {
  const [devices, setDevices] = useState<AvailableDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadAvailableDevices();
  }, []);

  async function loadAvailableDevices() {
    setLoading(true);
    try {
      const response = await fetch('/api/r710/devices/available');
      const data = await response.json();

      setDevices(data.devices || []);
      setLastUpdated(new Date(data.lastUpdated));
    } catch (error) {
      console.error('Failed to load available devices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function testRealTime() {
    setLoading(true);
    try {
      const response = await fetch('/api/r710/devices/available?testRealTime=true');
      const data = await response.json();

      setDevices(data.devices || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to test devices:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading available R710 devices...</div>;
  }

  if (devices.length === 0) {
    return (
      <div className="p-4 border rounded bg-yellow-50">
        <p className="font-semibold">No R710 devices available</p>
        <p className="text-sm text-gray-600 mt-2">
          No R710 devices are currently accessible from this system.
          This could be because:
        </p>
        <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc">
          <li>No devices have been registered yet (contact admin)</li>
          <li>Devices are on a different network (check network connectivity)</li>
          <li>Devices are offline or unreachable</li>
        </ul>
        <button
          onClick={testRealTime}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Test Connectivity Now
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium">
          Select R710 Device
        </label>
        <button
          onClick={testRealTime}
          className="text-xs text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <select className="w-full border rounded p-2">
        <option value="">-- Select Device --</option>
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.ipAddress} - {device.description || 'Unnamed Device'}
            {device._count.r710_business_integrations > 0 &&
              ` (Used by ${device._count.r710_business_integrations} business${device._count.r710_business_integrations > 1 ? 'es' : ''})`
            }
          </option>
        ))}
      </select>

      {lastUpdated && (
        <p className="text-xs text-gray-500 mt-1">
          Last checked: {lastUpdated.toLocaleString()}
        </p>
      )}

      <p className="text-xs text-gray-600 mt-2">
        ℹ️ Only showing devices accessible from this system
      </p>
    </div>
  );
}
```

### 5. Admin Device Management

**Admin can see ALL devices with status indicators:**

```tsx
// src/components/admin/R710DeviceList.tsx
export function R710DeviceList() {
  return (
    <table>
      <thead>
        <tr>
          <th>IP Address</th>
          <th>Description</th>
          <th>Status</th>
          <th>Last Check</th>
          <th>Businesses</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {devices.map((device) => (
          <tr key={device.id}>
            <td>{device.ipAddress}</td>
            <td>{device.description}</td>
            <td>
              <StatusBadge
                status={device.connectionStatus}
                lastCheck={device.lastHealthCheck}
              />
            </td>
            <td>{formatTime(device.lastHealthCheck)}</td>
            <td>{device._count.r710_business_integrations}</td>
            <td>
              <button onClick={() => testDevice(device.id)}>
                Test Now
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({ status, lastCheck }) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const isStale = new Date(lastCheck) < fiveMinutesAgo;

  if (status === 'CONNECTED' && !isStale) {
    return <span className="badge badge-green">✓ Connected</span>;
  }

  if (status === 'CONNECTED' && isStale) {
    return <span className="badge badge-yellow">⚠ Unknown (Check Stale)</span>;
  }

  return <span className="badge badge-red">✗ Disconnected</span>;
}
```

## Database Schema Enhancement

```prisma
model R710DeviceRegistry {
  id                     String                   @id @default(uuid())
  ipAddress              String                   @unique
  adminUsername          String
  encryptedAdminPassword String
  firmwareVersion        String?
  model                  String                   @default("R710")
  description            String?
  isActive               Boolean                  @default(true)

  // ✅ Connectivity tracking fields
  lastHealthCheck        DateTime?                // Last time connectivity was tested
  connectionStatus       R710ConnectionStatus     @default(DISCONNECTED)
  lastConnectedAt        DateTime?                // Last successful connection
  lastError              String?                  // Last error message if disconnected

  createdBy              String
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt

  creator                Users                    @relation(fields: [createdBy], references: [id])
  r710_business_integrations R710BusinessIntegrations[]
  r710_wlans             R710Wlans[]

  @@index([connectionStatus])
  @@index([lastHealthCheck])
  @@map("r710_device_registry")
}
```

## Workflow Updates

### Admin Registers New Device

```
1. Admin enters IP, username, password
2. System tests connectivity IMMEDIATELY
   ├─ ✓ Success → Save with connectionStatus: CONNECTED
   └─ ✗ Failure → Show error, don't save
3. Device appears in global registry
4. Background service monitors it every 5 minutes
```

### Business Creates Integration

```
1. Business navigates to WiFi setup
2. System calls: GET /api/r710/devices/available
3. API returns ONLY devices where:
   - isActive = true
   - connectionStatus = CONNECTED
   - lastHealthCheck < 5 minutes ago
4. Dropdown populated with accessible devices only
5. If no devices available:
   - Show helpful message
   - Offer "Test Connectivity Now" button
   - Suggest contacting admin
```

### Background Health Monitor

```
Every 5 minutes:
1. Fetch all active devices from registry
2. Test connectivity to each device (parallel, with timeout)
3. Update connectionStatus and lastHealthCheck
4. Log any status changes (CONNECTED → DISCONNECTED or vice versa)
5. Optionally: Alert admin if critical device goes offline
```

## Error Scenarios Handled

### Scenario 1: All Devices Unreachable
```
User Action: Create WiFi Integration
System Response:
  - Dropdown shows: "No devices available"
  - Message: "No R710 devices are accessible from this system"
  - Actions:
    ✓ Test Connectivity Now button
    ✓ Contact Admin link
    ✓ Help documentation
```

### Scenario 2: Device Goes Offline After Integration Created
```
Background Monitor: Detects device offline
System Actions:
  1. Update connectionStatus → DISCONNECTED
  2. Log error with timestamp
  3. Keep integration active (business data preserved)
  4. Show warning in business WiFi dashboard
  5. Disable token generation until device reconnects
```

### Scenario 3: Network Change (Device IP Changes)
```
Admin Action: Update device IP in registry
System Actions:
  1. Test connectivity to new IP
  2. Update if successful
  3. Invalidate old session
  4. Background monitor picks up new IP
  5. Businesses continue working (device ID unchanged)
```

## Benefits

✅ **Multi-Machine Safe**: Works correctly with database sync/backup
✅ **Network Aware**: Only shows devices reachable from current system
✅ **Real-Time Validation**: Optional real-time connectivity testing
✅ **Cached Performance**: Uses recent health checks for fast dropdown loading
✅ **Graceful Degradation**: Clear messaging when no devices available
✅ **Admin Visibility**: Admins see ALL devices with status indicators
✅ **Automatic Recovery**: Devices automatically reconnect when network restored

## Implementation Priority

**Phase 1 (Critical):**
1. ✅ Add connectivity fields to schema
2. ✅ Test connectivity during device registration
3. ✅ Filter dropdown to CONNECTED devices only

**Phase 2 (Important):**
4. Background health monitor service
5. API endpoint for available devices
6. Frontend dropdown component

**Phase 3 (Enhancement):**
7. Real-time connectivity testing
8. Admin dashboard with status indicators
9. Alerts for offline devices
