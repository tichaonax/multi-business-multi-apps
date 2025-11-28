const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixServiceBusinessType() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    Fixing Service Business Type                            ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')

    const businessId = '4b6911f4-3093-4f0e-9d93-7067260c1491'

    // Get current business
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      console.log('❌ Business not found!')
      return
    }

    console.log('Before:')
    console.log(`  Name: ${business.name}`)
    console.log(`  Type: "${business.type}"`)
    console.log('')

    // Update type
    const updated = await prisma.businesses.update({
      where: { id: businessId },
      data: { type: 'services' }
    })

    console.log('✅ After:')
    console.log(`  Name: ${updated.name}`)
    console.log(`  Type: "${updated.type}"`)
    console.log('')
    console.log('✅ Business type updated successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Refresh your browser')
    console.log('  2. Look for "Services" in the sidebar')
    console.log('  3. Click to expand and see your business')
    console.log('')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixServiceBusinessType()
