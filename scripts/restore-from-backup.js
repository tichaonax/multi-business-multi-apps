const { PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')

/**
 * Restore order - dependencies first, then dependent tables
 * This ensures foreign key constraints are satisfied
 *
 * NOTE: Excludes local/ephemeral tables (sync, printers, print jobs, device registry,
 * connected clients, network partitions, node states, offline queue, audit logs, chat)
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
  'sessions',
  'permissions',
  'userPermissions',
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
  'product_price_changes',
  'sku_sequences',

  // Barcode system
  'barcodeTemplates',
  'barcodeInventoryItems',
  'barcodePrintJobs',

  // Customers and orders
  'businessCustomers',
  'businessOrders',
  'businessOrderItems',
  'businessTransactions',
  'receiptSequences',
  'reprintLog',
  'customerLayby',
  'customerLaybyPayment',

  // Coupons (depends on businessOrders, employees)
  'coupons',
  'couponUsages',

  // Expense accounts
  'expenseAccounts',
  'expenseAccountDeposits',
  'expenseAccountPayments',

  // Meal program (depends on businesses, employees, persons, expenseAccounts, businessOrders)
  'mealProgramParticipants',
  'mealProgramEligibleItems',
  'mealProgramTransactions',

  // Payroll
  'payrollAccounts',
  'payrollAccountDeposits',
  'payrollAccountPayments',
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

  // Restaurant/Menu
  'menuItems',
  'menuCombos',
  'menuComboItems',
  'menuPromotions',
  'orders',
  'orderItems',

  // Inventory transfers (depends on businesses, employees, productVariants)
  'inventoryTransfers',
  'inventoryTransferItems',

  // Clothing bales
  'clothingBaleCategories',
  'clothingBales',

  // WiFi / ESP32 token system (depends on businesses)
  'portalIntegrations',
  'tokenConfigurations',
  'businessTokenMenuItems',
  'wifiTokenDevices',
  'wifiTokens',
  'wifiTokenSales',

  // R710 token system (depends on businesses, businessOrders)
  'r710BusinessIntegrations',
  'r710Wlans',
  'r710TokenConfigs',
  'r710Tokens',
  'r710TokenSales',
  'r710BusinessTokenMenuItems',

  // Saved reports
  'savedReports',

  // Miscellaneous
  'supplierProducts',
  'interBusinessLoans',
  'loanTransactions',
]

/**
 * Model name mappings (backup table names to Prisma model names)
 */
const TABLE_TO_MODEL_MAPPING = {
  'customerLaybys': 'customerLayby',
  'customerLaybyPayments': 'customerLaybyPayment'
}

/**
 * Find Prisma model name from table name
 */
function findPrismaModelName(prisma, name) {
  // Check explicit mappings first (handles plural → singular conversions)
  if (TABLE_TO_MODEL_MAPPING[name]) {
    return TABLE_TO_MODEL_MAPPING[name]
  }

  // Direct match
  if (prisma[name]) return name

  // Convert snake_case to camelCase
  const camel = name.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
  if (prisma[camel]) return camel

  // Try lowercase comparison
  const lower = name.toLowerCase().replace(/_/g, '')
  for (const key of Object.keys(prisma)) {
    if (key.toLowerCase().replace(/_/g, '') === lower) {
      return key
    }
  }

  return name
}

async function restore(backupPath) {
  if (!backupPath) throw new Error('backupPath required')
  const abs = path.isAbsolute(backupPath) ? backupPath : path.join(process.cwd(), backupPath)
  if (!fs.existsSync(abs)) throw new Error('Backup file not found: ' + abs)
  const raw = fs.readFileSync(abs, 'utf8')
  const backupData = JSON.parse(raw)

  // Basic validation of shape
  if (!backupData || typeof backupData !== 'object') throw new Error('Invalid backup format')

  // Handle v3.0 format: data is nested under businessData key
  // v1.0/v2.0 format has tables at the top level
  let tableData = backupData
  if (backupData.businessData && typeof backupData.businessData === 'object') {
    console.log('Detected v3.0 backup format — unwrapping businessData')
    tableData = backupData.businessData
  }

  try {
    console.log('Restoring backup from:', backupData.metadata?.timestamp || backupData.createdAt || 'unknown')
    console.log('Backup version:', backupData.metadata?.version || 'legacy')

    let totalProcessed = 0
    let totalErrors = 0
    const errorLog = []

    // Process each table in dependency order
    for (const tableName of RESTORE_ORDER) {
      const data = tableData[tableName]

      if (!data || !Array.isArray(data) || data.length === 0) {
        continue
      }

      const modelName = findPrismaModelName(prisma, tableName)
      const model = prisma[modelName]

      if (!model || typeof model.upsert !== 'function') {
        console.warn(`Model ${modelName} not found or doesn't support upsert`)
        continue
      }

      console.log(`Restoring ${tableName}: ${data.length} records`)

      // Process records
      for (let i = 0; i < data.length; i++) {
        const record = data[i]
        const recordId = record.id

        if (!recordId) {
          console.warn(`Record in ${tableName} has no ID, skipping`)
          totalErrors++
          errorLog.push({
            model: tableName,
            recordId: undefined,
            error: 'Record has no ID'
          })
          continue
        }

        try {
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
              create: record,
              update: record
            })
          } else {
            // Default: use id for upsert
            await model.upsert({
              where: { id: recordId },
              create: record,
              update: record
            })
          }

          totalProcessed++
        } catch (error) {
          totalErrors++
          const errorMsg = error.message || 'Unknown error'

          // Categorize errors
          const isExpectedError = errorMsg.includes('Unique constraint failed') ||
                                  errorMsg.includes('Foreign key constraint') ||
                                  errorMsg.includes('email')

          errorLog.push({
            model: tableName,
            recordId,
            error: errorMsg,
            expected: isExpectedError
          })

          if (isExpectedError) {
            console.warn(`Warning: ${tableName} record ${recordId}: ${errorMsg.split('\n')[0]}`)
          } else {
            console.error(`Error restoring ${tableName} record ${recordId}:`, errorMsg)
          }
        }
      }

      console.log(`✓ Completed ${tableName}: ${data.length} records`)
    }

    console.log('\n=== Restore Summary ===')
    console.log('Total processed:', totalProcessed)
    console.log('Total errors:', totalErrors)

    const unexpectedErrors = errorLog.filter(e => !e.expected)
    const expectedErrors = errorLog.filter(e => e.expected)

    if (expectedErrors.length > 0) {
      console.log('\nExpected warnings (conflicts with existing data):')
      expectedErrors.forEach(err => {
        console.log(`  - ${err.model} ${err.recordId || ''}: ${err.error.split('\n')[0]}`)
      })
    }

    if (unexpectedErrors.length > 0) {
      console.log('\nUnexpected errors:')
      unexpectedErrors.forEach(err => {
        console.log(`  - ${err.model} ${err.recordId || ''}: ${err.error}`)
      })
      throw new Error(`Restore failed with ${unexpectedErrors.length} unexpected errors`)
    }

    console.log('\nSuccess:', unexpectedErrors.length === 0)
    console.log('Restore complete!')
  } finally {
    await prisma.$disconnect()
  }
}

module.exports = { restore }

if (require.main === module) {
  const arg = process.argv[2]
  restore(arg).catch(err => {
    console.error('Restore failed', err)
    process.exit(1)
  })
}
