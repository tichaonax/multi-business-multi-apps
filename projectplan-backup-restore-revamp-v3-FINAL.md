# Backup & Restore System - Final Implementation Plan v3

**Date:** 2026-01-01
**Version:** 3.0 - FINAL
**Status:** Ready for Implementation

---

## Executive Summary

### The Core Problem

**Multiple laptops run the same business with different users/roles. When devices sync (via network) or restore backups, business data must be identical across devices but device-specific sync tracking must remain separate.**

---

## Part 1: What is "Device Data"? (CRITICAL CLARIFICATION)

### Category A: Business Data (Syncs Across Devices)

**Definition:** Data that represents the actual business operations and must be **identical across all devices** running that business.

**Examples:**
- **Users** - Same user IDs across all devices so permissions work
- **Products** - Same product IDs so inventory syncs
- **Orders** - Same order IDs so sales history is consistent
- **Employees** - Same employee IDs so payroll works
- **WiFi Tokens** - Same token IDs so revenue tracks correctly
- **Network Printers** - Shared business resources
- **R710 Devices** - Shared WiFi infrastructure

**Why sync:** When Device B restores Device A's backup, users should be able to login with same credentials, see same products, same orders, etc.

---

### Category B: Device-Specific Data (Never Syncs)

**Definition:** Local device state for tracking sync operations between devices. This is **metadata about the sync process itself**, not business data.

**Examples:**
- **SyncSessions** - "When did THIS device last sync with Device B?"
- **SyncNodes** - "What is THIS device's unique node ID in the network?"
- **SyncMetrics** - "How many successful syncs has THIS device completed?"
- **SyncEvents** - "What changes has THIS device detected locally?"
- **OfflineQueue** - "What operations is THIS device waiting to sync?"

**Why NOT sync:**
```
Device A has nodeId: "node-laptop-finance-001"
Device B has nodeId: "node-laptop-sales-002"

If we restore Device A's backup to Device B:
❌ BAD: Device B would think it's "node-laptop-finance-001"
❌ BAD: Sync system would have two devices with same ID
❌ BAD: Sync conflicts and data corruption

✅ GOOD: Device B keeps its own node ID
✅ GOOD: Device B generates fresh sync state
✅ GOOD: Each device maintains its own sync history
```

**Device-Specific Tables (11 tables):**
```
🔒 syncSessions             - THIS device's sync history
🔒 fullSyncSessions         - THIS device's full sync records
🔒 syncNodes                - THIS device's network identity
🔒 syncMetrics              - THIS device's performance metrics
🔒 nodeStates               - THIS device's current state
🔒 syncEvents               - Changes detected by THIS device
🔒 syncConfigurations       - THIS device's sync settings
🔒 offlineQueue             - THIS device's pending operations
🔒 deviceRegistry           - Devices THIS device has seen
🔒 deviceConnectionHistory  - THIS device's connection log
🔒 networkPartitions        - Network issues THIS device detected
```

**User Decision:** ✅ **NEVER restore device data to different device** (You said NO - agreed!)

---

## Part 2: Backup Types Redefined

### Backup Type 1: Full Backup

**Includes:**
- ALL businesses
- ALL users (who have access to any business)
- ALL products, orders, inventory
- ALL shared resources (printers, R710 devices)
- ALL reference data

**Use Case:**
- Complete system backup
- Restore to new device with all businesses
- Disaster recovery

**Filename:** `backup-full-20260101-153045.json.gz`

---

### Backup Type 2: Business-Specific Backup

**Includes:** ⚠️ **NOT just one business - includes ALL dependencies!**

```
Single Business "Restaurant ABC" backup includes:

1. The business itself:
   ✅ businesses (Restaurant ABC)
   ✅ businessAccounts (Restaurant ABC's account)
   ✅ businessLocations (Restaurant ABC's locations)

2. ALL users who touch this business:
   ✅ users (owner, managers, employees, customers)
   ✅ accounts (OAuth accounts for those users)
   ✅ businessMemberships (roles in Restaurant ABC)
   ✅ userPermissions (permissions for those users)

3. ALL products/inventory for this business:
   ✅ businessProducts (Restaurant ABC's menu items)
   ✅ productVariants, productBarcodes, productImages
   ✅ businessStockMovements (inventory history)

4. ALL orders/sales for this business:
   ✅ businessCustomers (Restaurant ABC's customers)
   ✅ businessOrders (sales from Restaurant ABC)
   ✅ businessOrderItems, businessTransactions

5. ALL employees for this business:
   ✅ employees (Restaurant ABC's staff)
   ✅ employeeContracts, payrollEntries, etc.

6. ALL shared resources this business uses:
   ✅ networkPrinters (that Restaurant ABC prints to)
   ✅ r710DeviceRegistry (R710 devices Restaurant ABC uses)
   ✅ tokenConfigurations (WiFi configs for Restaurant ABC)

7. ALL reference data needed:
   ✅ expenseCategories, inventoryDomains, etc.
```

