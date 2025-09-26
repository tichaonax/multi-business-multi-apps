const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  const b = 'restaurant-demo'
  const prods = await prisma.businessProduct.findMany({ where: { businessId: b } })
  const vars = await prisma.productVariant.findMany({ where: { product: { businessId: b } }, include: { product: true } })
  console.log('Products:', prods.length)
  console.log('Variants:', vars.length)
  for (const v of vars) {
    console.log('-', v.sku, 'product:', v.product.name, 'stock:', v.stockQuantity)
  }
  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
