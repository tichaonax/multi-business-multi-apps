/**
 * Clean Restore Implementation
 * Restores backup data deterministically using upsert operations
 * Ensures same backup can be restored multiple times with identical results
 *
 * Features:
 * - Smart device detection: Skips device-specific data when restoring to different device
 * - Business data always restores with preserved IDs for cross-device sync
 * - Device data only restores to same device
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import os from 'os'

// Disable verbose logging in production for performance
const VERBOSE_LOGGING = process.env.VERBOSE_RESTORE_LOGGING === 'true'

type AnyPrismaClient = PrismaClient & any

/**
 * Device-specific tables that should NOT restore to different devices
 * These contain sync tracking metadata specific to the source device
 */
const DEVICE_SPECIFIC_TABLES = [
  'syncSessions',
  'fullSyncSessions',
  'syncNodes',
  'syncMetrics',
  'nodeStates',
  'syncEvents',
  'syncConfigurations',
  'offlineQueue',
  'deviceRegistry',
  'deviceConnectionHistory',
  'networkPartitions'
]

/**
 * Tables that depend on syncNodes (via networkPrinters.nodeId FK) and should
 * be skipped on cross-machine restores. NetworkPrinters references SyncNodes.nodeId,
 * and print jobs reference NetworkPrinters.id — so the whole chain fails when
 * the source machine's syncNode doesn't exist on the target.
 *
 * These are safe to skip: printers need to be re-registered on each machine,
 * and print jobs are historical queue entries (all COMPLETED).
 */
const PRINTER_TABLES_SKIP_CROSS_MACHINE = [
  'networkPrinters',
  'printJobs',
  'barcodePrintJobs'
]

/**
 * Get current node ID (matches backup-clean.ts implementation)
 */
async function getCurrentNodeId(prisma: PrismaClient): Promise<string> {
  const node = await (prisma as any).syncNodes.findFirst({
    where: { isActive: true },
    orderBy: { lastSeen: 'desc' }
  })

  if (node) {
    return node.id
  }

  // No node exists - generate temporary ID
  const hostname = os.hostname()
  const platform = os.platform()
  const random = crypto.randomBytes(8).toString('hex')
  return `node-${platform}-${hostname}-${random}`
}

/**
 * Restore order - dependencies first, then dependent tables
 * This ensures foreign key constraints are satisfied
 */
