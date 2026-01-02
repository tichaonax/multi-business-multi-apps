# Backup & Restore System Revamp v2 - Cross-Device Sync Architecture

**Date:** 2026-01-01
**Version:** 2.0
**Status:** Planning - Awaiting Review

---

## Executive Summary

### The Problem We're Solving

**Two distinct use cases require different backup strategies:**

1. **Cross-Machine Sync/Restore** (Primary Use Case)
   - Device A backup → Device B restore
   - Business data (users, products, orders) must have **identical IDs** across devices
   - Device-specific data (sync state, node IDs, sessions) must **NOT** be restored
   - Use case: Multiple laptops running same business, different users, need synchronized data

2. **Same-Machine Disaster Recovery** (Secondary Use Case)
   - Device A backup → Device A restore
   - **ALL** data including device-specific state must be restored
   - Use case: Complete device restoration after hardware failure or corruption

### Current Problem

The existing backup system treats all tables equally - no distinction between:
- **Business Data** (should sync across devices)
- **Device-Specific Data** (should only restore to same device)

This means restoring a backup from Device A to Device B would:
- ❌ Overwrite Device B's node ID with Device A's node ID
- ❌ Import Device A's sync sessions into Device B
- ❌ Create sync conflicts and data corruption
- ❌ Break device identity and sync topology

### The Solution

**Two-tier backup structure with device metadata:**

```json
{
  "metadata": {
    "version": "2.0",
    "sourceNodeId": "node-abc-123",
    "sourceDeviceId": "device-xyz-789",
    "sourceDeviceName": "Laptop-Finance-001",
    "timestamp": "2026-01-01T12:00:00Z",
    "backupType": "business" | "full-device",
    "businessFilter": {
      "businessId": "optional-single-business-id",
      "includeDemoData": true
    }
  },

  "businessData": {
    // Always included - syncs across devices
    "users": [...],
    "businesses": [...],
    "products": [...],
    // ... all business tables
  },

  "deviceData": {
    // Only included when backupType === 'full-device'
    // Only restored when restoring to SAME device
    "syncSessions": [...],
    "syncNodes": [...],
    "deviceRegistry": [...],
    // ... all device-specific tables
  }
}
```

**Restore behavior:**

```typescript
if (backup.metadata.sourceNodeId === currentNodeId) {
  // Same device - restore everything
  await restoreBusinessData()
  await restoreDeviceData()
} else {
  // Different device - only business data
  await restoreBusinessData()
  await regenerateNodeId()
  await clearSyncState()
}
```

---

## Part 1: Table Classification

### Category A: Business Data (Always Sync Across Devices)

**Purpose:** Core business operations data that must be identical across all devices
**ID Behavior:** Preserve original IDs across devices
**Restore Behavior:** Always restore, regardless of source device

#### A1. Core Business & Users (9 tables)
```
✅ users                    - Same user IDs across all devices
✅ accounts                 - OAuth accounts for users
✅ businesses               - Business entities
✅ businessMemberships      - User roles in businesses
✅ businessAccounts         - Business account balances
✅ businessLocations        - Physical locations
✅ businessBrands           - Brand information
✅ businessCategories       - Product categories
✅ portalIntegrations       - WiFi portal configurations
```

**Why sync:** Users must have same IDs so permissions/roles work identically

---

#### A2. Products & Inventory (11 tables)
```
✅ businessProducts
✅ productVariants
✅ productBarcodes
✅ productImages
✅ productAttributes
✅ businessStockMovements
✅ supplierProducts
✅ businessSuppliers
✅ inventorySubcategories
✅ sku_sequences            - Ensures unique SKU generation
✅ product_price_changes    - Audit trail
```

**Why sync:** Product catalog must be identical for consistent sales/inventory

---

#### A3. Customers & Orders (6 tables)
```
✅ businessCustomers
✅ businessOrders
✅ businessOrderItems
✅ businessTransactions
✅ customerLaybys
✅ customerLaybyPayments
```

**Why sync:** Order history and customer data must be available on all devices

---

#### A4. HR & Payroll (26 tables)
```
✅ employees
✅ employeeContracts
✅ employeeBusinessAssignments
✅ employeeBenefits
✅ employeeAllowances
✅ employeeBonuses
✅ employeeDeductions
✅ employeeLoans
✅ employeeSalaryIncreases
✅ employeeLeaveRequests
✅ employeeLeaveBalance
✅ employeeAttendance
✅ employeeTimeTracking
✅ disciplinaryActions
✅ employeeDeductionPayments
✅ employeeLoanPayments
✅ contractBenefits
✅ contractRenewals
✅ payrollAccounts
✅ payrollPeriods
✅ payrollEntries
✅ payrollEntryBenefits
✅ payrollExports
✅ payrollAdjustments
✅ payrollAccountDeposits
✅ payrollAccountPayments
```

