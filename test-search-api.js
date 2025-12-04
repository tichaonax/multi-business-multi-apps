const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSearchAPI() {
  try {
    console.log('Testing search API logic for SKU: CLV-1491\n')

    // Find HXI Fashions business
    const business = await prisma.businesses.findFirst({
      where: {
        name: {
          contains: 'HXI',
          mode: 'insensitive'
        }
      }
    })

    if (!business) {
      console.log('HXI Fashions business not found')
      return
    }

    console.log(`Testing with business: ${business.name} (${business.id})\n`)

    // Simulate the API search query
    const searchTerm = 'CLV-1491'
    const where = {
      businessId: business.id,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    console.log('Search query WHERE clause:')
    console.log(JSON.stringify(where, null, 2))
    console.log()

    const products = await prisma.businessProducts.findMany({
      where,
      include: {
        business_categories: true,
        inventory_subcategory: true,
        product_variants: true
      },
      take: 10
    })

    console.log(`Found ${products.length} products matching search "${searchTerm}"`)
    console.log()

    if (products.length > 0) {
      products.forEach(p => {
        console.log(`✓ Product: ${p.name}`)
        console.log(`  - ID: ${p.id}`)
        console.log(`  - SKU: ${p.sku}`)
        console.log(`  - Category: ${p.business_categories?.name || 'N/A'}`)
        console.log(`  - Active: ${p.isActive}`)
        console.log(`  - Variants: ${p.product_variants.length}`)
        console.log()
      })
    } else {
      console.log('❌ No products found!')
      console.log()
      console.log('Let me check if the product exists without search filter...')

      const directProduct = await prisma.businessProducts.findFirst({
        where: {
          businessId: business.id,
          sku: 'CLV-1491'
        }
      })

      if (directProduct) {
        console.log('✓ Product exists when searching by exact SKU:')
        console.log(`  - Name: ${directProduct.name}`)
        console.log(`  - SKU: ${directProduct.sku}`)
        console.log(`  - Active: ${directProduct.isActive}`)
      }
    }

    // Also test with case variations
    console.log('\n--- Testing case variations ---')
    const variations = ['clv-1491', 'CLV-1491', 'Clv-1491', '1491']

    for (const variant of variations) {
      const count = await prisma.businessProducts.count({
        where: {
          businessId: business.id,
          OR: [
            { name: { contains: variant, mode: 'insensitive' } },
            { sku: { contains: variant, mode: 'insensitive' } },
            { description: { contains: variant, mode: 'insensitive' } }
          ]
        }
      })
      console.log(`Search "${variant}": ${count} results`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSearchAPI()
