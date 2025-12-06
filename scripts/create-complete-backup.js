const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// All tables that should be included in backup (matching seeded tables)
const allTables = [
  'systemSettings', 'emojiLookup', 'jobTitles', 'compensationTypes', 'benefitTypes',
  'permissionTemplates', 'idFormatTemplates', 'driverLicenseTemplates', 'projectTypes',
  'inventoryDomains', 'inventorySubcategories', 'expenseDomains', 'expenseCategories',
  'expenseSubcategories', 'users', 'accounts', 'sessions', 'businesses', 'businessMemberships',
  'businessAccounts', 'businessLocations', 'businessBrands', 'persons', 'employees',
  'employeeBusinessAssignments', 'employeeContracts', 'contractBenefits', 'contractRenewals',
  'employeeBenefits', 'employeeAllowances', 'employeeBonuses', 'employeeSalaryIncreases',
  'employeeLeaveBalance', 'employeeLeaveRequests', 'employeeLoans', 'employeeLoanPayments',
  'employeeDeductions', 'employeeDeductionPayments', 'businessCustomers', 'businessSuppliers',
  'supplierProducts', 'businessCategories', 'businessProducts', 'productVariants',
  'productBarcodes', 'productAttributes', 'productImages', 'businessStockMovements',
  'businessOrders', 'businessOrderItems', 'businessTransactions', 'expenseAccounts',
  'expenseAccountDeposits', 'expenseAccountPayments', 'payrollPeriods', 'payrollEntries',
  'payrollEntryBenefits', 'payrollAdjustments', 'payrollAccounts', 'payrollExports',
  'vehicles', 'vehicleDrivers', 'vehicleLicenses', 'vehicleMaintenanceRecords',
  'vehicleMaintenanceServices', 'vehicleMaintenanceServiceExpenses', 'vehicleTrips',
  'vehicleExpenses', 'vehicleReimbursements', 'driverAuthorizations', 'projects',
  'projectStages', 'projectContractors', 'stageContractorAssignments', 'projectTransactions',
  'constructionExpenses', 'constructionProjects', 'menuItems', 'menuCombos', 'menuComboItems',
  'menuPromotions', 'orders', 'orderItems', 'customerLayby', 'customerLaybyPayment',
  'personalBudgets', 'personalExpenses', 'fundSources', 'interBusinessLoans',
  'loanTransactions', 'conflictResolutions', 'disciplinaryActions', 'employeeAttendance',
  'employeeTimeTracking', 'dataSnapshots', 'seedDataTemplates'
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