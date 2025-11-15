const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Generate realistic barcodes for hardware products
 * @param {string} productName - Product name
 * @param {string} sku - Product SKU
 * @returns {Object} - Barcode data
 */
function generateHardwareBarcode(productName, sku) {
  // Hardware products often use various barcode types
  const barcodeTypes = ['UPC_A', 'EAN_13', 'CODE128']
  const type = barcodeTypes[Math.floor(Math.random() * barcodeTypes.length)]

  let code, isUniversal

  if (type === 'UPC_A') {
    // Generate UPC-A (12 digits)
    const prefix = '6' // Hardware/tools often use 6xxxxxx
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-5).padStart(5, '0')
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    const baseCode = prefix + uniqueId + randomPart // 1 + 5 + 5 = 11 digits

    // Calculate UPC-A check digit
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
    // Generate EAN-13 (13 digits)
    const prefix = '590' // European hardware prefix
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-9).padStart(9, '0')
    const baseCode = prefix + uniqueId

    // Calculate EAN-13 check digit
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
    // Generate Code 128 (alphanumeric)
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
 * Create barcode entries in the new ProductBarcodes table
 * @param {string} productId - Product ID
 * @param {string} variantId - Variant ID (optional)
 * @param {Object} barcodeData - Barcode data
 * @param {string} businessId - Business ID (optional, null for universal)
 */
async function createProductBarcode(productId, variantId, barcodeData, businessId = null) {
  const barcodeId = `${productId}-${variantId || 'default'}-${barcodeData.type}`

  await prisma.productBarcodes.upsert({
    where: { id: barcodeId },
    update: {
      code: barcodeData.code,
      type: barcodeData.type,
      isUniversal: barcodeData.isUniversal,
      isPrimary: barcodeData.isPrimary,
      label: barcodeData.label,
      updatedAt: new Date()
    },
    create: {
      id: barcodeId,
      productId: productId,
      variantId: variantId,
      code: barcodeData.code,
      type: barcodeData.type,
      isUniversal: barcodeData.isUniversal,
      isPrimary: barcodeData.isPrimary,
      label: barcodeData.label,
      businessId: businessId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
}

/**
 * Create a product with stock and stock movement
 */
async function createProductWithStock(businessId, categoryId, supplierId, productData, initialStock = 0) {
  const now = new Date()
  
  // Create or update product
  const product = await prisma.businessProducts.upsert({
    where: { businessId_sku: { businessId, sku: productData.sku } },
    update: { 
      basePrice: productData.basePrice, 
      costPrice: productData.costPrice, 
      supplierId,
      updatedAt: now 
    },
    create: {
      businessId,
      businessType: 'hardware',
      name: productData.name,
      sku: productData.sku,
      basePrice: productData.basePrice,
      costPrice: productData.costPrice,
      categoryId,
      supplierId,
      description: productData.description,
      createdAt: now,
      updatedAt: now
    }
  })

  // Create variant with stock
  const timestamp = Date.now()
  const variantId = `${product.id}-variant-default-${timestamp}`
  const variantSku = `${productData.sku}-STD-${timestamp}`
  
  const variant = await prisma.productVariants.create({
    data: { 
      id: variantId,
      productId: product.id, 
      sku: variantSku, 
      price: productData.basePrice, 
      stockQuantity: initialStock, 
      createdAt: now, 
      updatedAt: now 
    }
  })

  // Create stock movement for initial stock
  if (initialStock > 0) {
    const movementId = `${variant.id}-stock-init`
    await prisma.businessStockMovements.createMany({
      data: [{
        id: movementId,
        businessId,
        productVariantId: variant.id,
        movementType: 'PURCHASE_RECEIVED',
        quantity: initialStock,
        unitCost: productData.costPrice,
        reference: 'Seed initial stock',
        reason: 'Initial demo stock',
        businessType: 'hardware',
        businessProductId: product.id,
        createdAt: now
      }],
      skipDuplicates: true
    })
  }

  // Create barcode entries in the new ProductBarcodes table
  const barcodeData = generateHardwareBarcode(productData.name, productData.sku)
  
  // Create barcode for the product
  await createProductBarcode(product.id, null, barcodeData)
  
  // Create barcode for the variant (same barcode for now)
  await createProductBarcode(product.id, variant.id, barcodeData)

  return { product, variant }
}

/**
 * Ensure type-based categories exist before seeding demo data
 */
async function ensureCategoriesExist() {
  const categoriesExist = await prisma.businessCategories.findFirst({
    where: { businessType: 'hardware', businessId: null }
  })

  if (!categoriesExist) {
    console.log('📂 Type-based categories not found. Auto-seeding categories...')
    try {
      const { seedTypeCategories } = require('./seed-type-categories.js')
      await seedTypeCategories()
      console.log('✅ Categories seeded successfully')
    } catch (err) {
      console.error('❌ Failed to seed categories:', err.message)
      throw new Error('Cannot proceed without categories. Please run: npm run seed:categories')
    }
  } else {
    console.log('✅ Type-based categories already exist')
  }
}

async function seed() {
  try {
    const businessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'hardware-demo-business'

    // STEP 1: Ensure categories exist (auto-seed if missing)
    await ensureCategoriesExist()

    // STEP 2: Ensure business exists
    const now = new Date()
    const business = await prisma.businesses.upsert({
      where: { id: businessId },
      update: { 
        name: 'Hardware [Demo]',
        description: 'Demo business for testing - safe to delete',
        isDemo: true,
        updatedAt: now 
      },
      create: {
        id: businessId,
        name: 'Hardware [Demo]',
        type: 'hardware',
        description: 'Demo business for testing - safe to delete',
        isActive: true,
        isDemo: true,
        createdAt: now,
        updatedAt: now
      }
    })
    console.log('Using business for hardware demo:', businessId)

    // STEP 3: Get type-based categories
    const cat1 = await prisma.businessCategories.findFirst({
      where: { businessType: 'hardware', name: 'Hand Tools', businessId: null }
    })
    const cat2 = await prisma.businessCategories.findFirst({
      where: { businessType: 'hardware', name: 'Power Tools', businessId: null }
    })

    if (!cat1 || !cat2) {
      console.error('❌ Hardware categories still not found after seeding!')
      process.exitCode = 1
      return
    }

    console.log('✅ Using type-based categories:', { handTools: cat1.id, powerTools: cat2.id })

    // STEP 4: Create Suppliers
    const supplier = await prisma.businessSuppliers.upsert({
      where: { id: `${businessId}-sup-1` },
      update: {},
      create: {
        id: `${businessId}-sup-1`,
        businessId,
        supplierNumber: `${businessId}-SUP-1`,
        name: 'Seed Hardware Supplies',
        email: 'seed+hardware@example.com',
        businessType: 'hardware',
        updatedAt: now
      }
    })
    console.log('✅ Created supplier:', supplier.name)

    // STEP 5: Create Products with realistic cost prices and stock
    const products = [
      {
        sku: 'HB-M8-30',
        name: 'Hex Bolt M8 x 30mm',
        description: 'Standard hex bolt for general purpose',
        basePrice: 0.12,
        costPrice: 0.05,
        categoryId: cat1.id,
        stock: 500
      },
      {
        sku: 'HB-M10-40',
        name: 'Hex Bolt M10 x 40mm',
        description: 'Heavy-duty hex bolt',
        basePrice: 0.25,
        costPrice: 0.11,
        categoryId: cat1.id,
        stock: 350
      },
      {
        sku: 'SCR-PH2-50',
        name: 'Phillips Screwdriver',
        description: 'Professional grade screwdriver',
        basePrice: 8.99,
        costPrice: 4.50,
        categoryId: cat1.id,
        stock: 75
      },
      {
        sku: 'HAM-CL-16',
        name: 'Claw Hammer 16oz',
        description: 'Fiberglass handle claw hammer',
        basePrice: 15.99,
        costPrice: 8.50,
        categoryId: cat1.id,
        stock: 45
      },
      {
        sku: 'DR-18V-001',
        name: 'Cordless Drill - 18V',
        description: 'Lightweight cordless drill for DIY tasks',
        basePrice: 89.99,
        costPrice: 52.99,
        categoryId: cat2.id,
        stock: 25
      },
      {
        sku: 'SAW-CIR-7',
        name: 'Circular Saw 7.25"',
        description: 'Electric circular saw with laser guide',
        basePrice: 129.99,
        costPrice: 75.00,
        categoryId: cat2.id,
        stock: 18
      },
      {
        sku: 'GRN-ANG-4',
        name: 'Angle Grinder 4.5"',
        description: 'Powerful angle grinder for cutting and grinding',
        basePrice: 65.99,
        costPrice: 38.00,
        categoryId: cat2.id,
        stock: 30
      },
      {
        sku: 'DRL-IMP-20V',
        name: 'Impact Driver 20V',
        description: 'High-torque impact driver with LED light',
        basePrice: 99.99,
        costPrice: 58.00,
        categoryId: cat2.id,
        stock: 22
      }
    ]

    for (const productData of products) {
      try {
        const { product, variant } = await createProductWithStock(
          businessId, 
          productData.categoryId, 
          supplier.id, 
          productData, 
          productData.stock
        )
        console.log(`✅ Created product: ${productData.name} (${productData.stock} units, cost: $${productData.costPrice}, price: $${productData.basePrice})`)
      } catch (err) {
        console.error(`❌ Failed to create product ${productData.name}:`, err.message)
      }
    }

    console.log(`\n✅ Seeded ${products.length} hardware products with realistic cost and stock data`)

    console.log('Hardware demo seed complete for business:', businessId)
    await prisma.$disconnect()
  } catch (err) {
    console.error('Hardware seed failed:', err)
    await prisma.$disconnect()
    process.exitCode = 1
  }
}

// Export for in-process usage by API routes
module.exports = { seed }

if (require.main === module) seed()
