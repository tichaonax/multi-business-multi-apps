# Backup & Restore System Revamp - Analysis & Implementation Plan

## Executive Summary

**Current Status**:
- Database has **143 total tables**
- Backup system covers **~80 tables** (56%)
- **63 tables NOT included** in backup (44%)
- Missing critical new features: Barcode Management, WiFi Portal (ESP32 & R710), Network Printers, Chat System, Sync Infrastructure

**Goal**: Comprehensive backup/restore system that:
1. Includes all business-critical tables
2. Maintains referential integrity across machines
3. Supports idempotent restores (run backup multiple times = same result)
4. Integrates seamlessly with sync process
5. Provides granular control (full, business-specific, demo/production)

---

## Part 1: Current System Analysis

### 1.1 Current Backup Implementation

**Files**:
- `src/lib/backup-clean.ts` - Creates flat backups without nested relations
- `src/lib/restore-clean.ts` - Restores using upsert operations (idempotent)
- `src/app/api/backup/route.ts` - API endpoints (GET = backup, POST = restore)
- `src/lib/backup-progress.ts` - Progress tracking for UI

**Key Features** ✅:
- **Flat backup structure** - No nested includes, pure FK relationships
- **Upsert-based restore** - Same backup can be restored multiple times
- **Dependency ordering** - 145 tables in correct restore order
- **Batch processing** - Prevents timeouts on large datasets
- **Progress tracking** - Real-time UI updates
- **Error handling** - Continues on errors, logs issues
- **Business filtering** - Can backup specific business or all
- **Demo filtering** - Can include/exclude demo businesses

**Limitations** ❌:
- Missing 63 tables (44% of database)
- No validation for missing FK references before restore
- No cleanup of orphaned records after selective restore
- Limited retry logic for failed records
- No pre/post restore hooks for sync system integration

### 1.2 Current Tables Covered (80/143)

**System & Reference Data** (17 tables):
- systemSettings, emojiLookup, jobTitles, compensationTypes, benefitTypes
- idFormatTemplates, driverLicenseTemplates, projectTypes
- conflictResolutions, dataSnapshots, permissionTemplates, seedDataTemplates
- inventoryDomains, expenseDomains, expenseCategories, expenseSubcategories
- inventorySubcategories

**Core Business** (7 tables):
- users, accounts, businesses, businessMemberships, businessAccounts
- businessLocations, businessBrands

**HR & Employees** (18 tables):
- employees, employeeContracts, employeeBusinessAssignments
- employeeBenefits, employeeAllowances, employeeBonuses, employeeDeductions
- employeeLoans, employeeSalaryIncreases, employeeLeaveRequests
- employeeLeaveBalance, employeeAttendance, employeeTimeTracking
- disciplinaryActions, employeeDeductionPayments, employeeLoanPayments
- contractBenefits, contractRenewals

**Products & Inventory** (7 tables):
- businessProducts, productVariants, productBarcodes, productImages
- productAttributes, businessStockMovements, supplierProducts

**Customers & Orders** (6 tables):
- businessCustomers, businessOrders, businessOrderItems, businessTransactions
- customerLaybys, customerLaybyPayments

**Expense Management** (4 tables):
- expenseAccounts, expenseAccountDeposits, expenseAccountPayments
- businessCategories, businessSuppliers

**Payroll** (6 tables):
- payrollAccounts, payrollPeriods, payrollEntries, payrollEntryBenefits
- payrollExports, payrollAdjustments

**Personal Finance** (3 tables):
- fundSources, personalBudgets, personalExpenses

**Projects & Construction** (7 tables):
- projects, projectStages, projectContractors, projectTransactions
- constructionProjects, constructionExpenses, stageContractorAssignments

**Fleet Management** (11 tables):
- vehicles, vehicleDrivers, vehicleExpenses, vehicleLicenses
- driverAuthorizations, vehicleMaintenanceRecords, vehicleMaintenanceServices
- vehicleMaintenanceServiceExpenses, vehicleTrips, vehicleReimbursements

**Restaurant/Menu** (6 tables):
- menuItems, menuCombos, menuComboItems, menuPromotions, orders, orderItems

**Inter-Business** (2 tables):
- interBusinessLoans, loanTransactions

**Persons** (1 table):
- persons

**Misc** (1 table):
- receiptSequences

---

## Part 2: Missing Tables Analysis (63 tables)

### Group A: CRITICAL - Must Include (28 tables)

#### A1. Barcode Management System (3 tables)
**Relations**: Forms complete subsystem
```
BarcodeTemplates (parent)
  └── BarcodePrintJobs (child - FK: templateId)
  └── BarcodeInventoryItems (child - FK: templateId)
```
**Dependencies**:
- BarcodeTemplates → Businesses (businessId), Users (createdById)
- BarcodePrintJobs → BarcodeTemplates, Businesses, NetworkPrinters, Users
- BarcodeInventoryItems → BarcodeTemplates, Businesses, Users

**Why critical**: Entire barcode printing feature non-functional without these

---

#### A2. Network Printers (3 tables)
**Relations**: Printing infrastructure
```
NetworkPrinters (parent)
  └── PrintJobs (child - FK: printerId)
  └── ReprintLog (child - FK: printerId)
```
**Dependencies**:
- NetworkPrinters → Businesses (businessId), Users (createdBy)
- PrintJobs → NetworkPrinters, Businesses, Users
- ReprintLog → NetworkPrinters, Orders, Users

**Why critical**: All POS printing (receipts, labels, barcodes) depends on these

---

#### A3. WiFi Portal - ESP32 System (7 tables)
**Relations**: Token management subsystem
```
TokenConfigurations (parent)
  └── WifiTokenDevices (child - FK: configId)
  └── WifiTokens (parent - FK: configId)
      └── WifiTokenSales (child - FK: tokenId)
      └── ESP32ConnectedClients (child - FK: tokenId)
  └── BusinessTokenMenuItems (junction - FK: tokenConfigId)
```
**Dependencies**:
- TokenConfigurations → Businesses
- WifiTokenDevices → TokenConfigurations
- WifiTokens → TokenConfigurations, Users (createdBy)
- WifiTokenSales → WifiTokens, Users, Businesses
- ESP32ConnectedClients → WifiTokens
- BusinessTokenMenuItems → TokenConfigurations, Businesses

**Why critical**: WiFi token sales revenue tracking and device management

---

#### A4. WiFi Portal - R710 System (10 tables)
**Relations**: R710 integration subsystem
```
R710DeviceRegistry (parent)
  └── R710BusinessIntegrations (child - FK: deviceId)
      └── R710TokenConfigs (child - FK: integrationId)
          └── R710Tokens (child - FK: tokenConfigId)
              └── R710TokenSales (child - FK: tokenId)
              └── R710DeviceTokens (child - FK: tokenId)
              └── R710ConnectedClients (child - FK: tokenId)
      └── R710Wlans (child - FK: integrationId)
      └── R710SyncLogs (child - FK: integrationId)
      └── R710BusinessTokenMenuItems (junction - FK: integrationId, tokenConfigId)
```
**Dependencies**:
- R710DeviceRegistry → Users (createdBy)
- R710BusinessIntegrations → R710DeviceRegistry, Businesses
- R710TokenConfigs → R710BusinessIntegrations, Users
- R710Tokens → R710TokenConfigs
- R710TokenSales → R710Tokens, Businesses, Users
- R710Wlans → R710BusinessIntegrations, Users
- R710SyncLogs → R710BusinessIntegrations

**Why critical**: Revenue from R710 WiFi token sales, business integrations

---

#### A5. WiFi Analytics (1 table)
```
WiFiUsageAnalytics (child)
```
**Dependencies**:
- WiFiUsageAnalytics → Businesses (businessId), Users (userId)

**Why critical**: Revenue analysis and usage reporting

---

#### A6. User Permissions (2 tables)
```
Permissions (parent)
  └── UserPermissions (child - FK: permissionId)
```
**Dependencies**:
- Permissions → None (reference data)
- UserPermissions → Permissions, Users

**Why critical**: Access control breaks without these - users can't access features

---

#### A7. Portal Integrations (1 table)
```
PortalIntegrations (parent)
```
**Dependencies**:
- PortalIntegrations → Businesses

**Why critical**: Links businesses to WiFi portal configurations

---

#### A8. Product Price Changes (1 table)
```
product_price_changes (audit trail)
```
**Dependencies**:
- product_price_changes → BusinessProducts (productId)

**Why critical**: Audit trail for pricing history

---

### Group B: SYNC INFRASTRUCTURE - Required for Sync Integration (14 tables)

#### B1. Sync Sessions (2 tables)
```
SyncSessions (parent)
  └── FullSyncSessions (child - FK: sessionId)
```
**Dependencies**:
- SyncSessions → None
- FullSyncSessions → SyncSessions

**Why needed**: Track sync history between nodes

---

#### B2. Sync Nodes & Metrics (3 tables)
```
SyncNodes (parent)
  └── SyncMetrics (child - FK: nodeId)
NodeStates (independent)
```
**Dependencies**:
- SyncNodes → None
- SyncMetrics → SyncNodes
- NodeStates → None

**Why needed**: Multi-node sync topology and monitoring

---

#### B3. Sync Events (1 table)
```
SyncEvents (child)
```
**Dependencies**:
- SyncEvents → None (sourceNodeId is string reference)

**Why needed**: Event log for sync operations

---

#### B4. Device Management (2 tables)
```
DeviceRegistry (parent)
  └── DeviceConnectionHistory (child - FK: deviceId)
```
**Dependencies**:
- DeviceRegistry → Users (createdBy)
- DeviceConnectionHistory → DeviceRegistry

**Why needed**: Track devices participating in sync

---

#### B5. Offline Queue (1 table)
```
OfflineQueue (queue)
```
**Dependencies**:
- OfflineQueue → None

**Why needed**: Queued operations during offline periods

---

