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

  // Inventory and expense reference data
  'inventoryDomains',
  'expenseDomains',
  'expenseCategories',
  'expenseSubcategories',

  // Users and authentication
  'users',
  'accounts',
  'permissions',  // Security permissions (no FK dependencies)
  'userPermissions',  // Depends on users and permissions
  'permissionTemplates',  // Depends on users via createdBy FK
  'seedDataTemplates',  // Depends on users via createdBy FK

  // Businesses (core entity)
  'businesses',
  'businessMemberships',
  'businessAccounts',
  'businessLocations',
  'businessBrands',

  // Business categories and suppliers (shared data)
  'businessCategories',
  'businessSuppliers',
  'inventorySubcategories',

  // Persons (for various associations)
  'persons',

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
  'disciplinaryActions',
  'employeeDeductionPayments',
  'employeeLoanPayments',
  'contractBenefits',
  'contractRenewals',

  // Products and inventory
  'businessProducts',
  'productVariants',
  'productBarcodes',
  'productImages',
  'productAttributes',
  'businessStockMovements',
  'productPriceChanges',  // Product price audit trail

  // Customers and orders
  'businessCustomers',
  'businessOrders',
  'businessOrderItems',
  'businessTransactions',
  'customerLaybys',
  'customerLaybyPayments',

  // Expense accounts
  'expenseAccounts',
  'expenseAccountDeposits',
  'expenseAccountPayments',

  // Payroll
  'payrollAccounts',
  'payrollAccountDeposits',  // Depends on payrollAccounts
  'payrollAccountPayments',  // Depends on payrollAccounts
  'payrollPeriods',
  'payrollEntries',
  'payrollEntryBenefits',
  'payrollExports',
  'payrollAdjustments',

  // Personal finance
  'fundSources',
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
  'interBusinessLoans',
  'loanTransactions',
  'receiptSequences'
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

  // Type/lookup tables with unique name
  'projectTypes': 'name',
  'benefitTypes': 'name',
  'compensationTypes': 'name',
  'expenseDomains': 'name',
  'inventoryDomains': 'name',
  'permissions': 'name',
  'jobTitles': 'title'
}

/**
 * Model name mappings (backup table names to Prisma model names)
 */
