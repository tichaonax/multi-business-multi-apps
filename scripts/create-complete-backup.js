const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// All tables that should be included in backup
// NOTE: Excludes local/ephemeral tables (sync, printers, print jobs, device registry,
// connected clients, network partitions, node states, offline queue, audit logs, chat)
const allTables = [
  // Reference data
  'systemSettings', 'emojiLookup', 'jobTitles', 'compensationTypes', 'benefitTypes',
  'permissionTemplates', 'idFormatTemplates', 'driverLicenseTemplates', 'projectTypes',
  'inventoryDomains', 'inventorySubcategories', 'expenseDomains', 'expenseCategories',
  'expenseSubcategories', 'conflictResolutions', 'dataSnapshots', 'seedDataTemplates',

  // Users and authentication
  'users', 'accounts', 'sessions', 'permissions', 'userPermissions',

  // Businesses
  'businesses', 'businessMemberships', 'businessAccounts', 'businessLocations', 'businessBrands',

  // Persons and employees
  'persons', 'employees', 'employeeBusinessAssignments', 'employeeContracts',
  'contractBenefits', 'contractRenewals', 'employeeBenefits', 'employeeAllowances',
  'employeeBonuses', 'employeeSalaryIncreases', 'employeeLeaveBalance', 'employeeLeaveRequests',
  'employeeLoans', 'employeeLoanPayments', 'employeeDeductions', 'employeeDeductionPayments',
  'employeeAttendance', 'employeeTimeTracking', 'disciplinaryActions',

  // Customers and suppliers
  'businessCustomers', 'businessSuppliers', 'supplierProducts',

  // Products and inventory
  'businessCategories', 'businessProducts', 'productVariants', 'productBarcodes',
  'productAttributes', 'productImages', 'businessStockMovements', 'product_price_changes',
  'sku_sequences',

  // Barcode system
  'barcodeTemplates', 'barcodeInventoryItems', 'barcodePrintJobs',

  // Orders and transactions
  'businessOrders', 'businessOrderItems', 'businessTransactions',
  'receiptSequences', 'reprintLog',

  // Expense accounts
  'expenseAccounts', 'expenseAccountDeposits', 'expenseAccountPayments',

  // Payroll
  'payrollAccounts', 'payrollAccountDeposits', 'payrollAccountPayments',
  'payrollPeriods', 'payrollEntries', 'payrollEntryBenefits', 'payrollAdjustments',
  'payrollExports',

  // Vehicles
  'vehicles', 'vehicleDrivers', 'vehicleLicenses', 'vehicleMaintenanceRecords',
  'vehicleMaintenanceServices', 'vehicleMaintenanceServiceExpenses', 'vehicleTrips',
  'vehicleExpenses', 'vehicleReimbursements', 'driverAuthorizations',

  // Projects and construction
  'projects', 'projectStages', 'projectContractors', 'stageContractorAssignments',
  'projectTransactions', 'constructionExpenses', 'constructionProjects',

  // Restaurant / Menu
  'menuItems', 'menuCombos', 'menuComboItems', 'menuPromotions',
  'orders', 'orderItems',

  // Meal program
  'mealProgramParticipants', 'mealProgramEligibleItems', 'mealProgramTransactions',

  // Coupons
  'coupons', 'couponUsages',

  // Inventory transfers
  'inventoryTransfers', 'inventoryTransferItems',

  // Clothing bales
  'clothingBaleCategories', 'clothingBales',

  // Customer layby
  'customerLayby', 'customerLaybyPayment',

  // Personal finance
  'personalBudgets', 'personalExpenses', 'fundSources',
  'interBusinessLoans', 'loanTransactions',

  // WiFi / ESP32 token system
  'portalIntegrations', 'tokenConfigurations', 'businessTokenMenuItems',
  'wifiTokens', 'wifiTokenSales', 'wifiTokenDevices',

  // R710 token system
  'r710BusinessIntegrations', 'r710Wlans', 'r710TokenConfigs', 'r710Tokens',
  'r710TokenSales', 'r710BusinessTokenMenuItems',

  // Saved reports
  'savedReports',
]

async function createCompleteBackup() {
  try {
    console.log('🔄 Creating complete backup of all tables with data...')

    const backup = {
      metadata: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        type: 'full_backup',
        description: 'Complete backup of all seeded test data'
      }
    }

    let totalRecords = 0
    let tablesWithData = 0

    for (const tableName of allTables) {
      try {
        console.log(`📊 Backing up ${tableName}...`)
        const records = await prisma[tableName].findMany()

        if (records.length > 0) {
          backup[tableName] = records
          totalRecords += records.length
          tablesWithData++
          console.log(`   ✅ ${tableName}: ${records.length} records`)
        } else {
          console.log(`   ⚠️  ${tableName}: 0 records (empty)`)
        }
      } catch (error) {
        console.log(`   ❌ Error backing up ${tableName}: ${error.message}`)
      }
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `complete-backup-${timestamp}.json`
    const filepath = path.join(process.cwd(), filename)

    // Write backup to file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2))

    console.log('\n✅ Complete backup created successfully!')
    console.log(`📁 File: ${filename}`)
    console.log(`📊 Tables with data: ${tablesWithData}/${allTables.length}`)
    console.log(`📈 Total records: ${totalRecords}`)
    console.log(`💾 File size: ${fs.statSync(filepath).size} bytes`)

    return { filename, tablesWithData, totalRecords }

  } catch (error) {
    console.error('❌ Error creating complete backup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createCompleteBackup()