const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const prisma = new PrismaClient()

async function exportRestaurantProducts() {
  try {
    console.log('Exporting restaurant product seed data...\n')

    // Get all products from restaurant-demo-business
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId: 'restaurant-demo-business'
      },
      include: {
        business_categories: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    console.log(`Found ${products.length} products\n`)

    // Transform to seed data format
    const seedData = products.map(p => ({
      name: p.name,
      description: p.description || '',
      categoryName: p.business_categories?.name || 'Uncategorized',
      basePrice: 0, // Always zero for new businesses
      costPrice: 0,
      productType: p.productType,
      isCombo: p.isCombo,
      comboItemsData: p.comboItemsData,
      attributes: p.attributes || {}
    }))

    // Group by category for easier viewing
    const grouped = {}
    seedData.forEach(p => {
      if (!grouped[p.categoryName]) {
        grouped[p.categoryName] = []
      }
      grouped[p.categoryName].push(p)
    })

    // Create seed-data directory if it doesn't exist
    const seedDataDir = path.join(process.cwd(), 'seed-data', 'restaurant-products')
    if (!fs.existsSync(seedDataDir)) {
      fs.mkdirSync(seedDataDir, { recursive: true })
    }

    // Write to file
    const outputFile = path.join(seedDataDir, 'default-menu-items.json')
    fs.writeFileSync(outputFile, JSON.stringify(seedData, null, 2))

    console.log(`✅ Exported ${seedData.length} products to:`)
    console.log(`   ${outputFile}\n`)

    // Show summary by category
    console.log('Products by category:')
    Object.keys(grouped).sort().forEach(cat => {
      console.log(`  ${cat}: ${grouped[cat].length} items`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportRestaurantProducts()
