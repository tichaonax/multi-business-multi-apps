/**
 * Check clothing product prices in database vs API
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPrices() {
  console.log('🔍 Checking Clothing Product Prices\n')

  try {
    // Find clothing business
    const clothingBusiness = await prisma.businesses.findFirst({
      where: { type: 'clothing' }
    })

    if (!clothingBusiness) {
      console.log('❌ No clothing business found')
      return
    }

    console.log(`✅ Found business: ${clothingBusiness.name} (${clothingBusiness.id})\n`)

    // Get clothing products with variants
    const products = await prisma.businessProducts.findMany({
      where: { businessId: clothingBusiness.id },
      include: {
        product_variants: true
      },
      take: 5
    })

    console.log(`📦 Found ${products.length} products\n`)

    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`)
      console.log(`   ID: ${product.id}`)
      console.log(`   SKU: ${product.sku}`)
      console.log(`   basePrice: $${product.basePrice}`)
      console.log(`   costPrice: $${product.costPrice}`)

      if (product.product_variants && product.product_variants.length > 0) {
        console.log(`   Variants (${product.product_variants.length}):`)
        product.product_variants.forEach((variant, vIndex) => {
          console.log(`     ${vIndex + 1}. ${variant.name || 'Default'} - SKU: ${variant.sku} - Price: $${variant.price}`)
        })
      } else {
        console.log(`   ⚠️  No variants`)
      }
      console.log()
    })

    // Now check what the API returns
    console.log('\n🌐 Checking API Response...\n')
    const API_BASE = 'http://localhost:8080'
    const response = await fetch(`${API_BASE}/api/universal/products?businessId=${clothingBusiness.id}&includeVariants=true&limit=5`)
    const apiData = await response.json()

    if (apiData.success) {
      console.log(`✅ API returned ${apiData.data.length} products\n`)
      apiData.data.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`)
        console.log(`   basePrice: $${product.basePrice}`)
        if (product.variants && product.variants.length > 0) {
          console.log(`   Variants: ${product.variants.length}`)
          product.variants.forEach((variant, vIndex) => {
            console.log(`     ${vIndex + 1}. ${variant.name || 'Default'} - Price: $${variant.price}`)
          })
        }
        console.log()
      })
    } else {
      console.error('❌ API error:', apiData.error)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPrices()
