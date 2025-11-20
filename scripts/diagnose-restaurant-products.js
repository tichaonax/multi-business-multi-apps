const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnose() {
  try {
    console.log('🔍 Diagnosing Restaurant Product Visibility...\n')

    // 1. Find all restaurant businesses
    console.log('📊 Restaurant Businesses:')
    const restaurants = await prisma.businesses.findMany({
      where: { type: 'restaurant', isActive: true }
    })

    if (restaurants.length === 0) {
      console.log('❌ No restaurant businesses found!')
      return
    }

    restaurants.forEach(r => {
      console.log(`  - ${r.name} (ID: ${r.id})`)
    })
    console.log('')

    // 2. Count products per restaurant
    console.log('📦 Products per Restaurant:')
    for (const restaurant of restaurants) {
      const count = await prisma.businessProducts.count({
        where: { businessId: restaurant.id }
      })
      console.log(`  ${restaurant.name}: ${count} products`)

      if (count > 0) {
        // Show sample products
        const samples = await prisma.businessProducts.findMany({
          where: { businessId: restaurant.id },
          take: 5,
          orderBy: { name: 'asc' },
          include: { business_categories: true }
        })

        console.log('    Sample products:')
        samples.forEach(p => {
          console.log(`      - ${p.name} ($${p.basePrice}) [${p.isActive ? 'Active' : 'Inactive'}] [${p.isAvailable ? 'Available' : 'Unavailable'}]`)
        })
      }
    }
    console.log('')

    // 3. Check what the API query would return
    console.log('🔍 What API Query Returns (businessType=restaurant):')
    const apiProducts = await prisma.businessProducts.findMany({
      where: {
        businessType: 'restaurant',
        isAvailable: true,
        isActive: true
      },
      take: 10,
      include: {
        business_categories: true
      }
    })

    console.log(`  Found: ${apiProducts.length} products`)
    if (apiProducts.length > 0) {
      console.log('  Sample:')
      apiProducts.forEach(p => {
        console.log(`    - ${p.name} (Business: ${p.businessId})`)
      })
    }
    console.log('')

    // 4. Check products with $0 price (recently seeded)
    console.log('💰 Products with $0 Price (Recently Seeded):')
    const zeroPrice = await prisma.businessProducts.findMany({
      where: {
        businessType: 'restaurant',
        basePrice: 0
      },
      take: 10,
      include: {
        businesses: { select: { name: true } }
      }
    })

    console.log(`  Found: ${zeroPrice.length} products with $0 price`)
    if (zeroPrice.length > 0) {
      zeroPrice.forEach(p => {
        console.log(`    - ${p.name} (${p.businesses.name})`)
        console.log(`      Active: ${p.isActive}, Available: ${p.isAvailable}, BusinessType: ${p.businessType}`)
      })
    }
    console.log('')

    // 5. Check for any combo items
    console.log('🍽️ Combo Items:')
    const combos = await prisma.businessProducts.count({
      where: {
        businessType: 'restaurant',
        isCombo: true
      }
    })
    console.log(`  Found: ${combos} combo items`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnose()
