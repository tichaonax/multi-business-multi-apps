const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProduct() {
  try {
    console.log('Searching for product CLV-1491 in HXI Fashions...\n')

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

    console.log(`Found business: ${business.name} (${business.id})`)
    console.log(`Business type: ${business.type}\n`)

    // Search for the product by SKU
    const productBySku = await prisma.businessProducts.findFirst({
      where: {
        sku: 'CLV-1491',
        businessId: business.id
      },
      include: {
        business_categories: true,
        inventory_subcategory: true
      }
    })

    if (productBySku) {
      console.log('✓ Product found by SKU:')
      console.log(JSON.stringify(productBySku, null, 2))
    } else {
      console.log('✗ Product NOT found by exact SKU match')
    }

    // Try case-insensitive search
    const productCaseInsensitive = await prisma.businessProducts.findFirst({
      where: {
        sku: {
          equals: 'CLV-1491',
          mode: 'insensitive'
        },
        businessId: business.id
      },
      include: {
        business_categories: true,
        inventory_subcategory: true
      }
    })

    if (productCaseInsensitive && !productBySku) {
      console.log('\n✓ Product found with case-insensitive search:')
      console.log(JSON.stringify(productCaseInsensitive, null, 2))
    }

    // Search for all products with similar SKU
    const similarProducts = await prisma.businessProducts.findMany({
      where: {
        sku: {
          contains: '1491',
          mode: 'insensitive'
        },
        businessId: business.id
      },
      select: {
        id: true,
        sku: true,
        name: true,
        isActive: true
      }
    })

    console.log(`\nFound ${similarProducts.length} products containing '1491':`)
    similarProducts.forEach(p => {
      console.log(`  - ${p.sku}: ${p.name} (Active: ${p.isActive})`)
    })

    // Check all products for this business
    const totalProducts = await prisma.businessProducts.count({
      where: { businessId: business.id }
    })

    const activeProducts = await prisma.businessProducts.count({
      where: {
        businessId: business.id,
        isActive: true
      }
    })

    console.log(`\nTotal products in ${business.name}: ${totalProducts}`)
    console.log(`Active products: ${activeProducts}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProduct()
