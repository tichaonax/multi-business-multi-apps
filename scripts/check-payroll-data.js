const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPayroll() {
  const payrollAccounts = await prisma.payrollAccounts.findMany({
    include: {
      businesses: { select: { name: true, isDemo: true } },
      _count: { select: { deposits: true, payments: true } }
    }
  })

  const payrollPeriods = await prisma.payrollPeriods.count()
  const payrollEntries = await prisma.payrollEntries.count()

  console.log('Payroll Accounts:', payrollAccounts.length)
  payrollAccounts.forEach(a => {
    console.log(`  - ${a.businesses?.name || 'No business'} (Demo: ${a.businesses?.isDemo})`)
    console.log(`    Account: ${a.accountNumber}`)
    console.log(`    Balance: $${a.balance}`)
    console.log(`    Deposits: ${a._count.deposits}, Payments: ${a._count.payments}`)
  })

  console.log('\nPayroll Periods:', payrollPeriods)
  console.log('Payroll Entries:', payrollEntries)

  await prisma.$disconnect()
}

checkPayroll()