#### B6. Sync Configuration (1 table)
```
SyncConfigurations (config)
```
**Dependencies**:
- SyncConfigurations → None

**Why needed**: Per-node sync settings

---

#### B7. Network Partitions (1 table)
```
NetworkPartitions (monitoring)
```
**Dependencies**:
- NetworkPartitions → None

**Why needed**: Track network split-brain scenarios

---

#### B8. MAC ACL (1 table)
```
MacAclEntry (security)
```
**Dependencies**:
- MacAclEntry → Users (createdBy)

**Why needed**: WiFi security access control

---

#### B9. Audit Logs (1 table)
```
AuditLogs (audit)
```
**Dependencies**:
- AuditLogs → Users (userId)

**Why needed**: System audit trail (currently optional in backup)

---

#### B10. Chat System (1 table - referenced but optional)
```
ChatRooms, ChatMessages, ChatParticipants
```
**Dependencies**:
- ChatRooms → None
- ChatMessages → ChatRooms, Users
- ChatParticipants → ChatRooms, Users

**Why optional**: Feature may not be actively used, low priority

---

### Group C: REFERENCE DATA - Support Tables (6 tables)

#### C1. SKU Sequences (1 table)
```
sku_sequences (auto-increment tracking)
```
**Dependencies**:
- sku_sequences → Businesses (businessId)

**Why needed**: Ensures unique SKU generation after restore

---

#### C2. Payroll Account Transactions (2 tables)
```
PayrollAccounts (already backed up)
  └── PayrollAccountDeposits (missing)
  └── PayrollAccountPayments (missing)
```
**Dependencies**:
- PayrollAccountDeposits → PayrollAccounts, Businesses, Users
- PayrollAccountPayments → PayrollAccounts, Businesses, Users

**Why needed**: Complete payroll transaction history

---

#### C3. Sessions (1 table)
```
Sessions (auth)
```
**Dependencies**:
- Sessions → Users (userId)

**Why skip**: Temporary session data, regenerated on login

---

### Group D: EXCLUDE - Temporary/Transient Data (15 tables)

These should **NOT** be backed up:

1. **Sessions** - Auth sessions (regenerated on login)
2. **Chat tables** (ChatRooms, ChatMessages, ChatParticipants) - Optional feature, low priority
3. **ESP32ConnectedClients** - Real-time connection status (transient)
4. **R710ConnectedClients** - Real-time connection status (transient)
5. **DeviceConnectionHistory** - Can be rebuilt, low value
6. **NetworkPartitions** - Monitoring data (transient)
7. **OfflineQueue** - Temporary queue (cleared after sync)
8. **FullSyncSessions** - Sync history (can rebuild)
9. **SyncSessions** - Sync history (can rebuild)
10. **SyncMetrics** - Performance metrics (can rebuild)

---

## Part 3: Table Dependency Groups

### Critical Dependency Chains (MUST restore in order):

#### Chain 1: User & Auth
```
1. Users (root)
2. Accounts → Users
3. Permissions (independent reference data)
4. UserPermissions → Users, Permissions
5. PersonalBudgets → Users
6. PersonalExpenses → Users
```

#### Chain 2: Business Core
```
1. Businesses (root)
2. BusinessMemberships → Businesses, Users
3. BusinessAccounts → Businesses
4. BusinessLocations → Businesses
5. BusinessBrands → Businesses
6. PortalIntegrations → Businesses
```

#### Chain 3: Reference Data (independent, can be first)
```
- SystemSettings
- EmojiLookup
- JobTitles
- CompensationTypes
- BenefitTypes
- IdFormatTemplates
- DriverLicenseTemplates
- ProjectTypes
- InventoryDomains
- ExpenseDomains
- ExpenseCategories
- ExpenseSubcategories
- Permissions
```

#### Chain 4: Products & Inventory
```
1. BusinessCategories → Businesses (nullable)
2. BusinessSuppliers → Businesses (nullable)
3. InventorySubcategories → InventoryDomains
4. BusinessProducts → Businesses, BusinessCategories, BusinessSuppliers
5. ProductVariants → BusinessProducts
6. ProductBarcodes → BusinessProducts
7. ProductImages → BusinessProducts
8. ProductAttributes → BusinessProducts
9. product_price_changes → BusinessProducts
10. BusinessStockMovements → Businesses, BusinessProducts
```

#### Chain 5: Barcode Management (NEW)
```
1. NetworkPrinters → Businesses, Users
2. BarcodeTemplates → Businesses, Users
3. BarcodePrintJobs → BarcodeTemplates, Businesses, NetworkPrinters, Users
4. BarcodeInventoryItems → BarcodeTemplates, Businesses, Users
5. PrintJobs → NetworkPrinters, Businesses, Users
6. ReprintLog → NetworkPrinters, Orders, Users
```

#### Chain 6: WiFi Portal - ESP32 (NEW)
```
1. TokenConfigurations → Businesses
2. WifiTokenDevices → TokenConfigurations
3. WifiTokens → TokenConfigurations, Users
4. WifiTokenSales → WifiTokens, Users, Businesses
5. BusinessTokenMenuItems → TokenConfigurations, Businesses
6. WiFiUsageAnalytics → Businesses, Users
```

