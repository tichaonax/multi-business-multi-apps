#!/usr/bin/env node
/**
 * Analyze API Prisma Model References
 *
 * Generates a detailed report of all files that need fixing
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Map of snake_case to camelCase for common Prisma models
const modelMap = {
  'id_format_templates': 'idFormatTemplates',
  'job_titles': 'jobTitles',
  'compensation_types': 'compensationTypes',
  'benefit_types': 'benefitTypes',
  'business_memberships': 'businessMemberships',
  'employee_contracts': 'employeeContracts',
  'employee_benefits': 'employeeBenefits',
  'employee_allowances': 'employeeAllowances',
  'employee_attendance': 'employeeAttendance',
  'employee_bonuses': 'employeeBonuses',
  'employee_business_assignments': 'employeeBusinessAssignments',
  'employee_deductions': 'employeeDeductions',
  'employee_leave_requests': 'employeeLeaveRequests',
  'employee_loans': 'employeeLoans',
  'payroll_periods': 'payrollPeriods',
  'payroll_entries': 'payrollEntries',
  'vehicle_drivers': 'vehicleDrivers',
  'vehicle_expenses': 'vehicleExpenses',
  'vehicle_trips': 'vehicleTrips',
  'vehicle_licenses': 'vehicleLicenses',
  'vehicle_maintenance_records': 'vehicleMaintenanceRecords',
  'driver_authorizations': 'driverAuthorizations',
  'construction_projects': 'constructionProjects',
  'construction_expenses': 'constructionExpenses',
  'project_contractors': 'projectContractors',
  'project_stages': 'projectStages',
  'project_transactions': 'projectTransactions',
  'personal_expenses': 'personalExpenses',
  'inter_business_loans': 'interBusinessLoans',
  'business_transactions': 'businessTransactions'
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const issues = []

  Object.entries(modelMap).forEach(([snakeCase, camelCase]) => {
    const pattern = new RegExp(`prisma\\.${snakeCase}\\b`, 'g')
    const matches = content.match(pattern)

    if (matches) {
      issues.push({
        snakeCase,
        camelCase,
        count: matches.length
      })
    }
  })

  return issues
}

function main() {
  console.log('📋 API Prisma Reference Analysis Report\n')
  console.log('=' .repeat(80))
  console.log('')

  const apiDir = path.join(process.cwd(), 'src', 'app', 'api')

  // Find all files with snake_case Prisma references
  let files = []
  try {
    const grepResult = execSync(
      `grep -rl "prisma\\.[a-z_]*_[a-z_]*" "${apiDir}" --include="*.ts"`,
      { encoding: 'utf8' }
    )
    files = grepResult.trim().split('\n').filter(Boolean)
  } catch (err) {
    if (err.status === 1) {
      console.log('✅ No files with snake_case Prisma references found\n')
      return
    }
    throw err
  }

  console.log(`Found ${files.length} files with Prisma model reference issues:\n`)

  const fileAnalysis = []

  files.forEach((file, index) => {
    const relativePath = path.relative(process.cwd(), file)
    const issues = analyzeFile(file)

    if (issues.length > 0) {
      fileAnalysis.push({ file: relativePath, issues })
    }
  })

  // Group by directory
  const byDirectory = {}
  fileAnalysis.forEach(item => {
    const dir = path.dirname(item.file)
    if (!byDirectory[dir]) {
      byDirectory[dir] = []
    }
    byDirectory[dir].push(item)
  })

  // Print grouped report
  Object.entries(byDirectory).sort().forEach(([dir, items]) => {
    console.log(`\n📁 ${dir}/`)
    console.log('─'.repeat(80))

    items.forEach(item => {
      const fileName = path.basename(item.file)
      console.log(`\n  📄 ${fileName}`)

      item.issues.forEach(issue => {
        console.log(`     ❌ prisma.${issue.snakeCase} (${issue.count}x)`)
        console.log(`     ✅ Should be: prisma.${issue.camelCase}`)
      })
    })
  })

  // Summary by model
  console.log('\n\n' + '='.repeat(80))
  console.log('\n📊 Summary by Model:\n')

  const modelCounts = {}
  fileAnalysis.forEach(item => {
    item.issues.forEach(issue => {
      if (!modelCounts[issue.snakeCase]) {
        modelCounts[issue.snakeCase] = {
          camelCase: issue.camelCase,
          count: 0,
          files: 0
        }
      }
      modelCounts[issue.snakeCase].count += issue.count
      modelCounts[issue.snakeCase].files += 1
    })
  })

  Object.entries(modelCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([snake, data]) => {
      console.log(`  ${snake} → ${data.camelCase}`)
      console.log(`     Used in ${data.files} files, ${data.count} total references`)
    })

  console.log('\n' + '='.repeat(80))
  console.log(`\n📌 Total Files to Fix: ${fileAnalysis.length}`)
  console.log(`📌 Total Issues: ${fileAnalysis.reduce((sum, item) => sum + item.issues.reduce((s, i) => s + i.count, 0), 0)}`)
  console.log('\n✅ Run: node scripts/fix-api-prisma-references.js\n')
}

try {
  main()
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