**Why sync:** Employee records and payroll must be consistent

---

#### A5. Expense Management (5 tables)
```
✅ expenseAccounts
✅ expenseAccountDeposits
✅ expenseAccountPayments
✅ expenseDomains
✅ expenseCategories
✅ expenseSubcategories
```

**Why sync:** Expense tracking across all devices

---

#### A6. Projects & Construction (7 tables)
```
✅ projects
✅ projectStages
✅ projectContractors
✅ projectTransactions
✅ constructionProjects
✅ constructionExpenses
✅ stageContractorAssignments
```

**Why sync:** Project data must be available everywhere

---

#### A7. Fleet Management (11 tables)
```
✅ vehicles
✅ vehicleDrivers
✅ vehicleExpenses
✅ vehicleLicenses
✅ driverAuthorizations
✅ vehicleMaintenanceRecords
✅ vehicleMaintenanceServices
✅ vehicleMaintenanceServiceExpenses
✅ vehicleTrips
✅ vehicleReimbursements
```

**Why sync:** Fleet data must be consistent

---

#### A8. Restaurant/Menu (6 tables)
```
✅ menuItems
✅ menuCombos
✅ menuComboItems
✅ menuPromotions
✅ orders
✅ orderItems
```

**Why sync:** Menu must be identical on all POS devices

---

#### A9. WiFi Portal - ESP32 (6 tables)
```
✅ tokenConfigurations      - Token package definitions
✅ wifiTokenDevices         - ESP32 device registrations
✅ wifiTokens               - Generated tokens
✅ wifiTokenSales           - Sales transactions
✅ businessTokenMenuItems   - Menu integration
✅ wiFiUsageAnalytics       - Usage analytics
```

**Why sync:** WiFi token sales and revenue must be tracked across devices

**Note:** `ESP32ConnectedClients` excluded (see Category B - transient data)

---

#### A10. WiFi Portal - R710 (10 tables)
```
✅ r710DeviceRegistry       - Physical R710 devices (business assets)
✅ r710BusinessIntegrations - Which businesses use which devices
✅ r710Wlans                - WLAN configurations
✅ r710TokenConfigs         - Token packages for R710
✅ r710Tokens               - Generated R710 tokens
✅ r710TokenSales           - R710 sales transactions
✅ r710DeviceTokens         - Token-device mappings
✅ r710BusinessTokenMenuItems - Menu integration
✅ r710SyncLogs             - WLAN sync history (business audit trail)
```

**Why sync:** R710 devices are business assets, configurations should be consistent

**Note:** `R710ConnectedClients` excluded (see Category B - transient data)

---

#### A11. Barcode Management (6 tables)
```
✅ networkPrinters          - Network printers (business resources)
✅ barcodeTemplates         - Barcode templates
✅ barcodePrintJobs         - Print job history (audit trail)
✅ barcodeInventoryItems    - Inventory items with barcodes
✅ printJobs                - General print jobs (completed only)
✅ reprintLog               - Reprint audit trail
```

**Why sync:** Barcode templates and audit trails are business data

**Note:** Active print queue excluded - only completed jobs backed up

---

#### A12. Security & Access Control (3 tables)
```
✅ permissions              - Permission definitions
✅ userPermissions          - User-specific permissions
✅ macAclEntry              - WiFi MAC access control list
```

**Why sync:** Access control must be consistent across devices

---

#### A13. Personal Finance (3 tables)
```
✅ fundSources
✅ personalBudgets
✅ personalExpenses
```

**Why sync:** Personal finance tracking for users

---

#### A14. Reference Data (12 tables)
```
✅ systemSettings
✅ emojiLookup
✅ jobTitles
✅ compensationTypes
✅ benefitTypes
✅ idFormatTemplates
✅ driverLicenseTemplates
✅ projectTypes
✅ inventoryDomains
✅ permissionTemplates
✅ seedDataTemplates
✅ receiptSequences
```

**Why sync:** Reference data must be identical

---

#### A15. Misc Business (3 tables)
```
✅ persons
✅ interBusinessLoans
✅ loanTransactions
```

**Why sync:** Business relationship data

---

### Category B: Device-Specific Data (Only for Same-Device Restore)

**Purpose:** Local device state and sync tracking
**ID Behavior:** Device-unique, NOT preserved across devices
**Restore Behavior:** Only restore when sourceNodeId === currentNodeId

