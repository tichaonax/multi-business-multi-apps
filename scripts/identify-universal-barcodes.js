/**
 * Phase 5.1: Identify UPC/EAN Barcodes
 *
 * This script scans all existing barcodes in the ProductBarcodes table,
 * detects UPC-A (12 digits), UPC-E (6), EAN-13 (13), EAN-8 (8) formats,
 * updates type and isUniversal flags, and validates check digits.
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
 * Validate UPC-A check digit
 * @param {string} barcode - 12-digit UPC-A barcode
 * @returns {boolean} - True if check digit is valid
 */
function isValidUpcCheckDigit(barcode) {
  if (!/^\d{12}$/.test(barcode)) return false

  const digits = barcode.split('').map(Number)
  let sum = 0

  // Sum odd positions (1-based: 1,3,5,7,9,11) multiplied by 3
  for (let i = 0; i < 11; i += 2) {
    sum += digits[i] * 3
  }

  // Sum even positions (1-based: 2,4,6,8,10)
  for (let i = 1; i < 11; i += 2) {
    sum += digits[i]
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === digits[11]
}

/**
 * Validate EAN-13 check digit
 * @param {string} barcode - 13-digit EAN-13 barcode
 * @returns {boolean} - True if check digit is valid
 */
function isValidEan13CheckDigit(barcode) {
  if (!/^\d{13}$/.test(barcode)) return false

  const digits = barcode.split('').map(Number)
  let sum = 0

  // Sum odd positions (1-based: 1,3,5,7,9,11,13) multiplied by 1
  // Sum even positions (1-based: 2,4,6,8,10,12) multiplied by 3
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === digits[12]
}

/**
 * Validate EAN-8 check digit
 * @param {string} barcode - 8-digit EAN-8 barcode
 * @returns {boolean} - True if check digit is valid
 */
function isValidEan8CheckDigit(barcode) {
  if (!/^\d{8}$/.test(barcode)) return false

  const digits = barcode.split('').map(Number)
  let sum = 0

  // Sum odd positions (1-based: 1,3,5,7) multiplied by 3
  // Sum even positions (1-based: 2,4,6) multiplied by 1
  for (let i = 0; i < 7; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1)
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === digits[7]
}

/**
 * Validate UPC-E check digit (converted from UPC-E to UPC-A format)
 * @param {string} barcode - 6-digit UPC-E barcode
 * @returns {boolean} - True if check digit is valid
 */
function isValidUpcECheckDigit(barcode) {
  if (!/^\d{6}$/.test(barcode)) return false

  // Convert UPC-E to UPC-A for validation
  const upcA = convertUpcEToUpcA(barcode)
  return isValidUpcCheckDigit(upcA)
}

/**
 * Convert UPC-E to UPC-A format
 * @param {string} upcE - 6-digit UPC-E barcode
 * @returns {string} - 12-digit UPC-A barcode
 */
function convertUpcEToUpcA(upcE) {
  // UPC-E to UPC-A conversion logic
  const digits = upcE.split('').map(Number)
  const manufacturer = digits[0]
  const product = digits.slice(1, 6)

  let upcA = ''

  if (manufacturer === 0) {
    // 0XXXXX -> 0XX00000XXX
    upcA = `0${product[0]}${product[1]}00000${product[2]}${product[3]}${product[4]}`
  } else if (manufacturer === 1) {
    // 1XXXXX -> 0XX10000XXX
    upcA = `0${product[0]}${product[1]}10000${product[2]}${product[3]}${product[4]}`
  } else if (manufacturer === 2) {
    // 2XXXXX -> 0XX20000XXX
    upcA = `0${product[0]}${product[1]}20000${product[2]}${product[3]}${product[4]}`
  } else if (manufacturer === 3) {
    // 3XXXXX -> 0XXX00000XX
    upcA = `0${product[0]}${product[1]}${product[2]}00000${product[3]}${product[4]}`
  } else if (manufacturer === 4) {
    // 4XXXXX -> 0XXXX00000X
    upcA = `0${product[0]}${product[1]}${product[2]}${product[3]}00000${product[4]}`
  } else {
    // 5-9XXXXX -> 0XXXXX0000X
    upcA = `0${product[0]}${product[1]}${product[2]}${product[3]}${product[4]}0000${manufacturer}`
  }

  return upcA
}

/**
 * Validate barcode check digit based on type
 * @param {string} code - Barcode code
 * @param {string} type - Barcode type
 * @returns {boolean} - True if check digit is valid or not applicable
 */
function validateCheckDigit(code, type) {
  switch (type) {
    case 'UPC_A':
      return isValidUpcCheckDigit(code)
    case 'UPC_E':
      return isValidUpcECheckDigit(code)
    case 'EAN_13':
      return isValidEan13CheckDigit(code)
    case 'EAN_8':
      return isValidEan8CheckDigit(code)
    default:
      // For other types, we don't validate check digits
      return true
  }
}

/**
 * Main identification function
 */
async function identifyUniversalBarcodes() {
  console.log('🔍 Starting UPC/EAN barcode identification...\n')

  let totalProcessed = 0
  let updated = 0
  let invalidCheckDigits = []
  let typeUpdates = []
  let universalUpdates = []

  try {
    // Get all barcodes from ProductBarcodes table
    const barcodes = await prisma.productBarcodes.findMany({
      include: {
        business_product: {
          select: { name: true }
        },
        product_variant: {
          select: { name: true, sku: true }
        }
      }
    })

    console.log(`Found ${barcodes.length} barcodes to analyze\n`)

    for (const barcode of barcodes) {
      const { id, code, type: currentType, isUniversal: currentIsUniversal } = barcode
      totalProcessed++

      // Detect the actual type based on the code
      const detectedType = detectBarcodeType(code)
      const shouldBeUniversal = isUniversalBarcodeType(detectedType)

      // Check if type needs updating
      let needsUpdate = false
      const updates = {}

      if (detectedType !== currentType) {
        updates.type = detectedType
        needsUpdate = true
        typeUpdates.push({
          id,
          code,
          oldType: currentType,
          newType: detectedType,
          product: barcode.business_product?.name || barcode.product_variant?.name || 'Unknown'
        })
      }

      if (shouldBeUniversal !== currentIsUniversal) {
        updates.isUniversal = shouldBeUniversal
        needsUpdate = true
        universalUpdates.push({
          id,
          code,
          oldUniversal: currentIsUniversal,
          newUniversal: shouldBeUniversal,
          product: barcode.business_product?.name || barcode.product_variant?.name || 'Unknown'
        })
      }

      // Validate check digit for universal barcodes
      if (shouldBeUniversal) {
        const isValidCheckDigit = validateCheckDigit(code, detectedType)
        if (!isValidCheckDigit) {
          invalidCheckDigits.push({
            id,
            code,
            type: detectedType,
            product: barcode.business_product?.name || barcode.product_variant?.name || 'Unknown'
          })
        }
      }

      // Update the barcode if needed
      if (needsUpdate) {
        await prisma.productBarcodes.update({
          where: { id },
          data: updates
        })
        updated++
      }

      if (totalProcessed % 100 === 0) {
        console.log(`  Processed ${totalProcessed} barcodes...`)
      }
    }

    console.log('\n✅ Identification completed!\n')

    console.log('📊 Summary:')
    console.log(`   Total barcodes processed: ${totalProcessed}`)
    console.log(`   Barcodes updated: ${updated}`)
    console.log(`   Type corrections: ${typeUpdates.length}`)
    console.log(`   Universal flag updates: ${universalUpdates.length}`)
    console.log(`   Invalid check digits found: ${invalidCheckDigits.length}\n`)

    if (typeUpdates.length > 0) {
      console.log('🔧 Type Updates:')
      typeUpdates.slice(0, 10).forEach(update => {
        console.log(`   ${update.code}: ${update.oldType} → ${update.newType} (${update.product})`)
      })
      if (typeUpdates.length > 10) {
        console.log(`   ... and ${typeUpdates.length - 10} more`)
      }
      console.log('')
    }

    if (universalUpdates.length > 0) {
      console.log('🌍 Universal Flag Updates:')
      universalUpdates.slice(0, 10).forEach(update => {
        console.log(`   ${update.code}: ${update.oldUniversal} → ${update.newUniversal} (${update.product})`)
      })
      if (universalUpdates.length > 10) {
        console.log(`   ... and ${universalUpdates.length - 10} more`)
      }
      console.log('')
    }

    if (invalidCheckDigits.length > 0) {
      console.log('⚠️  Invalid Check Digits Found:')
      invalidCheckDigits.slice(0, 10).forEach(invalid => {
        console.log(`   ${invalid.code} (${invalid.type}): ${invalid.product}`)
      })
      if (invalidCheckDigits.length > 10) {
        console.log(`   ... and ${invalidCheckDigits.length - 10} more`)
      }
      console.log('')
      console.log('   Note: These barcodes have invalid check digits and may not scan correctly.')
      console.log('   Consider regenerating them with valid check digits.\n')
    }

  } catch (error) {
    console.error('❌ Error during identification:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the identification
identifyUniversalBarcodes()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })