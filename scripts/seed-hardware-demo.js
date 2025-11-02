const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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
  const variantSku = `${productData.sku}-STD`
  const variant = await prisma.productVariants.upsert({
    where: { sku: variantSku },
    update: { 
      stockQuantity: initialStock, 
      price: productData.basePrice, 
      updatedAt: now 
    },
    create: { 
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
