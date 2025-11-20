const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCombosByBusiness() {
  try {
    console.log('🔍 Checking Combo Items by Business...\n')

    // Get all restaurant businesses
    const restaurants = await prisma.businesses.findMany({
      where: { type: 'restaurant', isActive: true }
    })

    console.log('Restaurant Businesses:')
    for (const restaurant of restaurants) {
      console.log(`\n📊 ${restaurant.name} (${restaurant.id}):`)

      // Count total products
      const totalProducts = await prisma.businessProducts.count({
        where: { businessId: restaurant.id }
      })

      // Count combo items
      const comboItems = await prisma.businessProducts.count({
        where: {
          businessId: restaurant.id,
          isCombo: true
        }
      })

      console.log(`   Total Products: ${totalProducts}`)
      console.log(`   Combo Items: ${comboItems}`)

      // Show sample combos
      if (comboItems > 0) {
        const samples = await prisma.businessProducts.findMany({
          where: {
            businessId: restaurant.id,
            isCombo: true
          },
          take: 5
        })

        console.log('   Sample combos:')
        samples.forEach(c => {
          console.log(`     - ${c.name} ($${c.basePrice})`)
        })
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCombosByBusiness()