#### Chain 7: WiFi Portal - R710 (NEW)
```
1. R710DeviceRegistry → Users
2. R710BusinessIntegrations → R710DeviceRegistry, Businesses
3. R710Wlans → R710BusinessIntegrations, Users
4. R710TokenConfigs → R710BusinessIntegrations, Users
5. R710Tokens → R710TokenConfigs
6. R710TokenSales → R710Tokens, Businesses, Users
7. R710DeviceTokens → R710Tokens, R710DeviceRegistry
8. R710BusinessTokenMenuItems → R710BusinessIntegrations, R710TokenConfigs, Businesses
9. R710SyncLogs → R710BusinessIntegrations
```

#### Chain 8: HR & Employees
```
1. Employees → Businesses
2. EmployeeContracts → Employees, Businesses
3. EmployeeBusinessAssignments → Employees, Businesses
4. (All other employee-related tables...)
```

#### Chain 9: Customers & Orders
```
1. BusinessCustomers → Businesses
2. BusinessOrders → Businesses, BusinessCustomers
3. BusinessOrderItems → BusinessOrders, BusinessProducts
4. BusinessTransactions → Businesses
5. CustomerLayby → BusinessCustomers
6. CustomerLaybyPayment → CustomerLayby
```

#### Chain 10: Expense Management
```
1. ExpenseAccounts → Users, Businesses (nullable)
2. ExpenseAccountDeposits → ExpenseAccounts
3. ExpenseAccountPayments → ExpenseAccounts
```

#### Chain 11: Payroll
```
1. PayrollAccounts → Businesses
2. PayrollAccountDeposits → PayrollAccounts (NEW)
3. PayrollAccountPayments → PayrollAccounts (NEW)
4. PayrollPeriods → Businesses
5. PayrollEntries → PayrollPeriods, Employees
6. (All other payroll tables...)
```

#### Chain 12: Projects
```
1. Projects → Businesses, ProjectTypes
2. ProjectStages → Projects
3. ProjectContractors → Projects
4. ProjectTransactions → Projects
5. ConstructionProjects → (independent)
6. StageContractorAssignments → ProjectStages, ProjectContractors
```

#### Chain 13: Fleet Management
```
1. Vehicles → Businesses
2. VehicleDrivers → (independent)
3. DriverAuthorizations → Vehicles, VehicleDrivers
4. VehicleTrips → Vehicles, DriverAuthorizations (composite FK)
5. VehicleLicenses → Vehicles
6. VehicleExpenses → Vehicles (nullable businessId)
7. VehicleMaintenanceRecords → Vehicles
8. (Other vehicle tables...)
```

#### Chain 14: Menu & Restaurant
```
1. MenuItems → (independent)
2. MenuCombos → Businesses
3. MenuComboItems → MenuCombos, MenuItems
4. MenuPromotions → Businesses
5. Orders → (independent)
6. OrderItems → Orders
```

#### Chain 15: Sync Infrastructure (NEW)
```
1. SyncConfigurations → (independent)
2. SyncNodes → (independent)
3. SyncMetrics → SyncNodes
4. NodeStates → (independent)
5. SyncEvents → (independent)
6. DeviceRegistry → Users
7. MacAclEntry → Users
8. AuditLogs → Users
```

#### Chain 16: Support Tables
```
1. sku_sequences → Businesses
2. ReceiptSequences → Businesses
3. ConflictResolutions → (independent)
4. DataSnapshots → (independent)
5. SeedDataTemplates → Users
6. PermissionTemplates → Users
```

---

## Part 4: Critical Issues & Risks

### Issue 1: Foreign Key Constraint Violations
**Problem**: Restoring tables out of order causes FK violations
**Current Mitigation**: Restore order defined in RESTORE_ORDER array
**Gap**: New tables not in restore order yet
**Solution**: Update RESTORE_ORDER with all new tables in correct dependency order

### Issue 2: Orphaned Records After Selective Restore
**Problem**: Restoring specific business may leave FK references to missing records
**Example**: WiFi token references business that wasn't included in backup
**Current Mitigation**: Restore skips records with missing FK (P2003 error)
**Gap**: Silent data loss, no validation before restore
**Solution**: Pre-restore validation to check FK integrity

### Issue 3: Idempotency Concerns
**Problem**: Restoring same backup multiple times should yield identical database state
**Current Implementation**: Uses upsert with original IDs and timestamps
**Gap**: Some tables use composite unique constraints (emojiLookup), others use auto-generated IDs
**Solution**: Handle composite constraints explicitly (already done for emojiLookup)

### Issue 4: Sync Process Integration
**Problem**: Backup/restore must not interfere with active sync
**Current State**: No integration between backup and sync systems
**Gaps**:
1. No sync pause during restore
2. No sync event cleanup after restore
3. No node ID preservation across machines
**Solutions**:
1. Add sync pause/resume hooks
2. Clear sync queues after restore
3. Preserve or regenerate node IDs