const TABLE_TO_MODEL_MAPPING: Record<string, string> = {
  'customerLaybys': 'customerLayby',
  'customerLaybyPayments': 'customerLaybyPayment'
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
          // Remove any other array fields (likely relations)
          Object.keys(cleaned).forEach(key => {
            if (Array.isArray(cleaned[key])) {
              delete cleaned[key]
            }
          })
          return cleaned
        })

        for (let i = 0; i < cleanedBatch.length; i++) {
          const record = cleanedBatch[i]
          const globalIndex = batchStart + i
          const recordId = record.id

          modelCounts[tableName].attempted++

          if (!recordId) {
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
              await model.upsert({
                where: {
                  emoji_description: {
                    emoji: record.emoji,
                    description: record.description
                  }
                },
                create: recordToInsert,
                update: recordToInsert
              })
            } else if (tableName === 'r710Wlans') {
              // R710Wlans has unique constraint on [deviceRegistryId, wlanId]
              // CRITICAL: r710TokenConfigs references r710Wlans.id, so we must preserve backup ID
              const existing = await model.findFirst({
                where: {
                  deviceRegistryId: record.deviceRegistryId,
                  wlanId: record.wlanId
                }
              })

              if (existing && existing.id !== record.id) {
                // Different ID - delete existing and create with backup ID
                if (VERBOSE_LOGGING) console.log(`[restore-clean] r710Wlans: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                // Same ID - just update
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                // Doesn't exist - create
                await model.create({ data: recordToInsert })
              }
            } else if (tableName === 'r710BusinessIntegrations') {
              // R710BusinessIntegrations has unique constraint on [businessId, deviceRegistryId]
              const existing = await model.findFirst({
                where: {
                  businessId: record.businessId,
                  deviceRegistryId: record.deviceRegistryId
                }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] r710BusinessIntegrations: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                await model.create({ data: recordToInsert })
              }
            } else if (tableName === 'r710BusinessTokenMenuItems') {
              // R710BusinessTokenMenuItems has unique constraint on [businessId, tokenConfigId]
              const existing = await model.findFirst({
                where: {
                  businessId: record.businessId,
                  tokenConfigId: record.tokenConfigId
                }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] r710BusinessTokenMenuItems: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                await model.create({ data: recordToInsert })
              }
            } else if (tableName === 'businessTokenMenuItems') {
              // ESP32 BusinessTokenMenuItems has unique constraint on [businessId, tokenConfigurationId]
              const existing = await model.findFirst({
                where: {
                  businessId: record.businessId,
                  tokenConfigurationId: record.tokenConfigurationId
                }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] businessTokenMenuItems: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                await model.create({ data: recordToInsert })
              }
            } else if (tableName === 'employeeBusinessAssignments') {
              // EmployeeBusinessAssignments has unique constraint on [employeeId, businessId]
              const existing = await model.findFirst({
                where: {
                  employeeId: record.employeeId,
                  businessId: record.businessId
                }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] employeeBusinessAssignments: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                await model.create({ data: recordToInsert })
              }
            } else if (tableName === 'businessMemberships') {
              // BusinessMemberships has unique constraint on [userId, businessId]
              const existing = await model.findFirst({
                where: {
                  userId: record.userId,
                  businessId: record.businessId
                }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] businessMemberships: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                await model.create({ data: recordToInsert })
              }
            } else if (tableName === 'userPermissions') {
              // UserPermissions has unique constraint on [userId, permissionId]
              const existing = await model.findFirst({
                where: {
                  userId: record.userId,
                  permissionId: record.permissionId
                }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] userPermissions: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                await model.create({ data: recordToInsert })
              }
            } else if (tableName === 'r710Tokens') {
              // R710Tokens has unique constraint on [username, password]
              // Also referenced by r710TokenSales, r710DeviceTokens
              const existing = await model.findFirst({
                where: {
                  username: record.username,
                  password: record.password
                }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] r710Tokens: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                await model.create({ data: recordToInsert })
              }
            } else if (tableName === 'wifiTokens') {
              // WifiTokens (ESP32) has unique constraint on [token] field
              const existing = await model.findFirst({
                where: { token: record.token }
              })

              if (existing && existing.id !== record.id) {
                if (VERBOSE_LOGGING) console.log(`[restore-clean] wifiTokens: Replacing existing record (${existing.id}) with backup record (${record.id})`)
                await model.delete({ where: { id: existing.id } })
                await model.create({ data: recordToInsert })
              } else if (existing) {
                await model.update({ where: { id: existing.id }, data: recordToInsert })
              } else {
                await model.create({ data: recordToInsert })
              }
            } else if (uniqueConstraint) {
              // Handle tables with unique constraints on non-ID fields
              // First try to find by unique field, then upsert
              const uniqueField = typeof uniqueConstraint === 'string' ? uniqueConstraint : null

              if (uniqueField && record[uniqueField]) {
                // Check if record exists by unique field
                const existing = await model.findFirst({
                  where: { [uniqueField]: record[uniqueField] }
                })

                if (existing) {
                  // Update existing record by its ID
                  await model.update({
                    where: { id: existing.id },
                    data: recordToInsert
                  })
                } else {
                  // Create new record
                  await model.create({
                    data: recordToInsert
                  })
                }
              } else {
                // Fallback to standard upsert by id
                await model.upsert({
                  where: { id: recordId },
                  create: recordToInsert,
                  update: recordToInsert
                })
              }
            } else {
              // Default: use id for upsert
              await model.upsert({
                where: { id: recordId },
                create: recordToInsert,
                update: recordToInsert
              })
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
            const isValidationError = error.code === 'P2002' || errorMsg.includes('Unique constraint') || errorMsg.includes('validation')

            if (isForeignKeyError) {
              // Skip records with missing foreign key references - they're likely from incomplete backup data
              console.warn(`[restore-clean] Skipping ${tableName} record ${recordId} due to missing foreign key reference`)
              totalSkipped++
              modelCounts[tableName].skipped++
              skippedReasons.foreignKeyErrors++
              errorLog.push({
                model: tableName,
                recordId,
                error: `Foreign key constraint: ${errorMsg}`
              })
              continue
            }

            totalErrors++
            totalSkipped++
            modelCounts[tableName].skipped++

            if (isValidationError) {
              skippedReasons.validationErrors++
            } else {
              skippedReasons.otherErrors++
            }

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
          await model.update({
            where: { id: recordId },
            data: updates
          })
          console.log(`[restore-clean] Updated ${tableName} ${recordId} with self-ref FK: ${JSON.stringify(updates)}`)
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