#### B1. Sync Infrastructure (8 tables)
```
🔒 syncSessions             - Sync history for THIS device
🔒 fullSyncSessions         - Full sync sessions for THIS device
🔒 syncNodes                - THIS node's identity
🔒 syncMetrics              - Performance metrics for THIS node
🔒 nodeStates               - State of THIS node
🔒 syncEvents               - Sync events on THIS node
🔒 syncConfigurations       - Configuration for THIS node
🔒 offlineQueue             - Pending operations for THIS device
```

**Why device-specific:**
- Each device has unique node ID
- Sync history is device-local
- Restoring Device A's sync state to Device B would corrupt topology

---

#### B2. Device Management (2 tables)
```
🔒 deviceRegistry           - Devices seen by THIS node
🔒 deviceConnectionHistory  - Connection history for THIS device
```

**Why device-specific:**
- Tracks which devices THIS node has seen
- Different devices may see different peer devices

---

#### B3. Network & Monitoring (1 table)
```
🔒 networkPartitions        - Network issues detected by THIS device
```

**Why device-specific:**
- Each device has its own network view
- Network topology differs per device location

---

### Category C: Transient Data (NEVER Backup)

**Purpose:** Temporary runtime state
**Behavior:** Excluded from all backups

```
❌ sessions                  - User auth sessions (regenerated on login)
❌ esp32ConnectedClients     - Currently connected WiFi clients (real-time)
❌ r710ConnectedClients      - Currently connected R710 clients (real-time)
❌ chatRooms                 - Optional feature, low priority
❌ chatMessages              - Optional feature, low priority
❌ chatParticipants          - Optional feature, low priority
```

**Why exclude:**
- Sessions: Regenerated on login
- Connected clients: Real-time transient data, rebuilt from device connections
- Chat: Optional feature, not critical to business operations

---

### Category D: Audit Trail (Business Data - Special Handling)

```
✅ auditLogs                - System audit trail (business data)
✅ conflictResolutions      - Sync conflict resolution history
✅ dataSnapshots            - Historical snapshots
```

**Why sync:** Audit trails are business compliance data, must be preserved

---

## Part 2: Backup Metadata Schema

### Metadata Structure

```typescript
interface BackupMetadata {
  // Version for compatibility checking
  version: string // "2.0"

  // Source device identification
  sourceNodeId: string          // "node-abc-123"
  sourceDeviceId?: string       // "device-xyz-789"
  sourceDeviceName?: string     // "Laptop-Finance-001"
  sourceHostname?: string       // "DESKTOP-ABC123"
  sourcePlatform?: string       // "win32" | "darwin" | "linux"

  // Backup creation metadata
  timestamp: string             // ISO 8601: "2026-01-01T12:00:00.000Z"
  createdBy: string             // User ID who created backup

  // Backup type and scope
  backupType: 'business' | 'full-device'

  // Business filtering
  businessFilter?: {
    businessId?: string         // If single business backup
    includeDemoData: boolean    // Whether demo businesses included
  }

  // Statistics
  stats: {
    totalRecords: number
    totalTables: number
    businessRecords: number
    deviceRecords: number       // Only if full-device backup
    uncompressedSize: number    // Bytes
    compressedSize: number      // Bytes (if compressed)
  }

  // Schema version (for migration compatibility)
  schemaVersion: string         // Prisma schema version/hash

  // Checksums for integrity
  checksums: {
    businessData: string        // SHA-256 hash
    deviceData?: string         // SHA-256 hash (if included)
  }
}
```

### Example Metadata

```json
{
  "version": "2.0",
  "sourceNodeId": "node-laptop-001-abc123",
  "sourceDeviceId": "device-win32-xyz789",
  "sourceDeviceName": "Laptop-Finance-001",
  "sourceHostname": "DESKTOP-ABC123",
  "sourcePlatform": "win32",
  "timestamp": "2026-01-01T15:30:45.123Z",
  "createdBy": "user-admin-001",
  "backupType": "business",
  "businessFilter": {
    "includeDemoData": false
  },
  "stats": {
    "totalRecords": 125000,
    "totalTables": 116,
    "businessRecords": 125000,
    "deviceRecords": 0,
    "uncompressedSize": 45678901,
    "compressedSize": 12345678
  },
  "schemaVersion": "6.19.1-abc123def",
  "checksums": {
    "businessData": "sha256-abc123..."
  }
}
```

---

## Part 3: Restore Logic Flow

### Decision Tree