### Issue 5: Large Backup File Sizes
**Problem**: Full database backup can be very large
**Current Mitigation**: Compression option (not implemented)
**Gap**: No chunked upload/download for large backups
**Solution**: Add compression, streaming support

### Issue 6: Missing Transactional Consistency
**Problem**: Restore is not atomic - partial restore on failure
**Current Mitigation**: Error logging, continue on error
**Gap**: No rollback mechanism
**Solution**: Add transaction wrapper or backup staging table

---

## Part 5: Implementation Plan

### Phase 1: Analysis & Planning (CURRENT) ✅
**Tasks**:
- [x] Audit all 143 database tables
- [x] Identify 63 missing tables
- [x] Group tables by functionality and dependencies
- [x] Analyze critical FK chains
- [x] Create dependency graph
- [x] Document risks and issues

**Deliverable**: This document

---

### Phase 2: Add Critical Tables (Priority: HIGH)

#### Task 2.1: Add Barcode Management Tables
**Files to modify**:
- `src/lib/backup-clean.ts` (lines 620-628)
- `src/lib/restore-clean.ts` (lines 15-145)

**Changes**:
```typescript
// In backup-clean.ts, after line 619 (idFormatTemplates):
backupData.networkPrinters = await prisma.networkPrinters.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.barcodeTemplates = await prisma.barcodeTemplates.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.barcodePrintJobs = await prisma.barcodePrintJobs.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.barcodeInventoryItems = await prisma.barcodeInventoryItems.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.printJobs = await prisma.printJobs.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.reprintLog = await prisma.reprintLog.findMany()
```

**Restore order** (in restore-clean.ts):
```typescript
// Add after 'idFormatTemplates':
'networkPrinters',
'barcodeTemplates',
'barcodePrintJobs',
'barcodeInventoryItems',
'printJobs',
'reprintLog',
```

**Testing**:
1. Create backup with barcode data
2. Restore on clean database
3. Verify FK integrity
4. Test barcode printing workflow

---

#### Task 2.2: Add User Permissions Tables
**Files to modify**: Same as 2.1

**Changes**:
```typescript
// In backup-clean.ts, after reference data section:
backupData.permissions = await prisma.permissions.findMany()

backupData.userPermissions = await prisma.userPermissions.findMany({
  where: { userId: { in: userIds } }
})
```

**Restore order**:
```typescript
// Add after 'users':
'permissions',
'userPermissions',
```

**Testing**:
1. Verify admin access after restore
2. Test permission-based feature access

---

#### Task 2.3: Add WiFi Portal - ESP32 Tables
**Files to modify**: Same as 2.1

**Changes**:
```typescript
// In backup-clean.ts:
backupData.tokenConfigurations = await prisma.tokenConfigurations.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.wifiTokenDevices = await prisma.wifiTokenDevices.findMany({
  where: {
    tokenConfigurations: {
      businessId: { in: businessIds }
    }
  }
})

backupData.wifiTokens = await prisma.wifiTokens.findMany({
  where: {
    tokenConfigurations: {
      businessId: { in: businessIds }
    }
  }
})

backupData.wifiTokenSales = await prisma.wifiTokenSales.findMany({
  where: {
    businessId: { in: businessIds }
  }
})

backupData.businessTokenMenuItems = await prisma.businessTokenMenuItems.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.wifiUsageAnalytics = await prisma.wiFiUsageAnalytics.findMany({
  where: { businessId: { in: businessIds } }
})
```

**Restore order**:
```typescript
// Add after 'businesses':
'tokenConfigurations',
'wifiTokenDevices',
'wifiTokens',
'wifiTokenSales',
'businessTokenMenuItems',
'wifiUsageAnalytics',
```

**Testing**:
1. Verify WiFi token generation after restore
2. Test ESP32 device connectivity
3. Validate sales revenue data

---

#### Task 2.4: Add WiFi Portal - R710 Tables
**Files to modify**: Same as 2.1

**Changes**:
```typescript
// In backup-clean.ts:
backupData.r710DeviceRegistry = await prisma.r710DeviceRegistry.findMany()

backupData.r710BusinessIntegrations = await prisma.r710BusinessIntegrations.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.r710Wlans = await prisma.r710Wlans.findMany({
  where: {
    r710BusinessIntegrations: {
      businessId: { in: businessIds }
    }
  }
})

backupData.r710TokenConfigs = await prisma.r710TokenConfigs.findMany({
  where: {
    r710BusinessIntegrations: {
      businessId: { in: businessIds }
    }
  }
})

backupData.r710Tokens = await prisma.r710Tokens.findMany({
  where: {
    r710TokenConfigs: {
      r710BusinessIntegrations: {
        businessId: { in: businessIds }
      }
    }
  }
})

backupData.r710TokenSales = await prisma.r710TokenSales.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.r710DeviceTokens = await prisma.r710DeviceTokens.findMany()

backupData.r710BusinessTokenMenuItems = await prisma.r710BusinessTokenMenuItems.findMany()

backupData.r710SyncLogs = await prisma.r710SyncLogs.findMany()
```

**Restore order**:
```typescript
// Add after ESP32 tables:
'r710DeviceRegistry',
'r710BusinessIntegrations',
'r710Wlans',
'r710TokenConfigs',
'r710Tokens',
'r710TokenSales',
'r710DeviceTokens',
'r710BusinessTokenMenuItems',
'r710SyncLogs',
```

**Testing**:
1. Verify R710 device registration
2. Test WLAN configuration sync
3. Validate token sales and revenue

---

#### Task 2.5: Add Support Tables
**Files to modify**: Same as 2.1

**Changes**:
```typescript
// In backup-clean.ts:
backupData.skuSequences = await prisma.sku_sequences.findMany({
  where: { businessId: { in: businessIds } }
})

backupData.payrollAccountDeposits = await prisma.payrollAccountDeposits.findMany({
  where: {
    payroll_accounts: {
      businessId: { in: businessIds }
    }
  }
})

backupData.payrollAccountPayments = await prisma.payrollAccountPayments.findMany({
  where: {
    payroll_accounts: {
      businessId: { in: businessIds }
    }
  }
})

backupData.productPriceChanges = await prisma.product_price_changes.findMany()

backupData.portalIntegrations = await prisma.portalIntegrations.findMany({
  where: { businessId: { in: businessIds } }
})
```

**Restore order**:
```typescript
// Add in appropriate positions:
'skuSequences',           // After businesses
'payrollAccountDeposits', // After payrollAccounts
'payrollAccountPayments', // After payrollAccountDeposits
'productPriceChanges',    // After businessProducts
'portalIntegrations',     // After businesses
```

**Testing**:
1. Verify SKU generation after restore
2. Test payroll transaction history
3. Validate price change audit trail

---

### Phase 3: Sync Integration (Priority: HIGH)

#### Task 3.1: Add Sync Infrastructure Tables
**Files to modify**: Same as 2.1

**Changes**:
```typescript
// In backup-clean.ts:
backupData.syncConfigurations = await prisma.syncConfigurations.findMany()
backupData.syncNodes = await prisma.syncNodes.findMany()
backupData.syncMetrics = await prisma.syncMetrics.findMany()
backupData.nodeStates = await prisma.nodeStates.findMany()
backupData.syncEvents = await prisma.syncEvents.findMany()
backupData.deviceRegistry = await prisma.deviceRegistry.findMany()
backupData.macAclEntry = await prisma.macAclEntry.findMany()
```

**Restore order**:
```typescript
// Add early (after systemSettings):
'syncConfigurations',
'syncNodes',
'syncMetrics',
'nodeStates',
'syncEvents',
'deviceRegistry',
'macAclEntry',
```

**Special Handling**:
- Node IDs may need regeneration on new machine
- Sync events should be cleared or marked as historical
- Active sync sessions should be terminated

---

#### Task 3.2: Pre-Restore Hooks
**Files to create**: `src/lib/backup-hooks.ts`

**Implementation**:
```typescript
export async function preRestoreHook(prisma: PrismaClient): Promise<void> {
  // 1. Pause active sync sessions
  await pauseSyncSessions(prisma)

  // 2. Clear offline queues
  await clearOfflineQueues(prisma)

  // 3. Disconnect ESP32/R710 devices
  await disconnectWiFiDevices(prisma)

  // 4. Archive current sync events
  await archiveSyncEvents(prisma)
}
```

---

#### Task 3.3: Post-Restore Hooks
**Files to modify**: `src/lib/backup-hooks.ts`

**Implementation**:
```typescript
export async function postRestoreHook(prisma: PrismaClient): Promise<void> {
  // 1. Regenerate node ID if on different machine
  await regenerateNodeId(prisma)

  // 2. Clear sync event queue
  await prisma.syncEvents.deleteMany()

  // 3. Reset sync metrics
  await resetSyncMetrics(prisma)

  // 4. Resume sync sessions
  await resumeSyncSessions(prisma)

  // 5. Reconnect devices
  await reconnectWiFiDevices(prisma)
}
```

---

### Phase 4: Validation & Safety (Priority: MEDIUM)

#### Task 4.1: Pre-Restore FK Validation
**Files to create**: `src/lib/backup-validation.ts`

**Implementation**:
```typescript
export async function validateForeignKeys(
  backupData: any
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  // Check all FK references exist in backup
  // Example: BarcodePrintJobs.templateId -> BarcodeTemplates.id
  const printJobs = backupData.barcodePrintJobs || []
  const templates = backupData.barcodeTemplates || []
  const templateIds = new Set(templates.map((t: any) => t.id))

  for (const job of printJobs) {
    if (!templateIds.has(job.templateId)) {
      errors.push(`Print job ${job.id} references missing template ${job.templateId}`)
    }
  }

  // ... repeat for all FK relationships

  return { valid: errors.length === 0, errors }
}
```

**Integration**: Call in POST /api/backup route before restore

---

#### Task 4.2: Orphan Record Cleanup
**Files to create**: `src/lib/backup-cleanup.ts`

**Implementation**:
```typescript
export async function cleanupOrphanedRecords(
  prisma: PrismaClient
): Promise<{ deleted: number; tables: string[] }> {
  let totalDeleted = 0
  const affectedTables: string[] = []

  // Find and delete orphaned records
  // Example: WiFi tokens without valid business
  const orphanedTokens = await prisma.wifiTokens.findMany({
    where: {
      tokenConfigurations: {
        businessId: null
      }
    }
  })

  if (orphanedTokens.length > 0) {
    await prisma.wifiTokens.deleteMany({
      where: { id: { in: orphanedTokens.map(t => t.id) } }
    })
    totalDeleted += orphanedTokens.length
    affectedTables.push('wifiTokens')
  }

  // ... repeat for all tables with nullable FKs

  return { deleted: totalDeleted, tables: affectedTables }
}
```

**Integration**: Call after restore completes

---

### Phase 5: Performance & UX (Priority: LOW)

#### Task 5.1: Add Compression
**Files to modify**: `src/app/api/backup/route.ts`

**Implementation**:
```typescript
import zlib from 'zlib'

// In GET endpoint:
const compressed = searchParams.get('compress') === 'true'

if (compressed) {
  const jsonString = JSON.stringify(backupData)
  const gzipped = zlib.gzipSync(jsonString)

  return new NextResponse(gzipped, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}.gz"`,
      'Content-Encoding': 'gzip'
    }
  })
}
```

---

#### Task 5.2: Streaming Support
**Files to modify**: `src/app/api/backup/route.ts`

**Implementation**: Use Node.js streams for large backups
```typescript
import { Readable } from 'stream'

