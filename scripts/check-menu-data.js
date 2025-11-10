/**
 * Check Menu Data Issues
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkMenuData() {
  console.log('🔍 Checking Menu Data Issues')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Check products with variants and images
    const products = await prisma.businessProducts.findMany({
      where: { businessType: 'restaurant' },
      include: {
        product_variants: { where: { isActive: true } },
        product_images: true
      },
      take: 3
    })

    console.log('📦 Products with variants and images:\n')
    products.forEach(p => {
      console.log(`Product: ${p.name}`)
      console.log(`  Variants (${p.product_variants.length}):`)
      p.product_variants.forEach(v => {
        console.log(`    - ${v.name}: $${v.price}`)
      })
      console.log(`  Images (${p.product_images.length}):`)
      p.product_images.forEach(i => {
        console.log(`    - ${i.imageUrl}`)
      })
      console.log('')
    })

    // Check categories for restaurant
    const categories = await prisma.businessCategories.findMany({
      where: {
        businessId: 'restaurant-demo',
        isActive: true
      }
    })

    console.log('═══════════════════════════════════════════════════')
    console.log(`📂 Categories for restaurant-demo: ${categories.length}\n`)
    categories.forEach(cat => {
      console.log(`  - ${cat.name} (emoji: ${cat.emoji || 'none'})`)
    })

    console.log('\n═══════════════════════════════════════════════════')
    console.log('🐛 Issues Found:\n')

    if (products.some(p => p.product_variants.length > 0 && p.product_variants.every(v => v.price === 0))) {
      console.log('❌ Issue 1: Variants have zero prices in database')
    }

    if (products.some(p => p.product_images.length === 0)) {
      console.log('❌ Issue 2: Products missing images in database')
    }

    if (categories.every(c => !c.emoji)) {
      console.log('❌ Issue 3: Categories missing emoji field')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkMenuData()