```
┌─────────────────────────────────────┐
│  Load Backup File                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Parse and Validate Metadata        │
│  - Check version compatibility      │
│  - Validate checksums               │
│  - Verify schema version            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Check: sourceNodeId === currentNodeId? │
└──────────┬────────────┬─────────────┘
           │            │
     YES ──┤            ├── NO
           │            │
           ▼            ▼
  ┌────────────────┐  ┌────────────────────────┐
  │ Same Device    │  │ Different Device       │
  │ Restore        │  │ (Cross-Machine Sync)   │
  └────────┬───────┘  └────────┬───────────────┘
           │                   │
           ▼                   ▼
  ┌────────────────┐  ┌────────────────────────┐
  │ 1. Pause Sync  │  │ 1. Pause Sync          │
  │ 2. Restore     │  │ 2. Restore Business    │
  │    Business    │  │    Data Only           │
  │    Data        │  │ 3. Skip Device Data    │
  │ 3. Restore     │  │ 4. Regenerate NodeID   │
  │    Device Data │  │ 5. Clear Sync State    │
  │ 4. Resume Sync │  │ 6. Resume Sync         │
  └────────────────┘  └────────────────────────┘
```

### Detailed Restore Algorithm

```typescript
async function restoreBackup(backupFile: BackupData): Promise<RestoreResult> {
  // Step 1: Load and validate metadata
  const metadata = backupFile.metadata
  await validateBackupVersion(metadata.version)
  await validateChecksums(backupFile)

  const currentNodeId = await getCurrentNodeId()
  const isSameDevice = metadata.sourceNodeId === currentNodeId

  // Step 2: Pre-restore hooks
  await pauseSyncSystem()
  await disconnectWiFiDevices()
  await clearActiveQueues()

  // Step 3: Restore business data (always)
  console.log('Restoring business data...')
  await restoreBusinessData(backupFile.businessData, {
    preserveIds: true,  // CRITICAL: Keep original IDs for cross-device sync
    upsert: true        // Idempotent restore
  })

  // Step 4: Handle device data based on source
  if (isSameDevice) {
    // Same device - restore device data
    if (backupFile.deviceData) {
      console.log('Same device detected - restoring device data...')
      await restoreDeviceData(backupFile.deviceData, {
        preserveIds: true,
        upsert: true
      })
    }
  } else {
    // Different device - regenerate device-specific state
    console.log('Different device detected - regenerating device state...')

    // Do NOT restore device data
    // Generate new node ID for this device
    await regenerateNodeId()

    // Clear sync state
    await prisma.syncEvents.deleteMany()
    await prisma.syncSessions.deleteMany()
    await prisma.offlineQueue.deleteMany()

    // Reset sync metrics
    await resetSyncMetrics()

    // Create new node state
    await initializeNodeState()
  }

  // Step 5: Post-restore hooks
  await reconnectWiFiDevices()
  await resumeSyncSystem()

  // Step 6: Verify integrity
  await verifyForeignKeys()
  await cleanupOrphanedRecords()

  return {
    success: true,
    recordsRestored: metadata.stats.totalRecords,
    deviceDataRestored: isSameDevice && !!backupFile.deviceData,
    warnings: []
  }
}
```

---

## Part 4: Implementation Plan

### Phase 1: Core Infrastructure ✅ (COMPLETED)

**Tasks:**
- [x] Analysis and planning
- [x] Table classification (Categories A, B, C, D)
- [x] Metadata schema design
- [x] Restore logic flowchart

---

### Phase 2: Backup System Updates (Priority: CRITICAL)

#### Task 2.1: Add Metadata Generation
**File:** `src/lib/backup-clean.ts`

