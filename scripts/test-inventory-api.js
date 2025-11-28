const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Test the inventory API data fetching logic
 */

async function testInventoryAPI() {
  try {
    console.log('Testing inventory API data fetching...\n')

    // Find a clothing business
    const clothingBusiness = await prisma.businesses.findFirst({
      where: { type: 'clothing', isActive: true }
    })

    if (!clothingBusiness) {
      console.log('❌ No clothing business found')
      return
    }

    console.log(`✓ Found clothing business: ${clothingBusiness.name} (${clothingBusiness.id})`)

    // Count products
    const productCount = await prisma.businessProducts.count({
      where: { businessId: clothingBusiness.id, businessType: 'clothing' }
    })

    console.log(`✓ Total products: ${productCount}`)

    // Fetch products as the API would
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId: clothingBusiness.id
      },
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
        },
        product_barcodes: true
      },
      orderBy: { name: 'asc' },
      take: 10 // First 10 items
    })

    console.log(`\n✓ Fetched ${products.length} products\n`)

    // Display first 5
    products.slice(0, 5).forEach((product, index) => {
      const currentStock = product.product_variants.reduce((total, variant) => {
        return total + (Number(variant.stockQuantity) || 0)
      }, 0)

      console.log(`${index + 1}. ${product.name}`)
      console.log(`   SKU: ${product.sku}`)
      console.log(`   Category: ${product.business_categories?.name || 'N/A'}`)
      console.log(`   Stock: ${currentStock}`)
      console.log(`   Variants: ${product.product_variants.length}`)
      console.log(`   Barcodes: ${product.product_barcodes?.length || 0}`)
      console.log('')
    })

    // Check if there are any products with missing categories
    const missingCategories = products.filter(p => !p.business_categories)
    if (missingCategories.length > 0) {
      console.log(`⚠️  Warning: ${missingCategories.length} products have missing categories`)
      missingCategories.slice(0, 3).forEach(p => {
        console.log(`   - ${p.name} (categoryId: ${p.categoryId})`)
      })
    }

    // Check if all products have variants
    const noVariants = products.filter(p => p.product_variants.length === 0)
    if (noVariants.length > 0) {
      console.log(`\n⚠️  Warning: ${noVariants.length} products have no variants`)
      noVariants.slice(0, 3).forEach(p => {
        console.log(`   - ${p.name} (${p.sku})`)
      })
    }

    console.log('\n✅ Inventory API test complete')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

testInventoryAPI()
