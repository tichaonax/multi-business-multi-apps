const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkHardwareProducts() {
  try {
    console.log('🔍 Checking hardware demo products...\n')

    // Find hardware business
    const business = await prisma.businesses.findFirst({
      where: { type: 'hardware', isDemo: true }
    })

    if (!business) {
      console.log('❌ No hardware demo business found!')
      console.log('   Run: node scripts/seed-hardware-demo.js')
      return
    }

    console.log(`✅ Found business: ${business.name} (${business.id})\n`)

    // Get products
    const products = await prisma.businessProducts.findMany({
      where: { businessId: business.id },
      include: {
        product_variants: true,
        business_categories: true
      }
    })

    console.log(`📦 Found ${products.length} products:\n`)

    if (products.length === 0) {
      console.log('❌ No products found!')
      console.log('   Run: node scripts/seed-hardware-demo.js')
      return
    }

    products.forEach((product, i) => {
      console.log(`${i + 1}. ${product.name}`)
      console.log(`   SKU: ${product.sku}`)
      console.log(`   Base Price: $${product.basePrice}`)
      console.log(`   Cost Price: $${product.costPrice}`)
      console.log(`   Category: ${product.business_categories?.name || 'N/A'}`)

      if (product.product_variants.length > 0) {
        product.product_variants.forEach(variant => {
          console.log(`   Variant: ${variant.sku}`)
          console.log(`     Price: $${variant.price}`)
          console.log(`     Stock: ${variant.stockQuantity}`)
        })
      } else {
        console.log(`   ⚠️  No variants found!`)
      }

      // Check for issues
      if (!product.basePrice || product.basePrice === 0) {
        console.log(`   ❌ ISSUE: basePrice is ${product.basePrice}`)
      }
      if (product.product_variants.length > 0 && !product.product_variants[0].price) {
        console.log(`   ❌ ISSUE: variant price is undefined/null`)
      }

      console.log('')
    })

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkHardwareProducts()
