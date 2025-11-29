const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const businesses = await prisma.businesses.findMany({
    where: { isActive: true, type: { not: 'umbrella' } },
    select: {
      id: true,
      name: true,
      type: true,
      business_accounts: { select: { id: true, balance: true } },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
  
  console.log('Total businesses:', businesses.length)
  console.log('With accounts:', businesses.filter(b => b.business_accounts).length)
  console.log('Without accounts:', businesses.filter(b => !b.business_accounts).length)
  console.log()
  
  businesses.forEach(b => {
    console.log(b.name, '('+b.type+')', b.business_accounts ? 'HAS ACCOUNT $'+b.business_accounts.balance : 'NO ACCOUNT')
  })
  
  await prisma.$disconnect()
}
main()