**Changes:**
```typescript
import crypto from 'crypto'
import os from 'os'

export async function createBackup(options: {
  businessId?: string
  includeDemoData: boolean
  backupType: 'business' | 'full-device'
}): Promise<BackupData> {

  const currentNodeId = await getCurrentNodeId()
  const timestamp = new Date().toISOString()

  // Generate metadata
  const metadata: BackupMetadata = {
    version: '2.0',
    sourceNodeId: currentNodeId,
    sourceDeviceId: await getDeviceId(),
    sourceDeviceName: await getDeviceName(),
    sourceHostname: os.hostname(),
    sourcePlatform: os.platform(),
    timestamp,
    createdBy: options.userId || 'system',
    backupType: options.backupType,
    businessFilter: {
      businessId: options.businessId,
      includeDemoData: options.includeDemoData
    },
    stats: {
      totalRecords: 0,
      totalTables: 0,
      businessRecords: 0,
      deviceRecords: 0,
      uncompressedSize: 0,
      compressedSize: 0
    },
    schemaVersion: await getPrismaSchemaVersion(),
    checksums: {
      businessData: '',
      deviceData: undefined
    }
  }

  // Collect business data (Category A)
  const businessData = await collectBusinessData(options)

  // Collect device data (Category B) - only if full-device backup
  const deviceData = options.backupType === 'full-device'
    ? await collectDeviceData()
    : undefined

  // Calculate checksums
  metadata.checksums.businessData = generateChecksum(businessData)
  if (deviceData) {
    metadata.checksums.deviceData = generateChecksum(deviceData)
  }

  // Update stats
  metadata.stats.businessRecords = countRecords(businessData)
  metadata.stats.deviceRecords = deviceData ? countRecords(deviceData) : 0
  metadata.stats.totalRecords = metadata.stats.businessRecords + metadata.stats.deviceRecords
  metadata.stats.totalTables = countTables(businessData, deviceData)

  return {
    metadata,
    businessData,
    deviceData
  }
}
```

---

#### Task 2.2: Separate Business vs Device Data Collection
**File:** `src/lib/backup-clean.ts`

**Add Category A Collection (116 business tables):**
```typescript
async function collectBusinessData(options: BackupOptions): Promise<BusinessData> {
  const businessIds = await getBusinessIds(options)
  const userIds = await getUserIds(businessIds)

  return {
    // A1. Core Business & Users (9 tables)
    users: await prisma.users.findMany({
      where: { id: { in: userIds } }
    }),
    accounts: await prisma.accounts.findMany({
      where: { userId: { in: userIds } }
    }),
    businesses: await prisma.businesses.findMany({
      where: options.businessId ? { id: options.businessId } : {},
      where: options.includeDemoData ? {} : { isDemo: false }
    }),
    businessMemberships: await prisma.businessMemberships.findMany({
      where: { businessId: { in: businessIds } }
    }),
    businessAccounts: await prisma.businessAccounts.findMany({
      where: { businessId: { in: businessIds } }
    }),
    businessLocations: await prisma.businessLocations.findMany({
      where: { businessId: { in: businessIds } }
    }),
    businessBrands: await prisma.businessBrands.findMany({
      where: { businessId: { in: businessIds } }
    }),
    businessCategories: await prisma.businessCategories.findMany({
      where: { businessId: { in: businessIds } }
    }),
    portalIntegrations: await prisma.portalIntegrations.findMany({
      where: { businessId: { in: businessIds } }
    }),

    // A2. Products & Inventory (11 tables)
    businessProducts: await prisma.businessProducts.findMany({
      where: { businessId: { in: businessIds } }
    }),
    productVariants: await prisma.productVariants.findMany({
      where: { product: { businessId: { in: businessIds } } }
    }),
    productBarcodes: await prisma.productBarcodes.findMany({
      where: { businessId: { in: businessIds } }
    }),
    productImages: await prisma.productImages.findMany({
      where: { product: { businessId: { in: businessIds } } }
    }),
    productAttributes: await prisma.productAttributes.findMany({
      where: { product: { businessId: { in: businessIds } } }
    }),
    businessStockMovements: await prisma.businessStockMovements.findMany({
      where: { businessId: { in: businessIds } }
    }),
    supplierProducts: await prisma.supplierProducts.findMany({
      where: { product: { businessId: { in: businessIds } } }
    }),
    businessSuppliers: await prisma.businessSuppliers.findMany({
      where: { businessId: { in: businessIds } }
    }),
    inventorySubcategories: await prisma.inventorySubcategories.findMany(),
    skuSequences: await prisma.sku_sequences.findMany({
      where: { businessId: { in: businessIds } }
    }),
    productPriceChanges: await prisma.product_price_changes.findMany({
      where: { product: { businessId: { in: businessIds } } }
    }),

    // ... Continue for all 116 business tables
    // A3. Customers & Orders (6 tables)
    // A4. HR & Payroll (26 tables)
    // A5. Expense Management (5 tables)
    // A6. Projects (7 tables)
    // A7. Fleet (11 tables)
    // A8. Restaurant (6 tables)
    // A9. WiFi ESP32 (6 tables)
    // A10. WiFi R710 (10 tables)
    // A11. Barcode (6 tables)
    // A12. Security (3 tables)
    // A13. Personal Finance (3 tables)
    // A14. Reference Data (12 tables)
    // A15. Misc (3 tables)
  }
}
```

