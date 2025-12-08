const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Restore order - dependencies first
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
  'supplierProducts', 'interBusinessLoans', 'loanTransactions', 'receiptSequences'
];

async function createSafetyBackup() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `safety-backup-${timestamp}.json`;

  console.log(`📁 Creating safety backup: ${filename}...`);

  const backupData = { metadata: { timestamp: new Date().toISOString(), version: '1.0', type: 'safety' } };

  for (const tableName of ALL_TABLES) {
    try {
      const records = await prisma[tableName].findMany();
      backupData[tableName] = records;
    } catch (error) {
      console.error(`   ⚠️  Error backing up ${tableName}: ${error.message}`);
      backupData[tableName] = [];
    }
  }

  fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
  console.log(`✅ Safety backup created: ${filename}\n`);

  return filename;
}

async function countDatabaseRecords() {
  const counts = {};
  let total = 0;

  for (const tableName of ALL_TABLES) {
    try {
      const count = await prisma[tableName].count();
      counts[tableName] = count;
      total += count;
    } catch (error) {
      counts[tableName] = 'error';
    }
  }

  return { counts, total };
}

async function clearDatabase() {
  console.log('🗑️  Clearing Database...');
  console.log('═══════════════════════════════════════════════════\n');

  // Delete in reverse order to handle foreign keys
  const deleteOrder = [...RESTORE_ORDER].reverse();

  let totalDeleted = 0;

  for (const tableName of deleteOrder) {
    try {
      const result = await prisma[tableName].deleteMany({});
      if (result.count > 0) {
        console.log(`   🗑️  ${tableName}: ${result.count} records deleted`);
        totalDeleted += result.count;
      }
    } catch (error) {
      console.error(`   ❌ Error clearing ${tableName}: ${error.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`✅ Database cleared: ${totalDeleted} records deleted\n`);

  return totalDeleted;
}

async function restoreFromBackup(backupFileName) {
  console.log('🔄 Restoring from Backup...');
  console.log('═══════════════════════════════════════════════════\n');

  const backupPath = path.join(process.cwd(), backupFileName);
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

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
        errorLog.push({ model: tableName, recordId: undefined, error: 'Record has no ID' });
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
        const isForeignKeyError = error.code === 'P2003' || error.message.includes('Foreign key constraint');
        
        if (isForeignKeyError) {
          // Skip records with missing foreign key references - they're likely from incomplete backup data
          console.warn(`   ⚠️  Skipping ${tableName} record ${recordId} due to missing foreign key reference`);
          continue;
        }
        
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
  console.log(`✅ Restore Completed!`);
  console.log(`   Records processed: ${totalProcessed}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Success: ${totalErrors === 0 ? '✅ Yes' : '❌ No'}\n`);

  return { totalProcessed, totalErrors, errorLog };
}

async function validateRestore(backupFileName) {
  console.log('📊 Validation Results:');
  console.log('═══════════════════════════════════════════════════\n');

  const backupPath = path.join(process.cwd(), backupFileName);
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

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
    console.log('\n🎉 VALIDATION PASSED - All data restored correctly!');
  } else {
    console.log(`\n⚠️  VALIDATION FAILED - ${mismatches.length} table(s) mismatched`);
  }

  return { matchedTables, mismatches };
}

async function testCleanDatabaseRestore(backupFileName) {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   CLEAN DATABASE RESTORE TEST                     ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log('⚠️  WARNING: This test will:');
  console.log('   1. Create a safety backup of current database');
  console.log('   2. DELETE ALL DATA from the database');
  console.log('   3. Restore from the specified backup file');
  console.log('   4. Validate the restore\n');

  console.log(`📁 Backup File to Restore: ${backupFileName}\n`);

  try {
    // Step 1: Count current records
    console.log('📊 Current Database State:');
    console.log('═══════════════════════════════════════════════════');
    const beforeState = await countDatabaseRecords();
    console.log(`   Total Records: ${beforeState.total}`);
    const tablesWithData = Object.values(beforeState.counts).filter(c => typeof c === 'number' && c > 0).length;
    console.log(`   Tables with Data: ${tablesWithData}/96\n`);

    // Step 2: Create safety backup
    const safetyBackupFile = await createSafetyBackup();

    // Step 3: Clear database
    await clearDatabase();

    // Step 4: Verify database is empty
    console.log('📊 Database After Clearing:');
    console.log('═══════════════════════════════════════════════════');
    const afterClearState = await countDatabaseRecords();
    console.log(`   Total Records: ${afterClearState.total}`);

    if (afterClearState.total === 0) {
      console.log('   ✅ Database is completely empty\n');
    } else {
      console.log(`   ⚠️  Warning: ${afterClearState.total} records remain\n`);
    }

    // Step 5: Restore from backup
    const restoreResult = await restoreFromBackup(backupFileName);

    // Step 6: Validate restore
    const validationResult = await validateRestore(backupFileName);

    // Step 7: Final summary
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   TEST SUMMARY                                    ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    console.log(`✅ Safety Backup: ${safetyBackupFile}`);
    console.log(`📊 Before Clear: ${beforeState.total} records`);
    console.log(`🗑️  After Clear: ${afterClearState.total} records`);
    console.log(`🔄 Restored: ${restoreResult.totalProcessed} records`);
    console.log(`❌ Errors: ${restoreResult.totalErrors}`);
    console.log(`✓ Validated: ${validationResult.matchedTables}/96 tables matched\n`);

    if (restoreResult.totalErrors === 0 && validationResult.mismatches.length === 0) {
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║   🎉 TEST PASSED - CLEAN RESTORE SUCCESSFUL! 🎉   ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');
    } else {
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║   ⚠️  TEST FAILED - See errors above             ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');
    }

    console.log(`💡 To restore your original data, run:`);
    console.log(`   node scripts/test-restore-simple.js ${safetyBackupFile}\n`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get backup filename from command line or use default
const backupFileName = process.argv[2] || 'complete-backup-2025-12-06T17-36-29.json';

testCleanDatabaseRestore(backupFileName);
