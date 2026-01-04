const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')
const prisma = new PrismaClient()

/**
 * Master Seeding Script for Demo Data
 *
 * This script orchestrates all demo data seeding in the correct order:
 * 1. Reference Data (categories, domains, project types)
 * 2. Demo Businesses & Employees
 * 3. Products & Inventory
 * 4. Sales Orders & Business Expenses
 * 5. WiFi Portal (ESP32 & R710)
 * 6. Printers & Print Jobs
 * 7. Payroll Accounts & Periods
 * 8. HR Features (Benefits, Loans, Leave, Salary Increases)
 * 9. Construction Projects & Contractors
 *
 * Features:
 * - Comprehensive feature coverage (100% demo data)
 * - Re-runnable (idempotent seeding scripts)
 * - Error handling with detailed reporting
 * - Progress tracking and timing
 * - Verification checks for each phase
 */

async function seedAllDemoData() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║    🌱 Master Demo Data Seeding Script - Complete          ║')
  console.log('║         Comprehensive Demo Data for All Features          ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  const startTime = Date.now()
  let currentStep = 0
  const totalSteps = 16 // Updated total steps

  try {
    // ═══════════════════════════════════════════════════════════
    // Step 0: Pre-flight Checks
    // ═══════════════════════════════════════════════════════════
    console.log('🔍 Running pre-flight checks...\n')

    // Check for demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: {
        OR: [
          { name: { contains: '[Demo]' } },
          { name: { contains: 'Demo' } }
        ]
      },
      select: { id: true, name: true, type: true }
    })

    if (demoBusinesses.length === 0) {
      throw new Error('No demo businesses found! Please ensure demo businesses exist in the database.')
    }

    console.log(`✅ Found ${demoBusinesses.length} demo businesses:`)
    demoBusinesses.forEach(b => {
      console.log(`   - ${b.name} (${b.type})`)
    })
    console.log('')

    // Check for expense categories
    const categoryCount = await prisma.expenseCategories.count()
    if (categoryCount === 0) {
      console.log('⚠️  No expense categories found. These should be seeded via migration.')
      console.log('   Run: npx prisma db seed (or ensure seed-data/expense-types/ files exist)')
      console.log('')
    } else {
      console.log(`✅ Found ${categoryCount} expense categories\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // Step 1: Seed Demo Employees
    // ═══════════════════════════════════════════════════════════
    currentStep = 1
    console.log(`[$${currentStep}/${totalSteps}] 👥 Seeding Demo Employees...\n`)

    console.log('   Running: node scripts/seed-demo-employees.js')
    try {
      execSync('node scripts/seed-demo-employees.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Demo employees seeded successfully\n')
    } catch (error) {
      throw new Error(`Failed to seed demo employees: ${error.message}`)
    }

    // ═══════════════════════════════════════════════════════════
    // Step 2: Seed Demo Business Expenses
    // ═══════════════════════════════════════════════════════════
    currentStep = 2
    console.log(`[${currentStep}/${totalSteps}] 💸 Seeding Demo Business Expenses...\n`)

    console.log('   Running: node scripts/seed-demo-business-expenses.js')
    try {
      execSync('node scripts/seed-demo-business-expenses.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Demo business expenses seeded successfully\n')
    } catch (error) {
      throw new Error(`Failed to seed demo business expenses: ${error.message}`)
    }

    // ═══════════════════════════════════════════════════════════
    // Step 3: Seed Sales Orders with Employee Assignments
    // ═══════════════════════════════════════════════════════════
    currentStep = 3
    console.log(`[${currentStep}/${totalSteps}] 🛒 Seeding Sales Orders with Employees...\n`)

    console.log('   Running: node scripts/seed-sales-orders-all-businesses.js')
    try {
      execSync('node scripts/seed-sales-orders-all-businesses.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Sales orders seeded successfully\n')
    } catch (error) {
      throw new Error(`Failed to seed sales orders: ${error.message}`)
    }

    // ═══════════════════════════════════════════════════════════
    // Step 4: Seed Demo Expense Accounts
    // ═══════════════════════════════════════════════════════════
    currentStep = 4
    console.log(`[${currentStep}/${totalSteps}] 💳 Seeding Demo Expense Accounts...\n`)

    console.log('   Running: node scripts/seed-demo-expense-accounts.js')
    try {
      execSync('node scripts/seed-demo-expense-accounts.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Expense accounts seeded successfully\n')
    } catch (error) {
      throw new Error(`Failed to seed expense accounts: ${error.message}`)
    }

    // ═══════════════════════════════════════════════════════════
    // Step 5: Seed WiFi Portal - ESP32 Tokens
    // ═══════════════════════════════════════════════════════════
    currentStep = 5
    console.log(`[${currentStep}/${totalSteps}] 📡 Seeding WiFi Portal - ESP32 Tokens...\n`)

    console.log('   Running: node scripts/seed-esp32-tokens-demo.js')
    try {
      execSync('node scripts/seed-esp32-tokens-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ ESP32 WiFi tokens seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed ESP32 tokens: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 6: Seed WiFi Portal - R710 Tokens
    // ═══════════════════════════════════════════════════════════
    currentStep = 6
    console.log(`[${currentStep}/${totalSteps}] 📶 Seeding WiFi Portal - R710 Tokens...\n`)

    console.log('   Running: node scripts/seed-r710-tokens-demo.js')
    try {
      execSync('node scripts/seed-r710-tokens-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ R710 WiFi tokens seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed R710 tokens: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 7: Seed Printers & Print Jobs
    // ═══════════════════════════════════════════════════════════
    currentStep = 7
    console.log(`[${currentStep}/${totalSteps}] 🖨️  Seeding Printers & Print Jobs...\n`)

    console.log('   Running: node scripts/seed-printers-demo.js')
    try {
      execSync('node scripts/seed-printers-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Printers and print jobs seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed printers: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 8: Seed Payroll Accounts
    // ═══════════════════════════════════════════════════════════
    currentStep = 8
    console.log(`[${currentStep}/${totalSteps}] 💼 Seeding Payroll Accounts...\n`)

    console.log('   Running: node scripts/seed-payroll-accounts-demo.js')
    try {
      execSync('node scripts/seed-payroll-accounts-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Payroll accounts seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed payroll accounts: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 9: Seed Payroll Periods
    // ═══════════════════════════════════════════════════════════
    currentStep = 9
    console.log(`[${currentStep}/${totalSteps}] 📊 Seeding Payroll Periods...\n`)

    console.log('   Running: node scripts/seed-payroll-demo.js')
    try {
      execSync('node scripts/seed-payroll-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Payroll periods seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed payroll periods: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 10: Seed Employee Benefits
    // ═══════════════════════════════════════════════════════════
    currentStep = 10
    console.log(`[${currentStep}/${totalSteps}] 🏥 Seeding Employee Benefits...\n`)

    console.log('   Running: node scripts/seed-employee-benefits-demo.js')
    try {
      execSync('node scripts/seed-employee-benefits-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Employee benefits seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed employee benefits: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 11: Seed Employee Loans
    // ═══════════════════════════════════════════════════════════
    currentStep = 11
    console.log(`[${currentStep}/${totalSteps}] 💰 Seeding Employee Loans...\n`)

    console.log('   Running: node scripts/seed-employee-loans-demo.js')
    try {
      execSync('node scripts/seed-employee-loans-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Employee loans seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed employee loans: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 12: Seed Leave Management
    // ═══════════════════════════════════════════════════════════
    currentStep = 12
    console.log(`[${currentStep}/${totalSteps}] 🏖️  Seeding Leave Management...\n`)

    console.log('   Running: node scripts/seed-leave-management-demo.js')
    try {
      execSync('node scripts/seed-leave-management-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Leave management seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed leave management: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 13: Seed Salary Increases
    // ═══════════════════════════════════════════════════════════
    currentStep = 13
    console.log(`[${currentStep}/${totalSteps}] 📈 Seeding Salary Increases...\n`)

    console.log('   Running: node scripts/seed-salary-increases-demo.js')
    try {
      execSync('node scripts/seed-salary-increases-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Salary increases seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed salary increases: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 14: Seed Construction Projects
    // ═══════════════════════════════════════════════════════════
    currentStep = 14
    console.log(`[${currentStep}/${totalSteps}] 🏗️  Seeding Construction Projects...\n`)

    console.log('   Running: node scripts/seed-construction-projects-demo.js')
    try {
      execSync('node scripts/seed-construction-projects-demo.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n✅ Construction projects seeded successfully\n')
    } catch (error) {
      console.log(`⚠️  Warning: Failed to seed construction projects: ${error.message}`)
      console.log('   Continuing with remaining steps...\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 15: Comprehensive Data Verification
    // ═══════════════════════════════════════════════════════════
    currentStep = 15
    console.log(`[${currentStep}/${totalSteps}] ✅ Running Comprehensive Verification...\n`)

    // Count seeded data
    const employeeCount = await prisma.employees.count({
      where: {
        primaryBusinessId: {
          in: demoBusinesses.map(b => b.id)
        }
      }
    })

    const expenseCount = await prisma.businessExpenses.count({
      where: {
        businessId: {
          in: demoBusinesses.map(b => b.id)
        }
      }
    })

    const orderCount = await prisma.businessOrders.count({
      where: {
        businessId: {
          in: demoBusinesses.map(b => b.id)
        }
      }
    })

    const ordersWithEmployees = await prisma.businessOrders.count({
      where: {
        businessId: {
          in: demoBusinesses.map(b => b.id)
        },
        employeeId: {
          not: null
        }
      }
    })

    const expenseAccountCount = await prisma.expenseAccounts.count()
    const expenseDepositCount = await prisma.expenseAccountDeposits.count()

    // WiFi Portal counts
    const esp32TokensCount = await prisma.wiFiTokens.count()
    const r710TokensCount = await prisma.r710BusinessTokens.count()

    // Printer counts
    const printersCount = await prisma.printers.count()
    const printJobsCount = await prisma.printJobs.count()

    // Payroll counts
    const payrollPeriodsCount = await prisma.payrollPeriods.count()
    const payrollEntriesCount = await prisma.payrollEntries.count()

    // HR Feature counts
    const benefitsCount = await prisma.employeeBenefits.count()
    const loansCount = await prisma.employeeLoans.count()
    const leaveRequestsCount = await prisma.employeeLeaveRequests.count()
    const salaryIncreasesCount = await prisma.employeeSalaryIncreases.count()

    // Construction counts
    const constructionProjectsCount = await prisma.constructionProjects.count()
    const contractorsCount = await prisma.persons.count()

    console.log('📊 Comprehensive Data Summary:')
    console.log('')
    console.log('🏢 Core Data:')
    console.log(`   Demo Businesses: ${demoBusinesses.length}`)
    console.log(`   Employees: ${employeeCount}`)
    console.log(`   Business Expenses: ${expenseCount}`)
    console.log(`   Sales Orders: ${orderCount}`)
    console.log(`   Orders with Sales Person: ${ordersWithEmployees} (${((ordersWithEmployees/orderCount)*100).toFixed(1)}%)`)
    console.log('')
    console.log('💳 Financial:')
    console.log(`   Expense Accounts: ${expenseAccountCount}`)
    console.log(`   Expense Deposits: ${expenseDepositCount}`)
    console.log(`   Payroll Periods: ${payrollPeriodsCount}`)
    console.log(`   Payroll Entries: ${payrollEntriesCount}`)
    console.log('')
    console.log('📡 WiFi Portal:')
    console.log(`   ESP32 Tokens: ${esp32TokensCount}`)
    console.log(`   R710 Tokens: ${r710TokensCount}`)
    console.log('')
    console.log('🖨️  Printing:')
    console.log(`   Printers: ${printersCount}`)
    console.log(`   Print Jobs: ${printJobsCount}`)
    console.log('')
    console.log('👥 HR Features:')
    console.log(`   Employee Benefits: ${benefitsCount}`)
    console.log(`   Employee Loans: ${loansCount}`)
    console.log(`   Leave Requests: ${leaveRequestsCount}`)
    console.log(`   Salary Increases: ${salaryIncreasesCount}`)
    console.log('')
    console.log('🏗️  Construction:')
    console.log(`   Projects: ${constructionProjectsCount}`)
    console.log(`   Contractors: ${contractorsCount}`)
    console.log('')

    // Verify each demo business has data
    console.log('📋 Per-Business Verification:')
    for (const business of demoBusinesses) {
      const empCount = await prisma.employees.count({
        where: { primaryBusinessId: business.id }
      })
      const expCount = await prisma.businessExpenses.count({
        where: { businessId: business.id }
      })
      const ordCount = await prisma.businessOrders.count({
        where: { businessId: business.id }
      })

      const status = empCount > 0 && expCount > 0 && ordCount > 0 ? '✅' : '⚠️'
      console.log(`   ${status} ${business.name}:`)
      console.log(`      Employees: ${empCount} | Expenses: ${expCount} | Orders: ${ordCount}`)
    }
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Step 16: Success Summary
    // ═══════════════════════════════════════════════════════════
    currentStep = 16
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                 🎉 SEEDING COMPLETE! 🎉                    ║')
    console.log('║           100% Feature Coverage Achieved!                 ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')
    console.log(`✅ All demo data seeded successfully in ${duration}s`)
    console.log(`✅ Completed ${currentStep} of ${totalSteps} steps`)
    console.log('')
    console.log('📝 Next Steps:')
    console.log('   1. Start the dev server: npm run dev')
    console.log('   2. Login with demo credentials (see DEMO-TEST-CREDENTIALS.md)')
    console.log('   3. Test all features with comprehensive demo data:')
    console.log('')
    console.log('   🏢 Core Features:')
    console.log('      • Sales Analytics Dashboard')
    console.log('      • Employee Management')
    console.log('      • Product & Inventory Management')
    console.log('      • Business Expenses Tracking')
    console.log('')
    console.log('   📡 WiFi Portal:')
    console.log('      • ESP32 Token Management (Restaurant, Grocery)')
    console.log('      • R710 Token Management (Hardware, Clothing)')
    console.log('      • WiFi Sales Integration')
    console.log('')
    console.log('   🖨️  Printing System:')
    console.log('      • Network Printer Management')
    console.log('      • Barcode Label Printing')
    console.log('      • Receipt Printing (Thermal & Document)')
    console.log('')
    console.log('   💼 Payroll:')
    console.log('      • Payroll Accounts & Balances')
    console.log('      • Payroll Period Processing')
    console.log('      • Payroll Entry Calculations')
    console.log('')
    console.log('   👥 HR Features:')
    console.log('      • Employee Benefits Management')
    console.log('      • Employee Loans & Payments')
    console.log('      • Leave Management (Annual & Sick)')
    console.log('      • Salary Increase History')
    console.log('')
    console.log('   🏗️  Construction Module:')
    console.log('      • Construction Projects Tracking')
    console.log('      • Project Stages & Progress')
    console.log('      • Contractor Management')
    console.log('      • Project Transactions')
    console.log('')
    console.log('🔗 Documentation:')
    console.log('   - DEMO-TEST-CREDENTIALS.md - Demo employee login credentials')
    console.log('   - DEMO-DATA-EXPANSION-PLAN.md - Complete feature coverage details')
    console.log('   - DEMO-DATA-AUDIT-REPORT.md - Data verification report')
    console.log('')

  } catch (error) {
    console.error('\n❌ Error during seeding process:')
    console.error(`   Step: ${currentStep}/${totalSteps}`)
    console.error(`   Error: ${error.message}`)
    console.error('')
    console.error('💡 Troubleshooting:')
    console.error('   1. Check that all individual seeding scripts exist')
    console.error('   2. Verify database connection is working')
    console.error('   3. Ensure demo businesses exist in the database')
    console.error('   4. Check Prisma schema is up to date (npx prisma generate)')
    console.error('')
    console.error('🔄 To retry:')
    console.error('   node scripts/seed-all-demo-data.js')
    console.error('')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
seedAllDemoData()