**Add Category B Collection (11 device tables):**
```typescript
async function collectDeviceData(): Promise<DeviceData> {
  return {
    // B1. Sync Infrastructure (8 tables)
    syncSessions: await prisma.syncSessions.findMany(),
    fullSyncSessions: await prisma.fullSyncSessions.findMany(),
    syncNodes: await prisma.syncNodes.findMany(),
    syncMetrics: await prisma.syncMetrics.findMany(),
    nodeStates: await prisma.nodeStates.findMany(),
    syncEvents: await prisma.syncEvents.findMany(),
    syncConfigurations: await prisma.syncConfigurations.findMany(),
    offlineQueue: await prisma.offlineQueue.findMany(),

    // B2. Device Management (2 tables)
    deviceRegistry: await prisma.deviceRegistry.findMany(),
    deviceConnectionHistory: await prisma.deviceConnectionHistory.findMany(),

    // B3. Network Monitoring (1 table)
    networkPartitions: await prisma.networkPartitions.findMany()
  }
}
```

---

#### Task 2.3: Update API Endpoint
**File:** `src/app/api/backup/route.ts`

**Add backup type parameter:**
```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const businessId = searchParams.get('businessId') || undefined
  const includeDemoData = searchParams.get('includeDemoData') === 'true'
  const backupType = searchParams.get('backupType') || 'business' // 'business' | 'full-device'

  const backupData = await createBackup({
    businessId,
    includeDemoData,
    backupType: backupType as 'business' | 'full-device'
  })

  const filename = `backup-${backupType}-${new Date().toISOString()}.json`

  return new NextResponse(JSON.stringify(backupData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
```

---

### Phase 3: Restore System Updates (Priority: CRITICAL)

#### Task 3.1: Implement Smart Restore Logic
**File:** `src/lib/restore-clean.ts`

**Add device detection and conditional restore:**
```typescript
export async function restoreBackup(
  backupData: BackupData,
  options: RestoreOptions
): Promise<RestoreResult> {

  const metadata = backupData.metadata
  const currentNodeId = await getCurrentNodeId()
  const isSameDevice = metadata.sourceNodeId === currentNodeId

  console.log(`[Restore] Source Device: ${metadata.sourceNodeId}`)
  console.log(`[Restore] Current Device: ${currentNodeId}`)
  console.log(`[Restore] Same Device: ${isSameDevice}`)
  console.log(`[Restore] Backup Type: ${metadata.backupType}`)

  // Validate backup version
  if (metadata.version !== '2.0') {
    throw new Error(`Unsupported backup version: ${metadata.version}`)
  }

  // Validate checksums
  await validateChecksums(backupData)

  // Pre-restore hooks
  await preRestoreHook(prisma)

  try {
    // ALWAYS restore business data (Category A)
    console.log(`[Restore] Restoring business data (${metadata.stats.businessRecords} records)...`)
    await restoreBusinessData(backupData.businessData)

    // Conditionally restore device data (Category B)
    if (backupData.deviceData) {
      if (isSameDevice) {
        // Same device - restore device data
        console.log(`[Restore] Same device - restoring device data (${metadata.stats.deviceRecords} records)...`)
        await restoreDeviceData(backupData.deviceData)
      } else {
        // Different device - regenerate device state
        console.log(`[Restore] Different device - regenerating device state...`)
        await regenerateDeviceState()
      }
    } else {
      // Business backup (no device data)
      if (!isSameDevice) {
        console.log(`[Restore] Business backup on different device - regenerating device state...`)
        await regenerateDeviceState()
      }
    }

    // Post-restore hooks
    await postRestoreHook(prisma, isSameDevice)

    return {
      success: true,
      isSameDevice,
      recordsRestored: metadata.stats.totalRecords,
      businessRecordsRestored: metadata.stats.businessRecords,
      deviceRecordsRestored: isSameDevice ? metadata.stats.deviceRecords : 0,
      deviceStateRegenerated: !isSameDevice
    }

  } catch (error) {
    console.error('[Restore] Failed:', error)
    throw error
  }
}
```

---

#### Task 3.2: Add Device State Regeneration
**File:** `src/lib/device-state-manager.ts` (NEW)

