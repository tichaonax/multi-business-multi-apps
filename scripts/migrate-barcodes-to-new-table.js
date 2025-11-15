/**
 * Data Migration Script: Migrate Existing Barcodes to ProductBarcodes Table
 *
 * This script migrates barcode data from the old schema to the new ProductBarcodes table.
 *
 * Migration Strategy:
 * 1. Find all ProductVariants and BusinessProducts with barcode values
 * 2. For each barcode, detect the barcode type (UPC, EAN, or CUSTOM)
 * 3. Create entries in ProductBarcodes table
 * 4. Mark all migrated barcodes as primary
 * 5. Set isUniversal flag for UPC/EAN codes
 *
 * Note: Since we did a clean break migration, old barcode fields no longer exist
 * in the schema. This script is for reference/rollback purposes only.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Detect barcode type based on the barcode value
 * @param {string} barcode - The barcode value
 * @returns {string} - BarcodeType enum value
 */
function detectBarcodeType(barcode) {
  if (!barcode) return 'CUSTOM'

  // Remove any whitespace
  const cleanBarcode = barcode.trim()

  // UPC-A: 12 digits
  if (/^\d{12}$/.test(cleanBarcode)) {
    return 'UPC_A'
  }

  // UPC-E: 6 digits
  if (/^\d{6}$/.test(cleanBarcode)) {
    return 'UPC_E'
  }

  // EAN-13: 13 digits
  if (/^\d{13}$/.test(cleanBarcode)) {
    return 'EAN_13'
  }

  // EAN-8: 8 digits
  if (/^\d{8}$/.test(cleanBarcode)) {
    return 'EAN_8'
  }

  // ITF: 14 digits (commonly used for cases/cartons)
  if (/^\d{14}$/.test(cleanBarcode)) {
    return 'ITF'
  }

  // CODE128: Alphanumeric with specific start characters
  if (/^[A-Z0-9\-_]+$/.test(cleanBarcode) && cleanBarcode.length > 6) {
    return 'CODE128'
  }

  // CODE39: Alphanumeric with dashes
  if (/^[A-Z0-9\-\.\$\/\+%\s]+$/.test(cleanBarcode)) {
    return 'CODE39'
  }

  // Default to CUSTOM for anything else
  return 'CUSTOM'
}

/**
 * Check if a barcode type is universal (UPC/EAN)
 * @param {string} type - BarcodeType enum value
 * @returns {boolean}
 */
function isUniversalBarcodeType(type) {
  return ['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8'].includes(type)
}

/**
 * Main migration function
 */
async function migrateBarcodes() {
  console.log('🚀 Starting barcode data migration...\n')

  let totalMigrated = 0
  let variantBarcodes = 0
  let productBarcodes = 0
  let skipped = 0

  try {
    // NOTE: This query would fail on current schema since barcode field is removed
    // This is for documentation purposes only
    console.log('⚠️  Note: Barcode fields have been removed from schema.')
    console.log('   This script is for reference/documentation only.\n')

    console.log('📋 Migration Summary:')
    console.log('   Since this is a CLEAN BREAK migration with no backward compatibility,')
    console.log('   the old barcode fields were removed during schema migration.')
    console.log('')
    console.log('   New barcodes should be populated via:')
    console.log('   1. Updated seed scripts (seed-grocery-demo.js, etc.)')
    console.log('   2. Manual data entry through UI')
    console.log('   3. CSV import tools')
    console.log('   4. API endpoints\n')

    // Example migration code (would work if old fields still existed):
    /*
    // Get all variants with barcodes
    const variants = await prisma.productVariants.findMany({
      where: {
        barcode: { not: null }
      },
      include: {
        business_products: {
          select: {
            businessId: true,
            name: true
          }
        }
      }
    })

    console.log(`Found ${variants.length} variants with barcodes\n`)

    // Migrate variant barcodes
    for (const variant of variants) {
      const barcodeType = detectBarcodeType(variant.barcode)
      const isUniversal = isUniversalBarcodeType(barcodeType)

      await prisma.productBarcodes.create({
        data: {
          variantId: variant.id,
          code: variant.barcode,
          type: barcodeType,
          isPrimary: true,
          isUniversal: isUniversal,
          isActive: true,
          label: isUniversal ? 'Migrated UPC/EAN' : 'Migrated Barcode',
          businessId: isUniversal ? null : variant.business_products.businessId
        }
      })

      variantBarcodes++
      totalMigrated++

      if (totalMigrated % 100 === 0) {
        console.log(`  Migrated ${totalMigrated} barcodes...`)
      }
    }

    // Get all business products with barcodes
    const products = await prisma.businessProducts.findMany({
      where: {
        barcode: { not: null }
      }
    })

    console.log(`Found ${products.length} products with barcodes\n`)

    // Migrate product barcodes
    for (const product of products) {
      const barcodeType = detectBarcodeType(product.barcode)
      const isUniversal = isUniversalBarcodeType(barcodeType)

      await prisma.productBarcodes.create({
        data: {
          productId: product.id,
          code: product.barcode,
          type: barcodeType,
          isPrimary: true,
          isUniversal: isUniversal,
          isActive: true,
          label: isUniversal ? 'Migrated UPC/EAN' : 'Migrated Barcode',
          businessId: isUniversal ? null : product.businessId
        }
      })

      productBarcodes++
      totalMigrated++

      if (totalMigrated % 100 === 0) {
        console.log(`  Migrated ${totalMigrated} barcodes...`)
      }
    }
    */

    console.log('✅ Migration reference script completed\n')
    console.log('📊 Summary:')
    console.log(`   Total that would be migrated: ${totalMigrated}`)
    console.log(`   - Variant barcodes: ${variantBarcodes}`)
    console.log(`   - Product barcodes: ${productBarcodes}`)
    console.log(`   - Skipped (null): ${skipped}\n`)

  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateBarcodes()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
