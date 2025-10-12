const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
  try {
    const restaurantBusinesses = await prisma.businesses.findMany({ where: { type: 'restaurant' }, select: { id: true } })
    const ids = restaurantBusinesses.map(b => b.id)
    console.log('restaurant ids sample:', ids.slice(0,5))

    const whereClause = { businessId: { in: ids }, businessType: 'restaurant' }
    console.log('Running findMany with where:', whereClause)
    const orders = await prisma.businessOrder.findMany({ where: whereClause, take: 5 })
    console.log('Fetched orders:', orders.length)
    process.exit(0)
  } catch (err) {
    console.error('Prisma query failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

debug()
