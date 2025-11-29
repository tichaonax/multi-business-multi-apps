/**
 * Fix Expense Account Balance
 * Recalculates and updates the balance to the correct value
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixExpenseAccountBalance() {
  const accountId = '45a2cb61-1dee-45a5-b2d4-4681df533e1e'

  console.log('\n🔧 Fixing Expense Account Balance...\n')

  // Get current account state
  const account = await prisma.expenseAccounts.findUnique({
    where: { id: accountId },
    select: { accountName: true, balance: true },
  })

  console.log(`Account: ${account.accountName}`)
  console.log(`Current Balance: $${account.balance}\n`)

  // Calculate correct balance
  const depositsSum = await prisma.expenseAccountDeposits.aggregate({
    where: { expenseAccountId: accountId },
    _sum: { amount: true },
  })

  const paymentsSum = await prisma.expenseAccountPayments.aggregate({
    where: {
      expenseAccountId: accountId,
      status: 'SUBMITTED',
    },
    _sum: { amount: true },
  })

  const totalDeposits = Number(depositsSum._sum.amount || 0)
  const totalPayments = Number(paymentsSum._sum.amount || 0)
  const correctBalance = totalDeposits - totalPayments

  console.log('Calculation:')
  console.log(`  Deposits:  $${totalDeposits}`)
  console.log(`  Payments:  $${totalPayments}`)
  console.log(`  ----------------------`)
  console.log(`  Correct Balance: $${correctBalance}\n`)

  if (correctBalance === Number(account.balance)) {
    console.log('✅ Balance is already correct. No update needed.')
    return
  }

  // Update the balance
  await prisma.expenseAccounts.update({
    where: { id: accountId },
    data: { balance: correctBalance, updatedAt: new Date() },
  })

  console.log(`✅ Balance updated from $${account.balance} to $${correctBalance}`)
}

async function main() {
  try {
    await fixExpenseAccountBalance()
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
