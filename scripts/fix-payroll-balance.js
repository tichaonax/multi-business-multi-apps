const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixPayrollBalance() {
  console.log('🔧 FIXING PAYROLL ACCOUNT BALANCE\n')
  console.log('=' .repeat(60))

  try {
    // 1. Get the payroll account
    const payrollAccount = await prisma.payrollAccounts.findFirst({
      where: { businessId: null }
    })

    if (!payrollAccount) {
      console.log('❌ No payroll account found!')
      return
    }

    console.log(`\n📋 Payroll Account: ${payrollAccount.accountNumber}`)
    console.log(`   Current Balance: $${Number(payrollAccount.balance).toFixed(2)}`)

    // 2. Calculate correct balance
    const [depositsSum, paymentsSum] = await Promise.all([
      prisma.payrollAccountDeposits.aggregate({
        where: { payrollAccountId: payrollAccount.id },
        _sum: { amount: true },
      }),
      prisma.payrollPayments.aggregate({
        where: { payrollAccountId: payrollAccount.id },
        _sum: { amount: true },
      })
    ])

    const totalDeposits = Number(depositsSum._sum.amount || 0)
    const totalPayments = Number(paymentsSum._sum.amount || 0)
    const correctBalance = totalDeposits - totalPayments

    console.log(`\n📊 Calculation:`)
    console.log(`   Total Deposits: $${totalDeposits.toFixed(2)}`)
    console.log(`   Total Payments: $${totalPayments.toFixed(2)}`)
    console.log(`   Correct Balance: $${correctBalance.toFixed(2)}`)

    // 3. Update the balance
    console.log(`\n🔧 Updating balance...`)

    await prisma.payrollAccounts.update({
      where: { id: payrollAccount.id },
      data: {
        balance: correctBalance,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Balance updated successfully!`)

    // 4. Verify the fix
    const updatedAccount = await prisma.payrollAccounts.findUnique({
      where: { id: payrollAccount.id }
    })

    console.log(`\n✅ VERIFICATION:`)
    console.log(`   Old Balance: $${Number(payrollAccount.balance).toFixed(2)}`)
    console.log(`   New Balance: $${Number(updatedAccount.balance).toFixed(2)}`)
    console.log(`   Expected: $${correctBalance.toFixed(2)}`)
    console.log(`   Status: ${Number(updatedAccount.balance) === correctBalance ? '✓ CORRECT' : '✗ MISMATCH'}`)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Balance fix completed!')

  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPayrollBalance()
