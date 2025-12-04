const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkClothingData() {
  try {
    // Find clothing businesses
    const clothingBusinesses = await prisma.businesses.findMany({
      where: { type: 'clothing' },
      select: { id: true, name: true, shortName: true }
    })

    console.log('\n=== Clothing Businesses ===')
    console.log(JSON.stringify(clothingBusinesses, null, 2))

    if (clothingBusinesses.length === 0) {
      console.log('\n❌ No clothing businesses found!')
      await prisma.$disconnect()
      return
    }

    // Check products for each clothing business
    for (const business of clothingBusinesses) {
      console.log(`\n=== Checking ${business.name} (${business.id}) ===`)

      // Count total products
      const productCount = await prisma.businessProducts.count({
        where: { businessId: business.id }
      })

      console.log(`Total products: ${productCount}`)

      if (productCount > 0) {
        // Get sample products
        const products = await prisma.businessProducts.findMany({
          where: { businessId: business.id },
          select: {
            id: true,
            name: true,
            department: true,
            category: true,
            price: true
          },
          take: 5
        })

        console.log('\nSample products:', JSON.stringify(products, null, 2))

        // Count by department
        const allProducts = await prisma.businessProducts.findMany({
          where: { businessId: business.id },
          select: { department: true }
        })

        const departments = {}
        allProducts.forEach(p => {
          if (p.department) {
            departments[p.department] = (departments[p.department] || 0) + 1
          }
        })
        console.log('\nProducts by department:', departments)
      }
    }

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkClothingData()