**Use Case:**
- Deploy single business to new device/location
- Franchise model (duplicate one restaurant to new location)
- Testing (copy production business to dev environment)

**Critical Requirement:** When restored on new device, this business must be **fully functional** with all users able to login, all products available, all orders accessible.

**Filename:** `backup-business-restaurant-abc-20260101-153045.json.gz`

---

### Backup Type 3: Full Device Backup (with Device Data)

**Includes:**
- Everything from "Full Backup"
- PLUS: Device-specific sync state (Category B)

**Use Case:**
- Complete device restoration to SAME device after hardware failure
- System imaging/cloning

**Restore Behavior:**
```typescript
if (backupMetadata.sourceNodeId === currentNodeId) {
  // Same device - restore EVERYTHING
  restoreBusinessData()
  restoreDeviceData()  // Preserves node ID, sync history
} else {
  // Different device - show ERROR/WARNING
  throw new Error(
    "This is a full device backup from a different device. " +
    "Device-specific data cannot be restored to a different machine. " +
    "Please use a Business Backup instead."
  )
}
```

**Filename:** `backup-full-device-laptop-finance-001-20260101-153045.json.gz`

---

## Part 3: Dependency Resolution for Business-Specific Backups

### The Algorithm

```typescript
async function createBusinessSpecificBackup(businessId: string): Promise<BackupData> {

  // Step 1: Start with the business
  const business = await prisma.businesses.findUnique({ where: { id: businessId } })

  // Step 2: Find ALL users connected to this business
  const userIds = new Set<string>()

  // 2a. Users who are members
  const memberships = await prisma.businessMemberships.findMany({
    where: { businessId },
    select: { userId: true }
  })
  memberships.forEach(m => userIds.add(m.userId))

  // 2b. Users who are employees
  const employees = await prisma.employees.findMany({
    where: { businessId },
    select: { userId: true }
  })
  employees.forEach(e => userIds.add(e.userId))

  // 2c. Users who created products
  const products = await prisma.businessProducts.findMany({
    where: { businessId },
    select: { createdBy: true }
  })
  products.forEach(p => { if (p.createdBy) userIds.add(p.createdBy) })

  // 2d. Users who placed orders
  const orders = await prisma.businessOrders.findMany({
    where: { businessId },
    select: { userId: true }
  })
  orders.forEach(o => { if (o.userId) userIds.add(o.userId) })

  // 2e. Users who are customers
  const customers = await prisma.businessCustomers.findMany({
    where: { businessId },
    select: { userId: true }
  })
  customers.forEach(c => { if (c.userId) userIds.add(c.userId) })

  // Step 3: Find ALL shared resources this business uses

  // 3a. Network printers
  const printerIds = await prisma.printJobs.findMany({
    where: { businessId },
    select: { printerId: true },
    distinct: ['printerId']
  }).then(jobs => jobs.map(j => j.printerId))

  // 3b. R710 devices
  const r710DeviceIds = await prisma.r710BusinessIntegrations.findMany({
    where: { businessId },
    select: { deviceRegistryId: true }
  }).then(integrations => integrations.map(i => i.deviceRegistryId))

  // 3c. ESP32 token configs
  const tokenConfigIds = await prisma.tokenConfigurations.findMany({
    where: { businessId },
    select: { id: true }
  }).then(configs => configs.map(c => c.id))

  // Step 4: Collect all data with dependencies
  return {
    metadata: {
      version: '3.0',
      sourceNodeId: await getCurrentNodeId(),
      timestamp: new Date().toISOString(),
      backupType: 'business-specific',
      businessFilter: { businessId },
      stats: { /* calculated */ }
    },

    businessData: {
      // Core business
      businesses: [business],
      businessAccounts: await prisma.businessAccounts.findMany({ where: { businessId } }),
      businessLocations: await prisma.businessLocations.findMany({ where: { businessId } }),

      // ALL dependent users
      users: await prisma.users.findMany({
        where: { id: { in: Array.from(userIds) } }
      }),
      accounts: await prisma.accounts.findMany({
        where: { userId: { in: Array.from(userIds) } }
      }),
      businessMemberships: await prisma.businessMemberships.findMany({
        where: { businessId }
      }),
      userPermissions: await prisma.userPermissions.findMany({
        where: { userId: { in: Array.from(userIds) } }
      }),

      // ALL products/inventory
      businessProducts: await prisma.businessProducts.findMany({ where: { businessId } }),
      productVariants: await prisma.productVariants.findMany({
        where: { product: { businessId } }
      }),
      // ... all product-related tables

      // ALL shared resources
      networkPrinters: await prisma.networkPrinters.findMany({
        where: { id: { in: printerIds } }
      }),
      r710DeviceRegistry: await prisma.r710DeviceRegistry.findMany({
        where: { id: { in: r710DeviceIds } }
      }),
      tokenConfigurations: await prisma.tokenConfigurations.findMany({
        where: { id: { in: tokenConfigIds } }
      }),

      // ALL reference data (needed for business to function)
      expenseCategories: await prisma.expenseCategories.findMany(),
      inventoryDomains: await prisma.inventoryDomains.findMany(),
      permissions: await prisma.permissions.findMany(),
      // ... all reference tables
    },

    deviceData: undefined  // Business backups never include device data
  }
}
```

