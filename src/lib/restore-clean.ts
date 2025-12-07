/**
 * Clean Restore Implementation
 * Restores backup data deterministically using upsert operations
 * Ensures same backup can be restored multiple times with identical results
 */

import { PrismaClient } from '@prisma/client'

type AnyPrismaClient = PrismaClient & any

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
  'permissionTemplates',
  'projectTypes',
  'conflictResolutions',
  'dataSnapshots',
  'seedDataTemplates',
  
  // Inventory and expense reference data
  'inventoryDomains',
  'expenseDomains',
  'expenseCategories',
  'expenseSubcategories',
  
  // Users and authentication
  'users',
  'accounts',
  
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
  
  // Employees and HR
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
  'vehicleMaintenanceRecords',
  'vehicleMaintenanceServices',
  'vehicleMaintenanceServiceExpenses',
  'vehicleTrips',
  'vehicleReimbursements',
  'driverAuthorizations',
  
  // Restaurant/Menu
  'menuItems',
  'menuCombos',
  'menuComboItems',
  'menuPromotions',
  'orders',
  'orderItems',
  
  // Miscellaneous
  'supplierProducts',
  'interBusinessLoans',
  'loanTransactions'
]

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
}> {
  const { onProgress, onError, batchSize = 100 } = options
  
  let totalProcessed = 0
  let totalErrors = 0
  const errorLog: Array<{ model: string; recordId?: string; error: string }> = []

  console.log('[restore-clean] Starting restore process...')
  console.log('[restore-clean] Backup version:', backupData.metadata?.version)
  console.log('[restore-clean] Backup timestamp:', backupData.metadata?.timestamp)
  console.log('[restore-clean] Batch size:', batchSize)

  // Process each table in dependency order
  for (const tableName of RESTORE_ORDER) {
    const data = backupData[tableName]
    
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

    // Process records in batches to prevent timeouts
    const totalRecords = data.length
    for (let batchStart = 0; batchStart < totalRecords; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, totalRecords)
      const batch = data.slice(batchStart, batchEnd)

      console.log(`[restore-clean] Processing ${tableName} batch: ${batchStart + 1}-${batchEnd}/${totalRecords}`)

      for (let i = 0; i < batch.length; i++) {
        const record = batch[i]
        const globalIndex = batchStart + i
        const recordId = record.id

        if (!recordId) {
          console.warn(`[restore-clean] Record in ${tableName} has no ID, skipping`)
          totalErrors++
          errorLog.push({
            model: tableName,
            recordId: undefined,
            error: 'Record has no ID'
          })
          continue
        }

        try {
          // Use upsert to create or update
          // IMPORTANT: Preserves original IDs and timestamps
          // - create: record → Uses original ID, createdAt, updatedAt
          // - update: record → Explicitly provides updatedAt, overriding @updatedAt directive
          // This ensures restored data matches source database exactly

          // Special handling for models with composite unique constraints
          if (tableName === 'emojiLookup') {
            // EmojiLookup has unique constraint on [emoji, description]
            await model.upsert({
              where: {
                emoji_description: {
                  emoji: record.emoji,
                  description: record.description
                }
              },
              create: record,  // ← Preserves original ID, createdAt, updatedAt
              update: record   // ← Explicitly sets updatedAt, overriding @updatedAt
            })
          } else {
            // Default: use id for upsert
            await model.upsert({
              where: { id: recordId },
              create: record,  // ← Preserves original ID, createdAt, updatedAt
              update: record   // ← Explicitly sets updatedAt, overriding @updatedAt
            })
          }

          totalProcessed++

          // Report progress every 10 records or at end of batch
          if ((globalIndex + 1) % 10 === 0 || globalIndex + 1 === totalRecords) {
            if (onProgress) {
              onProgress(tableName, globalIndex + 1, totalRecords)
            }
          }
        } catch (error: any) {
          totalErrors++
          const errorMsg = error.message || 'Unknown error'
          
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

  console.log(`[restore-clean] Restore complete: ${totalProcessed} records processed, ${totalErrors} errors`)

  return {
    success: totalErrors === 0,
    processed: totalProcessed,
    errors: totalErrors,
    errorLog
  }
}

/**
 * Validate backup data structure
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
  }

  // Check for at least some data
  const dataKeys = Object.keys(backupData).filter(k => k !== 'metadata')
  if (dataKeys.length === 0) {
    errors.push('Backup contains no data tables')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
