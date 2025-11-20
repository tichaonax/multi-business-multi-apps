const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCombos() {
  try {
    console.log('🍽️ Checking Combo Items Structure...\n')

    // Get all combo items
    const combos = await prisma.businessProducts.findMany({
      where: {
        businessType: 'restaurant',
        isCombo: true
      },
      take: 10,
      include: {
        business_categories: true
      }
    })

    console.log(`Found ${combos.length} combo items:\n`)

    combos.forEach(c => {
      console.log(`  - ${c.name}`)
      console.log(`    Category: ${c.business_categories?.name || 'None'}`)
      console.log(`    Category ID: ${c.categoryId}`)
      console.log(`    isCombo: ${c.isCombo}`)
      console.log(`    Price: $${c.basePrice}`)
      console.log('')
    })

    // Count combos by category
    console.log('\nCombos by Category:')
    const categories = {}
    const allCombos = await prisma.businessProducts.findMany({
      where: {
        businessType: 'restaurant',
        isCombo: true
      },
      include: {
        business_categories: true
      }
    })

    allCombos.forEach(c => {
      const catName = c.business_categories?.name || 'Uncategorized'
      categories[catName] = (categories[catName] || 0) + 1
    })

    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} combos`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCombos()