const RESTORE_ORDER = [
  // System settings (no dependencies)
  'systemSettings',

  // Reference data (no dependencies)
  'emojiLookup',
  'jobTitles',
  'compensationTypes',
  'benefitTypes',
  'idFormatTemplates',
  'driverLicenseTemplates',
  'projectTypes',
  'conflictResolutions',
  'dataSnapshots',

  // Payroll tax reference data (global, no FK dependencies)
  'payeTaxBrackets',        // PAYE tax brackets by year
  'payrollTaxConstants',    // NSSA + AIDS Levy rates by year

  // Inventory and expense reference data
  'inventoryDomains',
  'expenseDomains',
  'expenseCategories',
  'expenseSubcategories',
  'expenseSubSubcategories',      // Depends on expenseSubcategories

  // Users and authentication
  'users',
  'accounts',
  'permissions',  // Security permissions (no FK dependencies)
  'userPermissions',  // Depends on users and permissions
  'permissionTemplates',  // Depends on users via createdBy FK
  'seedDataTemplates',  // Depends on users via createdBy FK
  'paymentNotes',       // Depends on users (userId FK, optional)

  // Businesses (core entity)
  'businesses',
  'businessMemberships',
  'businessAccounts',
  'businessLocations',
  'businessBrands',

  // Business categories and suppliers (shared data)
  'businessCategories',
  'businessSuppliers',
  'supplierRatings',          // Depends on businesses, businessSuppliers, users
  'inventorySubcategories',

  // Persons (for various associations)
  'persons',

  // Images (binary photos — must come before employees which reference them)
  'images',

  // Employees and HR (two-pass: first without supervisorId, then update)
  'employees',
  'employeeContracts',
  'employeeBusinessAssignments',
  'employeeBenefits',
  'employeeAllowances',
  'employeeBonuses',
  'employeeDeductions',
  'employeeLoans',
  'employeeSalaryIncreases',
  'employeeLeaveRequests',
  'employeeLeaveBalance',
  'employeeAttendance',
  'employeeTimeTracking',
  'employeeLoginLog',           // depends on employees
  'externalClockIn',            // depends on businesses
  'disciplinaryActions',
  'employeeDeductionPayments',
  'employeeLoanPayments',
  'contractBenefits',
  'contractRenewals',
  'employeeAbsences',           // depends on businesses + employees
  'perDiemEntries',             // depends on businesses + employees + users

  // Products and inventory
  'businessProducts',
  'productVariants',
  'productBarcodes',
  'productImages',
  'productAttributes',
  'businessStockMovements',
  'productPriceChanges',      // Product price audit trail
  'clothingBaleCategories',   // No FK dependencies (reference table)
  'clothingBales',            // Depends on businesses, clothingBaleCategories, employees
  'clothingBaleBogoHistory',       // Depends on clothingBales, users
  'clothingLabelPrintHistory',     // Depends on clothingBales (nullable), businesses, users

  // Customers and orders
  'businessCustomers',
  'businessOrders',
  'businessOrderItems',
  'businessTransactions',
  'customerLaybys',
  'customerLaybyPayments',

  // Promo Campaigns, Coupons and Customer Rewards
  'promoCampaigns',           // Depends on businesses
  'customerRewards',          // Depends on businesses, businessCustomers, promoCampaigns, businessOrders
  'coupons',                  // Depends on businesses, employees
  'couponUsages',             // Depends on coupons, businessOrders, employees

  // Meal Program (participants and config before transactions)
  'mealProgramParticipants',  // Depends on businesses, employees, persons, users
  'mealProgramEligibleItems', // Depends on businesses, businessProducts, users

  // Saved reports and display ads
  'savedReports',             // Depends on businesses, users
  'customerDisplayAds',       // Depends on businesses
  'posTerminalConfigs',       // Depends on businesses

  // Expense accounts (order matters: grants/lenders/loans before deposits; ledger before payments)
  'expenseAccounts',
  'expenseAccountGrants',       // depends on expenseAccounts + users
  'expenseAccountAutoDeposits', // depends on expenseAccounts + businesses
  'businessRentConfigs',        // depends on expenseAccounts + businesses + businessSuppliers
  'personalDepositSources',     // no FK dependencies (reference table)
  'expenseAccountLenders',      // no FK dependencies (reference table)
  'expenseAccountLoans',        // depends on expenseAccounts + expenseAccountLenders
  'fundSources',                // MUST come before expenseAccountDeposits (deposits FK → fundSources)
  'expenseAccountDeposits',     // depends on expenseAccounts + personalDepositSources + expenseAccountLoans + fundSources
  'businessTransferLedger',     // depends on expenseAccounts
  'groupedEODRuns',             // depends on businesses (no expense account FK)
  'groupedEODRunDates',         // depends on groupedEODRuns
  'eodPaymentBatches',          // depends on businesses — MUST come before paymentBatchSubmissions
  'paymentBatchSubmissions',    // depends on eodPaymentBatches + expenseAccounts + expenseAccountDeposits
  'expenseAccountPayments',     // depends on expenseAccounts + businessTransferLedger + paymentBatchSubmissions + eodPaymentBatches
  'expensePaymentVouchers',     // depends on expenseAccountPayments + businesses + employees
  'supplierPaymentRequests',    // Depends on businesses, businessSuppliers, expenseAccounts, users
  'supplierPaymentRequestItems', // Depends on supplierPaymentRequests, expenseCategories, expenseSubcategories
  'supplierPaymentRequestPartials', // Depends on supplierPaymentRequests, expenseAccountPayments, users
  'cashAllocationReports',      // depends on businesses + groupedEODRuns
  'cashAllocationLineItems',    // depends on cashAllocationReports + expenseAccountDeposits
  'cashBucketEntries',          // depends on businesses + users
  'pettyCashRequests',          // depends on businesses + expenseAccounts + expenseAccountDeposits + expenseAccountPayments
  'pettyCashTransactions',      // depends on pettyCashRequests + expenseAccountPayments
  'paymentReversalLogs',        // depends on businesses + users + pettyCashRequests

  // Payroll
  'payrollAccounts',
  'payrollAccountDeposits',     // Depends on payrollAccounts
  'payrollAccountPayments',     // Depends on payrollAccounts
  'payrollPaymentVouchers',     // Depends on payrollAccountPayments
  'accountOutgoingLoans',       // Depends on expenseAccounts + payrollAccounts
  'accountOutgoingLoanPayments', // Depends on accountOutgoingLoans
  'businessLoans',              // Depends on expenseAccounts + users (no businessId FK)
  'businessLoanManagers',       // Depends on businessLoans + users
  'businessLoanExpenses',       // Depends on businessLoans + users
  'businessLoanPreLockRepayments', // Depends on businessLoans + users
  'loanWithdrawalRequests',     // Depends on businessLoans + expenseAccountPayments
  'payrollPeriods',
  'payrollEntries',
  'payrollEntryBenefits',
  'payrollExports',
  'payrollAdjustments',
  'payrollSlips',               // Depends on payrollPeriods + payrollEntries
  'payrollZimraRemittances',    // Depends on payrollPeriods
  'mealProgramTransactions',    // Depends on mealProgramParticipants, businessOrders, expenseAccounts, employees, users

  // Personal finance
  'personalBudgets',
  'personalExpenses',

  // Projects
  'projects',
  'projectStages',
  'projectContractors',
  'projectTransactions',
  'constructionProjects',
  'constructionExpenses',
  'stageContractorAssignments',

  // Vehicles
  'vehicles',
  'vehicleDrivers',
  'vehicleExpenses',
  'vehicleLicenses',
  'driverAuthorizations',  // MUST come before vehicleTrips (composite FK dependency)
  'vehicleMaintenanceRecords',
  'vehicleMaintenanceServices',
  'vehicleMaintenanceServiceExpenses',
  'vehicleTrips',  // Depends on driverAuthorizations via composite FK
  'vehicleReimbursements',

  // WiFi Portal - Token Configurations (ESP32 system)
  'tokenConfigurations',  // Must come before wifiTokens and businessTokenMenuItems
  'businessTokenMenuItems',  // Depends on tokenConfigurations and businesses
  'wifiTokens',  // Depends on tokenConfigurations and businesses
  'wifiTokenDevices',  // Depends on wifiTokens
  'wifiTokenSales',  // Depends on wifiTokens and businesses
  'wiFiUsageAnalytics',  // Depends on businesses

  // WiFi Portal - R710 System (must come before menuComboItems!)
  'r710DeviceRegistry',  // No FK dependencies
  'r710BusinessIntegrations',  // Depends on businesses and r710DeviceRegistry
  'r710Wlans',  // Depends on businesses and r710DeviceRegistry
  'r710TokenConfigs',  // Depends on businesses - CRITICAL: menuComboItems references this!
  'r710Tokens',  // Depends on r710TokenConfigs and businesses
  'r710TokenSales',  // Depends on r710Tokens and businesses
  'r710DeviceTokens',  // Depends on r710Tokens
  'r710BusinessTokenMenuItems',  // Depends on r710TokenConfigs and businesses
  'r710SyncLogs',  // No critical FKs

  // Restaurant/Menu (AFTER r710TokenConfigs!)
  'menuItems',
  'menuCombos',
  'menuComboItems',  // Depends on menuCombos AND r710TokenConfigs (tokenConfigId FK)
  'menuPromotions',
  'orders',
  'orderItems',

  // Barcode Management System
  'networkPrinters',  // No FK dependencies (device-level)
  'barcodeTemplates',  // Depends on businesses
  'barcodeInventoryItems',  // Depends on businesses
  'barcodePrintJobs',  // Depends on businesses
  'printJobs',  // Depends on businesses
  'reprintLog',  // Depends on businesses

  // Portal Integrations
  'portalIntegrations',  // Depends on businesses

  // SKU Sequences
  'skuSequences',  // Depends on businesses

  // MAC ACL
  'macAclEntry',  // No FK dependencies

  // Miscellaneous
  'supplierProducts',
  'inventoryTransfers',       // depends on businesses + employees
  'inventoryTransferItems',   // depends on inventoryTransfers + productVariants
  'interBusinessLoans',
  'loanTransactions',
  'receiptSequences',

  // Chat
  'chatRooms',          // Depends on users
  'chatMessages',       // Depends on chatRooms, users
  'chatParticipants',   // Depends on chatRooms, users

  // Notifications
  'appNotifications',   // Depends on users

  // Chicken Run Management (MBM-145)
  'chickenRunSettings',          // Depends on businesses (@unique businessId)
  'chickenVaccinationSchedules', // Depends on businesses
  'chickenBatches',              // Depends on businesses + businessSuppliers
  'chickenMortality',            // Depends on chickenBatches
  'chickenFeedLogs',             // Depends on chickenBatches + businessSuppliers
  'chickenMedicationLogs',       // Depends on chickenBatches
  'chickenWeightLogs',           // Depends on chickenBatches
  'chickenVaccinationLogs',      // Depends on chickenBatches + chickenVaccinationSchedules
  'chickenCulling',              // Depends on chickenBatches
  'chickenInventory',            // Depends on chickenCulling + businesses + businessSuppliers
  'chickenBirdWeights',          // Depends on chickenCulling + chickenInventory
  'chickenInventoryMovements',   // Depends on chickenInventory
  'chickenUtilityCosts',         // Depends on businesses
  'chickenLaborLogs',            // Depends on businesses

  // Stock Take Workflow (depends on businesses, users, employees, businessProducts)
  'stockTakeDrafts',           // Depends on businesses, users
  'stockTakeDraftItems',       // Depends on stockTakeDrafts, businessProducts, productVariants
  'stockTakeReports',          // Depends on businesses, users, stockTakeDrafts
  'stockTakeReportEmployees',  // Depends on stockTakeReports, employees, users

  // Custom Bulk Products (depends on businesses, categories, suppliers, employees)
  'customBulkProducts',

  // Audit logs (optional — only present when backup was created with includeAuditLogs=true)
  'auditLogs'           // Depends on users
]

