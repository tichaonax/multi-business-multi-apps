/**
 * Phase 5.3: Validate Barcode Data
 *
 * This script validates all barcode data in the ProductBarcodes table:
 * 1. Check all barcodes have valid format for their type
 * 2. Verify uniqueness constraints
 * 3. Check for orphaned records
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Validate barcode format based on type
 * @param {string} code - Barcode code
 * @param {string} type - Barcode type
 * @returns {boolean} - True if format is valid
 */
function validateBarcodeFormat(code, type) {
  if (!code) return false

  switch (type) {
    case 'UPC_A':
      return /^\d{12}$/.test(code)
    case 'UPC_E':
      return /^\d{6}$/.test(code)
    case 'EAN_13':
      return /^\d{13}$/.test(code)
    case 'EAN_8':
      return /^\d{8}$/.test(code)
    case 'ITF':
      return /^\d{14}$/.test(code)
    case 'CODE128':
      return /^[A-Z0-9\-_]+$/.test(code) && code.length > 6
    case 'CODE39':
      return /^[A-Z0-9\-\.\$\/\+%\s]+$/.test(code)
    case 'QR_CODE':
    case 'DATA_MATRIX':
    case 'PDF417':
      // These can contain various characters, just check they're not empty
      return code.length > 0
    case 'CUSTOM':
    case 'SKU_BARCODE':
      // Custom formats - just check they're not empty
      return code.length > 0
    default:
      return false
  }
}

/**
 * Check if barcode violates uniqueness constraints
 * @param {Object} barcode - Barcode record
 * @returns {Object} - Validation result
 */
async function checkUniquenessConstraints(barcode) {
  const issues = []

  try {
    // Check for duplicate barcodes on same variant
    if (barcode.variantId) {
      const duplicates = await prisma.productBarcodes.findMany({
        where: {
          variantId: barcode.variantId,
          code: barcode.code,
          type: barcode.type,
          id: { not: barcode.id }
        }
      })

      if (duplicates.length > 0) {
        issues.push({
          type: 'DUPLICATE_VARIANT_BARCODE',
          message: `Duplicate barcode ${barcode.code} (${barcode.type}) on same variant`,
          severity: 'ERROR'
        })
      }
    }

    // Check for universal barcodes used in business-specific context incorrectly
    if (barcode.isUniversal && barcode.businessId) {
      issues.push({
        type: 'UNIVERSAL_WITH_BUSINESS',
        message: `Universal barcode ${barcode.code} should not have businessId set`,
        severity: 'WARNING'
      })
    }

    // Check for business-specific barcodes marked as universal
    if (!barcode.isUniversal && !barcode.businessId && (barcode.type === 'UPC_A' || barcode.type === 'EAN_13' || barcode.type === 'EAN_8')) {
      issues.push({
        type: 'BUSINESS_SPECIFIC_MARKED_UNIVERSAL',
        message: `Business-specific ${barcode.type} barcode ${barcode.code} should be marked as universal`,
        severity: 'WARNING'
      })
    }

  } catch (error) {
    issues.push({
      type: 'VALIDATION_ERROR',
      message: `Error checking uniqueness: ${error.message}`,
      severity: 'ERROR'
    })
  }

  return issues
}

/**
 * Check for orphaned barcode records
 * @param {Object} barcode - Barcode record
 * @returns {Object} - Validation result
 */
async function checkOrphanedRecords(barcode) {
  const issues = []

  try {
    // Check if product exists
    if (barcode.productId) {
      const product = await prisma.businessProducts.findUnique({
        where: { id: barcode.productId }
      })
      if (!product) {
        issues.push({
          type: 'ORPHANED_PRODUCT_BARCODE',
          message: `Barcode references non-existent product ${barcode.productId}`,
          severity: 'ERROR'
        })
      }
    }

    // Check if variant exists
    if (barcode.variantId) {
      const variant = await prisma.productVariants.findUnique({
        where: { id: barcode.variantId }
      })
      if (!variant) {
        issues.push({
          type: 'ORPHANED_VARIANT_BARCODE',
          message: `Barcode references non-existent variant ${barcode.variantId}`,
          severity: 'ERROR'
        })
      }
    }

    // Check if business exists
    if (barcode.businessId) {
      const business = await prisma.businesses.findUnique({
        where: { id: barcode.businessId }
      })
      if (!business) {
        issues.push({
          type: 'ORPHANED_BUSINESS_BARCODE',
          message: `Barcode references non-existent business ${barcode.businessId}`,
          severity: 'ERROR'
        })
      }
    }

    // Check for barcodes that reference both product and variant
    if (barcode.productId && barcode.variantId) {
      issues.push({
        type: 'DUAL_REFERENCE',
        message: `Barcode references both product and variant - should reference only one`,
        severity: 'WARNING'
      })
    }

    // Check for barcodes that reference neither product nor variant
    if (!barcode.productId && !barcode.variantId) {
      issues.push({
        type: 'NO_REFERENCE',
        message: `Barcode references neither product nor variant`,
        severity: 'ERROR'
      })
    }

  } catch (error) {
    issues.push({
      type: 'VALIDATION_ERROR',
      message: `Error checking orphaned records: ${error.message}`,
      severity: 'ERROR'
    })
  }

  return issues
}

/**
 * Main validation function
 */
