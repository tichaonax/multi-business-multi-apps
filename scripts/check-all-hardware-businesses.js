const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAllHardwareBusinesses() {
  try {
    const businesses = await prisma.businesses.findMany({
      where: { type: 'hardware' }
    })

    console.log('🔧 Hardware Businesses:')
    businesses.forEach(b => {
      console.log(`  - ${b.name} (${b.id}) [Demo: ${b.isDemo}, Active: ${b.isActive}]`)
    })

    const products = await prisma.businessProducts.findMany({
      where: { businessType: 'hardware' },
      include: { product_variants: true }
    })

    console.log(`\n📦 Total Hardware Products: ${products.length}\n`)

    products.forEach(p => {
      console.log(`${p.name}`)
      console.log(`  Business ID: ${p.businessId}`)
      console.log(`  Base Price: $${p.basePrice}`)
      console.log(`  Variants: ${p.product_variants.length}`)
      if (p.product_variants.length > 0) {
        p.product_variants.forEach(v => {
          console.log(`    - ${v.sku}: ${v.price === null ? 'NULL' : v.price === undefined ? 'UNDEFINED' : '$' + v.price}`)
        })
      }
      console.log('')
    })

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkAllHardwareBusinesses()