/**
 * Tables with self-referential or circular foreign keys that need two-pass restore
 * First pass: insert with these FK fields set to null
 * Second pass: update with actual FK values
 *
 * This handles:
 * - Self-referential FKs (e.g., employees.supervisorId → employees.id)
 * - Cross-table FKs that may reference records not yet created (e.g., employeeContracts.supervisorId → employees.id)
 */
const SELF_REFERENTIAL_TABLES: Record<string, string[]> = {
  'employees': ['supervisorId'],
  'employeeContracts': ['supervisorId']  // References employees.id - needs deferred insert
}

/**
 * Tables with unique constraints on non-ID fields
 * Maps table name to the unique field(s) to use for upsert matching
 */
const UNIQUE_CONSTRAINT_FIELDS: Record<string, string | { fields: string[] }> = {
  // Account tables with unique accountNumber
  'payrollAccounts': 'accountNumber',
  'expenseAccounts': 'accountNumber',

  // Expense account grants (composite unique)
  'expenseAccountGrants': { fields: ['expenseAccountId', 'userId'] },

  // Type/lookup tables with unique name
  'projectTypes': 'name',
  'benefitTypes': 'name',
  'compensationTypes': 'name',
  'expenseDomains': 'name',
  'inventoryDomains': 'name',
  'expensePaymentVouchers': 'paymentId',
  'permissions': 'name',
  'jobTitles': 'title',

  // Promo system unique constraints
  'customerRewards': 'couponCode',

  // Coupons: unique on (businessId, code) — cross-server restores can have same code, different id
  'coupons': { fields: ['businessId', 'code'] },

  // SupplierRatings: unique on (supplierId, businessId, ratedBy)
  'supplierRatings': { fields: ['supplierId', 'businessId', 'ratedBy'] },

  // Business Rent Config: unique on businessId
  'businessRentConfigs': 'businessId',

  // Expense Account Auto Deposits: unique on (businessId, expenseAccountId)
  'expenseAccountAutoDeposits': { fields: ['businessId', 'expenseAccountId'] },

  // Business Loan Managers: unique on (loanId, userId)
  'businessLoanManagers': { fields: ['loanId', 'userId'] },

  // Loan Withdrawal Requests: unique on requestNumber
  'loanWithdrawalRequests': 'requestNumber',

  // Chicken Run Settings: unique on businessId
  'chickenRunSettings': 'businessId',

  // Chicken Batches: unique on batchNumber
  'chickenBatches': 'batchNumber',

}

// (Composite unique and child dependency configs removed — replaced by ID remapping approach)

/**
 * Model name mappings (backup table names to Prisma model names)
 */
const TABLE_TO_MODEL_MAPPING: Record<string, string> = {
  'customerLaybys': 'customerLayby',
  'customerLaybyPayments': 'customerLaybyPayment',
  'customerDisplayAds': 'customerDisplayAd',
  'posTerminalConfigs': 'posTerminalConfig',
  // EOD / Cash Box
  'eodPaymentBatches': 'eODPaymentBatch',
  'cashBucketEntries': 'cashBucketEntry',
  'groupedEODRuns': 'groupedEODRun',
  'groupedEODRunDates': 'groupedEODRunDate',
  'cashAllocationReports': 'cashAllocationReport',
  'cashAllocationLineItems': 'cashAllocationLineItem',
  // Petty Cash / Per Diem
  'pettyCashTransactions': 'pettyCashTransaction',
  'paymentReversalLogs': 'paymentReversalLog',
  // Business Loans
  'businessLoans': 'businessLoan',
  'businessLoanManagers': 'businessLoanManager',
  'businessLoanExpenses': 'businessLoanExpense',
  'businessLoanPreLockRepayments': 'businessLoanPreLockRepayment',
  'loanWithdrawalRequests': 'loanWithdrawalRequest',
  // Expense Account Auto Deposits / Rent Config
  'expenseAccountAutoDeposits': 'expenseAccountAutoDeposit',
  'businessRentConfigs': 'businessRentConfig',
  // Notifications
  'appNotifications': 'appNotification',
  // Chicken Run
  'chickenBatches': 'chickenBatch',
  'chickenFeedLogs': 'chickenFeedLog',
  'chickenMedicationLogs': 'chickenMedicationLog',
  'chickenWeightLogs': 'chickenWeightLog',
  'chickenVaccinationSchedules': 'chickenVaccinationSchedule',
  'chickenVaccinationLogs': 'chickenVaccinationLog',
  'chickenBirdWeights': 'chickenBirdWeight',
  'chickenInventoryMovements': 'chickenInventoryMovement',
  'chickenUtilityCosts': 'chickenUtilityCost',
  'chickenLaborLogs': 'chickenLaborLog',
}

/**
 * Model name mappings (snake_case to camelCase)
 */
function findPrismaModelName(prisma: AnyPrismaClient, name: string): string {
  // Check explicit mappings first (handles plural → singular conversions)
  if (TABLE_TO_MODEL_MAPPING[name]) {
    return TABLE_TO_MODEL_MAPPING[name]
  }

  // Direct match
  if ((prisma as any)[name]) return name

  // Convert snake_case to camelCase
  const camel = name.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
  if ((prisma as any)[camel]) return camel

  // Try lowercase comparison
  const lower = name.toLowerCase().replace(/_/g, '')
  for (const key of Object.keys(prisma)) {
    if (key.toLowerCase().replace(/_/g, '') === lower) {
      return key
    }
  }

  return name
}

/**
 * Restore data from backup using upsert operations
 * This ensures deterministic results - same backup = same database state
 *
 * Features:
 * - Batch processing to prevent timeouts
 * - Progress callbacks for UI updates
 * - Error tracking without stopping restore
 * - Proper dependency ordering
 */
