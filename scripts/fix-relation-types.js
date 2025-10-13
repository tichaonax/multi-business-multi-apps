#!/usr/bin/env node

/**
 * Fix Prisma Schema Relation Types
 *
 * Converts relation field types from snake_case to PascalCase
 * after model names have been converted to PascalCase
 */

const fs = require('fs')
const path = require('path')

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma')

// Map of snake_case to PascalCase for relation types
const relationMap = {
  'users': 'Users',
  'businesses': 'Businesses',
  'employees': 'Employees',
  'accounts': 'Accounts',
  'audit_logs': 'AuditLogs',
  'benefit_types': 'BenefitTypes',
  'business_accounts': 'BusinessAccounts',
  'business_brands': 'BusinessBrands',
  'business_categories': 'BusinessCategories',
  'business_customers': 'BusinessCustomers',
  'business_memberships': 'BusinessMemberships',
  'business_order_items': 'BusinessOrderItems',
  'business_orders': 'BusinessOrders',
  'business_products': 'BusinessProducts',
  'business_stock_movements': 'BusinessStockMovements',
  'business_suppliers': 'BusinessSuppliers',
  'business_transactions': 'BusinessTransactions',
  'chat_messages': 'ChatMessages',
  'chat_participants': 'ChatParticipants',
  'chat_rooms': 'ChatRooms',
  'compensation_types': 'CompensationTypes',
  'construction_expenses': 'ConstructionExpenses',
  'construction_projects': 'ConstructionProjects',
  'contract_benefits': 'ContractBenefits',
  'contract_renewals': 'ContractRenewals',
  'disciplinary_actions': 'DisciplinaryActions',
  'driver_authorizations': 'DriverAuthorizations',
  'driver_license_templates': 'DriverLicenseTemplates',
  'employee_allowances': 'EmployeeAllowances',
  'employee_attendance': 'EmployeeAttendance',
  'employee_benefits': 'EmployeeBenefits',
  'employee_bonuses': 'EmployeeBonuses',
  'employee_business_assignments': 'EmployeeBusinessAssignments',
  'employee_contracts': 'EmployeeContracts',
  'employee_deduction_payments': 'EmployeeDeductionPayments',
  'employee_deductions': 'EmployeeDeductions',
  'employee_leave_balance': 'EmployeeLeaveBalance',
  'employee_leave_requests': 'EmployeeLeaveRequests',
  'employee_loan_payments': 'EmployeeLoanPayments',
  'employee_loans': 'EmployeeLoans',
  'employee_salary_increases': 'EmployeeSalaryIncreases',
  'employee_time_tracking': 'EmployeeTimeTracking',
  'expense_categories': 'ExpenseCategories',
  'fund_sources': 'FundSources',
  'id_format_templates': 'IdFormatTemplates',
  'inter_business_loans': 'InterBusinessLoans',
  'job_titles': 'JobTitles',
  'loan_transactions': 'LoanTransactions',
  'menu_combo_items': 'MenuComboItems',
  'menu_combos': 'MenuCombos',
  'menu_items': 'MenuItems',
  'menu_promotions': 'MenuPromotions',
  'order_items': 'OrderItems',
  'orders': 'Orders',
  'payroll_adjustments': 'PayrollAdjustments',
  'payroll_entries': 'PayrollEntries',
  'payroll_entry_benefits': 'PayrollEntryBenefits',
  'payroll_exports': 'PayrollExports',
  'payroll_periods': 'PayrollPeriods',
  'permission_templates': 'PermissionTemplates',
  'personal_budgets': 'PersonalBudgets',
  'personal_expenses': 'PersonalExpenses',
  'persons': 'Persons',
  'product_attributes': 'ProductAttributes',
  'product_images': 'ProductImages',
  'product_variants': 'ProductVariants',
  'project_contractors': 'ProjectContractors',
  'project_stages': 'ProjectStages',
  'project_transactions': 'ProjectTransactions',
  'project_types': 'ProjectTypes',
  'projects': 'Projects',
  'sessions': 'Sessions',
  'stage_contractor_assignments': 'StageContractorAssignments',
  'supplier_products': 'SupplierProducts',
  'vehicle_drivers': 'VehicleDrivers',
  'vehicle_expenses': 'VehicleExpenses',
  'vehicle_licenses': 'VehicleLicenses',
  'vehicle_maintenance_records': 'VehicleMaintenanceRecords',
  'vehicle_maintenance_service_expenses': 'VehicleMaintenanceServiceExpenses',
  'vehicle_maintenance_services': 'VehicleMaintenanceServices',
  'vehicle_reimbursements': 'VehicleReimbursements',
  'vehicle_trips': 'VehicleTrips',
  'vehicles': 'Vehicles'
}

function fixRelationTypes() {
  console.log('🔧 Fixing Prisma Schema Relation Types\n')

  // Read schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')

  let fixed = schema
  let replacementCount = 0

  // Replace relation types
  // Pattern: fieldName relation_type @relation(...) or fieldName relation_type?
  Object.entries(relationMap).forEach(([snake, pascal]) => {
    // Match: spaces + field_name + spaces + snake_case_type + (whitespace OR ? OR [ OR @)
    // Using word boundary \\b would be ideal but doesn't work with underscores
    // So we match start of line or whitespace, then snake_case, then end markers

    const patterns = [
      // Standard: fieldName snake_case @relation
      new RegExp(`(\\s+[a-zA-Z_]+\\s+)${snake}(\\s+@)`, 'g'),
      // Optional: fieldName snake_case? @relation
      new RegExp(`(\\s+[a-zA-Z_]+\\s+)${snake}(\\?\\s+@)`, 'g'),
      // Array: fieldName snake_case[] @relation
      new RegExp(`(\\s+[a-zA-Z_]+\\s+)${snake}(\\[\\])`, 'g'),
      // Optional Array: fieldName snake_case[]?
      new RegExp(`(\\s+[a-zA-Z_]+\\s+)${snake}(\\[\\]\\?)`, 'g'),
    ]

    patterns.forEach(pattern => {
      const matches = fixed.match(pattern)
      if (matches) {
        replacementCount += matches.length
        fixed = fixed.replace(pattern, `$1${pascal}$2`)
      }
    })
  })

  // Write fixed schema
  fs.writeFileSync(SCHEMA_PATH, fixed)

  console.log(`✅ Fixed ${replacementCount} relation type references`)
  console.log(`✅ All relation types now use PascalCase model names\n`)
}

try {
  fixRelationTypes()
} catch (error) {
  console.error('❌ Error fixing relation types:', error.message)
  process.exit(1)
}
