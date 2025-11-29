const {PrismaClient} = require('@prisma/client')
const p = new PrismaClient()

p.expenseAccounts.findMany({
  select: {accountName: true, accountNumber: true, balance: true}
}).then(r => {
  console.log('Total Expense Accounts:', r.length)
  r.forEach(a => console.log('  -', a.accountNumber, a.accountName, '$'+a.balance))
  return p.$disconnect()
})
