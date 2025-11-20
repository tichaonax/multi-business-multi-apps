const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function markGangoAsCompanionItem() {
  try {
    console.log('🔍 Finding "Gango" products...\n')

    // Find all products with "Gango" in the name
    const gangoProducts = await prisma.businessProducts.findMany({
      where: {
        businessType: 'restaurant',
        name: { contains: 'Gango', mode: 'insensitive' }
      },
      include: {
        business_categories: true,
        businesses: true
      }
    })

    console.log(`Found ${gangoProducts.length} products with "Gango" in name:\n`)

    if (gangoProducts.length === 0) {
      console.log('❌ No "Gango" products found.')
      console.log('\nTo test this feature, you can mark any side dish as requiring a companion item.')
      return
    }

    // Mark each as requiring a companion item
    for (const product of gangoProducts) {
      console.log(`📝 Updating: ${product.name}`)
      console.log(`   Business: ${product.businesses.name}`)
      console.log(`   Category: ${product.business_categories?.name || 'None'}`)

      await prisma.businessProducts.update({
        where: { id: product.id },
        data: { requiresCompanionItem: true }
      })

      console.log(`   ✅ Marked as requiring companion item\n`)
    }

    console.log('✨ All done!\n')
    console.log('📋 What this means:')
    console.log('   - These items will show a "+" badge in the POS')
    console.log('   - They cannot be added to cart alone')
    console.log('   - Customer must add a main item from the same category first')
    console.log('   - Example: Add "Sadza" (main) before adding "Gango" (side)\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

markGangoAsCompanionItem()
