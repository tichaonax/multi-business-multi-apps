const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function unseed() {
  try {
    const demoBusinessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

    console.log('Unseeding grocery demo business:', demoBusinessId)

    // Delete order items and orders for that business
    await prisma.businessOrderItem.deleteMany({ where: { order: { businessId: demoBusinessId } } }).catch(() => {})
    await prisma.businessOrder.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

    // Delete stock movements, product images, variants, attributes, products, categories
    await prisma.businessStockMovement.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

    const demoProducts = await prisma.businessProduct.findMany({ where: { businessId: demoBusinessId } }).catch(() => [])
    const demoProductIds = demoProducts.map(p => p.id)
    const demoVariantIds = demoProductIds.length ? await prisma.productVariant.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then(r => r.map(x => x.id)).catch(() => []) : []

    await prisma.productImage.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
    await prisma.productVariant.deleteMany({ where: { id: { in: demoVariantIds } } }).catch(() => {})
    await prisma.productAttribute.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
    await prisma.businessProduct.deleteMany({ where: { id: { in: demoProductIds } } }).catch(() => {})
    await prisma.businessCategory.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})
    await prisma.businesses.deleteMany({ where: { id: demoBusinessId } }).catch(() => {})

    console.log('Grocery demo unseed complete')
  } catch (err) {
    console.error('Grocery unseed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) unseed()

module.exports = { unseed }
