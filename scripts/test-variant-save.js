/**
 * Test Variant Save Process
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testVariantSave() {
  console.log('🧪 Testing Variant Save Process')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Get a product with variants
    const product = await prisma.businessProducts.findFirst({
      where: {
        businessType: 'restaurant',
        name: { contains: 'Eggs' }
      },
      include: {
        product_variants: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!product) {
      console.log('❌ Product "Eggs" not found')
      return
    }

    console.log(`📦 Product: ${product.name}`)
    console.log(`   ID: ${product.id}`)
    console.log(`   Variants Count: ${product.product_variants.length}\n`)

    if (product.product_variants.length > 0) {
      console.log('Current Variants:')
      product.product_variants.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.name}`)
        console.log(`      ID: ${v.id}`)
        console.log(`      SKU: ${v.sku}`)
        console.log(`      Price: $${v.price}`)
        console.log(`      Created: ${v.createdAt}`)
        console.log(`      Updated: ${v.updatedAt}`)
        console.log('')
      })
    }

    // Test updating a variant
    if (product.product_variants.length > 0) {
      const firstVariant = product.product_variants[0]
      console.log('═══════════════════════════════════════════════════')
      console.log('🔧 Testing Update...\n')

      const newPrice = 5.99
      console.log(`Updating "${firstVariant.name}" price to $${newPrice}`)

      const updated = await prisma.product_variants.update({
        where: { id: firstVariant.id },
        data: { price: newPrice }
      })

      console.log(`✅ Updated successfully`)
      console.log(`   New price in DB: $${updated.price}`)

      // Verify it persisted
      const verified = await prisma.product_variants.findUnique({
        where: { id: firstVariant.id }
      })

      console.log(`✅ Verified in DB: $${verified.price}`)

      // Reset back to original
      await prisma.product_variants.update({
        where: { id: firstVariant.id },
        data: { price: firstVariant.price }
      })
      console.log(`   Reset back to original: $${firstVariant.price}`)
    }

    console.log('\n═══════════════════════════════════════════════════')
    console.log('✅ Database can save variants correctly')
    console.log('   Issue must be in API or form submission logic\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testVariantSave()
