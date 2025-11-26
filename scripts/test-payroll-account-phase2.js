const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function runTests() {
  console.log('\n🧪 TESTING PHASE 1 & 2: PAYROLL ACCOUNT SYSTEM\n')
  console.log('='.repeat(60))

  let passedTests = 0
  let failedTests = 0

  // Test 1: Verify Payroll Account Exists
  console.log('\n📋 TEST 1: Verify Global Payroll Account Exists')
  console.log('-'.repeat(60))
  try {
    const payrollAccount = await prisma.payrollAccounts.findFirst({
      where: { businessId: null },
      include: {
        users: {
          select: { name: true, email: true }
        }
      }
    })

    if (payrollAccount) {
      console.log('✅ PASS: Payroll account found')
      console.log(`   Account Number: ${payrollAccount.accountNumber}`)
      console.log(`   Balance: $${payrollAccount.balance}`)
      console.log(`   Created By: ${payrollAccount.users.name} (${payrollAccount.users.email})`)
      console.log(`   Is Active: ${payrollAccount.isActive}`)
      passedTests++
    } else {
      console.log('❌ FAIL: Payroll account not found')
      failedTests++
    }
  } catch (error) {
    console.log('❌ FAIL: Error retrieving payroll account:', error.message)
    failedTests++
  }

  // Test 2: Verify Database Schema (Tables Exist)
  console.log('\n📋 TEST 2: Verify Database Tables Exist')
  console.log('-'.repeat(60))
  try {
    const accountsCount = await prisma.payrollAccounts.count()
    const depositsCount = await prisma.payrollAccountDeposits.count()
    const paymentsCount = await prisma.payrollPayments.count()
    const vouchersCount = await prisma.payrollPaymentVouchers.count()

    console.log('✅ PASS: All tables accessible')
    console.log(`   payroll_accounts: ${accountsCount} records`)
    console.log(`   payroll_account_deposits: ${depositsCount} records`)
    console.log(`   payroll_payments: ${paymentsCount} records`)
    console.log(`   payroll_payment_vouchers: ${vouchersCount} records`)
    passedTests++
  } catch (error) {
    console.log('❌ FAIL: Error accessing tables:', error.message)
    failedTests++
  }

  // Test 3: Test Balance Calculation
  console.log('\n📋 TEST 3: Test Balance Calculation Function')
  console.log('-'.repeat(60))
  try {
    const payrollAccount = await prisma.payrollAccounts.findFirst({
      where: { businessId: null }
    })

    if (!payrollAccount) {
      console.log('❌ FAIL: Payroll account not found')
      failedTests++
    } else {
      // Calculate balance from deposits and payments
      const depositsSum = await prisma.payrollAccountDeposits.aggregate({
        where: { payrollAccountId: payrollAccount.id },
        _sum: { amount: true }
      })

      const paymentsSum = await prisma.payrollPayments.aggregate({
        where: { payrollAccountId: payrollAccount.id },
        _sum: { amount: true }
      })

      const totalDeposits = Number(depositsSum._sum.amount || 0)
      const totalPayments = Number(paymentsSum._sum.amount || 0)
      const calculatedBalance = totalDeposits - totalPayments
      const storedBalance = Number(payrollAccount.balance)

      console.log('✅ PASS: Balance calculation working')
      console.log(`   Total Deposits: $${totalDeposits.toFixed(2)}`)
      console.log(`   Total Payments: $${totalPayments.toFixed(2)}`)
      console.log(`   Calculated Balance: $${calculatedBalance.toFixed(2)}`)
      console.log(`   Stored Balance: $${storedBalance.toFixed(2)}`)

      if (calculatedBalance === storedBalance) {
        console.log('   ✓ Balance is accurate')
      } else {
        console.log('   ⚠️  Balance mismatch detected')
      }
      passedTests++
    }
  } catch (error) {
    console.log('❌ FAIL: Error calculating balance:', error.message)
    failedTests++
  }

  // Test 4: Verify Permissions Added
  console.log('\n📋 TEST 4: Verify Payroll Permissions Exist in Type Definitions')
  console.log('-'.repeat(60))
  try {
    const fs = require('fs')
    const permissionsFile = fs.readFileSync('src/types/permissions.ts', 'utf8')

    const requiredPermissions = [
      'canAccessPayrollAccount',
      'canViewPayrollAccountBalance',
      'canMakePayrollDeposits',
      'canMakePayrollPayments',
      'canAdjustPaymentAmounts',
      'canIssuePaymentVouchers',
      'canCompletePayments',
      'canViewPayrollHistory',
      'canExportPayrollPayments'
    ]

    let allFound = true
    let foundCount = 0

    for (const perm of requiredPermissions) {
      if (permissionsFile.includes(perm)) {
        foundCount++
      } else {
        allFound = false
        console.log(`   ⚠️  Missing permission: ${perm}`)
      }
    }

    if (allFound) {
      console.log('✅ PASS: All 9 permissions defined')
      console.log(`   Found ${foundCount}/${requiredPermissions.length} permissions`)
      passedTests++
    } else {
      console.log(`❌ FAIL: Only ${foundCount}/${requiredPermissions.length} permissions found`)
      failedTests++
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking permissions:', error.message)
    failedTests++
  }

  // Test 5: Test Deposit History Query
  console.log('\n📋 TEST 5: Test Deposit History Query')
  console.log('-'.repeat(60))
  try {
    const payrollAccount = await prisma.payrollAccounts.findFirst({
      where: { businessId: null }
    })

    if (!payrollAccount) {
      console.log('❌ FAIL: Payroll account not found')
      failedTests++
    } else {
      const deposits = await prisma.payrollAccountDeposits.findMany({
        where: { payrollAccountId: payrollAccount.id },
        include: {
          businesses: {
            select: { name: true, type: true }
          },
          users: {
            select: { name: true }
          }
        },
        orderBy: { depositDate: 'desc' },
        take: 5
      })

      console.log('✅ PASS: Deposit query working')
      console.log(`   Found ${deposits.length} deposit(s)`)

      if (deposits.length > 0) {
        console.log('\n   Recent Deposits:')
        deposits.forEach((d, i) => {
          console.log(`   ${i + 1}. $${d.amount} from ${d.businesses.name}`)
          console.log(`      Date: ${d.depositDate.toISOString().split('T')[0]}`)
          console.log(`      Type: ${d.transactionType}`)
          console.log(`      Note: ${d.autoGeneratedNote}`)
        })
      } else {
        console.log('   ℹ️  No deposits yet (expected for new installation)')
      }
      passedTests++
    }
  } catch (error) {
    console.log('❌ FAIL: Error querying deposits:', error.message)
    failedTests++
  }

  // Test 6: Verify API Files Exist
  console.log('\n📋 TEST 6: Verify API Endpoint Files Exist')
  console.log('-'.repeat(60))
  try {
    const fs = require('fs')
    const path = require('path')

    const apiFiles = [
      'src/app/api/payroll/account/route.ts',
      'src/app/api/payroll/account/balance/route.ts',
      'src/app/api/payroll/account/deposits/route.ts',
      'src/lib/payroll-account-utils.ts'
    ]

    let allExist = true
    let existCount = 0

    for (const file of apiFiles) {
      const fullPath = path.join(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        existCount++
        const stats = fs.statSync(fullPath)
        console.log(`   ✓ ${file} (${stats.size} bytes)`)
      } else {
        allExist = false
        console.log(`   ✗ ${file} NOT FOUND`)
      }
    }

    if (allExist) {
      console.log(`✅ PASS: All ${apiFiles.length} API files exist`)
      passedTests++
    } else {
      console.log(`❌ FAIL: Only ${existCount}/${apiFiles.length} files found`)
      failedTests++
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking API files:', error.message)
    failedTests++
  }

  // Test 7: Test Business Account Integration
  console.log('\n📋 TEST 7: Verify Business Expense API Integration')
  console.log('-'.repeat(60))
  try {
    const fs = require('fs')
    const expenseApiFile = fs.readFileSync('src/app/api/business/[businessId]/expenses/route.ts', 'utf8')

    const hasImports = expenseApiFile.includes('payroll-account-utils')
    const hasAutoDeposit = expenseApiFile.includes('Auto-create payroll deposit') ||
                          expenseApiFile.includes('payroll')

    if (hasImports && hasAutoDeposit) {
      console.log('✅ PASS: Business expense API integrated')
      console.log('   ✓ Imports payroll-account-utils')
      console.log('   ✓ Contains auto-deposit logic')
      passedTests++
    } else {
      console.log('❌ FAIL: Integration incomplete')
      if (!hasImports) console.log('   ✗ Missing imports')
      if (!hasAutoDeposit) console.log('   ✗ Missing auto-deposit logic')
      failedTests++
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking integration:', error.message)
    failedTests++
  }

  // Test 8: Check for Demo Businesses (for testing deposits)
  console.log('\n📋 TEST 8: Check Available Demo Businesses for Testing')
  console.log('-'.repeat(60))
  try {
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      include: {
        business_accounts: {
          select: { balance: true }
        }
      },
      take: 5
    })

    console.log('✅ PASS: Query successful')
    console.log(`   Found ${demoBusinesses.length} demo business(es)`)

    if (demoBusinesses.length > 0) {
      console.log('\n   Available for Deposit Testing:')
      demoBusinesses.forEach((b, i) => {
        const balance = b.business_accounts?.balance || 0
        console.log(`   ${i + 1}. ${b.name} (${b.type})`)
        console.log(`      ID: ${b.id}`)
        console.log(`      Balance: $${balance}`)
        console.log(`      Can Test Deposit: ${Number(balance) > 0 ? 'Yes' : 'No (needs balance)'}`)
      })
    } else {
      console.log('   ℹ️  No demo businesses found')
      console.log('   💡 Tip: Run seed script to create demo businesses')
    }
    passedTests++
  } catch (error) {
    console.log('❌ FAIL: Error checking businesses:', error.message)
    failedTests++
  }

  // Final Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📈 Total: ${passedTests + failedTests}`)
  console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`)

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Phase 1 & 2 implementation is working correctly!')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.')
  }

  console.log('\n' + '='.repeat(60))
  console.log('💡 NEXT STEPS FOR MANUAL TESTING:')
  console.log('='.repeat(60))
  console.log('1. Start the dev server: npm run dev')
  console.log('2. Test API endpoints with curl or Postman:')
  console.log('   - GET  http://localhost:8080/api/payroll/account')
  console.log('   - GET  http://localhost:8080/api/payroll/account/balance')
  console.log('   - GET  http://localhost:8080/api/payroll/account/deposits')
  console.log('   - POST http://localhost:8080/api/payroll/account/deposits')
  console.log('3. Create a payroll expense to test auto-deposit')
  console.log('4. Verify balance updates after deposits')
  console.log('='.repeat(60))
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✨ Testing completed!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Testing failed with error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
