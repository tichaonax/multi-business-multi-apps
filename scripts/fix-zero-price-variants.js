/**
 * Fix product variants with $0 prices
 * Updates variant prices to match their product's basePrice (except WiFi tokens)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixZeroPriceVariants() {
  console.log('🔧 Fixing Product Variants with $0 Prices\n')

  try {
    // Find all variants with price = 0
    const zeroVariants = await prisma.productVariants.findMany({
      where: {
        OR: [
          { price: 0 },
          { price: null }
        ]
      },
      include: {
        business_products: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            attributes: true
          }
        }
      }
    })

    console.log(`📦 Found ${zeroVariants.length} variants with $0 or null price\n`)

    let fixedCount = 0
    let skippedWiFi = 0
    let skippedZeroBase = 0
    const errors = []

    for (const variant of zeroVariants) {
      const product = variant.business_products

      // Check if this is a WiFi token product
      const isWiFiToken =
        product.attributes?.isWiFiToken === true ||
        product.name?.toLowerCase().includes('wifi')

      if (isWiFiToken) {
        console.log(`⏭️  Skipping WiFi token: ${product.name}`)
        skippedWiFi++
        continue
      }

      // Check if product has a valid basePrice
      const basePrice = parseFloat(product.basePrice)
      if (!basePrice || basePrice <= 0) {
        console.log(`⚠️  Product "${product.name}" also has $0 basePrice - skipping variant`)
        skippedZeroBase++
        continue
      }

      // Update variant price to match product basePrice
      try {
        await prisma.productVariants.update({
          where: { id: variant.id },
          data: {
            price: basePrice,
            updatedAt: new Date()
          }
        })

        console.log(`✅ Fixed variant "${variant.name || 'Default'}" for "${product.name}"`)
        console.log(`   Price: $0 → $${basePrice}`)
        fixedCount++
      } catch (error) {
        console.error(`❌ Error fixing variant ${variant.id}:`, error.message)
        errors.push({ variant: variant.id, product: product.name, error: error.message })
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary:')
    console.log(`   Total variants checked: ${zeroVariants.length}`)
    console.log(`   ✅ Fixed: ${fixedCount}`)
    console.log(`   ⏭️  Skipped (WiFi tokens): ${skippedWiFi}`)
    console.log(`   ⚠️  Skipped (zero basePrice): ${skippedZeroBase}`)
    console.log(`   ❌ Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach(({ variant, product, error }) => {
        console.log(`   - Variant ${variant} (${product}): ${error}`)
      })
    }

    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixZeroPriceVariants()