// Stream backup data in chunks instead of loading all into memory
```

---

#### Task 5.3: Progress Reporting Enhancement
**Files to modify**: `src/lib/backup-progress.ts`

**Enhancements**:
- Add estimated time remaining
- Add transfer speed
- Add memory usage tracking
- Add per-table progress bars in UI

---

### Phase 6: Testing & Validation (Priority: HIGH)

#### Task 6.1: Unit Tests
**Files to create**:
- `src/lib/__tests__/backup-clean.new-tables.test.ts`
- `src/lib/__tests__/restore-clean.new-tables.test.ts`
- `src/lib/__tests__/backup-hooks.test.ts`
- `src/lib/__tests__/backup-validation.test.ts`

**Test Cases**:
1. Backup includes all new tables
2. Restore order preserves FK integrity
3. Idempotent restore (run twice = same result)
4. Business-specific backup excludes other businesses
5. Demo filtering works correctly
6. Sync hooks execute properly
7. FK validation catches errors
8. Orphan cleanup works

---

#### Task 6.2: Integration Tests
**Scenarios**:
1. **Full Backup → Full Restore**
   - Backup all data
   - Clear database
   - Restore
   - Verify all 143 tables restored correctly

2. **Business-Specific Backup → Restore**
   - Backup single business
   - Restore on different machine
   - Verify only that business data restored
   - Verify no orphaned references

3. **Production Backup (No Demos) → Restore**
   - Backup with `includeDemoData: false`
   - Verify demo businesses excluded
   - Restore and verify

4. **Cross-Machine Restore**
   - Backup on Machine A
   - Restore on Machine B
   - Verify node ID regeneration
   - Verify sync system works

5. **Multiple Restore Test**
   - Restore same backup 3 times
   - Verify database state identical each time

6. **With Active Sync**
   - Create backup while sync active
   - Restore while sync active
   - Verify no data corruption

---

#### Task 6.3: Performance Testing
**Metrics to Track**:
- Backup creation time (target: < 5 minutes for 100K records)
- Restore time (target: < 10 minutes for 100K records)
- Memory usage (target: < 1GB peak)
- File size (target: < 100MB compressed for typical database)

---

### Phase 7: Documentation (Priority: MEDIUM)

#### Task 7.1: Update User Documentation
**Files to create/update**:
- `docs/backup-restore-guide.md` - User guide
- `docs/backup-restore-api.md` - API reference
- `README.md` - Update backup/restore section

**Content**:
- How to create backups
- How to restore backups
- Best practices
- Troubleshooting guide
- FAQ

---

#### Task 7.2: Developer Documentation
**Files to create**:
- `docs/backup-restore-architecture.md`
- `docs/table-dependency-graph.md`
- `docs/sync-integration.md`

**Content**:
- System architecture
- Table dependency graph (visual)
- Adding new tables to backup
- Sync integration details

---

## Part 6: Risk Assessment

### High Risk
1. **Data Loss**: Incorrect restore order could cause FK violations and data loss
   - **Mitigation**: Comprehensive testing, FK validation

2. **Sync Corruption**: Restore during active sync could corrupt data
   - **Mitigation**: Pre-restore hooks to pause sync

3. **Performance**: Large backups could timeout or crash
   - **Mitigation**: Batch processing, streaming, compression

### Medium Risk
1. **Orphaned Records**: Selective backups leave dangling references
   - **Mitigation**: Orphan cleanup, FK validation

2. **Non-Idempotent Restore**: Running restore multiple times creates duplicates
   - **Mitigation**: Upsert-based restore (already implemented)

### Low Risk
1. **Version Compatibility**: Backup from older version may not restore
   - **Mitigation**: Version checking, migration scripts

---

## Part 7: Timeline Estimate

### Phase 1: Analysis & Planning - **COMPLETED** ✅
**Duration**: 4 hours

### Phase 2: Add Critical Tables
**Duration**: 6-8 hours
- Task 2.1 (Barcode): 1.5 hours
- Task 2.2 (Permissions): 1 hour
- Task 2.3 (ESP32): 2 hours
- Task 2.4 (R710): 2 hours
- Task 2.5 (Support): 1.5 hours

### Phase 3: Sync Integration
**Duration**: 4-6 hours
- Task 3.1 (Tables): 1 hour
- Task 3.2 (Pre-hooks): 2 hours
- Task 3.3 (Post-hooks): 2 hours

### Phase 4: Validation & Safety
**Duration**: 4-6 hours
- Task 4.1 (FK Validation): 3 hours
- Task 4.2 (Orphan Cleanup): 2 hours

### Phase 5: Performance & UX
**Duration**: 3-4 hours
- Task 5.1 (Compression): 1 hour
- Task 5.2 (Streaming): 2 hours
- Task 5.3 (Progress): 1 hour

### Phase 6: Testing
**Duration**: 8-12 hours
- Task 6.1 (Unit Tests): 4 hours
- Task 6.2 (Integration Tests): 6 hours
- Task 6.3 (Performance): 2 hours

### Phase 7: Documentation
**Duration**: 3-4 hours
- Task 7.1 (User Docs): 2 hours
- Task 7.2 (Developer Docs): 2 hours

**Total Estimate**: 28-40 hours (3.5 - 5 days)

---

## Part 8: Recommended Approach

### Option A: Full Implementation (Recommended for Production)
**Phases**: All (1-7)
**Duration**: 28-40 hours
**Pros**: Comprehensive, safe, production-ready
**Cons**: Time-intensive

### Option B: Phased Rollout (Recommended for Fast Iteration)
**Phase 1**: Critical Tables (2.1-2.5)
**Phase 2**: Sync Integration (3.1-3.3)
**Phase 3**: Testing (6.1-6.2)
**Duration**: 18-26 hours
**Pros**: Faster time to value, incremental risk
**Cons**: Missing performance optimizations initially

### Option C: Minimal Viable (For Immediate Needs)
**Phase 1**: Critical Tables (2.1-2.5) only
**Duration**: 6-8 hours
**Pros**: Fastest, covers most important data
**Cons**: No sync integration, no validation

---

## Part 9: Success Criteria

### Must Have ✅
1. All 28 critical tables backed up and restored
2. FK integrity maintained across restore
3. Idempotent restore (run multiple times = same result)
4. Business-specific backups work correctly
5. Demo filtering works correctly
6. Sync integration (pause/resume)
7. Basic error handling and logging

### Should Have 🎯
1. FK validation before restore
2. Orphan record cleanup
3. Pre/post restore hooks
4. Comprehensive test coverage
5. User documentation

### Nice to Have 🌟
1. Compression support
2. Streaming for large backups
3. Performance metrics
4. Developer documentation
5. Progress reporting enhancements

---

## Part 10: Next Steps

### Immediate Action Items:
1. **Review this plan** with stakeholders
2. **Choose implementation approach** (A, B, or C)
3. **Prioritize phases** based on business needs
4. **Set timeline** for each phase
5. **Assign resources** if multiple developers

### Once Approved:
1. Create feature branch: `feature/backup-restore-revamp`
2. Start with Phase 2: Add Critical Tables
3. Test each table group before moving to next
4. Deploy to staging environment for integration testing
5. Run full test suite before production deployment

---

## Questions for Stakeholder Review

1. **Which implementation approach** do you prefer (A, B, or C)?

2. **Are there any tables in "Group C" or "Group D"** that should be promoted to critical?

3. **Should we include chat system tables**? (Currently marked as optional/low priority)

4. **What is the acceptable backup file size**? (Compression needed?)

5. **What is the acceptable backup/restore time**? (For SLA definition)

6. **Should we support versioned backups**? (Keep multiple backup versions)

7. **Should sync infrastructure tables be backed up**? (Or regenerated fresh on each machine?)

8. **Are there any compliance/audit requirements** we should consider?

---

## Conclusion

This plan provides a comprehensive approach to revamping the backup/restore system to cover all 143 database tables while maintaining data integrity, sync compatibility, and system stability. The modular phase structure allows for flexible implementation based on business priorities and resource availability.

**Recommended Next Step**: Review and approve this plan, then begin Phase 2 with Task 2.1 (Barcode Management Tables) as the highest priority critical feature.
