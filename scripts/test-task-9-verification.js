const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Task 9: Testing & Verification Script
 *
 * Automated verification of all MBM-114A features:
 * 1. Restaurant dashboard has food/kitchen expenses
 * 2. Grocery dashboard has produce/dairy expenses
 * 3. Hardware dashboard has tools/equipment expenses
 * 4. Clothing dashboard has inventory/commission expenses
 * 5. Sales person filtering data exists
 * 6. Date range data exists
 */

async function runTask9Verification() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║         Task 9: Testing & Verification - MBM-114A         ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  }

  try {
    // Get date range (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 30)

    // ═══════════════════════════════════════════════════════════
    // Test 1: Restaurant Dashboard - Food/Kitchen Expenses
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Test 1: Restaurant Dashboard - Food/Kitchen Expenses\n')

    const restaurantBusiness = await prisma.businesses.findFirst({
      where: {
        type: 'restaurant',
        name: { contains: '[Demo]' }
      }
    })

    if (!restaurantBusiness) {
      results.tests.push({ name: 'Restaurant Business', status: 'FAILED', message: 'No restaurant demo business found' })
      results.failed++
    } else {
      // Check for food-related expense categories
      const restaurantExpenses = await prisma.businessExpenses.findMany({
        where: {
          businessId: restaurantBusiness.id,
          expenseDate: { gte: startDate, lte: endDate }
        },
        include: {
          expense_categories: true,
          expense_subcategories: true
        },
        take: 10
      })

      const foodCategories = ['Proteins', 'Produce', 'Fresh Produce', 'Vegetables', 'Meat', 'Dairy']
      const hasFoodExpenses = restaurantExpenses.some(exp =>
        foodCategories.some(cat =>
          exp.expense_categories.name?.includes(cat) ||
          exp.expense_subcategories?.name?.includes(cat)
        )
      )

      if (hasFoodExpenses) {
        results.tests.push({ name: 'Restaurant Food/Kitchen Expenses', status: 'PASSED', message: `Found ${restaurantExpenses.length} expenses with food categories` })
        results.passed++
        console.log(`   ✅ PASSED: Found food/kitchen expenses`)
        restaurantExpenses.slice(0, 3).forEach(exp => {
          console.log(`      - ${exp.expense_categories.name} > ${exp.expense_subcategories?.name || 'N/A'}: $${exp.amount}`)
        })
      } else {
        results.tests.push({ name: 'Restaurant Food/Kitchen Expenses', status: 'WARNING', message: 'No food-related expenses found' })
        results.warnings++
        console.log(`   ⚠️  WARNING: No food/kitchen expenses found`)
      }
    }
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Test 2: Grocery Dashboard - Produce/Dairy Expenses
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Test 2: Grocery Dashboard - Produce/Dairy Expenses\n')

    const groceryBusiness = await prisma.businesses.findFirst({
      where: {
        type: 'grocery',
        name: { contains: '[Demo]' }
      }
    })

    if (!groceryBusiness) {
      results.tests.push({ name: 'Grocery Business', status: 'FAILED', message: 'No grocery demo business found' })
      results.failed++
    } else {
      const groceryExpenses = await prisma.businessExpenses.findMany({
        where: {
          businessId: groceryBusiness.id,
          expenseDate: { gte: startDate, lte: endDate }
        },
        include: {
          expense_categories: true,
          expense_subcategories: true
        },
        take: 10
      })

      const groceryCategories = ['Produce', 'Dairy', 'Fresh', 'Vegetables', 'Fruits']
      const hasGroceryExpenses = groceryExpenses.some(exp =>
        groceryCategories.some(cat =>
          exp.expense_categories.name?.includes(cat) ||
          exp.expense_subcategories?.name?.includes(cat)
        )
      )

      if (hasGroceryExpenses) {
        results.tests.push({ name: 'Grocery Produce/Dairy Expenses', status: 'PASSED', message: `Found ${groceryExpenses.length} expenses` })
        results.passed++
        console.log(`   ✅ PASSED: Found produce/dairy expenses`)
        groceryExpenses.slice(0, 3).forEach(exp => {
          console.log(`      - ${exp.expense_categories.name} > ${exp.expense_subcategories?.name || 'N/A'}: $${exp.amount}`)
        })
      } else {
        results.tests.push({ name: 'Grocery Produce/Dairy Expenses', status: 'WARNING', message: 'No produce/dairy expenses found' })
        results.warnings++
        console.log(`   ⚠️  WARNING: No produce/dairy expenses found`)
      }
    }
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Test 3: Hardware Dashboard - Tools/Equipment Expenses
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Test 3: Hardware Dashboard - Tools/Equipment Expenses\n')

    const hardwareBusiness = await prisma.businesses.findFirst({
      where: {
        type: 'hardware',
        name: { contains: '[Demo]' }
      }
    })

    if (!hardwareBusiness) {
      results.tests.push({ name: 'Hardware Business', status: 'FAILED', message: 'No hardware demo business found' })
      results.failed++
    } else {
      const hardwareExpenses = await prisma.businessExpenses.findMany({
        where: {
          businessId: hardwareBusiness.id,
          expenseDate: { gte: startDate, lte: endDate }
        },
        include: {
          expense_categories: true,
          expense_subcategories: true
        },
        take: 10
      })

      const hardwareCategories = ['Tools', 'Equipment', 'Inventory', 'Hardware']
      const hasHardwareExpenses = hardwareExpenses.some(exp =>
        hardwareCategories.some(cat =>
          exp.expense_categories.name?.includes(cat) ||
          exp.expense_subcategories?.name?.includes(cat)
        )
      )

      if (hasHardwareExpenses) {
        results.tests.push({ name: 'Hardware Tools/Equipment Expenses', status: 'PASSED', message: `Found ${hardwareExpenses.length} expenses` })
        results.passed++
        console.log(`   ✅ PASSED: Found tools/equipment expenses`)
        hardwareExpenses.slice(0, 3).forEach(exp => {
          console.log(`      - ${exp.expense_categories.name} > ${exp.expense_subcategories?.name || 'N/A'}: $${exp.amount}`)
        })
      } else {
        results.tests.push({ name: 'Hardware Tools/Equipment Expenses', status: 'WARNING', message: 'No tools/equipment expenses found' })
        results.warnings++
        console.log(`   ⚠️  WARNING: No tools/equipment expenses found`)
      }
    }
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Test 4: Clothing Dashboard - Inventory/Commission Expenses
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Test 4: Clothing Dashboard - Inventory/Commission Expenses\n')

    const clothingBusiness = await prisma.businesses.findFirst({
      where: {
        type: 'clothing',
        name: { contains: '[Demo]' }
      }
    })

    if (!clothingBusiness) {
      results.tests.push({ name: 'Clothing Business', status: 'FAILED', message: 'No clothing demo business found' })
      results.failed++
    } else {
      const clothingExpenses = await prisma.businessExpenses.findMany({
        where: {
          businessId: clothingBusiness.id,
          expenseDate: { gte: startDate, lte: endDate }
        },
        include: {
          expense_categories: true,
          expense_subcategories: true
        },
        take: 10
      })

      const clothingCategories = ['Inventory', 'Commission', 'Garment', 'Clothing', 'Staff']
      const hasClothingExpenses = clothingExpenses.some(exp =>
        clothingCategories.some(cat =>
          exp.expense_categories.name?.includes(cat) ||
          exp.expense_subcategories?.name?.includes(cat)
        )
      )

      if (hasClothingExpenses) {
        results.tests.push({ name: 'Clothing Inventory/Commission Expenses', status: 'PASSED', message: `Found ${clothingExpenses.length} expenses` })
        results.passed++
        console.log(`   ✅ PASSED: Found inventory/commission expenses`)
        clothingExpenses.slice(0, 3).forEach(exp => {
          console.log(`      - ${exp.expense_categories.name} > ${exp.expense_subcategories?.name || 'N/A'}: $${exp.amount}`)
        })
      } else {
        results.tests.push({ name: 'Clothing Inventory/Commission Expenses', status: 'WARNING', message: 'No inventory/commission expenses found' })
        results.warnings++
        console.log(`   ⚠️  WARNING: No inventory/commission expenses found`)
      }
    }
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Test 5: Sales Person Filtering Data
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Test 5: Sales Person Filtering Data\n')

    const ordersWithEmployees = await prisma.businessOrders.count({
      where: {
        employeeId: { not: null },
        createdAt: { gte: startDate, lte: endDate }
      }
    })

    const totalOrders = await prisma.businessOrders.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    })

    const coverage = totalOrders > 0 ? (ordersWithEmployees / totalOrders) * 100 : 0

    if (coverage >= 95) {
      results.tests.push({ name: 'Sales Person Filtering', status: 'PASSED', message: `${coverage.toFixed(1)}% coverage` })
      results.passed++
      console.log(`   ✅ PASSED: ${ordersWithEmployees}/${totalOrders} orders have sales person (${coverage.toFixed(1)}%)`)
    } else if (coverage >= 50) {
      results.tests.push({ name: 'Sales Person Filtering', status: 'WARNING', message: `Only ${coverage.toFixed(1)}% coverage` })
      results.warnings++
      console.log(`   ⚠️  WARNING: Only ${coverage.toFixed(1)}% coverage on sales person assignment`)
    } else {
      results.tests.push({ name: 'Sales Person Filtering', status: 'FAILED', message: `Only ${coverage.toFixed(1)}% coverage` })
      results.failed++
      console.log(`   ❌ FAILED: Only ${coverage.toFixed(1)}% coverage on sales person assignment`)
    }
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Test 6: Date Range Data Coverage
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Test 6: Date Range Data Coverage (30 days)\n')

    const oldestOrder = await prisma.businessOrders.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    })

    const newestOrder = await prisma.businessOrders.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })

    if (oldestOrder && newestOrder) {
      const daysCovered = Math.ceil((newestOrder.createdAt.getTime() - oldestOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24))

      if (daysCovered >= 25) {
        results.tests.push({ name: 'Date Range Coverage', status: 'PASSED', message: `${daysCovered} days covered` })
        results.passed++
        console.log(`   ✅ PASSED: ${daysCovered} days of data available`)
        console.log(`      Oldest: ${oldestOrder.createdAt.toISOString().split('T')[0]}`)
        console.log(`      Newest: ${newestOrder.createdAt.toISOString().split('T')[0]}`)
      } else {
        results.tests.push({ name: 'Date Range Coverage', status: 'WARNING', message: `Only ${daysCovered} days covered` })
        results.warnings++
        console.log(`   ⚠️  WARNING: Only ${daysCovered} days of data (expected ~30)`)
      }
    } else {
      results.tests.push({ name: 'Date Range Coverage', status: 'FAILED', message: 'No orders found' })
      results.failed++
      console.log(`   ❌ FAILED: No orders found`)
    }
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Test Summary
    // ═══════════════════════════════════════════════════════════
    console.log('═'.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('═'.repeat(60))
    console.log('')
    console.log(`Total Tests: ${results.tests.length}`)
    console.log(`✅ Passed: ${results.passed}`)
    console.log(`⚠️  Warnings: ${results.warnings}`)
    console.log(`❌ Failed: ${results.failed}`)
    console.log('')

    console.log('Detailed Results:')
    results.tests.forEach((test, idx) => {
      const icon = test.status === 'PASSED' ? '✅' : test.status === 'WARNING' ? '⚠️' : '❌'
      console.log(`   ${idx + 1}. ${icon} ${test.name}: ${test.message}`)
    })
    console.log('')

    // Overall Status
    if (results.failed === 0 && results.warnings === 0) {
      console.log('╔════════════════════════════════════════════════════════════╗')
      console.log('║              🎉 ALL TESTS PASSED! 🎉                       ║')
      console.log('╚════════════════════════════════════════════════════════════╝')
      console.log('')
      console.log('✅ Task 9 verification complete - all automated checks passed!')
      console.log('')
      console.log('📝 Next: Run manual browser tests (see TASK-9-TESTING-GUIDE.md)')
    } else if (results.failed === 0) {
      console.log('╔════════════════════════════════════════════════════════════╗')
      console.log('║           ✅ TESTS PASSED WITH WARNINGS                    ║')
      console.log('╚════════════════════════════════════════════════════════════╝')
      console.log('')
      console.log('⚠️  Some warnings detected - review above for details')
      console.log('📝 Automated tests passed, proceed to manual browser tests')
    } else {
      console.log('╔════════════════════════════════════════════════════════════╗')
      console.log('║                ❌ SOME TESTS FAILED                        ║')
      console.log('╚════════════════════════════════════════════════════════════╝')
      console.log('')
      console.log('❌ Some tests failed - please review and fix issues above')
      console.log('💡 Run: node scripts/seed-all-demo-data.js to re-seed data')
    }

  } catch (error) {
    console.error('❌ Error during verification:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
runTask9Verification()
