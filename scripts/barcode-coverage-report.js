/**
 * Phase 5.4: Generate Barcode Coverage Report
 *
 * This script generates comprehensive coverage reports for barcode data:
 * 1. Count products with/without barcodes
 * 2. Analyze barcode coverage by type
 * 3. Generate summary statistics
 * 4. Show coverage by business
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Generate comprehensive barcode coverage report
 */
async function generateCoverageReport() {
  console.log('📊 Generating barcode coverage report...\n')

  try {
    // Get total product counts
    const totalProducts = await prisma.businessProducts.count()
    const totalVariants = await prisma.productVariants.count()
    const totalBarcodes = await prisma.productBarcodes.count()

    console.log('📈 Overall Statistics:')
    console.log(`   Total products: ${totalProducts}`)
    console.log(`   Total variants: ${totalVariants}`)
    console.log(`   Total barcodes: ${totalBarcodes}`)
    console.log(`   Average barcodes per product: ${totalProducts > 0 ? (totalBarcodes / totalProducts).toFixed(2) : '0'}`)
    console.log('')

    if (totalProducts === 0) {
      console.log('ℹ️  No products found. Run seed scripts first to populate demo data.\n')
      return
    }

    // Get products with barcodes
    const productsWithBarcodes = await prisma.businessProducts.findMany({
      where: {
        product_barcodes: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        businessId: true,
        _count: {
          select: { product_barcodes: true }
        }
      }
    })

    // Get products without barcodes
    const productsWithoutBarcodes = await prisma.businessProducts.findMany({
      where: {
        product_barcodes: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        businessId: true
      }
    })

    // Get variants with barcodes
    const variantsWithBarcodes = await prisma.productVariants.findMany({
      where: {
        product_barcodes: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        productId: true,
        _count: {
          select: { product_barcodes: true }
        }
      }
    })

    // Get variants without barcodes
    const variantsWithoutBarcodes = await prisma.productVariants.findMany({
      where: {
        product_barcodes: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        productId: true
      }
    })

    console.log('📦 Product Coverage:')
    console.log(`   Products with barcodes: ${productsWithBarcodes.length} (${((productsWithBarcodes.length / totalProducts) * 100).toFixed(1)}%)`)
    console.log(`   Products without barcodes: ${productsWithoutBarcodes.length} (${((productsWithoutBarcodes.length / totalProducts) * 100).toFixed(1)}%)`)
    console.log('')

    console.log('🔄 Variant Coverage:')
    console.log(`   Variants with barcodes: ${variantsWithBarcodes.length} (${totalVariants > 0 ? ((variantsWithBarcodes.length / totalVariants) * 100).toFixed(1) : '0'}%)`)
    console.log(`   Variants without barcodes: ${variantsWithoutBarcodes.length} (${totalVariants > 0 ? ((variantsWithoutBarcodes.length / totalVariants) * 100).toFixed(1) : '0'}%)`)
    console.log('')

    // Barcode type distribution
    const barcodeTypeStats = await prisma.productBarcodes.groupBy({
      by: ['type'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    console.log('🏷️  Barcode Type Distribution:')
    if (barcodeTypeStats.length > 0) {
      barcodeTypeStats.forEach(stat => {
        const percentage = ((stat._count.id / totalBarcodes) * 100).toFixed(1)
        console.log(`   ${stat.type}: ${stat._count.id} (${percentage}%)`)
      })
    } else {
      console.log('   No barcodes found')
    }
    console.log('')

    // Universal vs business-specific barcodes
    const universalStats = await prisma.productBarcodes.groupBy({
      by: ['isUniversal'],
      _count: {
        id: true
      }
    })

    console.log('🌍 Universal vs Business-Specific Barcodes:')
    universalStats.forEach(stat => {
      const type = stat.isUniversal ? 'Universal' : 'Business-Specific'
      const percentage = ((stat._count.id / totalBarcodes) * 100).toFixed(1)
      console.log(`   ${type}: ${stat._count.id} (${percentage}%)`)
    })
    console.log('')

    // Coverage by business
    const businessStats = await prisma.businesses.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            business_products: true
          }
        }
      }
    })

    console.log('🏢 Coverage by Business:')
    for (const business of businessStats) {
      const businessBarcodes = await prisma.productBarcodes.count({
        where: {
          OR: [
            { businessId: business.id },
            { business_product: { businessId: business.id } },
            { product_variant: { business_products: { businessId: business.id } } }
          ]
        }
      })

      const coverage = business._count.business_products > 0 ? ((businessBarcodes / business._count.business_products) * 100).toFixed(1) : '0'
      console.log(`   ${business.name}: ${businessBarcodes}/${business._count.business_products} products (${coverage}%)`)
    }
    console.log('')

    // Top products by barcode count
    if (productsWithBarcodes.length > 0) {
      console.log('🥇 Top Products by Barcode Count:')
      const topProducts = productsWithBarcodes
        .sort((a, b) => b._count.barcodes - a._count.barcodes)
        .slice(0, 10)

      topProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name}: ${product._count.product_barcodes} barcodes`)
      })
      console.log('')
    }

    // Products without barcodes (sample)
    if (productsWithoutBarcodes.length > 0) {
      console.log('⚠️  Sample Products Without Barcodes:')
      const sampleSize = Math.min(10, productsWithoutBarcodes.length)
      for (let i = 0; i < sampleSize; i++) {
        const product = productsWithoutBarcodes[i]
        console.log(`   • ${product.name}`)
      }
      if (productsWithoutBarcodes.length > 10) {
        console.log(`   ... and ${productsWithoutBarcodes.length - 10} more`)
      }
      console.log('')
    }

    // Generate recommendations
    console.log('💡 Recommendations:')
    const coveragePercent = totalProducts > 0 ? ((productsWithBarcodes.length / totalProducts) * 100) : 0

    if (coveragePercent === 0) {
      console.log('   • No products have barcodes yet - run seed scripts to populate demo data')
    } else if (coveragePercent < 50) {
      console.log('   • Low barcode coverage - consider adding barcodes to more products')
      console.log('   • Focus on high-volume products first')
    } else if (coveragePercent < 80) {
      console.log('   • Moderate barcode coverage - good progress, continue adding barcodes')
    } else {
      console.log('   • Excellent barcode coverage!')
    }

    // Check for universal barcode usage
    const universalBarcodes = await prisma.productBarcodes.count({
      where: { isUniversal: true }
    })

    if (universalBarcodes === 0 && totalBarcodes > 0) {
      console.log('   • No universal barcodes found - consider identifying UPC/EAN codes as universal')
    }

    // Check for over-barcoded products
    const overBarcoded = productsWithBarcodes.filter(p => p._count.barcodes > 5)
    if (overBarcoded.length > 0) {
      console.log(`   • ${overBarcoded.length} products have more than 5 barcodes - review for consolidation`)
    }

    console.log('')

  } catch (error) {
    console.error('❌ Error generating coverage report:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the coverage report
generateCoverageReport()
  .then(() => {
    console.log('✅ Coverage report completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })