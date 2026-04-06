import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const r = await prisma.expenseAccount.findMany({
  where: { accountName: { contains: 'Hwandaza', mode: 'insensitive' } },
  select: { id: true, accountName: true, accountType: true, businessId: true }
})
console.log(JSON.stringify(r, null, 2))
await prisma.$disconnect()
