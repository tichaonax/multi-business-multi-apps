import { PrismaClient } from '@prisma/client'
import { seedRestaurantProducts } from '../src/lib/seed-restaurant-products'

const prisma = new PrismaClient()

async function testRestaurantSeeding() {
  try {
    console.log('Testing Restaurant Product Seeding (Direct)...\n')

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

    // Call the seeding function directly
    console.log('Seeding products...')
    const result = await seedRestaurantProducts(testBusiness.id)

    console.log('\n📊 Seeding Results:')
    console.log(`   Success: ${result.success}`)
    console.log(`   Total Products: ${result.totalProducts}`)
    console.log(`   Imported: ${result.imported}`)
    console.log(`   Skipped: ${result.skipped}`)
    console.log(`   Errors: ${result.errors}`)
    if (result.message) {
      console.log(`   Message: ${result.message}`)
    }

    if (result.errors > 0 && result.errorLog.length > 0) {
      console.log('\n❌ Errors:')
      result.errorLog.slice(0, 5).forEach(err => {
        console.log(`   - ${err.name}: ${err.error}`)
      })
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
