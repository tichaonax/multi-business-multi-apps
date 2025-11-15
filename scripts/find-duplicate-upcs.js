/**
 * Phase 5.2: Find Duplicate UPCs Across Businesses
 *
 * This script identifies products with the same UPC codes in different businesses,
 * which is expected for universal barcodes but may indicate data quality issues.
 * Generates a report for review.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Main function to find duplicate UPCs
 */
async function findDuplicateUPCs() {
  console.log('🔍 Finding duplicate UPCs across businesses...\n')

  let totalUniversalBarcodes = 0
  let uniqueCodes = 0
  let duplicatesFound = 0
  const duplicateReport = []

  try {
    // Get all universal barcodes (UPC/EAN codes)
    const universalBarcodes = await prisma.productBarcodes.findMany({
      where: {
        isUniversal: true
      },
      include: {
        business_product: {
          select: {
            id: true,
            name: true,
            businessId: true
          }
        },
        product_variant: {
          include: {
            business_products: {
              select: {
                id: true,
                name: true,
                businessId: true
              }
            }
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    totalUniversalBarcodes = universalBarcodes.length
    console.log(`Found ${totalUniversalBarcodes} universal barcodes\n`)

    if (totalUniversalBarcodes === 0) {
      console.log('ℹ️  No universal barcodes found. Run seed scripts first to populate demo data.\n')
      return
    }

    // Group barcodes by code
    const codeGroups = {}
    for (const barcode of universalBarcodes) {
      const code = barcode.code
      if (!codeGroups[code]) {
        codeGroups[code] = []
      }
      codeGroups[code].push(barcode)
    }

    uniqueCodes = Object.keys(codeGroups).length
    console.log(`Found ${uniqueCodes} unique UPC/EAN codes\n`)

    // Find duplicates (codes used in multiple businesses)
    for (const [code, barcodes] of Object.entries(codeGroups)) {
      const businesses = new Set()
      const products = []

      for (const barcode of barcodes) {
        // Get business ID from various sources
        let businessId = null
        let businessName = 'Unknown Business'
        let productName = 'Unknown Product'

        if (barcode.business_product) {
          businessId = barcode.business_product.businessId
          productName = barcode.business_product.name
        } else if (barcode.product_variant?.business_products) {
          businessId = barcode.product_variant.business_products.businessId
          productName = barcode.product_variant.business_products.name
        }

        if (barcode.business) {
          businessName = barcode.business.name
        }

        businesses.add(businessId || 'unknown')
        products.push({
          businessId: businessId || 'unknown',
          businessName,
          productName,
          barcodeId: barcode.id,
          type: barcode.type,
          isPrimary: barcode.isPrimary
        })
      }

      // If this code appears in multiple businesses, it's a potential duplicate
      if (businesses.size > 1) {
        duplicatesFound++
        duplicateReport.push({
          code,
          businessCount: businesses.size,
          productCount: barcodes.length,
          businesses: Array.from(businesses),
          products
        })
      }
    }

    console.log('✅ Analysis completed!\n')

    console.log('📊 Summary:')
    console.log(`   Total universal barcodes: ${totalUniversalBarcodes}`)
    console.log(`   Unique UPC/EAN codes: ${uniqueCodes}`)
    console.log(`   Codes used across multiple businesses: ${duplicatesFound}`)
    console.log(`   Cross-business usage rate: ${((duplicatesFound / uniqueCodes) * 100).toFixed(1)}%\n`)

    if (duplicateReport.length > 0) {
      console.log('🔍 Duplicate UPC/EAN Report:')
      console.log('=' .repeat(80))

      duplicateReport.forEach((duplicate, index) => {
        console.log(`${index + 1}. UPC/EAN: ${duplicate.code} (${duplicate.type || 'Unknown Type'})`)
        console.log(`   Used in ${duplicate.businessCount} businesses, ${duplicate.productCount} products:`)

        duplicate.products.forEach(product => {
          console.log(`   • ${product.businessName}: ${product.productName}`)
          console.log(`     Business ID: ${product.businessId}, Primary: ${product.isPrimary}`)
        })
        console.log('')
      })

      console.log('💡 Analysis Notes:')
      console.log('   • Universal barcodes (UPC/EAN) are expected to appear across businesses')
      console.log('   • This is normal for manufacturer UPC codes on identical products')
      console.log('   • Review cases where the same business has multiple products with the same UPC')
      console.log('   • Check for data entry errors or incorrect universal flag assignments\n')

    } else {
      console.log('✅ No duplicate UPCs found across businesses.')
      console.log('   This is expected if demo data has not been seeded yet.\n')
    }

    // Additional analysis: Check for same business having multiple products with same UPC
    console.log('🔍 Additional Analysis: Same Business, Multiple Products')
    const sameBusinessDuplicates = []

    for (const [code, barcodes] of Object.entries(codeGroups)) {
      const businessGroups = {}

      for (const barcode of barcodes) {
        let businessId = null
        if (barcode.business_product) {
          businessId = barcode.business_product.businessId
        } else if (barcode.product_variant?.business_products) {
          businessId = barcode.product_variant.business_products.businessId
        }

        if (businessId) {
          if (!businessGroups[businessId]) {
            businessGroups[businessId] = []
          }
          businessGroups[businessId].push(barcode)
        }
      }

      // Check each business for multiple products with same UPC
      for (const [businessId, businessBarcodes] of Object.entries(businessGroups)) {
        if (businessBarcodes.length > 1) {
          sameBusinessDuplicates.push({
            code,
            businessId,
            productCount: businessBarcodes.length,
            products: businessBarcodes.map(b => ({
              id: b.id,
              productName: b.business_product?.name || b.product_variant?.business_products?.name || 'Unknown',
              isPrimary: b.isPrimary
            }))
          })
        }
      }
    }

    if (sameBusinessDuplicates.length > 0) {
      console.log(`⚠️  Found ${sameBusinessDuplicates.length} cases where the same business has multiple products with identical UPCs:`)

      sameBusinessDuplicates.forEach((dup, index) => {
        console.log(`${index + 1}. Business ${dup.businessId} - UPC ${dup.code}:`)
        dup.products.forEach(product => {
          console.log(`   • ${product.productName} (Primary: ${product.isPrimary})`)
        })
        console.log('')
      })

      console.log('💡 Recommendation: Review these cases. Each product should typically have a unique UPC,')
      console.log('   or only one should be marked as primary if they represent the same item.\n')
    } else {
      console.log('✅ No cases found where the same business has multiple products with identical UPCs.\n')
    }

  } catch (error) {
    console.error('❌ Error during duplicate analysis:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the analysis
findDuplicateUPCs()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })