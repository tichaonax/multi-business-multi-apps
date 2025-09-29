/*
  Lightweight integration test for clothing seed/unseed.
  - Runs the seed script
  - Verifies the demo business and a product exist
  - Runs the unseed cleanup logic (directly via prisma operations)
  - Verifies the demo business was removed

  Run with: node tests/seed-clothing.test.js
*/

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { seed: seedClothing } = require('../scripts/seed-clothing-demo.js')

async function run() {
  try {
    console.log('Starting clothing seed integration test')
    await seedClothing()

    const demoBusinessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'clothing-demo-business'
    const business = await prisma.business.findUnique({ where: { id: demoBusinessId } })
    if (!business) throw new Error('Expected demo business after seeding')
    console.log('Seed created business:', business.id)

    const products = await prisma.businessProduct.findMany({ where: { businessId: demoBusinessId } })
    if (!products || products.length === 0) throw new Error('Expected at least one product after seeding')
    console.log('Seed created products:', products.map(p => p.id))

    // Now run unseed logic (reuse the same steps as API route)
    // Delete order items and orders for that business
    await prisma.businessOrderItem.deleteMany({ where: { order: { businessId: demoBusinessId } } }).catch(() => {})
    await prisma.businessOrder.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

    // Delete stock movements, product images, variants, attributes, products, categories
    await prisma.businessStockMovement.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

    const demoProducts = await prisma.businessProduct.findMany({ where: { businessId: demoBusinessId } }).catch(() => [])
    const demoProductIds = demoProducts.map(p => p.id)

    if (demoProductIds.length) {
      await prisma.productImage.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
      await prisma.productAttribute.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
    }

    const demoVariantIds = demoProductIds.length ? await prisma.productVariant.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then(r => r.map(x => x.id)).catch(() => []) : []
    if (demoVariantIds.length) {
      await prisma.businessStockMovement.deleteMany({ where: { productVariantId: { in: demoVariantIds } } }).catch(() => {})
      await prisma.productVariant.deleteMany({ where: { id: { in: demoVariantIds } } }).catch(() => {})
    }

    if (demoProductIds.length) {
      await prisma.businessProduct.deleteMany({ where: { id: { in: demoProductIds } } }).catch(() => {})
    }

    await prisma.businessCategory.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})
    await prisma.business.deleteMany({ where: { id: demoBusinessId } }).catch(() => {})

    const after = await prisma.business.findUnique({ where: { id: demoBusinessId } })
    if (after) throw new Error('Unseed failed: demo business still exists')
    console.log('Unseed removed demo business successfully')

    console.log('Clothing seed integration test passed')
  } catch (err) {
    console.error('Test failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

run()