**Implementation:**
```typescript
export async function regenerateDeviceState(): Promise<void> {
  console.log('[Device State] Regenerating device-specific state...')

  // 1. Generate new node ID
  const newNodeId = await generateNodeId()
  console.log(`[Device State] New Node ID: ${newNodeId}`)

  // 2. Clear all sync state
  await prisma.syncEvents.deleteMany()
  await prisma.syncSessions.deleteMany()
  await prisma.fullSyncSessions.deleteMany()
  await prisma.offlineQueue.deleteMany()
  await prisma.networkPartitions.deleteMany()

  console.log('[Device State] Cleared sync state')

  // 3. Create new sync node record
  await prisma.syncNodes.create({
    data: {
      id: newNodeId,
      nodeUrl: process.env.NEXT_PUBLIC_NODE_URL || 'http://localhost:8080',
      isActive: true,
      lastSeen: new Date(),
      nodeType: 'primary'
    }
  })

  console.log('[Device State] Created new sync node')

  // 4. Initialize node state
  await prisma.nodeStates.create({
    data: {
      nodeId: newNodeId,
      state: 'IDLE',
      lastUpdated: new Date()
    }
  })

  console.log('[Device State] Initialized node state')

  // 5. Reset sync metrics
  await prisma.syncMetrics.create({
    data: {
      nodeId: newNodeId,
      lastSyncAt: null,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastError: null
    }
  })

  console.log('[Device State] Reset sync metrics')

  // 6. Create default sync configuration
  await prisma.syncConfigurations.create({
    data: {
      nodeId: newNodeId,
      syncInterval: 300000, // 5 minutes
      enabled: true,
      createdAt: new Date()
    }
  })

  console.log('[Device State] Created default sync configuration')
  console.log('[Device State] Device state regeneration complete')
}

async function generateNodeId(): Promise<string> {
  const hostname = os.hostname()
  const platform = os.platform()
  const timestamp = Date.now()
  const random = crypto.randomBytes(8).toString('hex')

  return `node-${platform}-${hostname}-${timestamp}-${random}`
}

export async function getCurrentNodeId(): Promise<string> {
  const node = await prisma.syncNodes.findFirst({
    where: { isActive: true },
    orderBy: { lastSeen: 'desc' }
  })

  if (!node) {
    // No node exists - create one
    return await generateNodeId()
  }

  return node.id
}
```

---

### Phase 4: UI Updates (Priority: HIGH)

#### Task 4.1: Update Backup Page UI
**File:** `src/app/manage/backup/page.tsx`

**Add backup type selector:**
```tsx
<div className="space-y-4">
  <h2>Backup Type</h2>

  <div className="space-y-2">
    <label className="flex items-center space-x-2">
      <input
        type="radio"
        name="backupType"
        value="business"
        checked={backupType === 'business'}
        onChange={(e) => setBackupType(e.target.value)}
      />
      <div>
        <div className="font-medium">Business Backup</div>
        <div className="text-sm text-gray-500">
          Sync business data across devices. Excludes device-specific sync state.
          Use this for restoring to different laptops.
        </div>
      </div>
    </label>

    <label className="flex items-center space-x-2">
      <input
        type="radio"
        name="backupType"
        value="full-device"
        checked={backupType === 'full-device'}
        onChange={(e) => setBackupType(e.target.value)}
      />
      <div>
        <div className="font-medium">Full Device Backup</div>
        <div className="text-sm text-gray-500">
          Complete device backup including sync state and device identity.
          Use this for disaster recovery on the SAME device.
        </div>
      </div>
    </label>
  </div>
</div>
```

---

#### Task 4.2: Update Restore Page UI
**File:** `src/app/manage/backup/page.tsx`

**Add device detection warning:**
```tsx
{backupMetadata && (
  <div className="space-y-4">
    <h3>Backup Information</h3>

    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="font-medium">Source Device:</span>
        <span>{backupMetadata.sourceDeviceName}</span>
      </div>
      <div>
        <span className="font-medium">Backup Type:</span>
        <span>{backupMetadata.backupType}</span>
      </div>
      <div>
        <span className="font-medium">Created:</span>
        <span>{new Date(backupMetadata.timestamp).toLocaleString()}</span>
      </div>
      <div>
        <span className="font-medium">Records:</span>
        <span>{backupMetadata.stats.totalRecords.toLocaleString()}</span>
      </div>
    </div>

    {/* Device mismatch warning */}
    {backupMetadata.sourceNodeId !== currentNodeId && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium text-yellow-900">Different Device Detected</h4>
            <p className="text-sm text-yellow-800 mt-1">
              This backup is from <strong>{backupMetadata.sourceDeviceName}</strong>.
              Device-specific data will NOT be restored. This device will generate a new node ID and sync state.
            </p>
            {backupMetadata.backupType === 'full-device' && (
              <p className="text-sm text-yellow-800 mt-2">
                <strong>Note:</strong> This is a full device backup, but device data will be skipped since you're restoring to a different device.
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Same device confirmation */}
    {backupMetadata.sourceNodeId === currentNodeId && (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium text-green-900">Same Device Detected</h4>
            <p className="text-sm text-green-800 mt-1">
              This backup is from this device. All data including device-specific sync state will be restored.
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

---

### Phase 5: Testing (Priority: CRITICAL)

#### Test Case 1: Cross-Device Business Sync
```
1. Device A (Laptop-Finance-001):
   - Create business data (users, products, orders)
   - Create "Business Backup"
   - Verify metadata.backupType === 'business'
   - Verify businessData present
   - Verify deviceData === undefined

