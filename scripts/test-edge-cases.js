const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testEdgeCases() {
  console.log('=== Expense Account Edge Case Testing ===\n')

  try {
    // Edge Case 1: Zero Balance Accounts
    console.log('1. Testing Zero Balance Accounts...')
    const zeroBalanceAccounts = await prisma.expenseAccounts.findMany({
      where: { balance: 0 },
      select: { id: true, accountNumber: true, accountName: true, balance: true },
    })

    if (zeroBalanceAccounts.length > 0) {
      console.log(`   Found ${zeroBalanceAccounts.length} account(s) with zero balance:`)
      zeroBalanceAccounts.forEach((acc) => {
        console.log(`   - ${acc.accountNumber}: ${acc.accountName} ($${acc.balance})`)
      })

      // Check if they have any transactions
      for (const acc of zeroBalanceAccounts) {
        const transactionCount = await prisma.expenseAccountPayments.count({
          where: { expenseAccountId: acc.id },
        })
        if (transactionCount > 0) {
          console.log(`     ✅ Has ${transactionCount} transaction(s) - balanced account`)
        } else {
          console.log(`     ⚠️  No transactions - newly created or unused account`)
        }
      }
    } else {
      console.log('   No zero balance accounts found')
    }
    console.log()

    // Edge Case 2: Low Balance (Below Threshold)
    console.log('2. Testing Low Balance Accounts...')
    const lowBalanceAccounts = await prisma.expenseAccounts.findMany({
      where: {
        balance: {
          lt: prisma.expenseAccounts.fields.lowBalanceThreshold,
        },
        isActive: true,
      },
      select: {
        accountNumber: true,
        accountName: true,
        balance: true,
        lowBalanceThreshold: true,
      },
    })

    // Alternative query since Prisma doesn't support comparing fields directly
    const allAccounts = await prisma.expenseAccounts.findMany({
      where: { isActive: true },
      select: {
        accountNumber: true,
        accountName: true,
        balance: true,
        lowBalanceThreshold: true,
      },
    })

    const lowBalance = allAccounts.filter(
      (acc) => Number(acc.balance) < Number(acc.lowBalanceThreshold)
    )

    if (lowBalance.length > 0) {
      console.log(`   Found ${lowBalance.length} low balance account(s):`)
      lowBalance.forEach((acc) => {
        const percentOfThreshold = (Number(acc.balance) / Number(acc.lowBalanceThreshold)) * 100
        const severity = percentOfThreshold < 50 ? '🔴 CRITICAL' : '🟡 WARNING'
        console.log(`   ${severity} ${acc.accountNumber}: $${Number(acc.balance).toFixed(2)} (Threshold: $${Number(acc.lowBalanceThreshold).toFixed(2)})`)
      })
    } else {
      console.log('   ✅ No low balance accounts found - all accounts healthy')
    }
    console.log()

    // Edge Case 3: Decimal Precision
    console.log('3. Testing Decimal Precision...')
    const allPayments = await prisma.expenseAccountPayments.findMany({
      select: { id: true, amount: true },
      take: 100,
    })

    let precisionIssues = 0
    allPayments.forEach((payment) => {
      const amountStr = payment.amount.toString()
      if (amountStr.includes('.')) {
        const decimals = amountStr.split('.')[1]
        if (decimals && decimals.length > 2) {
          precisionIssues++
          console.log(`   ⚠️  Payment ${payment.id} has more than 2 decimal places: $${payment.amount}`)
        }
      }
    })

    if (precisionIssues === 0) {
      console.log('   ✅ All payment amounts have correct decimal precision (≤2 places)')
    } else {
      console.log(`   ❌ Found ${precisionIssues} payment(s) with precision issues`)
    }
    console.log()

    // Edge Case 4: Orphaned Payments (Payee Deleted)
    console.log('4. Testing for Orphaned Payments...')
    const employeePayments = await prisma.expenseAccountPayments.findMany({
      where: { payeeType: 'EMPLOYEE' },
      include: { payeeEmployee: true },
    })

    const orphanedEmployeePayments = employeePayments.filter((p) => !p.payeeEmployee)
    if (orphanedEmployeePayments.length > 0) {
      console.log(`   ⚠️  Found ${orphanedEmployeePayments.length} orphaned employee payment(s)`)
      orphanedEmployeePayments.forEach((p) => {
        console.log(`      Payment ${p.id}: $${p.amount} to deleted employee`)
      })
    } else if (employeePayments.length > 0) {
      console.log('   ✅ All employee payments have valid payee references')
    }

    const personPayments = await prisma.expenseAccountPayments.findMany({
      where: { payeeType: 'PERSON' },
      include: { payeePerson: true },
    })

    const orphanedPersonPayments = personPayments.filter((p) => !p.payeePerson)
    if (orphanedPersonPayments.length > 0) {
      console.log(`   ⚠️  Found ${orphanedPersonPayments.length} orphaned person payment(s)`)
    } else if (personPayments.length > 0) {
      console.log('   ✅ All person payments have valid payee references')
    }
    console.log()

    // Edge Case 5: Very Old Transactions
    console.log('5. Testing for Very Old Transactions...')
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    const oldPayments = await prisma.expenseAccountPayments.count({
      where: {
        paymentDate: {
          lt: twoYearsAgo,
        },
      },
    })

    const oldDeposits = await prisma.expenseAccountDeposits.count({
      where: {
        depositDate: {
          lt: twoYearsAgo,
        },
      },
    })

    if (oldPayments > 0 || oldDeposits > 0) {
      console.log(`   Found ${oldPayments} old payment(s) and ${oldDeposits} old deposit(s) (>2 years ago)`)
      console.log('   ℹ️  Consider archiving old transactions for performance')
    } else {
      console.log('   ✅ No very old transactions found')
    }
    console.log()

    // Edge Case 6: Large Batches
    console.log('6. Testing for Large Payment Batches...')
    const paymentsGroupedByDay = await prisma.expenseAccountPayments.groupBy({
      by: ['expenseAccountId', 'paymentDate', 'createdAt'],
      _count: { id: true },
      having: {
        id: {
          _count: {
            gte: 10,
          },
        },
      },
      take: 10,
    })

    if (paymentsGroupedByDay.length > 0) {
      console.log(`   Found ${paymentsGroupedByDay.length} day(s) with 10+ payments:`)
      for (const group of paymentsGroupedByDay) {
        const account = await prisma.expenseAccounts.findUnique({
          where: { id: group.expenseAccountId },
          select: { accountNumber: true },
        })
        console.log(`   - Account ${account?.accountNumber}: ${group._count.id} payments on ${group.paymentDate.toISOString().split('T')[0]}`)
      }
    } else {
      console.log('   No large batch days found (no days with 10+ payments)')
    }
    console.log()

    // Edge Case 7: Draft Payments (Uncommitted)
    console.log('7. Testing for Draft/Uncommitted Payments...')
    const draftPayments = await prisma.expenseAccountPayments.count({
      where: { status: 'DRAFT' },
    })

    if (draftPayments > 0) {
      console.log(`   ⚠️  Found ${draftPayments} draft payment(s) not submitted`)
      console.log('   ℹ️  These payments do not affect account balance until submitted')
    } else {
      console.log('   ✅ No draft payments found - all payments submitted')
    }
    console.log()

    // Edge Case 8: Inactive Accounts with Balance
    console.log('8. Testing for Inactive Accounts with Balance...')
    const inactiveWithBalance = await prisma.expenseAccounts.findMany({
      where: {
        isActive: false,
        balance: {
          gt: 0,
        },
      },
      select: { accountNumber: true, accountName: true, balance: true },
    })

    if (inactiveWithBalance.length > 0) {
      console.log(`   ⚠️  Found ${inactiveWithBalance.length} inactive account(s) with balance:`)
      inactiveWithBalance.forEach((acc) => {
        console.log(`   - ${acc.accountNumber}: ${acc.accountName} ($${Number(acc.balance).toFixed(2)})`)
      })
      console.log('   ℹ️  Consider transferring funds or documenting why balance remains')
    } else {
      console.log('   ✅ No inactive accounts with balance')
    }
    console.log()

    // Edge Case 9: Accounts with No Transactions
    console.log('9. Testing for Accounts with No Transactions...')
    const accountsWithNoTransactions = []

    for (const account of allAccounts) {
      const depositCount = await prisma.expenseAccountDeposits.count({
        where: { expenseAccountId: account.id },
      })
      const paymentCount = await prisma.expenseAccountPayments.count({
        where: { expenseAccountId: account.id },
      })

      if (depositCount === 0 && paymentCount === 0) {
        accountsWithNoTransactions.push(account)
      }
    }

    if (accountsWithNoTransactions.length > 0) {
      console.log(`   Found ${accountsWithNoTransactions.length} account(s) with no transactions:`)
      accountsWithNoTransactions.forEach((acc) => {
        console.log(`   - ${acc.accountNumber}: ${acc.accountName}`)
      })
      console.log('   ℹ️  These may be newly created accounts')
    } else {
      console.log('   ✅ All accounts have at least one transaction')
    }
    console.log()

    // Edge Case 10: Category Usage
    console.log('10. Testing Category Usage...')
    const categoriesUsed = await prisma.expenseAccountPayments.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    })

    if (categoriesUsed.length > 0) {
      console.log('   Top 5 most used categories:')
      for (const catUsage of categoriesUsed) {
        if (catUsage.categoryId) {
          const category = await prisma.expenseCategories.findUnique({
            where: { id: catUsage.categoryId },
            select: { name: true, emoji: true },
          })
          console.log(`   - ${category?.emoji} ${category?.name}: ${catUsage._count.id} payment(s)`)
        } else {
          console.log(`   - Uncategorized: ${catUsage._count.id} payment(s)`)
        }
      }
    }

    const uncategorizedCount = await prisma.expenseAccountPayments.count({
      where: { categoryId: null },
    })

    if (uncategorizedCount > 0) {
      console.log(`   ⚠️  ${uncategorizedCount} payment(s) have no category`)
    }
    console.log()

    // Summary
    console.log('=== EDGE CASE TESTING COMPLETE ===\n')
    console.log('Review any warnings (⚠️) and address as needed.')
    console.log('Critical issues (🔴) should be resolved immediately.')

  } catch (error) {
    console.error('❌ Error during edge case testing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEdgeCases()
