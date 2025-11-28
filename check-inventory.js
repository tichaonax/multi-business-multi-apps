const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkInventory() {
  try {
    console.log('Checking inventory items in database...')

    const businessId = '3de615c8-7259-4641-a8f2-9fffa570805a'

    const products = await prisma.businessProducts.findMany({
      where: { businessId },
      include: {
        business_categories: true,
        inventory_subcategory: true,
        business_brands: true,
        business_suppliers: true,
        business_locations: true,
        product_variants: {
          include: {
            business_stock_movements: true
          }
        }
      }
    })

    console.log(`\nFound ${products.length} inventory items:`)
    products.forEach(product => {
      console.log(`- ${product.name} (${product.businessType})`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkInventory()