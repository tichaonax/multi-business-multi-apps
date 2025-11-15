const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Regenerate all barcodes with correct formats
 */
async function regenerateBarcodes() {
  try {
    console.log('🔄 Regenerating all barcodes with correct formats...')

    // Get all products with their business types
    const products = await prisma.businessProducts.findMany({
      where: { isActive: true },
      include: {
        businesses: true,
        product_variants: {
          where: { isActive: true }
        }
      }
    })

    console.log(`Found ${products.length} products to process`)

    let updatedCount = 0

    for (const product of products) {
      const businessType = product.businesses?.type || product.businessType

      // Generate new barcode based on business type
      let barcodeData
      if (businessType === 'grocery') {
        barcodeData = generateGroceryBarcode(product.name, product.sku)
      } else if (businessType === 'hardware') {
        barcodeData = generateHardwareBarcode(product.name, product.sku)
      } else if (businessType === 'restaurant') {
        barcodeData = generateRestaurantBarcode(product.name, product.sku)
      } else if (businessType === 'clothing') {
        barcodeData = generateClothingBarcode(product.name, product.sku)
      } else {
        console.log(`⚠️  Unknown business type: ${businessType} for product ${product.name}`)
        continue
      }

      // Update product barcode
      const productBarcodeId = `${product.id}-default-${barcodeData.type}`
      await prisma.productBarcodes.upsert({
        where: { id: productBarcodeId },
        update: {
          code: barcodeData.code,
          type: barcodeData.type,
          isUniversal: barcodeData.isUniversal,
          isPrimary: barcodeData.isPrimary,
          label: barcodeData.label,
          updatedAt: new Date()
        },
        create: {
          id: productBarcodeId,
          productId: product.id,
          variantId: null,
          code: barcodeData.code,
          type: barcodeData.type,
          isUniversal: barcodeData.isUniversal,
          isPrimary: barcodeData.isPrimary,
          label: barcodeData.label,
          businessId: product.businessId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Update variant barcodes
      for (const variant of product.product_variants) {
        const variantBarcodeId = `${product.id}-${variant.id}-${barcodeData.type}`
        await prisma.productBarcodes.upsert({
          where: { id: variantBarcodeId },
          update: {
            code: barcodeData.code,
            type: barcodeData.type,
            isUniversal: barcodeData.isUniversal,
            isPrimary: false,
            label: barcodeData.label,
            updatedAt: new Date()
          },
          create: {
            id: variantBarcodeId,
            productId: product.id,
            variantId: variant.id,
            code: barcodeData.code,
            type: barcodeData.type,
            isUniversal: barcodeData.isUniversal,
            isPrimary: false,
            label: barcodeData.label,
            businessId: product.businessId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      updatedCount++
      if (updatedCount % 10 === 0) {
        console.log(`✅ Updated ${updatedCount} products...`)
      }
    }

    console.log(`✅ Successfully regenerated barcodes for ${updatedCount} products`)

  } catch (err) {
    console.error('❌ Failed to regenerate barcodes:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Generate realistic barcodes for grocery products
 */
function generateGroceryBarcode(productName, sku) {
  const categoryPrefixes = {
    'Fresh Produce': '4',
    'Dairy Products': '0',
    'Meat & Seafood': '2',
    'Bakery': '8',
    'Pantry & Canned Goods': '0',
    'Beverages': '0'
  }

  let category = 'Pantry & Canned Goods'
  for (const [cat, prefix] of Object.entries(categoryPrefixes)) {
    if (productName.toLowerCase().includes(cat.toLowerCase().split(' ')[0])) {
      category = cat
      break
    }
  }

  const prefix = categoryPrefixes[category] || '0'
  const uniqueId = sku.split('-').pop().padStart(5, '0').slice(-5)
  const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  const baseCode = prefix + uniqueId + randomPart

  function calculateUPCCheckDigit(code) {
    let sum = 0
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(code[i])
      sum += digit * (i % 2 === 0 ? 1 : 3)
    }
    const remainder = sum % 10
    return remainder === 0 ? 0 : 10 - remainder
  }

  const checkDigit = calculateUPCCheckDigit(baseCode)
  const upcCode = baseCode + checkDigit

  return {
    code: upcCode,
    type: 'UPC_A',
    isUniversal: true,
    isPrimary: true,
    label: 'Retail UPC'
  }
}

/**
 * Generate realistic barcodes for hardware products
 */
function generateHardwareBarcode(productName, sku) {
  const type = ['UPC_A', 'EAN_13', 'CODE128'][Math.floor(Math.random() * 3)]

  let code, isUniversal

  if (type === 'UPC_A') {
    const prefix = '6'
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-5).padStart(5, '0')
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    const baseCode = prefix + uniqueId + randomPart

    function calculateUPCCheckDigit(code) {
      let sum = 0
      for (let i = 0; i < 11; i++) {
        const digit = parseInt(code[i])
        sum += digit * (i % 2 === 0 ? 1 : 3)
      }
      const remainder = sum % 10
      return remainder === 0 ? 0 : 10 - remainder
    }

    const checkDigit = calculateUPCCheckDigit(baseCode)
    code = baseCode + checkDigit
    isUniversal = true
  } else if (type === 'EAN_13') {
    const prefix = '590'
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-9).padStart(9, '0')
    const baseCode = prefix + uniqueId

    function calculateEAN13CheckDigit(code) {
      let sum = 0
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i])
        sum += digit * (i % 2 === 0 ? 1 : 3)
      }
      const remainder = sum % 10
      return remainder === 0 ? 0 : 10 - remainder
    }

    const checkDigit = calculateEAN13CheckDigit(baseCode)
    code = baseCode + checkDigit
    isUniversal = true
  } else if (type === 'CODE128') {
    code = 'HW' + sku.replace(/[^A-Z0-9]/g, '').slice(-8).padStart(8, '0')
    isUniversal = false
  }

  return {
    code: code,
    type: type,
    isUniversal: isUniversal,
    isPrimary: true,
    label: type === 'CODE128' ? 'Internal Code' : 'Retail Barcode'
  }
}

/**
 * Generate realistic barcodes for restaurant products
 */
function generateRestaurantBarcode(productName, sku) {
  const type = ['UPC_A', 'EAN_13', 'CODE128'][Math.floor(Math.random() * 3)]

  let code, isUniversal

  if (type === 'UPC_A') {
    const prefix = '0'
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-5).padStart(5, '0')
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    const baseCode = prefix + uniqueId + randomPart

    function calculateUPCCheckDigit(code) {
      let sum = 0
      for (let i = 0; i < 11; i++) {
        const digit = parseInt(code[i])
        sum += digit * (i % 2 === 0 ? 1 : 3)
      }
      const remainder = sum % 10
      return remainder === 0 ? 0 : 10 - remainder
    }

    const checkDigit = calculateUPCCheckDigit(baseCode)
    code = baseCode + checkDigit
    isUniversal = true
  } else if (type === 'EAN_13') {
    const prefix = '590'
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-9).padStart(9, '0')
    const baseCode = prefix + uniqueId

    function calculateEAN13CheckDigit(code) {
      let sum = 0
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i])
        sum += digit * (i % 2 === 0 ? 1 : 3)
      }
      const remainder = sum % 10
      return remainder === 0 ? 0 : 10 - remainder
    }

    const checkDigit = calculateEAN13CheckDigit(baseCode)
    code = baseCode + checkDigit
    isUniversal = true
  } else if (type === 'CODE128') {
    code = 'RST' + sku.replace(/[^A-Z0-9]/g, '').slice(-8).padStart(8, '0')
    isUniversal = false
  }

  return {
    code: code,
    type: type,
    isUniversal: isUniversal,
    isPrimary: true,
    label: type === 'CODE128' ? 'Internal Code' : 'Retail Barcode'
  }
}

