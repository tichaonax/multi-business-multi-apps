const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanup() {
  try {
    // Find all demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: {
        OR: [
          { name: { contains: 'Demo' } },
          { id: { in: ['clothing-demo-business', 'hardware-demo-business', 'grocery-demo-business', 'restaurant-demo', 'contractors-demo-business'] } }
        ]
      }
    })

    console.log(`Found ${demoBusinesses.length} demo businesses to clean up:`)
    demoBusinesses.forEach(b => console.log(`  - ${b.id}: ${b.name}`))

    if (demoBusinesses.length === 0) {
      console.log('No demo businesses to clean up')
      await prisma.$disconnect()
      return
    }

    // Delete each business one by one with all its related data
    console.log('\nDeleting demo businesses and their related data...')
    for (const business of demoBusinesses) {
      try {
        const bid = business.id
        console.log(`\nProcessing: ${business.name} (${bid})`)
        
        // Delete in dependency order using correct column names
        await prisma.$executeRaw`DELETE FROM business_stock_movements WHERE "businessProductId" IN (SELECT id FROM business_products WHERE "businessId" = ${bid})`
        await prisma.$executeRaw`DELETE FROM product_attributes WHERE "productId" IN (SELECT id FROM business_products WHERE "businessId" = ${bid})`
        await prisma.$executeRaw`DELETE FROM product_images WHERE "productId" IN (SELECT id FROM business_products WHERE "businessId" = ${bid})`
        await prisma.$executeRaw`DELETE FROM product_variants WHERE "productId" IN (SELECT id FROM business_products WHERE "businessId" = ${bid})`
        await prisma.$executeRaw`DELETE FROM business_products WHERE "businessId" = ${bid}`
        await prisma.$executeRaw`DELETE FROM business_categories WHERE "businessId" = ${bid}`
        await prisma.$executeRaw`DELETE FROM project_contractors WHERE "projectId" IN (SELECT id FROM projects WHERE "businessId" = ${bid})`
        await prisma.$executeRaw`DELETE FROM projects WHERE "businessId" = ${bid}`
        await prisma.$executeRaw`DELETE FROM persons WHERE "businessId" = ${bid}`
        await prisma.$executeRaw`DELETE FROM business_order_items WHERE "orderId" IN (SELECT id FROM business_orders WHERE "businessId" = ${bid})`
        await prisma.$executeRaw`DELETE FROM business_orders WHERE "businessId" = ${bid}`
        await prisma.$executeRaw`DELETE FROM businesses WHERE id = ${bid}`
        
        console.log(`✓ Deleted: ${business.name}`)
      } catch (err) {
        console.error(`✗ Failed to delete ${business.name}: ${err.message}`)
      }
    }

    console.log('\n✅ Cleanup complete!')
    await prisma.$disconnect()
  } catch (err) {
    console.error('❌ Cleanup failed:', err)
    await prisma.$disconnect()
    process.exitCode = 1
  }
}

cleanup()
