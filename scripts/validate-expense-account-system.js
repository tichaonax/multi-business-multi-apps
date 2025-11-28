const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function validateExpenseAccountSystem() {
  console.log('=== Expense Account System Validation ===\n')

  const results = {
    accounts: { pass: 0, fail: 0, tests: [] },
    deposits: { pass: 0, fail: 0, tests: [] },
    payments: { pass: 0, fail: 0, tests: [] },
    balances: { pass: 0, fail: 0, tests: [] },
    payees: { pass: 0, fail: 0, tests: [] },
  }

  try {
    // Test 1: Validate Expense Accounts
    console.log('1. Validating Expense Accounts...')
    const accounts = await prisma.expenseAccounts.findMany({
      include: {
        _count: {
          select: {
            deposits: true,
            payments: true,
          },
        },
      },
    })

    if (accounts.length === 0) {
      console.log('   ⚠️  No expense accounts found')
    } else {
      console.log(`   ✅ Found ${accounts.length} expense account(s)`)

      for (const account of accounts) {
        // Validate account number format
        if (account.accountNumber.startsWith('ACC-')) {
          results.accounts.pass++
          results.accounts.tests.push(`Account ${account.accountNumber} has valid format`)
        } else {
          results.accounts.fail++
          results.accounts.tests.push(`❌ Account ${account.accountNumber} has invalid format`)
        }

        // Validate balance is not negative
        if (Number(account.balance) >= 0) {
          results.accounts.pass++
          results.accounts.tests.push(`Account ${account.accountNumber} balance is non-negative`)
        } else {
          results.accounts.fail++
          results.accounts.tests.push(`❌ Account ${account.accountNumber} has negative balance: $${account.balance}`)
        }
      }
    }
    console.log()

    // Test 2: Validate Deposits
    console.log('2. Validating Deposits...')
    const deposits = await prisma.expenseAccountDeposits.findMany({
      include: {
        expenseAccount: {
          select: { accountNumber: true, accountName: true },
        },
        sourceBusiness: {
          select: { name: true },
        },
      },
    })

    console.log(`   Found ${deposits.length} deposit(s)`)

    for (const deposit of deposits) {
      // Validate amount is positive
      if (Number(deposit.amount) > 0) {
        results.deposits.pass++
      } else {
        results.deposits.fail++
        results.deposits.tests.push(`❌ Deposit ${deposit.id} has non-positive amount: $${deposit.amount}`)
      }

      // Validate sourceType matches presence of sourceBusiness
      if (deposit.sourceType === 'BUSINESS_TRANSFER' && !deposit.sourceBusiness) {
        results.deposits.fail++
        results.deposits.tests.push(`❌ Deposit ${deposit.id} is BUSINESS_TRANSFER but has no sourceBusiness`)
      } else if (deposit.sourceType === 'BUSINESS_TRANSFER' && deposit.sourceBusiness) {
        results.deposits.pass++
      }
    }
    console.log(`   ✅ ${results.deposits.pass} deposits valid, ❌ ${results.deposits.fail} issues found\n`)

    // Test 3: Validate Payments
    console.log('3. Validating Payments...')
    const payments = await prisma.expenseAccountPayments.findMany({
      include: {
        expenseAccount: {
          select: { accountNumber: true },
        },
        payeeUser: {
          select: { name: true },
        },
        payeeEmployee: {
          select: { fullName: true },
        },
        payeePerson: {
          select: { fullName: true },
        },
        payeeBusiness: {
          select: { name: true },
        },
        category: {
          select: { name: true },
        },
      },
    })

    console.log(`   Found ${payments.length} payment(s)`)

    for (const payment of payments) {
      // Validate amount is positive
      if (Number(payment.amount) > 0) {
        results.payments.pass++
      } else {
        results.payments.fail++
        results.payments.tests.push(`❌ Payment ${payment.id} has non-positive amount: $${payment.amount}`)
      }

      // Validate payee exists based on payeeType
      let payeeExists = false
      switch (payment.payeeType) {
        case 'USER':
          payeeExists = !!payment.payeeUser
          break
        case 'EMPLOYEE':
          payeeExists = !!payment.payeeEmployee
          break
        case 'PERSON':
          payeeExists = !!payment.payeePerson
          break
        case 'BUSINESS':
          payeeExists = !!payment.payeeBusiness
          break
      }

      if (payeeExists) {
        results.payments.pass++
      } else {
        results.payments.fail++
        results.payments.tests.push(`❌ Payment ${payment.id} payeeType=${payment.payeeType} but payee not found`)
      }

      // Validate status
      const validStatuses = ['DRAFT', 'SUBMITTED']
      if (validStatuses.includes(payment.status)) {
        results.payments.pass++
      } else {
        results.payments.fail++
        results.payments.tests.push(`❌ Payment ${payment.id} has invalid status: ${payment.status}`)
      }
    }
    console.log(`   ✅ ${results.payments.pass} payment validations passed, ❌ ${results.payments.fail} issues found\n`)

    // Test 4: Validate Balance Calculations
    console.log('4. Validating Balance Calculations...')

    for (const account of accounts) {
      // Calculate expected balance
      const depositsSum = await prisma.expenseAccountDeposits.aggregate({
        where: { expenseAccountId: account.id },
        _sum: { amount: true },
      })

      const paymentsSum = await prisma.expenseAccountPayments.aggregate({
        where: {
          expenseAccountId: account.id,
          status: 'SUBMITTED',
        },
        _sum: { amount: true },
      })

      const expectedBalance =
        Number(depositsSum._sum.amount || 0) -
        Number(paymentsSum._sum.amount || 0)

      const actualBalance = Number(account.balance)
      const diff = Math.abs(expectedBalance - actualBalance)

      if (diff < 0.01) {
        // Allow for floating point precision
        results.balances.pass++
        console.log(`   ✅ ${account.accountNumber}: Balance correct ($${actualBalance.toFixed(2)})`)
      } else {
        results.balances.fail++
        console.log(`   ❌ ${account.accountNumber}: Balance mismatch! Expected: $${expectedBalance.toFixed(2)}, Actual: $${actualBalance.toFixed(2)}`)
        results.balances.tests.push(`❌ Account ${account.accountNumber} balance mismatch: expected $${expectedBalance.toFixed(2)}, actual $${actualBalance.toFixed(2)}`)
      }
    }
    console.log()

    // Test 5: Validate Payee Relationships
    console.log('5. Validating Payee Relationships...')

    const employeePayments = await prisma.expenseAccountPayments.count({
      where: { payeeType: 'EMPLOYEE' },
    })

    const personPayments = await prisma.expenseAccountPayments.count({
      where: { payeeType: 'PERSON' },
    })

    const businessPayments = await prisma.expenseAccountPayments.count({
      where: { payeeType: 'BUSINESS' },
    })

    const userPayments = await prisma.expenseAccountPayments.count({
      where: { payeeType: 'USER' },
    })

    console.log(`   Employee payments: ${employeePayments}`)
    console.log(`   Person/Contractor payments: ${personPayments}`)
    console.log(`   Business payments: ${businessPayments}`)
    console.log(`   User payments: ${userPayments}`)

    // Test payee-specific API data structure
    if (employeePayments > 0) {
      const firstEmployeePayment = await prisma.expenseAccountPayments.findFirst({
        where: { payeeType: 'EMPLOYEE' },
        include: { payeeEmployee: true },
      })

      if (firstEmployeePayment && firstEmployeePayment.payeeEmployee) {
        console.log(`   ✅ Employee payee relationship intact`)
        results.payees.pass++
      } else {
        console.log(`   ❌ Employee payee relationship broken`)
        results.payees.fail++
      }
    }

    console.log()

    // Summary Report
    console.log('=== VALIDATION SUMMARY ===\n')

    const totalTests = Object.values(results).reduce((sum, category) =>
      sum + category.pass + category.fail, 0
    )
    const totalPass = Object.values(results).reduce((sum, category) =>
      sum + category.pass, 0
    )
    const totalFail = Object.values(results).reduce((sum, category) =>
      sum + category.fail, 0
    )

    console.log(`Total Tests: ${totalTests}`)
    console.log(`✅ Passed: ${totalPass}`)
    console.log(`❌ Failed: ${totalFail}`)
    console.log()

    if (totalFail === 0) {
      console.log('🎉 ALL TESTS PASSED! System is healthy.')
    } else {
      console.log('⚠️  SOME TESTS FAILED. See details above.')
      console.log('\nFailed Tests:')
      for (const [category, data] of Object.entries(results)) {
        if (data.tests.length > 0) {
          console.log(`\n${category.toUpperCase()}:`)
          data.tests.forEach((test) => console.log(`  ${test}`))
        }
      }
    }

    console.log('\n=== RECOMMENDATIONS ===\n')

    if (accounts.length === 0) {
      console.log('- Create at least one expense account to begin testing')
    }

    if (deposits.length === 0) {
      console.log('- Add deposits to expense accounts to enable payment testing')
    }

    if (payments.length === 0) {
      console.log('- Create test payments to validate payment processing')
    } else if (employeePayments === 0 && personPayments === 0) {
      console.log('- Create payments to employees or contractors to test payee integration')
    }

    if (totalFail > 0) {
      console.log('- Fix data integrity issues before production deployment')
      console.log('- Run: node scripts/fix-expense-account-balances.js (if script exists)')
    }

  } catch (error) {
    console.error('❌ Validation Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

validateExpenseAccountSystem()
