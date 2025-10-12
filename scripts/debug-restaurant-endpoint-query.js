const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  try {
    const restaurants = await prisma.businesses.findMany({ where: { type: 'restaurant' }, select: { id: true } })
    const ids = restaurants.map(r => r.id)
    console.log('restaurant ids:', ids)

    const whereClause = {
      businessId: { in: ids },
      businessType: 'restaurant'
    }

    console.log('Running businessOrder.findMany with whereClause:', JSON.stringify(whereClause))

    const orders = await prisma.businessOrder.findMany({
      where: whereClause,
      include: {
        business: { select: { name: true, type: true } },
        employee: { select: { fullName: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            productVariant: {
              select: {
                name: true,
                product: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      skip: 0
    })

    console.log('Fetched orders count:', orders.length)
    for (const o of orders) {
      console.log('--- Order:', o.id, 'orderType:', o.orderType)
      console.log(' attributes:', o.attributes)
    }
  } catch (err) {
    console.error('Error running endpoint query:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
