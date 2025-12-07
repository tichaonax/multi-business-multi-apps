import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of all tables to validate (sessions excluded - not backed up/restored)
const ALL_TABLES = [
  'systemSettings', 'emojiLookup', 'jobTitles', 'compensationTypes', 'benefitTypes',
  'permissionTemplates', 'idFormatTemplates', 'driverLicenseTemplates', 'projectTypes',
  'inventoryDomains', 'inventorySubcategories', 'expenseDomains', 'expenseCategories',
  'expenseSubcategories', 'users', 'accounts', 'businesses', 'businessMemberships',
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
  'menuPromotions', 'orders', 'orderItems', 'customerLaybys', 'customerLaybyPayments',
  'personalBudgets', 'personalExpenses', 'fundSources', 'interBusinessLoans', 'loanTransactions',
  'conflictResolutions', 'disciplinaryActions', 'employeeAttendance', 'employeeTimeTracking',
  'dataSnapshots', 'seedDataTemplates'
];

export async function POST(request: NextRequest) {
  try {
    const { backupFileName, backupData } = await request.json();

    if (!backupFileName || !backupData) {
      return NextResponse.json({
        success: false,
        error: 'Backup file name and data are required'
      }, { status: 400 });
    }

    console.log('📊 Validating backup against database...');

    const results: any = {
      tablesMatched: 0,
      tablesMismatched: 0,
      mismatches: [],
      summary: {}
    };

    // Map backup table names (plural) to Prisma model names (singular) for special cases
    const tableNameMapping: Record<string, string> = {
      'customerLaybys': 'customerLayby',
      'customerLaybyPayments': 'customerLaybyPayment'
    };

    // Validate each table
    for (const tableName of ALL_TABLES) {
      try {
        // Get the Prisma model name (use mapping if exists, otherwise use tableName as-is)
        const prismaModelName = tableNameMapping[tableName] || tableName;

        // Get count from database
        const dbCount = await (prisma as any)[prismaModelName].count();

        // Get count from backup
        const backupRecords = backupData[tableName] || [];
        const backupCount = Array.isArray(backupRecords) ? backupRecords.length : 0;

        results.summary[tableName] = {
          database: dbCount,
          backup: backupCount,
          matched: dbCount === backupCount
        };

        if (dbCount === backupCount) {
          results.tablesMatched++;
        } else {
          results.tablesMismatched++;
          results.mismatches.push({
            table: tableName,
            database: dbCount,
            backup: backupCount,
            difference: dbCount - backupCount
          });
        }
      } catch (error: any) {
        console.error(`Error validating ${tableName}:`, error.message);
        results.summary[tableName] = {
          database: 'error',
          backup: 'error',
          matched: false,
          error: error.message
        };
        results.tablesMismatched++;
      }
    }

    const allMatched = results.tablesMismatched === 0;

    console.log(allMatched ? '✅ Validation passed!' : '❌ Validation failed!');

    return NextResponse.json({
      success: true,
      validated: allMatched,
      backupFile: backupFileName,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Validation failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
