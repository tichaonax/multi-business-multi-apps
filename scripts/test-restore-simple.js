const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// All 96 tables in the database
const ALL_TABLES = [
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
  'personalBudgets', 'personalExpenses', 'fundSources', 'interBusinessLoans', 'loanTransactions',
  'conflictResolutions', 'disciplinaryActions', 'employeeAttendance', 'employeeTimeTracking',
  'dataSnapshots', 'seedDataTemplates'
];

// Restore order - same as in restore-clean.ts
const RESTORE_ORDER = [
  'systemSettings', 'emojiLookup', 'jobTitles', 'compensationTypes', 'benefitTypes',
  'idFormatTemplates', 'driverLicenseTemplates', 'permissionTemplates', 'projectTypes',
  'conflictResolutions', 'dataSnapshots', 'seedDataTemplates',
  'inventoryDomains', 'expenseDomains', 'expenseCategories', 'expenseSubcategories',
  'users', 'accounts',
  'businesses', 'businessMemberships', 'businessAccounts', 'businessLocations', 'businessBrands',
  'businessCategories', 'businessSuppliers', 'inventorySubcategories',
  'persons', 'employees', 'employeeContracts', 'employeeBusinessAssignments',
  'employeeBenefits', 'employeeAllowances', 'employeeBonuses', 'employeeDeductions',
  'employeeLoans', 'employeeSalaryIncreases', 'employeeLeaveRequests', 'employeeLeaveBalance',
  'employeeAttendance', 'employeeTimeTracking', 'disciplinaryActions',
  'employeeDeductionPayments', 'employeeLoanPayments', 'contractBenefits', 'contractRenewals',
  'businessProducts', 'productVariants', 'productBarcodes', 'productImages', 'productAttributes',
  'businessStockMovements', 'businessCustomers', 'businessOrders', 'businessOrderItems',
  'businessTransactions', 'customerLayby', 'customerLaybyPayment',
  'expenseAccounts', 'expenseAccountDeposits', 'expenseAccountPayments',
  'payrollAccounts', 'payrollPeriods', 'payrollEntries', 'payrollEntryBenefits',
  'payrollAdjustments', 'payrollExports',
  'vehicles', 'vehicleDrivers', 'driverAuthorizations', 'vehicleLicenses', 'vehicleMaintenanceRecords',
  'vehicleMaintenanceServices', 'vehicleMaintenanceServiceExpenses', 'vehicleTrips',
  'vehicleExpenses', 'vehicleReimbursements',
  'personalBudgets', 'personalExpenses', 'fundSources',
  'projects', 'projectStages', 'projectContractors', 'stageContractorAssignments',
  'projectTransactions', 'constructionProjects', 'constructionExpenses',
  'menuItems', 'menuCombos', 'menuComboItems', 'menuPromotions',
  'orders', 'orderItems',
  'supplierProducts', 'interBusinessLoans', 'loanTransactions'
];

async function testRestore(backupFileName) {
  try {
    console.log('🔄 Testing Restore from Backup');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📁 Backup File: ${backupFileName}\n`);

    // 1. Read backup file
    const backupPath = path.join(process.cwd(), backupFileName);

    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup file not found: ${backupFileName}`);
      process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    console.log('✅ Backup file loaded successfully\n');

    // 2. Perform restore using upsert operations
    console.log('🔄 Performing Restore...');
    console.log('═══════════════════════════════════════════════════\n');

    let totalProcessed = 0;
    let totalErrors = 0;
    const errorLog = [];

    for (const tableName of RESTORE_ORDER) {
      const data = backupData[tableName];

      if (!data || !Array.isArray(data) || data.length === 0) {
        continue;
      }

      const model = prisma[tableName];

      if (!model || typeof model.upsert !== 'function') {
        console.warn(`⚠️  Model ${tableName} not found or doesn't support upsert`);
        continue;
      }

      console.log(`   Restoring ${tableName}: ${data.length} records...`);

      for (const record of data) {
        const recordId = record.id;

        if (!recordId) {
          totalErrors++;
          errorLog.push({
            model: tableName,
            recordId: undefined,
            error: 'Record has no ID'
          });
          continue;
        }

        try {
          // Special handling for emojiLookup composite unique constraint
          if (tableName === 'emojiLookup') {
            await model.upsert({
              where: {
                emoji_description: {
                  emoji: record.emoji,
                  description: record.description
                }
              },
              create: record,
              update: record
            });
          } else {
            await model.upsert({
              where: { id: recordId },
              create: record,
              update: record
            });
          }

          totalProcessed++;
        } catch (error) {
          totalErrors++;
          errorLog.push({
            model: tableName,
            recordId,
            error: error.message
          });
          console.error(`   ❌ Error restoring ${tableName} record ${recordId}: ${error.message}`);
        }
      }

      console.log(`   ✓ ${tableName}: Completed\n`);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log(`\n✅ Restore Completed!`);
    console.log(`   Records processed: ${totalProcessed}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Success: ${totalErrors === 0 ? '✅ Yes' : '❌ No'}\n`);

    // 3. Validation - Compare backup vs database
    console.log('📊 Validation Results:');
    console.log('═══════════════════════════════════════════════════\n');

    const mismatches = [];
    let matchedTables = 0;

    for (const tableName of ALL_TABLES) {
      try {
        const backupRecords = backupData[tableName] || [];
        const backupCount = Array.isArray(backupRecords) ? backupRecords.length : 0;
        const dbCount = await prisma[tableName].count();

        if (backupCount === dbCount) {
          matchedTables++;
        } else if (backupCount > 0 || dbCount > 0) {
          mismatches.push({
            table: tableName,
            backup: backupCount,
            database: dbCount,
            difference: dbCount - backupCount
          });
        }
      } catch (error) {
        console.error(`   ❌ Error validating ${tableName}: ${error.message}`);
      }
    }

    console.log(`✅ Tables Matched: ${matchedTables}/96\n`);

    if (mismatches.length > 0) {
      console.log('⚠️  Mismatched Tables:');
      console.log('─────────────────────────────────────────────────');
      console.log('Table'.padEnd(40) + 'Backup'.padEnd(10) + 'Database'.padEnd(10) + 'Diff');
      console.log('─────────────────────────────────────────────────');

      for (const mismatch of mismatches) {
        const diff = mismatch.difference > 0 ? `+${mismatch.difference}` : mismatch.difference.toString();
        console.log(
          mismatch.table.padEnd(40) +
          mismatch.backup.toString().padEnd(10) +
          mismatch.database.toString().padEnd(10) +
          diff
        );
      }
      console.log('─────────────────────────────────────────────────');
    }

    console.log('═══════════════════════════════════════════════════');

    if (mismatches.length === 0) {
      console.log('\n🎉 RESTORE TEST PASSED - All data validated!');
    } else {
      console.log(`\n⚠️  RESTORE COMPLETED WITH ${mismatches.length} MISMATCHES`);
    }

    if (errorLog.length > 0) {
      console.log(`\n⚠️  ${errorLog.length} errors occurred during restore`);
      console.log('First 10 errors:');
      errorLog.slice(0, 10).forEach(err => {
        console.log(`   - ${err.model} (${err.recordId || 'no ID'}): ${err.error}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Restore test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get backup filename from command line or use default
const backupFileName = process.argv[2] || 'complete-backup-2025-12-06T17-36-29.json';

testRestore(backupFileName);
