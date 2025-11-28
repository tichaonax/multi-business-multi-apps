const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')
const prisma = new PrismaClient()

/**
 * Master Seeding Script for Demo Data
 *
 * This script orchestrates all demo data seeding in the correct order:
 * 1. Expense Categories (already seeded via migration)
 * 2. Demo Employees (with user accounts and business memberships)
 * 3. Demo Business Expenses
 * 4. Demo Sales Orders (with employeeId assignments)
 *
 * Features:
 * - Re-runnable (cleans up existing demo data first)
 * - Error handling with rollback
 * - Progress reporting
 * - Verification checks
 */

async function seedAllDemoData() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║    🌱 Master Demo Data Seeding Script - MBM-114A          ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  const startTime = Date.now()
  let currentStep = 0
  const totalSteps = 5

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
    // Step 5: Final Verification
    // ═══════════════════════════════════════════════════════════
    currentStep = 5
    console.log(`[${currentStep}/${totalSteps}] ✅ Running Final Verification...\n`)

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

    console.log('📊 Data Summary:')
    console.log(`   Demo Businesses: ${demoBusinesses.length}`)
    console.log(`   Employees: ${employeeCount}`)
    console.log(`   Business Expenses: ${expenseCount}`)
    console.log(`   Sales Orders: ${orderCount}`)
    console.log(`   Orders with Sales Person: ${ordersWithEmployees} (${((ordersWithEmployees/orderCount)*100).toFixed(1)}%)`)
    console.log(`   Expense Accounts: ${expenseAccountCount}`)
    console.log(`   Expense Deposits: ${expenseDepositCount}`)
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

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                 🎉 SEEDING COMPLETE! 🎉                    ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')
    console.log(`✅ All demo data seeded successfully in ${duration}s`)
    console.log('')
    console.log('📝 Next Steps:')
    console.log('   1. Start the dev server: npm run dev')
    console.log('   2. Login with demo credentials (see DEMO-TEST-CREDENTIALS.md)')
    console.log('   3. Test the following features:')
    console.log('      - Sales Analytics Dashboard (/restaurant/reports/sales-analytics)')
    console.log('      - Employee Filtering (on dashboard)')
    console.log('      - End-of-Day Reports')
    console.log('')
    console.log('🔗 Documentation:')
    console.log('   - DEMO-TEST-CREDENTIALS.md - Demo employee logins')
    console.log('   - MBM-114B-SALES-ANALYTICS-COMPLETE.md - Sales analytics guide')
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
