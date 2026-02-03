import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Check if backup excluded demo data
    const backupMetadata = backupData.metadata || {};
    const includeDemoData = backupMetadata.businessFilter?.includeDemoData ?? true;

    // Handle different backup formats:
    // - Old format: tables at top level (backup.businesses)
    // - New format: tables nested in businessData (backup.businessData.businesses)
    const tableData = backupData.businessData || backupData;
    console.log(`Backup format: ${backupData.businessData ? 'nested (businessData)' : 'flat (top-level)'}`);

    console.log(`Backup metadata - includeDemoData: ${includeDemoData}`);

    // If backup excluded demo data, get demo business IDs to exclude from database counts
    let demoBusinessIds: string[] = [];
    if (!includeDemoData) {
      const demoBusinesses = await prisma.businesses.findMany({
        where: {
          OR: [
            { isDemo: true },
            { name: { contains: '[Demo]' } }
          ]
        },
        select: { id: true }
      });
      demoBusinessIds = demoBusinesses.map(b => b.id);
      console.log(`Found ${demoBusinessIds.length} demo businesses to exclude from validation`);
    }

    const results: any = {
      tablesMatched: 0,
      tablesMismatched: 0,
      mismatches: [],
      summary: {},
      validationMode: includeDemoData ? 'all-data' : 'production-only',
      excludedDemoBusinesses: demoBusinessIds.length
    };

    // Map backup table names (plural) to Prisma model names (singular) for special cases
    const tableNameMapping: Record<string, string> = {
      'customerLaybys': 'customerLayby',
      'customerLaybyPayments': 'customerLaybyPayment'
    };

    // Define which tables are business-related (should exclude demo business data)
    const businessRelatedTables: Record<string, string> = {
      'businesses': 'id',
      'businessMemberships': 'businessId',
      'businessAccounts': 'businessId',
      'businessLocations': 'businessId',
      'businessBrands': 'businessId',
      'businessCategories': 'businessId',
      'businessProducts': 'businessId',
      'productVariants': 'businessId',
      'productBarcodes': 'businessId',
      'productAttributes': 'businessId',
      'productImages': 'businessId',
      'businessStockMovements': 'businessId',
      'businessCustomers': 'businessId',
      'businessOrders': 'businessId',
      'businessOrderItems': 'businessId',
      'businessTransactions': 'businessId',
      'businessSuppliers': 'businessId',
      'supplierProducts': 'businessId',
      'employees': 'primaryBusinessId',
      'employeeBusinessAssignments': 'businessId',
      'employeeContracts': 'businessId',
      'contractBenefits': 'businessId',
      'contractRenewals': 'businessId',
      'employeeBenefits': 'businessId',
      'employeeAllowances': 'businessId',
      'employeeBonuses': 'businessId',
      'employeeSalaryIncreases': 'businessId',
      'employeeLeaveBalance': 'businessId',
      'employeeLeaveRequests': 'businessId',
      'employeeLoans': 'businessId',
      'employeeLoanPayments': 'businessId',
      'employeeDeductions': 'businessId',
      'employeeDeductionPayments': 'businessId',
      'payrollAccounts': 'businessId',
      'payrollPeriods': 'businessId',
      'payrollEntries': 'businessId',
      'payrollEntryBenefits': 'businessId',
      'payrollExports': 'businessId',
      'payrollAdjustments': 'businessId',
      'menuItems': 'businessId',
      'menuCombos': 'businessId',
      'menuComboItems': 'businessId',
      'menuPromotions': 'businessId',
      'orders': 'businessId',
      'orderItems': 'businessId',
      'customerLaybys': 'businessId',
      'customerLaybyPayments': 'businessId'
    };

    // Validate each table
    for (const tableName of ALL_TABLES) {
      try {
        // Get the Prisma model name (use mapping if exists, otherwise use tableName as-is)
        const prismaModelName = tableNameMapping[tableName] || tableName;

        // Build where clause to exclude demo data if needed
        let whereClause = {};
        if (!includeDemoData && demoBusinessIds.length > 0) {
          const businessIdField = businessRelatedTables[tableName];
          if (businessIdField) {
            if (businessIdField === 'id') {
              // For businesses table, exclude by ID directly
              whereClause = { id: { notIn: demoBusinessIds } };
            } else {
              // For related tables, exclude by business ID field
              whereClause = { [businessIdField]: { notIn: demoBusinessIds } };
            }
          }
        }

        // Get count from database with filter
        const dbCount = await (prisma as any)[prismaModelName].count({ where: whereClause });

        // Get count from backup (use tableData which handles both old and new formats)
        const backupRecords = tableData[tableName] || [];
        const backupCount = Array.isArray(backupRecords) ? backupRecords.length : 0;

        const matched = dbCount === backupCount;
        const isBusinessRelated = !!businessRelatedTables[tableName];
        const demoDataExcluded = !includeDemoData && isBusinessRelated;

        results.summary[tableName] = {
          database: dbCount,
          backup: backupCount,
          matched,
          demoDataExcluded,
          note: demoDataExcluded ? 'Counting production data only (demo excluded)' : undefined
        };

        if (matched) {
          results.tablesMatched++;
        } else {
          results.tablesMismatched++;
          results.mismatches.push({
            table: tableName,
            database: dbCount,
            backup: backupCount,
            difference: dbCount - backupCount,
            demoDataExcluded,
            note: demoDataExcluded ? 'Database count excludes demo data to match backup filter' : undefined
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

    console.log(`\n📊 Validation Summary:`);
    console.log(`   Mode: ${results.validationMode}`);
    if (!includeDemoData) {
      console.log(`   Excluded ${demoBusinessIds.length} demo businesses from database counts`);
    }
    console.log(`   Tables matched: ${results.tablesMatched}`);
    console.log(`   Tables mismatched: ${results.tablesMismatched}`);
    console.log(allMatched ? '✅ Validation passed!' : '❌ Validation failed!');

    // Sort the summary alphabetically for easier reading
    const sortedSummary: any = {};
    Object.keys(results.summary)
      .sort((a, b) => a.localeCompare(b))
      .forEach(key => {
        sortedSummary[key] = results.summary[key];
      });

    // Sort mismatches alphabetically too
    results.mismatches.sort((a: any, b: any) => a.table.localeCompare(b.table));

    return NextResponse.json({
      success: true,
      validated: allMatched,
      backupFile: backupFileName,
      results: {
        ...results,
        summary: sortedSummary
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Validation failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