/**
 * Generate realistic barcodes for clothing products
 */
function generateClothingBarcode(productName, sku) {
  const type = ['UPC_A', 'EAN_13', 'CODE128'][Math.floor(Math.random() * 3)]

  let code, isUniversal

  if (type === 'UPC_A') {
    const prefix = '8'
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-5).padStart(5, '0')
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    const baseCode = prefix + uniqueId + randomPart

    function calculateUPCCheckDigit(code) {
      let sum = 0
      for (let i = 0; i < 11; i++) {
        const digit = parseInt(code[i])
        sum += digit * (i % 2 === 0 ? 1 : 3)
      }
      const remainder = sum % 10
      return remainder === 0 ? 0 : 10 - remainder
    }

    const checkDigit = calculateUPCCheckDigit(baseCode)
    code = baseCode + checkDigit
    isUniversal = true
  } else if (type === 'EAN_13') {
    const prefix = '890'
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-9).padStart(9, '0')
    const baseCode = prefix + uniqueId

    function calculateEAN13CheckDigit(code) {
      let sum = 0
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i])
        sum += digit * (i % 2 === 0 ? 1 : 3)
      }
      const remainder = sum % 10
      return remainder === 0 ? 0 : 10 - remainder
    }

    const checkDigit = calculateEAN13CheckDigit(baseCode)
    code = baseCode + checkDigit
    isUniversal = true
  } else if (type === 'CODE128') {
    code = 'CLO' + sku.replace(/[^A-Z0-9]/g, '').slice(-8).padStart(8, '0')
    isUniversal = false
  }

  return {
    code: code,
    type: type,
    isUniversal: isUniversal,
    isPrimary: true,
    label: type === 'CODE128' ? 'Internal Code' : 'Retail Barcode'
  }
}

if (require.main === module) regenerateBarcodes()