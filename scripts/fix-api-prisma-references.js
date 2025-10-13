#!/usr/bin/env node
/**
 * Fix API Prisma Model References
 *
 * Converts snake_case Prisma model references to camelCase
 * in all API route files.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Map of snake_case to camelCase for all Prisma models
const modelMap = {
  'id_format_templates': 'idFormatTemplates',
  'job_titles': 'jobTitles',
  'compensation_types': 'compensationTypes',
  'benefit_types': 'benefitTypes',
  'business_accounts': 'businessAccounts',
  'business_brands': 'businessBrands',
  'business_categories': 'businessCategories',
  'business_customers': 'businessCustomers',
  'business_memberships': 'businessMemberships',
  'business_order_items': 'businessOrderItems',
  'business_orders': 'businessOrders',
  'business_products': 'businessProducts',
  'business_stock_movements': 'businessStockMovements',
  'business_suppliers': 'businessSuppliers',
  'business_transactions': 'businessTransactions',
  'chat_messages': 'chatMessages',
  'chat_participants': 'chatParticipants',
  'chat_rooms': 'chatRooms',
  'conflict_resolutions': 'conflictResolutions',
  'construction_expenses': 'constructionExpenses',
  'construction_projects': 'constructionProjects',
  'contract_benefits': 'contractBenefits',
  'contract_renewals': 'contractRenewals',
  'data_snapshots': 'dataSnapshots',
  'disciplinary_actions': 'disciplinaryActions',
  'driver_authorizations': 'driverAuthorizations',
  'driver_license_templates': 'driverLicenseTemplates',
  'employee_allowances': 'employeeAllowances',
  'employee_attendance': 'employeeAttendance',
  'employee_benefits': 'employeeBenefits',
  'employee_bonuses': 'employeeBonuses',
  'employee_business_assignments': 'employeeBusinessAssignments',
  'employee_contracts': 'employeeContracts',
  'employee_deduction_payments': 'employeeDeductionPayments',
  'employee_deductions': 'employeeDeductions',
  'employee_leave_balance': 'employeeLeaveBalance',
  'employee_leave_requests': 'employeeLeaveRequests',
  'employee_loan_payments': 'employeeLoanPayments',
  'employee_loans': 'employeeLoans',
  'employee_salary_increases': 'employeeSalaryIncreases',
  'employee_time_tracking': 'employeeTimeTracking',
  'expense_categories': 'expenseCategories',
  'fund_sources': 'fundSources',
  'initial_load_sessions': 'initialLoadSessions',
  'inter_business_loans': 'interBusinessLoans',
  'loan_transactions': 'loanTransactions',
  'menu_combo_items': 'menuComboItems',
  'menu_combos': 'menuCombos',
  'menu_items': 'menuItems',
  'menu_promotions': 'menuPromotions',
  'network_partitions': 'networkPartitions',
  'node_states': 'nodeStates',
  'offline_queue': 'offlineQueue',
  'order_items': 'orderItems',
  'payroll_adjustments': 'payrollAdjustments',
  'payroll_entries': 'payrollEntries',
  'payroll_entry_benefits': 'payrollEntryBenefits',
  'payroll_exports': 'payrollExports',
  'payroll_periods': 'payrollPeriods',
  'permission_templates': 'permissionTemplates',
  'personal_budgets': 'personalBudgets',
  'personal_expenses': 'personalExpenses',
  'product_attributes': 'productAttributes',
  'product_images': 'productImages',
  'product_variants': 'productVariants',
  'project_contractors': 'projectContractors',
  'project_stages': 'projectStages',
  'project_transactions': 'projectTransactions',
  'project_types': 'projectTypes',
  'stage_contractor_assignments': 'stageContractorAssignments',
  'supplier_products': 'supplierProducts',
  'sync_configurations': 'syncConfigurations',
  'sync_events': 'syncEvents',
  'sync_metrics': 'syncMetrics',
  'sync_nodes': 'syncNodes',
  'sync_sessions': 'syncSessions',
  'vehicle_drivers': 'vehicleDrivers',
  'vehicle_expenses': 'vehicleExpenses',
  'vehicle_licenses': 'vehicleLicenses',
  'vehicle_maintenance_records': 'vehicleMaintenanceRecords',
  'vehicle_maintenance_service_expenses': 'vehicleMaintenanceServiceExpenses',
  'vehicle_maintenance_services': 'vehicleMaintenanceServices',
  'vehicle_reimbursements': 'vehicleReimbursements',
  'vehicle_trips': 'vehicleTrips',
  'audit_logs': 'auditLogs'
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false
  let replacements = []

  // Replace each snake_case model with camelCase
  Object.entries(modelMap).forEach(([snakeCase, camelCase]) => {
    // Pattern: prisma.snake_case (with word boundary)
    const pattern = new RegExp(`prisma\\.${snakeCase}\\b`, 'g')
    const matches = content.match(pattern)

    if (matches) {
      content = content.replace(pattern, `prisma.${camelCase}`)
      modified = true
      replacements.push(`${snakeCase} → ${camelCase} (${matches.length}x)`)
    }
  })

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    return { modified: true, replacements }
  }

  return { modified: false, replacements: [] }
}

function main() {
  console.log('🔧 Fixing Prisma model references in API routes...\n')

  // Find all API route files with snake_case Prisma references
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api')

  console.log(`📁 Scanning: ${apiDir}\n`)

  // Use grep to find files with snake_case patterns
  let files = []
  try {
    const grepResult = execSync(
      `grep -rl "prisma\\.[a-z_]*_[a-z_]*" "${apiDir}" --include="*.ts"`,
      { encoding: 'utf8' }
    )
    files = grepResult.trim().split('\n').filter(Boolean)
  } catch (err) {
    if (err.status === 1) {
      console.log('✅ No files with snake_case Prisma references found')
      return
    }
    throw err
  }

  console.log(`📝 Found ${files.length} files to process\n`)

  let processedCount = 0
  let modifiedCount = 0
  let totalReplacements = 0

  files.forEach(file => {
    const relativePath = path.relative(process.cwd(), file)
    const result = fixFile(file)

    processedCount++

    if (result.modified) {
      modifiedCount++
      totalReplacements += result.replacements.length
      console.log(`✅ ${relativePath}`)
      result.replacements.forEach(rep => {
        console.log(`   - ${rep}`)
      })
      console.log('')
    }
  })

  console.log('━'.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`   • Files scanned: ${processedCount}`)
  console.log(`   • Files modified: ${modifiedCount}`)
  console.log(`   • Total replacements: ${totalReplacements}`)
  console.log('')
  console.log('✅ All API routes updated to use camelCase Prisma models!')
}

try {
  main()
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
