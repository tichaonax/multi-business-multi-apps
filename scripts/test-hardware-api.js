const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testHardwareAPI() {
  try {
    console.log('🔍 Testing Hardware Products API Response...\n')

    // Find hardware business
    const business = await prisma.businesses.findFirst({
      where: { type: 'hardware', isDemo: true }
    })

    if (!business) {
      console.log('❌ No hardware demo business found!')
      return
    }

    console.log(`✅ Found business: ${business.name} (${business.id})\n`)

    // Simulate what the API does - fetch products with variants
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId: business.id,
        isActive: true
      },
      include: {
        businesses: {
          select: { name: true, type: true }
        },
        business_brands: {
          select: { id: true, name: true }
        },
        business_categories: {
          select: { id: true, name: true }
        },
        product_variants: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        },
        product_images: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' }
          ]
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    console.log(`📦 Found ${products.length} products\n`)

    // Show first 3 products with variant details
    products.slice(0, 3).forEach((product, i) => {
      console.log(`${i + 1}. ${product.name}`)
      console.log(`   Product SKU: ${product.sku}`)
      console.log(`   Product basePrice: $${product.basePrice}`)
      console.log(`   Product costPrice: $${product.costPrice}`)
      console.log(`   Product isAvailable: ${product.isAvailable}`)

      if (product.product_variants && product.product_variants.length > 0) {
        console.log(`   Variants (${product.product_variants.length}):`)
        product.product_variants.forEach(variant => {
          console.log(`     - ${variant.name || 'Standard'}`)
          console.log(`       SKU: ${variant.sku}`)
          console.log(`       price: ${variant.price === null ? 'NULL' : variant.price === undefined ? 'UNDEFINED' : '$' + variant.price}`)
          console.log(`       stockQuantity: ${variant.stockQuantity}`)
          console.log(`       isAvailable: ${variant.isAvailable}`)
          console.log(`       isActive: ${variant.isActive}`)
        })
      } else {
        console.log(`   ⚠️  No variants found!`)
      }
      console.log('')
    })

    // Now simulate the normalizeProduct function
    console.log('🔄 Simulating normalizeProduct() transformation...\n')

    const normalized = products.slice(0, 1).map(product => {
      const normalized = { ...product }
      normalized.brand = normalized.brand || (normalized.business_brands ? { id: normalized.business_brands.id, name: normalized.business_brands.name } : null)
      normalized.category = normalized.category || (normalized.business_categories ? { id: normalized.business_categories.id, name: normalized.business_categories.name } : null)
      normalized.variants = normalized.variants || normalized.product_variants || []
      normalized.images = normalized.images || normalized.product_images || []
      normalized.business = normalized.business || null

      delete normalized.business_brands
      delete normalized.business_categories
      delete normalized.product_variants
      delete normalized.ProductImages

      return normalized
    })

    console.log('Normalized Product:')
    console.log(`  name: ${normalized[0].name}`)
    console.log(`  basePrice: $${normalized[0].basePrice}`)
    console.log(`  variants: ${normalized[0].variants.length} variants`)
    if (normalized[0].variants.length > 0) {
      console.log(`  First variant:`)
      console.log(`    name: ${normalized[0].variants[0].name}`)
      console.log(`    sku: ${normalized[0].variants[0].sku}`)
      console.log(`    price: ${normalized[0].variants[0].price === null ? 'NULL' : normalized[0].variants[0].price === undefined ? 'UNDEFINED' : '$' + normalized[0].variants[0].price}`)

      // Simulate what product-card.tsx does
      const currentPrice = normalized[0].variants[0].price ?? normalized[0].basePrice
      console.log(`\n  🎯 Calculated currentPrice (variant.price ?? basePrice): $${currentPrice}`)
    }

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

testHardwareAPI()