async function validateBarcodeData() {
  console.log('🔍 Validating barcode data...\n')

  let totalBarcodes = 0
  let formatErrors = 0
  let uniquenessErrors = 0
  let orphanedErrors = 0
  const validationReport = {
    formatIssues: [],
    uniquenessIssues: [],
    orphanedIssues: []
  }

  try {
    // Get all barcodes
    const barcodes = await prisma.productBarcodes.findMany({
      include: {
        business_product: {
          select: { id: true, name: true }
        },
        product_variant: {
          include: {
            business_products: {
              select: { id: true, name: true }
            }
          }
        },
        business: {
          select: { id: true, name: true }
        }
      }
    })

    totalBarcodes = barcodes.length
    console.log(`Found ${totalBarcodes} barcodes to validate\n`)

    if (totalBarcodes === 0) {
      console.log('ℹ️  No barcodes found to validate. Run seed scripts first to populate demo data.\n')
      return
    }

    // Validate each barcode
    for (const barcode of barcodes) {
      const { id, code, type, productId, variantId } = barcode
      let hasIssues = false

      // 1. Format validation
      const isValidFormat = validateBarcodeFormat(code, type)
      if (!isValidFormat) {
        formatErrors++
        hasIssues = true
        validationReport.formatIssues.push({
          id,
          code,
          type,
          product: barcode.business_product?.name || barcode.product_variant?.business_products?.name || 'Unknown',
          issue: `Invalid format for type ${type}`
        })
      }

      // 2. Uniqueness constraints
      const uniquenessIssues = await checkUniquenessConstraints(barcode)
      if (uniquenessIssues.length > 0) {
        uniquenessErrors += uniquenessIssues.length
        hasIssues = true
        validationReport.uniquenessIssues.push(...uniquenessIssues.map(issue => ({
          ...issue,
          barcodeId: id,
          code,
          type,
          product: barcode.business_product?.name || barcode.product_variant?.business_products?.name || 'Unknown'
        })))
      }

      // 3. Orphaned records
      const orphanedIssues = await checkOrphanedRecords(barcode)
      if (orphanedIssues.length > 0) {
        orphanedErrors += orphanedIssues.length
        hasIssues = true
        validationReport.orphanedIssues.push(...orphanedIssues.map(issue => ({
          ...issue,
          barcodeId: id,
          code,
          type,
          product: barcode.business_product?.name || barcode.product_variant?.business_products?.name || 'Unknown'
        })))
      }

      if (hasIssues) {
        console.log(`⚠️  Issues found for barcode ${code} (${type})`)
      }

      if (totalBarcodes > 100 && (totalBarcodes % 50) === 0) {
        console.log(`  Validated ${totalBarcodes} barcodes...`)
      }
    }

    console.log('\n✅ Validation completed!\n')

    console.log('📊 Summary:')
    console.log(`   Total barcodes validated: ${totalBarcodes}`)
    console.log(`   Format validation errors: ${formatErrors}`)
    console.log(`   Uniqueness constraint violations: ${uniquenessErrors}`)
    console.log(`   Orphaned record issues: ${orphanedErrors}`)
    console.log(`   Overall health: ${formatErrors + uniquenessErrors + orphanedErrors === 0 ? '✅ GOOD' : '⚠️  ISSUES FOUND'}\n`)

    // Report format issues
    if (validationReport.formatIssues.length > 0) {
      console.log('🔧 Format Validation Issues:')
      validationReport.formatIssues.slice(0, 10).forEach(issue => {
        console.log(`   ${issue.code} (${issue.type}): ${issue.issue} - ${issue.product}`)
      })
      if (validationReport.formatIssues.length > 10) {
        console.log(`   ... and ${validationReport.formatIssues.length - 10} more`)
      }
      console.log('')
    }

    // Report uniqueness issues
    if (validationReport.uniquenessIssues.length > 0) {
      console.log('🔒 Uniqueness Constraint Violations:')
      validationReport.uniquenessIssues.slice(0, 10).forEach(issue => {
        console.log(`   ${issue.code} (${issue.type}): ${issue.message} - ${issue.product}`)
      })
      if (validationReport.uniquenessIssues.length > 10) {
        console.log(`   ... and ${validationReport.uniquenessIssues.length - 10} more`)
      }
      console.log('')
    }

    // Report orphaned issues
    if (validationReport.orphanedIssues.length > 0) {
      console.log('🗂️  Orphaned Record Issues:')
      validationReport.orphanedIssues.slice(0, 10).forEach(issue => {
        console.log(`   ${issue.code} (${issue.type}): ${issue.message} - ${issue.product}`)
      })
      if (validationReport.orphanedIssues.length > 10) {
        console.log(`   ... and ${validationReport.orphanedIssues.length - 10} more`)
      }
      console.log('')
    }

    // Recommendations
    if (formatErrors + uniquenessErrors + orphanedErrors > 0) {
      console.log('💡 Recommendations:')
      if (formatErrors > 0) {
        console.log('   • Fix barcode formats to match their declared types')
        console.log('   • Regenerate barcodes with correct formats if needed')
      }
      if (uniquenessErrors > 0) {
        console.log('   • Remove duplicate barcodes from same variants')
        console.log('   • Review universal vs business-specific barcode assignments')
      }
      if (orphanedErrors > 0) {
        console.log('   • Remove barcodes referencing deleted products/variants')
        console.log('   • Ensure all barcodes have valid product or variant references')
      }
      console.log('')
    }

  } catch (error) {
    console.error('❌ Error during validation:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the validation
validateBarcodeData()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })