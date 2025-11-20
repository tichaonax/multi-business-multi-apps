const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProductAvailability() {
  try {
    const businessId = 'restaurant-demo-business'

    console.log('Checking Restaurant Products Availability...\n')

    // Get all products
    const allProducts = await prisma.businessProducts.findMany({
      where: { businessId },
      include: {
        product_variants: true,
        business_categories: true
      },
      orderBy: { name: 'asc' }
    })

    console.log(`📊 Total Products: ${allProducts.length}`)
    console.log('')

    // Group by availability
    const available = allProducts.filter(p => p.isAvailable)
    const unavailable = allProducts.filter(p => !p.isAvailable)
    const active = allProducts.filter(p => p.isActive)
    const inactive = allProducts.filter(p => !p.isActive)

    console.log(`✅ Available (isAvailable=true): ${available.length}`)
    console.log(`❌ Unavailable (isAvailable=false): ${unavailable.length}`)
    console.log(`✅ Active (isActive=true): ${active.length}`)
    console.log(`❌ Inactive (isActive=false): ${inactive.length}`)
    console.log('')

    // Show sample products
    console.log('Sample Products (first 10):')
    allProducts.slice(0, 10).forEach(p => {
      console.log(`  ${p.name}`)
      console.log(`    ID: ${p.id}`)
      console.log(`    isActive: ${p.isActive}`)
      console.log(`    isAvailable: ${p.isAvailable}`)
      console.log(`    basePrice: $${p.basePrice}`)
      console.log(`    Category: ${p.business_categories?.name || 'None'}`)
      console.log(`    Variants: ${p.product_variants.length}`)
      console.log('')
    })

    // Check what the API would return
    console.log('='.repeat(60))
    console.log('What POS API would fetch:')
    console.log('  Query: businessType=restaurant&isAvailable=true&isActive=true')

    const apiProducts = await prisma.businessProducts.findMany({
      where: {
        businessType: 'restaurant',
        isAvailable: true,
        isActive: true
      },
      include: {
        business_categories: { select: { id: true, name: true } }
      },
      take: 10
    })

    console.log(`  Result: ${apiProducts.length} products found`)
    console.log('')
    apiProducts.forEach(p => {
      console.log(`    - ${p.name} ($${p.basePrice}) [${p.business_categories?.name || 'No category'}]`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductAvailability()
