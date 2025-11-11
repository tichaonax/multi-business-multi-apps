# Periodic Sync - Automatic Table Tracking

## How Periodic Sync Works

The system uses **Prisma Client Extensions** to automatically track ALL database changes in real-time. Every `create`, `update`, `delete`, and `upsert` operation is automatically captured and queued for sync to peer nodes.

**Sync Interval**: Every 30 seconds (configurable)

## Tables Synced During Periodic Updates

### ✅ ALL User & Application Data Tables (~70+ tables)

The Prisma extension tracks changes on **ALL models** except sync infrastructure. This includes:

#### 1. Authentication & Users
- ✅ **Users** - User accounts, credentials, permissions
- ✅ **Accounts** - OAuth provider accounts (Google, GitHub, etc.)
- ❌ **Sessions** - NOT synced (ephemeral, users re-login on new server)
- ✅ **BusinessMemberships** - User access to businesses

#### 2. Employees (~15 tables)
- ✅ Employees
- ✅ EmployeeContracts
- ✅ EmployeeBenefits
- ✅ EmployeeLoans
- ✅ EmployeeLoanPayments
- ✅ EmployeeBonuses
- ✅ EmployeeDeductions
- ✅ EmployeeDeductionPayments
- ✅ EmployeeSalaryIncreases
- ✅ EmployeeAttendance
- ✅ EmployeeLeaveBalance
- ✅ EmployeeLeaveRequests
- ✅ EmployeeAllowances
- ✅ EmployeeTimeTracking
- ✅ EmployeeBusinessAssignments
- ✅ DisciplinaryActions

#### 3. Personal Finances
- ✅ Persons
- ✅ PersonalBudgets
- ✅ PersonalExpenses

#### 4. Business Data (~14 tables)
- ✅ Businesses
- ✅ BusinessCategories
- ✅ BusinessBrands
- ✅ BusinessSuppliers
- ✅ BusinessCustomers
- ✅ BusinessProducts
- ✅ ProductVariants
- ✅ ProductImages (including image file content)
- ✅ BusinessStockMovements
- ✅ BusinessOrders
- ✅ BusinessOrderItems
- ✅ BusinessTransactions
- ✅ BusinessAccounts
- ✅ BusinessLocations

#### 5. Vehicles & Fleet (~10 tables)
- ✅ Vehicles
- ✅ VehicleDrivers
- ✅ VehicleLicenses
- ✅ VehicleMaintenanceRecords
- ✅ VehicleMaintenanceServices
- ✅ VehicleMaintenanceServiceExpenses
- ✅ VehicleExpenses
- ✅ VehicleTrips
- ✅ VehicleReimbursements
- ✅ DriverAuthorizations

#### 6. Construction Projects (~6 tables)
- ✅ ConstructionProjects
- ✅ ProjectContractors
- ✅ ProjectStages
- ✅ StageContractorAssignments
- ✅ ConstructionExpenses
- ✅ ProjectTransactions

#### 7. Inter-Business Loans
- ✅ InterBusinessLoans
- ✅ LoanTransactions

#### 8. Customer Layby/Layaway
- ✅ CustomerLayby
- ✅ CustomerLaybyPayment

#### 9. Reference/Lookup Tables (~11 tables)
- ✅ FundSources
- ✅ BenefitTypes
- ✅ CompensationTypes
- ✅ JobTitles
- ✅ PermissionTemplates
- ✅ IdFormatTemplates
- ✅ DriverLicenseTemplates
- ✅ ExpenseCategories
- ✅ ExpenseSubcategories
- ✅ ExpenseDomains
- ✅ ProjectTypes

#### 10. Chat & Collaboration
- ✅ ChatRooms
- ✅ ChatParticipants
- ✅ ChatMessages

## Excluded Tables (NOT Synced)

These tables are excluded because they're sync infrastructure or server-specific:

- ❌ Sessions - Ephemeral, users re-login on new server
- ❌ VerificationTokens - Email verification, server-specific
- ❌ AuditLogs - Can be server-specific (optional)
- ❌ SyncNodes - Sync infrastructure
- ❌ SyncEvents - Sync infrastructure
- ❌ ConflictResolutions - Sync infrastructure
- ❌ SyncSessions - Sync infrastructure
- ❌ NetworkPartitions - Sync infrastructure
- ❌ SyncMetrics - Sync infrastructure
- ❌ SyncConfigurations - Sync infrastructure
- ❌ InitialLoadSessions - Sync infrastructure

## Demo Data Filtering

Both initial load and periodic sync automatically filter out demo business data:
- Any business with ID containing `-demo-business`, `-demo`, or starting with `demo-`
- All related records (products, orders, etc.) linked to demo businesses

## Implementation Files

- **`src/lib/sync/prisma-extension.ts`** - Automatic change tracking for all models
- **`src/lib/sync/change-tracker.ts`** - Core change tracking with vector clocks
- **`src/lib/sync/sync-helper.ts`** - Helper functions for sync operations
- **`src/lib/sync/database-hooks.ts`** - Database-level hooks

## How It Works

1. **Application makes change**: `prisma.users.create({ ... })`
2. **Extension intercepts**: Captures operation, record ID, and data
3. **Change tracked**: Creates SyncEvent with vector clock
4. **Queued for sync**: Event stored in sync_events table
5. **Periodic sync**: Every 30s, unprocessed events sent to peers
6. **Peer receives**: Remote server applies change with UPSERT
7. **Marked processed**: Event marked as synced

## Performance Notes

- ⚠️ **Bulk Operations** (`updateMany`, `deleteMany`) are logged but not tracked individually
- ✅ **Individual Operations** are fully tracked with before/after data
- ✅ **Vector Clocks** ensure causality and detect concurrent updates
- ✅ **Lamport Clocks** provide total ordering of events
- ✅ **Checksum Verification** ensures data integrity during transfer

## Result

✅ **Complete automatic synchronization** of all user, business, employee, vehicle, and project data
✅ **Real-time change tracking** on all CRUD operations
✅ **30-second sync interval** ensures data freshness
✅ **Demo data automatically filtered** from sync
✅ **Users can work on any server** - changes propagate automatically
