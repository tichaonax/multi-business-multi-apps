const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function unseed() {
  try {
    const demoBusinessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'hardware-demo-business'

    console.log('Unseeding hardware demo business:', demoBusinessId)

    // Delete order items and orders for that business
    await prisma.businessOrderItems.deleteMany({ where: { order: { businessId: demoBusinessId } } }).catch(() => {})
    await prisma.businessOrders.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

    // Delete stock movements, product images, variants, attributes, products, categories
    await prisma.businessStockMovements.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

    const demoProducts = await prisma.businessProducts.findMany({ where: { businessId: demoBusinessId } }).catch(() => [])
    const demoProductIds = demoProducts.map(p => p.id)
    const demoVariantIds = demoProductIds.length ? await prisma.productVariants.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then(r => r.map(x => x.id)).catch(() => []) : []

    await prisma.productImages.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
    await prisma.productVariants.deleteMany({ where: { id: { in: demoVariantIds } } }).catch(() => {})
    await prisma.productAttributes.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
    await prisma.businessProducts.deleteMany({ where: { id: { in: demoProductIds } } }).catch(() => {})
    await prisma.businessCategories.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})
    await prisma.businesses.deleteMany({ where: { id: demoBusinessId } }).catch(() => {})

    console.log('Hardware demo unseed complete')
  } catch (err) {
    console.error('Hardware unseed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) unseed()

module.exports = { unseed }