2. Device B (Laptop-Sales-002):
   - Restore backup from Device A
   - Verify business data restored with SAME IDs
   - Verify new node ID generated
   - Verify sync state cleared
   - Verify users can login
   - Verify products/orders accessible
```

#### Test Case 2: Same-Device Full Restore
```
1. Device A:
   - Create "Full Device Backup"
   - Verify metadata.backupType === 'full-device'
   - Verify businessData present
   - Verify deviceData present
   - Note current node ID

2. Device A (after system wipe):
   - Restore full device backup
   - Verify business data restored
   - Verify device data restored
   - Verify node ID preserved
   - Verify sync state preserved
```

#### Test Case 3: Full Backup to Different Device
```
1. Device A:
   - Create "Full Device Backup"

2. Device B:
   - Restore backup from Device A
   - Should show warning: "Different device detected"
   - Verify business data restored
   - Verify device data SKIPPED
   - Verify new node ID generated
```

---

## Part 5: Migration Path

### For Existing Backups (v1 format)

**Problem:** Existing backups don't have metadata structure

**Solution:**
```typescript
async function migrateV1Backup(oldBackup: any): Promise<BackupData> {
  return {
    metadata: {
      version: '2.0',
      sourceNodeId: 'migrated-v1-unknown',
      timestamp: new Date().toISOString(),
      backupType: 'business', // Assume business backup
      businessFilter: {
        includeDemoData: true
      },
      stats: {
        totalRecords: countRecords(oldBackup),
        totalTables: countTables(oldBackup),
        businessRecords: countRecords(oldBackup),
        deviceRecords: 0,
        uncompressedSize: 0,
        compressedSize: 0
      },
      schemaVersion: 'unknown',
      checksums: {
        businessData: generateChecksum(oldBackup)
      }
    },
    businessData: oldBackup,
    deviceData: undefined
  }
}
```

---

## Part 6: Questions for Review

### Critical Decisions Needed:

1. **Should we support restoring device data to a different device?**
   - Current plan: NO - auto-skip device data if different device
   - Alternative: YES - but show big warning and require user confirmation

2. **How should we handle node ID conflicts?**
   - Current plan: Always regenerate on different device
   - Alternative: Allow user to choose "Take over node ID" vs "Create new node ID"

3. **Should backup filename indicate backup type?**
   - `backup-business-2026-01-01.json`
   - `backup-full-device-2026-01-01.json`

4. **Should we compress backups by default?**
   - Business backups can be large (100MB+)
   - Add compression option?

5. **Should we support incremental backups?**
   - Only backup changed records since last backup
   - More complex but saves space/time

6. **Chat system tables - include or exclude?**
   - Currently excluded from backup
   - Should these sync across devices?

7. **Print jobs - historical or active?**
   - Currently backing up all print jobs
   - Should we only backup completed jobs? Or none at all?

8. **Should we version backups?**
   - Keep multiple backup files?
   - Auto-delete old backups?

---

## Part 7: Summary

### Key Changes from v1:

1. **Two-tier backup structure:**
   - Business Data (116 tables) - always syncs
   - Device Data (11 tables) - only for same-device restore

2. **Metadata-driven restore:**
   - Auto-detects same vs different device
   - Intelligently skips/regenerates device state

3. **Backup types:**
   - Business Backup: For cross-device sync
   - Full Device Backup: For disaster recovery

4. **Idempotent cross-device sync:**
   - Preserves original IDs
   - Ensures data consistency across devices

### Benefits:

✅ Users can backup from Laptop A, restore to Laptop B
✅ Business data stays synchronized with same IDs
✅ No sync conflicts from duplicate node IDs
✅ Complete device restoration possible
✅ Clear distinction between business vs device data

### Next Steps:

1. **Review this plan** and answer the 8 questions above
2. **Choose implementation timeline:**
   - Fast track: 1 week (focus on core functionality)
   - Complete: 2-3 weeks (includes full testing and polish)
3. **Approve table classifications** (Categories A, B, C, D)
4. **Begin implementation** starting with Phase 2

---

**Ready to proceed?** 🚀
