const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDemoBusinessProducts() {
  try {
    // Check for demo business
    const demoBusiness = await prisma.businesses.findUnique({
      where: { id: 'clothing-demo-business' },
      select: { id: true, name: true, type: true, isDemo: true }
    })

    if (!demoBusiness) {
      console.log('❌ No demo business found with ID "clothing-demo-business"')
      await prisma.$disconnect()
      return
    }

    console.log('\n=== Demo Business ===')
    console.log(JSON.stringify(demoBusiness, null, 2))

    // Check products for demo business
    const productCount = await prisma.businessProducts.count({
      where: { businessId: 'clothing-demo-business' }
    })

    console.log(`\nTotal products in demo business: ${productCount}`)

    if (productCount > 0) {
      const products = await prisma.businessProducts.findMany({
        where: { businessId: 'clothing-demo-business' },
        select: {
          id: true,
          name: true,
          sku: true,
          basePrice: true,
          categoryId: true
        },
        take: 10
      })

      console.log('\nSample products:')
      products.forEach(p => {
        console.log(`  - ${p.name} (SKU: ${p.sku}, Price: $${p.basePrice})`)
      })
    }

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkDemoBusinessProducts()