export async function restoreCleanBackup(
  prisma: AnyPrismaClient,
  backupData: any,
  options: {
    onProgress?: (model: string, processed: number, total: number) => void
    onError?: (model: string, recordId: string | undefined, error: string) => void
    batchSize?: number // Number of records to process in each batch
  } = {}
): Promise<{
  success: boolean
  processed: number
  errors: number
  errorLog: Array<{ model: string; recordId?: string; error: string }>
  skippedRecords: number
  skippedReasons: {
    foreignKeyErrors: number
    validationErrors: number
    otherErrors: number
  }
  modelCounts: Record<string, { attempted: number; successful: number; skipped: number }>
  deviceMismatch?: boolean
  skippedDeviceData?: boolean
}> {
  const { onProgress, onError, batchSize = 100 } = options

  /**
   * Retry any DB operation that fails with "Unknown argument `field`".
   * Backup data may contain fields added after the Prisma client was generated,
   * or fields removed in later migrations. Auto-strip and retry up to 15 times.
   */
  async function withUnknownFieldRetry<T>(
    record: Record<string, any>,
    fn: (r: Record<string, any>) => Promise<T>
  ): Promise<T> {
    const current = { ...record }
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        return await fn(current)
      } catch (err: any) {
        const msg: string = err?.message || ''
        const match = msg.match(/Unknown argument `([^`]+)`/)
        if (match) {
          delete current[match[1]]
          continue
        }
        throw err
      }
    }
    throw new Error('withUnknownFieldRetry: too many unknown fields stripped — aborting record')
  }

  let totalProcessed = 0
  let totalErrors = 0
  let totalSkipped = 0
  const errorLog: Array<{ model: string; recordId?: string; error: string }> = []
  const skippedReasons = {
    foreignKeyErrors: 0,
    validationErrors: 0,
    otherErrors: 0
  }
  const modelCounts: Record<string, { attempted: number; successful: number; skipped: number }> = {}

  console.log('[restore-clean] Starting restore process...')
  console.log('[restore-clean] Backup version:', backupData.metadata?.version)
  console.log('[restore-clean] Backup timestamp:', backupData.metadata?.timestamp)
  console.log('[restore-clean] Batch size:', batchSize)

  // === DEVICE DETECTION ===
  // Check if backup is from same device or different device
  const currentNodeId = await getCurrentNodeId(prisma)
  const backupSourceNodeId = backupData.metadata?.sourceNodeId
  const isSameDevice = currentNodeId === backupSourceNodeId
  const hasDeviceData = backupData.deviceData && Object.keys(backupData.deviceData).length > 0

  console.log('[restore-clean] Device Detection:')
  console.log('  Current Device Node ID:', currentNodeId)
  console.log('  Backup Source Node ID:', backupSourceNodeId)
  console.log('  Same Device Restore:', isSameDevice ? 'YES' : 'NO')
  console.log('  Has Device Data:', hasDeviceData ? 'YES' : 'NO')

  let skippedDeviceData = false

  if (!isSameDevice && hasDeviceData) {
    console.warn('[restore-clean] ⚠️  DEVICE MISMATCH DETECTED')
    console.warn('[restore-clean] Backup is from a different device')
    console.warn('[restore-clean] Device-specific sync data will be SKIPPED')
    console.warn('[restore-clean] Only business data will be restored')
    skippedDeviceData = true
  }

  // Determine which data to restore
  const dataSources: Array<{ source: any; sourceType: 'business' | 'device' }> = []

  // Always restore business data
  dataSources.push({ source: backupData.businessData || backupData, sourceType: 'business' })

  // Only restore device data if same device
  if (isSameDevice && hasDeviceData) {
    console.log('[restore-clean] Including device-specific data (same device restore)')
    dataSources.push({ source: backupData.deviceData, sourceType: 'device' })
  }

  // === ID REMAPPING for all restores (cross-machine AND same-device re-seeded databases) ===
  // Reference data (domains, categories, etc.) may exist in the target DB with different IDs
  // but the same unique key values — this happens after a DB re-seed or cross-machine restore.
  // We build a mapping: backup_id → target_id. Then for every record being restored, we remap
  // FK fields to use the target's IDs. This preserves ALL target data and prevents P2002/P2003
  // errors from ID mismatches in reference tables.
  const idRemap: Map<string, string> = new Map()

  {
    console.log('[restore-clean] Building ID remap for reference data (same-device and cross-machine)...')
    const bd = backupData.businessData || backupData

    // Build remap for tables with single-field unique constraints (name-based)
    const SINGLE_UNIQUE_REMAP: Record<string, string> = {
      'inventoryDomains': 'name',
      'expenseDomains': 'name',
      'projectTypes': 'name',
      'benefitTypes': 'name',
      'compensationTypes': 'name',
      'jobTitles': 'title',
      'permissions': 'name',
    }

    for (const [tableName, uniqueField] of Object.entries(SINGLE_UNIQUE_REMAP)) {
      const backupRecords = bd[tableName]
      if (!backupRecords || !Array.isArray(backupRecords) || backupRecords.length === 0) continue

      const modelName = findPrismaModelName(prisma, tableName)
      const model = prisma[modelName]
      if (!model || typeof model.findFirst !== 'function') continue

      for (const record of backupRecords) {
        if (!record.id || !record[uniqueField]) continue
        try {
          const existing = await model.findFirst({
            where: { [uniqueField]: record[uniqueField] },
            select: { id: true }
          })
          if (existing && existing.id !== record.id) {
            idRemap.set(record.id, existing.id)
          }
        } catch { /* skip on error */ }
      }
    }

    // Build remap for tables with composite unique constraints
    const COMPOSITE_UNIQUE_REMAP: Record<string, string[]> = {
      'businessCategories': ['businessType', 'name'],  // domainId excluded — it may itself be remapped
      'expenseCategories': ['name'],                    // domainId excluded — may be remapped
      'inventorySubcategories': ['name'],               // categoryId excluded — may be remapped
      'expenseSubcategories': ['name'],                 // categoryId excluded — may be remapped
      'expenseSubSubcategories': ['name'],              // subcategoryId excluded — may be remapped
      // Meal program — participants and eligible items can be re-created with different IDs
      'mealProgramParticipants': ['businessId', 'employeeId'],  // @@unique([businessId, employeeId])
      'mealProgramEligibleItems': ['businessId', 'productId'],  // @@unique([businessId, productId])
    }

    // Process in dependency order so parent remaps are available for children
    const REMAP_ORDER = [
      'businessCategories', 'expenseCategories', 'inventorySubcategories', 'expenseSubcategories', 'expenseSubSubcategories',
      'mealProgramParticipants', 'mealProgramEligibleItems',
    ]

    for (const tableName of REMAP_ORDER) {
      const uniqueFields = COMPOSITE_UNIQUE_REMAP[tableName]
      if (!uniqueFields) continue

      const backupRecords = bd[tableName]
      if (!backupRecords || !Array.isArray(backupRecords) || backupRecords.length === 0) continue

      const modelName = findPrismaModelName(prisma, tableName)
      const model = prisma[modelName]
      if (!model || typeof model.findFirst !== 'function') continue

      for (const record of backupRecords) {
        if (!record.id) continue

        // Build where clause using unique fields + any FK fields (remapped)
        const whereClause: Record<string, any> = {}
        let hasAllFields = true

        // Add the simple unique fields
        for (const field of uniqueFields) {
          if (record[field] !== undefined && record[field] !== null) {
            whereClause[field] = record[field]
          } else {
            hasAllFields = false
            break
          }
        }

        // Add FK fields (remapped) for more precise matching
        if (tableName === 'businessCategories' && record.domainId) {
          whereClause.domainId = idRemap.get(record.domainId) || record.domainId
        }
        if (tableName === 'expenseCategories' && record.domainId) {
          whereClause.domainId = idRemap.get(record.domainId) || record.domainId
        }
        if (tableName === 'inventorySubcategories' && record.categoryId) {
          whereClause.categoryId = idRemap.get(record.categoryId) || record.categoryId
        }
        if (tableName === 'expenseSubcategories' && record.categoryId) {
          whereClause.categoryId = idRemap.get(record.categoryId) || record.categoryId
        }
        if (tableName === 'expenseSubSubcategories' && record.subcategoryId) {
          whereClause.subcategoryId = idRemap.get(record.subcategoryId) || record.subcategoryId
        }
        // mealProgramParticipants and mealProgramEligibleItems use their own fields directly
        // (businessId and employeeId/productId are top-level IDs that should match)

        if (!hasAllFields) continue

        try {
          const existing = await model.findFirst({
            where: whereClause,
            select: { id: true }
          })
          if (existing && existing.id !== record.id) {
            idRemap.set(record.id, existing.id)
          }
        } catch { /* skip on error */ }
      }
    }

    console.log(`[restore-clean] ID remap built: ${idRemap.size} IDs need remapping`)
    if (VERBOSE_LOGGING) {
      for (const [from, to] of idRemap) {
        console.log(`  ${from} → ${to}`)
      }
    }
  }

  // Track self-referential updates for second pass
  const selfRefUpdates: Array<{ tableName: string; recordId: string; updates: Record<string, any> }> = []

  // Process each data source
  for (const { source, sourceType } of dataSources) {
    console.log(`[restore-clean] Processing ${sourceType} data...`)

    // Process each table in dependency order
    for (const tableName of RESTORE_ORDER) {
      const data = source[tableName]

      if (!data || !Array.isArray(data) || data.length === 0) {
        continue
      }

      // Skip printer-related tables on cross-machine restores
      // NetworkPrinters has FK to SyncNodes.nodeId which is device-specific
      // PrintJobs and BarcodePrintJobs have FK to NetworkPrinters.id
      if (!isSameDevice && PRINTER_TABLES_SKIP_CROSS_MACHINE.includes(tableName)) {
        console.log(`[restore-clean] Skipping ${tableName} (${data.length} records) — printer tables depend on device-specific syncNodes`)
        continue
      }

      const modelName = findPrismaModelName(prisma, tableName)
      const model = prisma[modelName]

      if (!model || typeof model.upsert !== 'function') {
        console.warn(`[restore-clean] Model ${modelName} not found or doesn't support upsert`)
        continue
      }

      console.log(`[restore-clean] Restoring ${tableName}: ${data.length} records`)

      // Check if this table has self-referential FKs
      const selfRefFields = SELF_REFERENTIAL_TABLES[tableName] || []
      const hasSelfRef = selfRefFields.length > 0

      // Check if this table has unique constraints on non-ID fields
      const uniqueConstraint = UNIQUE_CONSTRAINT_FIELDS[tableName]

      if (hasSelfRef) {
        console.log(`[restore-clean] ${tableName} has self-referential FK(s): ${selfRefFields.join(', ')} - using two-pass restore`)
      }

      // Initialize model counts
      if (!modelCounts[tableName]) {
        modelCounts[tableName] = { attempted: 0, successful: 0, skipped: 0 }
      }

      // Process records in batches to prevent timeouts
      const totalRecords = data.length
      for (let batchStart = 0; batchStart < totalRecords; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalRecords)
        const batch = data.slice(batchStart, batchEnd)

        if (VERBOSE_LOGGING) console.log(`[restore-clean] Processing ${tableName} batch: ${batchStart + 1}-${batchEnd}/${totalRecords}`)

        // Clean nested relations from records (backup should be flat)
        const cleanedBatch = batch.map((record: any) => {
          const cleaned = { ...record }
          // Remove common nested relation fields
          delete cleaned.product_variants
          delete cleaned.product_images
          delete cleaned.product_attributes
          delete cleaned.business_products
          delete cleaned.businesses
          delete cleaned.users
          delete cleaned.r710_tokens
          delete cleaned.wifi_tokens
          delete cleaned.menu_items
          // NOTE: Do NOT add generic array-field removal here.
          // Json columns (e.g. MealProgramTransactions.itemsSummary) store arrays as
          // valid scalar data. Removing all arrays would silently strip those values
          // and cause "Argument X is missing" errors from Prisma.

          // Convert JSON-serialized Buffer objects back to real Buffers
          // This handles bytea columns (e.g. images.data) that were serialized via JSON.stringify
          for (const [key, value] of Object.entries(cleaned)) {
            if (value && typeof value === 'object' && (value as any).type === 'Buffer' && Array.isArray((value as any).data)) {
              (cleaned as any)[key] = Buffer.from((value as any).data)
            }
          }

          return cleaned
        })

        for (let i = 0; i < cleanedBatch.length; i++) {
          const record = cleanedBatch[i]
          const globalIndex = batchStart + i
          let recordId = record.id

          modelCounts[tableName].attempted++

          if (!recordId && tableName !== 'receiptSequences') {
            console.warn(`[restore-clean] Record in ${tableName} has no ID, skipping`)
            totalErrors++
            totalSkipped++
            modelCounts[tableName].skipped++
            skippedReasons.validationErrors++
            errorLog.push({
              model: tableName,
              recordId: undefined,
              error: 'Record has no ID'
            })
            continue
          }

          try {
            // Prepare record for insert
            let recordToInsert = { ...record }

            // For self-referential tables: nullify self-ref FKs for first pass
            // and queue update for second pass
            if (hasSelfRef) {
              const selfRefValues: Record<string, any> = {}
              for (const field of selfRefFields) {
                if (record[field] != null) {
                  selfRefValues[field] = record[field]
                  recordToInsert[field] = null  // Nullify for first pass
                }
              }
              // Queue update for second pass if there are self-ref values
              if (Object.keys(selfRefValues).length > 0) {
                selfRefUpdates.push({
                  tableName,
                  recordId,
                  updates: selfRefValues
                })
              }
            }

            // === FK REMAPPING ===
            // For cross-machine restores, remap FK fields that reference IDs from the
            // source machine to the corresponding IDs on the target machine.
            // Also remap the record's own ID if it's in the mapping (i.e., the target
            // already has a record with the same unique key but different ID).
            if (idRemap.size > 0) {
              // Remap the record's own ID if needed
              const remappedId = idRemap.get(recordToInsert.id)
              if (remappedId) {
                recordToInsert.id = remappedId
              }

              // Remap all FK fields (any field ending in 'Id' except 'id' itself)
              for (const key of Object.keys(recordToInsert)) {
                if (key !== 'id' && key.endsWith('Id') && typeof recordToInsert[key] === 'string') {
                  const remapped = idRemap.get(recordToInsert[key])
                  if (remapped) {
                    recordToInsert[key] = remapped
                  }
                }
              }

              // Update recordId to match the remapped ID for upsert where clauses
              recordId = recordToInsert.id
            }

            // Use upsert to create or update
            // IMPORTANT: Preserves original IDs and timestamps
            // - create: record → Uses original ID, createdAt, updatedAt
            // - update: record → Explicitly provides updatedAt, overriding @updatedAt directive
            // This ensures restored data matches source database exactly

            // Special handling for models with composite unique constraints
            // CRITICAL: For tables with composite unique keys, we must preserve the backup's ID
            // because child records reference it. If an existing record has a different ID,
            // we must delete it first and recreate with the backup's ID.

            if (tableName === 'emojiLookup') {
              // EmojiLookup has unique constraint on [emoji, description]
              // This table has no child references, so simple upsert is fine
              await withUnknownFieldRetry(recordToInsert, r => model.upsert({
                where: { emoji_description: { emoji: record.emoji, description: record.description } },
                create: r,
                update: r
              }))
            } else if (tableName === 'receiptSequences') {
              // ReceiptSequences has composite PK (businessId, date) — no id field
              await withUnknownFieldRetry(recordToInsert, r => model.upsert({
                where: { businessId_date: { businessId: r.businessId, date: r.date } },
                create: r,
                update: { lastSequence: r.lastSequence, updatedAt: r.updatedAt }
              }))
            } else if (tableName === 'r710Wlans') {
              // R710Wlans has unique constraint on [deviceRegistryId, wlanId]
              // CRITICAL: r710TokenConfigs references r710Wlans.id, so we must preserve backup ID
              const existing = await model.findFirst({
                where: {
                  deviceRegistryId: recordToInsert.deviceRegistryId,
                  wlanId: recordToInsert.wlanId
                }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] r710Wlans: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              } else if (existing) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (tableName === 'r710BusinessIntegrations') {
              const existing = await model.findFirst({
                where: { businessId: recordToInsert.businessId, deviceRegistryId: recordToInsert.deviceRegistryId }
              })
              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] r710BusinessIntegrations: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              } else if (existing) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (tableName === 'r710BusinessTokenMenuItems') {
              const existing = await model.findFirst({
                where: { businessId: recordToInsert.businessId, tokenConfigId: recordToInsert.tokenConfigId }
              })
              if (existing && existing.id !== recordId) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] r710BusinessTokenMenuItems: Replacing existing record (${existing.id}) with backup record (${recordId})`)
                await model.delete({ where: { id: existing.id } })
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              } else if (existing) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (tableName === 'businessTokenMenuItems') {
              const existing = await model.findFirst({
                where: { businessId: recordToInsert.businessId, tokenConfigurationId: recordToInsert.tokenConfigurationId }
              })
              if (existing && existing.id !== recordId) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] businessTokenMenuItems: Replacing existing record (${existing.id}) with backup record (${recordId})`)
                await model.delete({ where: { id: existing.id } })
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              } else if (existing) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (tableName === 'employeeBusinessAssignments') {
              const existing = await model.findFirst({
                where: { employeeId: recordToInsert.employeeId, businessId: recordToInsert.businessId }
              })
              if (existing && existing.id !== recordId) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] employeeBusinessAssignments: Replacing existing record (${existing.id}) with backup record (${recordId})`)
                await model.delete({ where: { id: existing.id } })
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              } else if (existing) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (tableName === 'businessMemberships') {
              const existing = await model.findFirst({
                where: { userId: recordToInsert.userId, businessId: recordToInsert.businessId }
              })
              if (existing && existing.id !== recordId) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] businessMemberships: Replacing existing record (${existing.id}) with backup record (${recordId})`)
                await model.delete({ where: { id: existing.id } })
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              } else if (existing) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (tableName === 'userPermissions') {
              const existing = await model.findFirst({
                where: { userId: recordToInsert.userId, permissionId: recordToInsert.permissionId }
              })
              if (existing && existing.id !== recordId) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] userPermissions: Replacing existing record (${existing.id}) with backup record (${recordId})`)
                await model.delete({ where: { id: existing.id } })
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              } else if (existing) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (tableName === 'r710Tokens') {
              const existingById = await model.findUnique({ where: { id: record.id } })
              if (existingById) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: record.id }, data: r }))
              } else {
                const existingByUsername = await model.findFirst({ where: { username: recordToInsert.username } })
                if (existingByUsername) {
                  if (VERBOSE_LOGGING) console.log(`[restore-clean] r710Tokens: Deleting existing record with username=${record.username} (${existingByUsername.id}) to restore backup record (${record.id})`)
                  await model.delete({ where: { id: existingByUsername.id } })
                }
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (tableName === 'wifiTokens') {
              const existing = await model.findFirst({ where: { token: recordToInsert.token } })
              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] wifiTokens: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              } else if (existing) {
                await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
              }
            } else if (uniqueConstraint) {
              if (typeof uniqueConstraint === 'string' && record[uniqueConstraint]) {
                const existing = await model.findFirst({ where: { [uniqueConstraint]: record[uniqueConstraint] } })
                if (existing) {
                  await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
                } else {
                  await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
                }
              } else if (typeof uniqueConstraint === 'object' && uniqueConstraint.fields) {
                const whereClause: Record<string, any> = {}
                let hasAllFields = true
                for (const field of uniqueConstraint.fields) {
                  if (record[field] !== undefined && record[field] !== null) {
                    whereClause[field] = record[field]
                  } else {
                    hasAllFields = false
                    break
                  }
                }
                if (hasAllFields) {
                  const existing = await model.findFirst({ where: whereClause })
                  if (existing) {
                    await withUnknownFieldRetry(recordToInsert, r => model.update({ where: { id: existing.id }, data: r }))
                  } else {
                    await withUnknownFieldRetry(recordToInsert, r => model.create({ data: r }))
                  }
                } else {
                  await withUnknownFieldRetry(recordToInsert, r => model.upsert({ where: { id: recordId }, create: r, update: r }))
                }
              } else {
                await withUnknownFieldRetry(recordToInsert, r => model.upsert({ where: { id: recordId }, create: r, update: r }))
              }
            } else {
              // Default: use id for upsert
              await withUnknownFieldRetry(recordToInsert, r => model.upsert({ where: { id: recordId }, create: r, update: r }))
            }

            totalProcessed++
            modelCounts[tableName].successful++

            // Report progress every 10 records or at end of batch
            if ((globalIndex + 1) % 10 === 0 || globalIndex + 1 === totalRecords) {
              if (onProgress) {
                onProgress(tableName, globalIndex + 1, totalRecords)
              }
            }
          } catch (error: any) {
            const errorMsg = error.message || 'Unknown error'
            const isForeignKeyError = error.code === 'P2003' || errorMsg.includes('Foreign key constraint')
            const isUniqueConstraintError = error.code === 'P2002' || errorMsg.includes('Unique constraint')

            if (isForeignKeyError) {
              // Skip records with missing foreign key references - they're likely from incomplete backup data
              console.warn(`[restore-clean] Skipping ${tableName} record ${recordId} due to missing foreign key reference`)
              totalSkipped++
              modelCounts[tableName].skipped++
              skippedReasons.foreignKeyErrors++
              continue
            }

            if (isUniqueConstraintError) {
              // Skip records that conflict on a non-ID unique field (e.g. display numbers like orderNumber,
              // customerNumber, sku). These are legitimate cross-server conflicts where the local record
              // (different GUID, same display number) takes precedence. Not a restore error.
              console.warn(`[restore-clean] Skipping ${tableName} record ${recordId} due to unique constraint conflict (local record preserved)`)
              totalSkipped++
              modelCounts[tableName].skipped++
              skippedReasons.validationErrors++
              continue
            }

            totalErrors++
            totalSkipped++
            modelCounts[tableName].skipped++
            skippedReasons.otherErrors++

          errorLog.push({
            model: tableName,
            recordId,
            error: errorMsg
          })

          if (onError) {
            onError(tableName, recordId, errorMsg)
          }

          console.error(`[restore-clean] Error restoring ${tableName} record ${recordId}:`, errorMsg)
        }
      }

      // Small delay between batches to prevent overwhelming the database
      if (batchEnd < totalRecords) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    // Final progress update for this model
    if (onProgress) {
      onProgress(tableName, totalRecords, totalRecords)
    }
  }

  } // End dataSources loop

  // === SECOND PASS: Update self-referential foreign keys ===
  if (selfRefUpdates.length > 0) {
    console.log(`[restore-clean] Second pass: updating ${selfRefUpdates.length} self-referential FK(s)...`)

    for (const { tableName, recordId, updates } of selfRefUpdates) {
      try {
        const modelName = findPrismaModelName(prisma, tableName)
        const model = prisma[modelName]

        if (model && typeof model.update === 'function') {
          // Remap IDs in self-ref updates for cross-machine restores
          const remappedRecordId = idRemap.get(recordId) || recordId
          const remappedUpdates: Record<string, any> = {}
          for (const [key, value] of Object.entries(updates)) {
            remappedUpdates[key] = (typeof value === 'string' && idRemap.get(value)) || value
          }

          await model.update({
            where: { id: remappedRecordId },
            data: remappedUpdates
          })
          console.log(`[restore-clean] Updated ${tableName} ${remappedRecordId} with self-ref FK: ${JSON.stringify(remappedUpdates)}`)
        }
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error'
        console.warn(`[restore-clean] Failed to update self-ref FK for ${tableName} ${recordId}: ${errorMsg}`)
        // Don't count as error - the record was created successfully, just the self-ref update failed
        // This can happen if the referenced record doesn't exist (data integrity issue in backup)
        errorLog.push({
          model: tableName,
          recordId,
          error: `Self-ref FK update failed: ${errorMsg}`
        })
      }
    }

    console.log(`[restore-clean] Second pass complete`)
  }

  console.log(`[restore-clean] Restore complete: ${totalProcessed} records processed, ${totalSkipped} skipped, ${totalErrors} errors`)
  console.log(`[restore-clean] Skip reasons: Foreign Keys=${skippedReasons.foreignKeyErrors}, Validation=${skippedReasons.validationErrors}, Other=${skippedReasons.otherErrors}`)

  return {
    success: totalErrors === 0,
    processed: totalProcessed,
    errors: totalErrors,
    errorLog,
    skippedRecords: totalSkipped,
    skippedReasons,
    modelCounts,
    deviceMismatch: !isSameDevice,
    skippedDeviceData
  }
}

/**
 * Validate backup data structure
 * Supports both v2.0 (flat) and v3.0 (structured) backup formats
 */
export function validateBackupData(backupData: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!backupData) {
    errors.push('Backup data is null or undefined')
    return { valid: false, errors }
  }

  if (!backupData.metadata) {
    errors.push('Backup metadata is missing')
  } else {
    if (!backupData.metadata.version) {
      errors.push('Backup version is missing')
    }
    if (!backupData.metadata.timestamp) {
      errors.push('Backup timestamp is missing')
    }

    // v3.0 specific validations
    if (backupData.metadata.version === '3.0') {
      if (!backupData.metadata.sourceNodeId) {
        errors.push('v3.0 backup missing sourceNodeId')
      }
      if (!backupData.metadata.backupType) {
        errors.push('v3.0 backup missing backupType')
      }
    }
  }

  // Check for at least some data
  // v3.0 has businessData object, v2.0 has flat structure
  if (backupData.businessData) {
    // v3.0 format
    const businessDataKeys = Object.keys(backupData.businessData)
    if (businessDataKeys.length === 0) {
      errors.push('Backup contains no business data tables')
    }
  } else {
    // v2.0 format (flat)
    const dataKeys = Object.keys(backupData).filter(k => k !== 'metadata' && k !== 'deviceData')
    if (dataKeys.length === 0) {
      errors.push('Backup contains no data tables')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