---

## Part 4: Backup Features

### Feature 1: Compression (Default ON)

```typescript
interface BackupOptions {
  businessId?: string           // undefined = full backup
  compress?: boolean            // Default: true
  includeDemoData?: boolean     // Default: false
  includeDeviceData?: boolean   // Default: false (only for same-device restore)
}

// API endpoint
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const compress = params.get('compress') !== 'false'  // Default true

  const backupData = await createBackup({
    businessId: params.get('businessId') || undefined,
    compress,
    includeDemoData: params.get('includeDemoData') === 'true',
    includeDeviceData: params.get('includeDeviceData') === 'true'
  })

  if (compress) {
    const gzipped = await compressBackup(backupData)
    return new NextResponse(gzipped, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}.gz"`,
        'Content-Encoding': 'gzip'
      }
    })
  } else {
    // Uncompressed (human-readable JSON)
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`
      }
    })
  }
}
```

**Compression Stats (estimated):**
```
Uncompressed: 150 MB
Compressed:   25 MB (83% reduction)
Email limit:  25 MB (fits!)
```

---

### Feature 2: Versioned Backups (Keep Multiple)

```typescript
interface BackupVersion {
  id: string
  filename: string
  timestamp: Date
  backupType: 'full' | 'business-specific' | 'full-device'
  businessId?: string
  businessName?: string
  size: number
  compressedSize: number
  recordCount: number
  createdBy: string
}

// Storage structure
backups/
  ├── full/
  │   ├── backup-full-20260101-153045.json.gz
  │   ├── backup-full-20260102-153045.json.gz
  │   └── backup-full-20260103-153045.json.gz
  ├── business/
  │   ├── backup-business-restaurant-abc-20260101-153045.json.gz
  │   ├── backup-business-restaurant-abc-20260102-153045.json.gz
  │   └── backup-business-grocery-xyz-20260101-153045.json.gz
  └── device/
      ├── backup-full-device-laptop-finance-001-20260101-153045.json.gz
      └── backup-full-device-laptop-sales-002-20260101-153045.json.gz

// Retention policy
const RETENTION_POLICY = {
  full: {
    daily: 7,      // Keep last 7 days
    weekly: 4,     // Keep last 4 weeks
    monthly: 12    // Keep last 12 months
  },
  business: {
    daily: 30,     // Keep last 30 days
    weekly: 12     // Keep last 12 weeks
  },
  device: {
    daily: 3,      // Keep last 3 days
    weekly: 2      // Keep last 2 weeks
  }
}
```

---

### Feature 3: Distribution Methods

```typescript
// Method 1: Download (current)
// User clicks "Create Backup" → Downloads .json.gz file

// Method 2: Email
async function emailBackup(backupFile: string, toEmail: string) {
  const nodemailer = require('nodemailer')

  const transporter = nodemailer.createTransport({
    // SMTP config
  })

  await transporter.sendMail({
    from: 'backups@yourbusiness.com',
    to: toEmail,
    subject: `Backup: ${backupFile}`,
    text: 'Please find your backup file attached.',
    attachments: [
      {
        filename: backupFile,
        path: `/backups/${backupFile}`
      }
    ]
  })
}

// Method 3: Shared Network Folder
async function saveToNetworkShare(backupFile: string) {
  const networkPath = process.env.BACKUP_NETWORK_PATH  // \\server\backups
  const fs = require('fs')

  await fs.promises.copyFile(
    `/local/backups/${backupFile}`,
    `${networkPath}/${backupFile}`
  )
}

// Method 4: Cloud Storage (optional)
async function uploadToCloud(backupFile: string) {
  // S3, Google Drive, Dropbox, etc.
}
```

---

### Feature 4: Backup Metadata Database

```prisma
model BackupHistory {
  id                String   @id @default(uuid())
  filename          String
  filepath          String?
  backupType        String   // 'full' | 'business-specific' | 'full-device'
  businessId        String?
  businessName      String?

  // Size info
  uncompressedSize  BigInt
  compressedSize    BigInt
  recordCount       Int
  tableCount        Int

  // Source info
  sourceNodeId      String
  sourceDeviceName  String?
  createdBy         String
  createdAt         DateTime @default(now())

  // Distribution
  emailedTo         String?
  emailedAt         DateTime?
  savedToNetwork    Boolean  @default(false)
  networkPath       String?

  // Checksums
  checksum          String

  @@map("backup_history")
}
```

---

## Part 5: Table Classification (Final)

### Business Data Tables (116 tables) ✅ ALWAYS BACKUP

#### Core Business & Users (9 tables)
```
✅ users
✅ accounts
✅ businesses
✅ businessMemberships
✅ businessAccounts
✅ businessLocations
✅ businessBrands
✅ businessCategories
✅ portalIntegrations
```

#### Products & Inventory (11 tables)
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
✅ sku_sequences
✅ product_price_changes
```

#### Customers & Orders (6 tables)
```
✅ businessCustomers
✅ businessOrders
✅ businessOrderItems
✅ businessTransactions
✅ customerLaybys
✅ customerLaybyPayments
```

#### HR & Payroll (26 tables)
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

#### Expense Management (6 tables)
```
✅ expenseAccounts
✅ expenseAccountDeposits
✅ expenseAccountPayments
✅ expenseDomains
✅ expenseCategories
✅ expenseSubcategories
```

#### Projects & Construction (7 tables)
```
✅ projects
✅ projectStages
✅ projectContractors
✅ projectTransactions
✅ constructionProjects
✅ constructionExpenses
✅ stageContractorAssignments
```

#### Fleet Management (11 tables)
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

#### Restaurant/Menu (6 tables)
```
✅ menuItems
✅ menuCombos
✅ menuComboItems
✅ menuPromotions
✅ orders
✅ orderItems
```

#### WiFi Portal - ESP32 (6 tables)
```
✅ tokenConfigurations
✅ wifiTokenDevices
✅ wifiTokens
✅ wifiTokenSales
✅ businessTokenMenuItems
✅ wiFiUsageAnalytics
```

#### WiFi Portal - R710 (10 tables)
```
✅ r710DeviceRegistry
✅ r710BusinessIntegrations
✅ r710Wlans
✅ r710TokenConfigs
✅ r710Tokens
✅ r710TokenSales
✅ r710DeviceTokens
✅ r710BusinessTokenMenuItems
✅ r710SyncLogs
```

#### Barcode Management (6 tables)
```
✅ networkPrinters
✅ barcodeTemplates
✅ barcodePrintJobs        // All jobs (fall off after 3 months anyway)
✅ barcodeInventoryItems
✅ printJobs               // All jobs (fall off after 3 months anyway)
✅ reprintLog
```

#### Security & Access Control (3 tables)
```
✅ permissions
✅ userPermissions
✅ macAclEntry
```

#### Personal Finance (3 tables)
```
✅ fundSources
✅ personalBudgets
✅ personalExpenses
```

#### Reference Data (12 tables)
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

#### Audit & History (3 tables)
```
✅ auditLogs
✅ conflictResolutions
✅ dataSnapshots
```

#### Misc Business (3 tables)
```
✅ persons
✅ interBusinessLoans
✅ loanTransactions
```

**Total Business Tables: 116**

---

### Device-Specific Data (11 tables) 🔒 SAME DEVICE ONLY

```
🔒 syncSessions
🔒 fullSyncSessions
🔒 syncNodes
🔒 syncMetrics
🔒 nodeStates
🔒 syncEvents
🔒 syncConfigurations
🔒 offlineQueue
🔒 deviceRegistry
🔒 deviceConnectionHistory
🔒 networkPartitions
```

**Total Device Tables: 11**

---

### Transient Data (6 tables) ❌ NEVER BACKUP

```
❌ sessions                  // User auth sessions (regenerated on login)
❌ esp32ConnectedClients     // Real-time WiFi connections
❌ r710ConnectedClients      // Real-time WiFi connections
❌ chatRooms                 // Chat system (you said NO)
❌ chatMessages              // Chat system (you said NO)
❌ chatParticipants          // Chat system (you said NO)
```

**Total Excluded: 6**

**Grand Total: 116 + 11 + 6 = 133 tables**
(Note: Your schema has 143 tables, the extra 10 may be junction tables or new tables to classify)

---

## Part 6: Implementation Phases

### Phase 1: Core Backup System (Week 1)

**Tasks:**
1. Update backup-clean.ts with all 116 business tables
2. Add metadata generation
3. Add compression (default ON, option to disable)
4. Separate business vs device data collection
5. Add business-specific backup with dependency resolution

**Deliverables:**
- Can create full backups (compressed)
- Can create business-specific backups (with all dependencies)
- Can create full device backups (with device data)
- Metadata includes source device info

---

### Phase 2: Smart Restore System (Week 1)

**Tasks:**
1. Update restore-clean.ts to read metadata
2. Add device detection logic (sourceNodeId vs currentNodeId)
3. Conditional restore (skip device data if different device)
4. Device state regeneration
5. Add checksums validation

**Deliverables:**
- Can restore full backups
- Can restore business-specific backups
- Auto-detects same vs different device
- Regenerates node ID when needed
- Validates backup integrity

---

### Phase 3: Versioning & Distribution (Week 2)

**Tasks:**
1. Create BackupHistory model
2. Implement retention policy
3. Add email distribution
4. Add network share support
5. UI for browsing backup versions

**Deliverables:**
- Keeps multiple backup versions
- Auto-cleanup old backups
- Can email backups
- Can save to network share
- UI shows backup history

---

### Phase 4: UI Updates (Week 2)

**Tasks:**
1. Update backup page with type selector
2. Add compression toggle
3. Add device mismatch warning on restore
4. Show backup metadata before restore
5. Progress indicators

**Deliverables:**
- User-friendly backup creation
- Clear warnings for cross-device restore
- Shows what will be restored
- Progress tracking

---

### Phase 5: Testing (Week 2-3)

**Test Cases:**
1. Full backup → Full restore (same device)
2. Full backup → Full restore (different device)
3. Business backup → Restore (different device)
4. Multiple business backups
5. Compression/decompression
6. Email distribution
7. Network share save/load
8. Version management
9. Checksum validation
10. Large dataset performance

---

## Part 7: Key Files to Modify

```
src/lib/backup-clean.ts              // Main backup logic
src/lib/restore-clean.ts             // Main restore logic
src/lib/device-state-manager.ts      // NEW - Device ID management
src/lib/backup-compression.ts        // NEW - Compression utilities
src/lib/backup-distribution.ts       // NEW - Email/network share
src/app/api/backup/route.ts          // API endpoints
src/app/manage/backup/page.tsx       // UI
prisma/schema.prisma                 // Add BackupHistory model
```

---

## Part 8: Success Criteria

### Must Have ✅

1. **Full backup** includes all 116 business tables
2. **Business-specific backup** includes ALL dependencies (users, shared resources)
3. **Compression** enabled by default, optional disable
4. **Smart restore** detects same vs different device
5. **Device data** never restores to different device
6. **Node ID** regenerated on cross-device restore
7. **Versioning** keeps multiple backups with retention policy
8. **Distribution** supports download, email, network share
9. **Validation** checksums verify backup integrity
10. **UI** shows clear warnings for cross-device restore

### Should Have 🎯

1. Backup history database
2. Automatic cleanup of old backups
3. Progress indicators for large backups
4. Estimated restore time
5. Pre-restore validation

### Won't Have ❌

1. Incremental backups (problematic for cross-device)
2. Chat system backup (you said NO)
3. Real-time connected clients (transient data)
4. Active sessions (regenerated on login)

---

## Part 9: Timeline

**Week 1:** Core backup/restore functionality
**Week 2:** Versioning, distribution, UI
**Week 3:** Testing and polish

**Total:** 3 weeks

---

## Questions Answered

1. ✅ Device data NEVER restores to different device
2. ✅ Backup types: Full, Business-Specific, Full-Device
3. ✅ Compress by default, option to disable
4. ❌ No incremental backups (cross-device issues)
5. ❌ Chat system NOT backed up
6. ✅ All print jobs backed up (fall off after 3 months)
7. ✅ Keep multiple versions with retention policy
8. ✅ No file size limit (compressed backups small enough for email)

---

## Ready to Implement? 🚀

This plan now correctly handles:
- ✅ Business-specific backups include ALL dependencies
- ✅ Cross-device restore works without sync conflicts
- ✅ Same-device restore preserves everything
- ✅ Compression keeps files small
- ✅ Versioning for safety
- ✅ Multiple distribution methods

**Next Step:** Review and approve, then I'll start implementation with Phase 1.
