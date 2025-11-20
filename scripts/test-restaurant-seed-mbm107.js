const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Import the seeding function (needs to be compiled TypeScript)
// For testing, we'll create a test business and call the API

async function testRestaurantSeeding() {
  try {
    console.log('Testing Restaurant Product Seeding...\n')

    // Check if test business already exists
    let testBusiness = await prisma.businesses.findFirst({
      where: { name: 'Test Restaurant Seed' }
    })

    if (testBusiness) {
      console.log(`✅ Found existing test business: ${testBusiness.id}`)
    } else {
      // Create a test restaurant business
      console.log('Creating test restaurant business...')
      testBusiness = await prisma.businesses.create({
        data: {
          id: 'test-restaurant-seed-' + Date.now(),
          name: 'Test Restaurant Seed',
          type: 'restaurant',
          description: 'Test business for seeding',
          shortName: 'TEST-RST-' + Date.now(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`✅ Created test business: ${testBusiness.id}\n`)
    }

    // Call the seeding API
    console.log('Calling seeding API...')
    const response = await fetch('http://localhost:8080/api/admin/restaurant/seed-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: testBusiness.id })
    })

    const result = await response.json()

    console.log('\n📊 Seeding Results:')
    console.log(`   Success: ${result.success}`)
    if (result.data) {
      console.log(`   Total Products: ${result.data.totalProducts}`)
      console.log(`   Imported: ${result.data.imported}`)
      console.log(`   Skipped: ${result.data.skipped}`)
      console.log(`   Errors: ${result.data.errors}`)
    }
    if (result.message) {
      console.log(`   Message: ${result.message}`)
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }

    // Verify products were created
    const productCount = await prisma.businessProducts.count({
      where: { businessId: testBusiness.id }
    })

    console.log(`\n✅ Verification: ${productCount} products in database for test business`)

    // Show sample products
    const sampleProducts = await prisma.businessProducts.findMany({
      where: { businessId: testBusiness.id },
      include: { business_categories: true },
      take: 10,
      orderBy: { name: 'asc' }
    })

    console.log('\nSample Products:')
    sampleProducts.forEach(p => {
      console.log(`  - ${p.name} ($${p.basePrice}) [${p.business_categories?.name || 'No category'}]`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRestaurantSeeding()
