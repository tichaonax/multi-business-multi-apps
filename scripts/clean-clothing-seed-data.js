const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Clean seed data from clothing businesses
 * Removes all products and variants imported from seed data
 */
async function cleanClothingSeedData() {
  console.log('🧹 Starting clothing seed data cleanup...\n')

  try {
    // Find all clothing businesses
    const clothingBusinesses = await prisma.businesses.findMany({
      where: { type: 'clothing' },
      select: { id: true, name: true }
    })

    if (clothingBusinesses.length === 0) {
      console.log('ℹ️  No clothing businesses found.')
      return
    }

    console.log(`Found ${clothingBusinesses.length} clothing business(es):\n`)
    clothingBusinesses.forEach(b => console.log(`  - ${b.name} (${b.id})`))
    console.log('')

    for (const business of clothingBusinesses) {
      console.log(`🗑️  Cleaning ${business.name}...`)

      // Count existing products
      const productCount = await prisma.businessProducts.count({
        where: { businessId: business.id }
      })

      if (productCount === 0) {
        console.log(`  ✅ No products to clean\n`)
        continue
      }

      console.log(`  📦 Found ${productCount} products to remove`)

      // Delete in correct order to avoid foreign key violations

      // 1. Delete product variants first
      const variantsDeleted = await prisma.productVariants.deleteMany({
        where: {
          product: {
            businessId: business.id
          }
        }
      })
      console.log(`  🗑️  Deleted ${variantsDeleted.count} product variants`)

      // 2. Delete product images
      const imagesDeleted = await prisma.productImages.deleteMany({
        where: {
          product: {
            businessId: business.id
          }
        }
      })
      console.log(`  🗑️  Deleted ${imagesDeleted.count} product images`)

      // 3. Delete product barcodes
      const barcodesDeleted = await prisma.productBarcodes.deleteMany({
        where: {
          product: {
            businessId: business.id
          }
        }
      })
      console.log(`  🗑️  Deleted ${barcodesDeleted.count} product barcodes`)

      // 4. Delete barcode inventory items
      const inventoryDeleted = await prisma.barcodeInventoryItems.deleteMany({
        where: {
          businessId: business.id
        }
      })
      console.log(`  🗑️  Deleted ${inventoryDeleted.count} inventory items`)

      // 5. Delete stock movements
      const stockMovementsDeleted = await prisma.businessStockMovements.deleteMany({
        where: {
          product: {
            businessId: business.id
          }
        }
      })
      console.log(`  🗑️  Deleted ${stockMovementsDeleted.count} stock movements`)

      // 6. Finally, delete the products
      const productsDeleted = await prisma.businessProducts.deleteMany({
        where: { businessId: business.id }
      })
      console.log(`  🗑️  Deleted ${productsDeleted.count} products`)

      console.log(`  ✅ Cleanup complete for ${business.name}\n`)
    }

    console.log('✅ All clothing seed data cleaned successfully!')
    console.log('\n💡 You can now add your own products from the Products page.')

  } catch (error) {
    console.error('❌ Error cleaning seed data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  cleanClothingSeedData()
    .then(() => {
      console.log('\n✅ Cleanup script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Cleanup script failed:', error)
      process.exit(1)
    })
}

module.exports = { cleanClothingSeedData }
