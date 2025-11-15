// Check for duplicate SKUs in ProductVariants that would violate new unique constraint
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate SKUs in ProductVariants...\n')

  try {
    // Find SKUs that appear more than once for the same product
    const duplicates = await prisma.$queryRaw`
      SELECT
        pv."productId",
        pv.sku,
        COUNT(*) as count,
        array_agg(pv.id) as variant_ids
      FROM product_variants pv
      GROUP BY pv."productId", pv.sku
      HAVING COUNT(*) > 1
    `

    if (duplicates.length === 0) {
      console.log('✅ No duplicate SKUs found!')
      console.log('   The new unique constraint [productId, sku] can be safely applied.\n')
      return true
    }

    console.log(`❌ Found ${duplicates.length} duplicate SKU(s):\n`)

    for (const dup of duplicates) {
      console.log(`Product ID: ${dup.productId}`)
      console.log(`  SKU: ${dup.sku}`)
      console.log(`  Count: ${dup.count}`)
      console.log(`  Variant IDs: ${dup.variant_ids.join(', ')}`)

      // Get product details
      const product = await prisma.businessProducts.findUnique({
        where: { id: dup.productId },
        select: { name: true, businessId: true }
      })

      if (product) {
        console.log(`  Product: ${product.name} (Business: ${product.businessId})`)
      }
      console.log('')
    }

    console.log('⚠️  These duplicates must be resolved before applying the migration.\n')
    return false
  } catch (error) {
    console.error('Error checking duplicates:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

checkDuplicates().then(success => {
  process.exit(success ? 0 : 1)
})
