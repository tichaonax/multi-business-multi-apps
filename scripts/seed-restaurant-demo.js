const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Generate realistic barcodes for restaurant products
 * @param {string} productName - Product name
 * @param {string} sku - Product SKU
 * @returns {Object} - Barcode data
 */
function generateRestaurantBarcode(productName, sku) {
  // Restaurant products often use various barcode types
  const barcodeTypes = ['UPC_A', 'EAN_13', 'CODE128']
  const type = barcodeTypes[Math.floor(Math.random() * barcodeTypes.length)]

  let code, isUniversal

  if (type === 'UPC_A') {
    // Generate UPC-A (12 digits) - common for beverages and packaged foods
    const prefix = '0' // General merchandise
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
    // Generate EAN-13 (13 digits) - common for international products
    const prefix = '590' // European prefix
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
    // Generate Code 128 (alphanumeric) - for custom restaurant items
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
 * Ensure type-based categories exist before seeding demo data
 */
async function ensureCategoriesExist() {
  const categoriesExist = await prisma.businessCategories.findFirst({
    where: { businessType: 'restaurant', businessId: null }
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

// Get existing type-based category (don't create new ones)
async function getCategory(name) {
  return prisma.businessCategories.findFirst({
    where: { 
      businessType: 'restaurant', 
      name,
      businessId: null  // Type-based categories have NULL businessId
    }
  })
}

async function createMenuItemWithStock(businessId, categoryId, itemData, initialStock = 0) {
  let product

  if (itemData.sku) {
    product = await prisma.businessProducts.upsert({
      where: { businessId_sku: { businessId, sku: itemData.sku } },
      update: { description: itemData.description || '', basePrice: itemData.basePrice, costPrice: itemData.costPrice || null, attributes: itemData.attributes || {}, updatedAt: new Date() },
      create: {
        businessId,
        name: itemData.name,
        description: itemData.description || '',
        sku: itemData.sku,
        categoryId: categoryId || undefined,
        basePrice: itemData.basePrice,
        costPrice: itemData.costPrice || null,
        businessType: 'restaurant',
        isActive: true,
        attributes: itemData.attributes || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  } else {
    const existing = await prisma.businessProducts.findFirst({ where: { businessId, name: itemData.name } })
    if (existing) {
      product = await prisma.businessProducts.update({ where: { id: existing.id }, data: { description: itemData.description || '', basePrice: itemData.basePrice, costPrice: itemData.costPrice || null, attributes: itemData.attributes || {}, updatedAt: new Date() } })
    } else {
      product = await prisma.businessProducts.create({ data: { businessId, name: itemData.name, description: itemData.description || '', sku: null, categoryId: categoryId || undefined, basePrice: itemData.basePrice, costPrice: itemData.costPrice || null, businessType: 'restaurant', isActive: true, attributes: itemData.attributes || {}, createdAt: new Date(), updatedAt: new Date() } })
    }
  }

  // Create default variant
  const timestamp = Date.now()
  const variantSku = itemData.sku || `${product.name.replace(/\s+/g, '-').toUpperCase()}-DFT`
  const variantId = `${product.id}-variant-default-${timestamp}`
  
  const variant = await prisma.productVariants.create({
    data: { 
      id: variantId,
      productId: product.id, 
      sku: `${variantSku}-${timestamp}`, 
      price: itemData.basePrice, 
      stockQuantity: initialStock || 0, 
      isActive: true, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    }
  })

  // Create size variants (small/regular/large) if requested via itemData.sizes
  if (itemData.sizes !== false) {
    // price adjustments: small = -20%, regular = 0, large = +25%
    const sizes = [
      { name: 'Small', factor: 0.8 },
      { name: 'Regular', factor: 1.0 },
      { name: 'Large', factor: 1.25 }
    ]

    for (const s of sizes) {
      const timestamp = Date.now()
      const sku = `${product.name.replace(/\s+/g, '-').toUpperCase()}-${s.name.toUpperCase().slice(0,3)}-${timestamp}`.replace(/[^A-Z0-9-]/g, '')
      const variantId = `${product.id}-variant-${sku}`
      const price = Math.round((itemData.basePrice * s.factor + Number.EPSILON) * 100) / 100
      await prisma.productVariants.upsert({
        where: { id: variantId },
        update: { price, stockQuantity: initialStock || 0, isActive: true, name: s.name, updatedAt: new Date() },
        create: { id: variantId, productId: product.id, name: s.name, sku, price, stockQuantity: initialStock || 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }
      })
    }
  }

  if (initialStock && initialStock > 0) {
    await prisma.businessStockMovements.create({
      data: {
          id: `${businessId}-stock-${variant.id}-${Date.now()}`,
        businessId,
        productVariantId: variant.id,
        movementType: 'PURCHASE_RECEIVED',
        quantity: initialStock,
        unitCost: itemData.costPrice || null,
        reference: 'Seed initial stock',
        reason: 'Initial demo stock',
        businessType: 'restaurant',
        businessProductId: product.id
      }
    })

    await prisma.productVariants.update({ where: { id: variant.id }, data: { stockQuantity: initialStock } })
  }

  if (itemData.attributes) {
    const attrData = Object.entries(itemData.attributes).map(([key, value], idx) => ({ id: `${product.id}-attr-${idx}-${key}`, productId: product.id, key, value: String(value), createdAt: new Date() }))
    await prisma.productAttributes.deleteMany({ where: { productId: product.id } }).catch(() => {})
    if (attrData.length > 0) await prisma.productAttributes.createMany({ data: attrData })
  }

  // Ensure POS attributes exist on the businessProduct.attributes JSON for POS behavior
  const posAttrs = product.attributes || {}
  // posCategory will be the item category (e.g., Mains, Starters)
  posAttrs.posCategory = posAttrs.posCategory || itemData.posCategory || itemData.category || 'Unassigned'
  // printToKitchen true for food-like items, false for drinks
  const isDrink = (itemData.category || '').toLowerCase().includes('drink') || (itemData.attributes && itemData.attributes.chilled)
  posAttrs.printToKitchen = typeof posAttrs.printToKitchen === 'boolean' ? posAttrs.printToKitchen : !isDrink
  await prisma.businessProducts.update({ where: { id: product.id }, data: { attributes: posAttrs } })

  // Create barcode entries in the new ProductBarcodes table
  if (itemData.sku) {
    const barcodeData = generateRestaurantBarcode(itemData.name, itemData.sku)
    
    // Create barcode for the product
    await createProductBarcode(product.id, null, barcodeData)
    
    // Create barcode for the default variant
    await createProductBarcode(product.id, variant.id, barcodeData)
    
    // Create barcodes for size variants if they exist
    if (itemData.sizes !== false) {
      const sizes = ['Small', 'Regular', 'Large']
      for (const sizeName of sizes) {
        const timestamp = Date.now()
        const sku = `${itemData.name.replace(/\s+/g, '-').toUpperCase()}-${sizeName.toUpperCase().slice(0,3)}-${timestamp}`.replace(/[^A-Z0-9-]/g, '')
        const sizeVariant = await prisma.productVariants.findFirst({ where: { sku } })
        if (sizeVariant) {
          await createProductBarcode(product.id, sizeVariant.id, barcodeData)
        }
      }
    }
  }

  return { product, variant }
}

async function seed() {
  try {
    console.log('🔍 Checking for existing restaurant demo businesses...')

    const now = new Date()

    // STEP 1: Ensure categories exist (auto-seed if missing)
    await ensureCategoriesExist()

    // STEP 2: Check for existing demo businesses
    const existingDemoBusinesses = await prisma.businesses.findMany({
      where: {
        type: 'restaurant',
        OR: [
          { isDemo: true },
          { name: { contains: '[Demo]' } },
          { id: { contains: 'demo' } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    })

    let business
    const businessId = 'restaurant-demo-business'

    // First check if the correct ID already exists
    const correctBusiness = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (correctBusiness) {
      // Perfect! Use the existing business with correct ID
      console.log(`✅ Found demo business with correct ID: "${correctBusiness.name}" (${businessId})`)
      console.log(`   Reusing this business for seeding (idempotent)`)

      business = await prisma.businesses.update({
        where: { id: businessId },
        data: {
          isDemo: true,
          description: 'Demo restaurant for testing - safe to delete',
          updatedAt: now
        }
      })

      // Clean up any other demo businesses with wrong IDs
      const otherDemos = await prisma.businesses.findMany({
        where: {
          type: 'restaurant',
          isDemo: true,
          id: { not: businessId }
        }
      })

      if (otherDemos.length > 0) {
        console.log(`   ⚠️  Found ${otherDemos.length} duplicate demo business(es), cleaning up...`)
        for (const duplicate of otherDemos) {
          console.log(`   Deleting duplicate: "${duplicate.name}" (${duplicate.id})`)
          await prisma.businesses.delete({ where: { id: duplicate.id } }).catch(err => {
            console.log(`   ⚠️  Could not delete ${duplicate.id}: ${err.message}`)
          })
        }
      }
    } else if (existingDemoBusinesses.length > 0) {
      // Found old demo businesses with wrong IDs - clean them up and create new one
      console.log(`⚠️  Found ${existingDemoBusinesses.length} demo business(es) with incorrect IDs`)

      for (const oldBusiness of existingDemoBusinesses) {
        console.log(`   Deleting old demo: "${oldBusiness.name}" (${oldBusiness.id})`)
        await prisma.businesses.delete({ where: { id: oldBusiness.id } }).catch(err => {
          console.log(`   ⚠️  Could not delete ${oldBusiness.id}: ${err.message}`)
        })
      }

      // Create new business with correct ID
      console.log(`📝 Creating demo business with correct ID...`)

      business = await prisma.businesses.create({
        data: {
          id: businessId,
          name: 'Restaurant [Demo]',
          type: 'restaurant',
          description: 'Demo restaurant for testing - safe to delete',
          isActive: true,
          isDemo: true,
          createdAt: now,
          updatedAt: now
        }
      })

      console.log(`✅ Created new demo business: "${business.name}" (${businessId})`)
    } else {
      // No demo business exists - create new one
      console.log(`📝 No demo business found. Creating new one...`)

      business = await prisma.businesses.create({
        data: {
          id: businessId,
          name: 'Restaurant [Demo]',
          type: 'restaurant',
          description: 'Demo restaurant for testing - safe to delete',
          isActive: true,
          isDemo: true,
          createdAt: now,
          updatedAt: now
        }
      })

      console.log(`✅ Created new demo business: "${business.name}" (${businessId})`)
    }

    console.log(`\n📦 Seeding products for: ${business.name}`)
    console.log(`   Business ID: ${businessId}\n`)

    const categories = [
      { name: 'Appetizers', desc: 'Appetizers and small plates' },
      { name: 'Main Courses', desc: 'Main courses' },
      { name: 'Desserts', desc: 'Sweet treats' },
      { name: 'Beverages', desc: 'Beverages and soft drinks' }
    ]

    // Get type-based categories (should already exist from seed-type-categories.js)
    const createdCats = {}
    for (const c of categories) {
      const cat = await getCategory(c.name)
      if (!cat) {
        console.error(`❌ Category "${c.name}" not found! Please run: npm run seed:categories first`)
        process.exitCode = 1
        return
      }
      createdCats[c.name] = cat.id
    }
    console.log('✅ Using type-based categories')

    // STEP 3: Create Suppliers (type-based for restaurant businesses)
    const suppliers = [
      { 
        name: 'Fresh Produce Market', 
        supplierNumber: 'RST-SUP-001',
        contactPerson: 'Produce Manager',
        email: 'orders@freshproducemarket.com',
        phone: '+1-555-0301',
        description: 'Fresh vegetables and fruits supplier'
      },
      { 
        name: 'Prime Meat Distributors', 
        supplierNumber: 'RST-SUP-002',
        contactPerson: 'Meat Manager',
        email: 'orders@primemeat.com',
        phone: '+1-555-0302',
        description: 'Fresh meat and poultry supplier'
      },
      { 
        name: 'Seafood Express', 
        supplierNumber: 'RST-SUP-003',
        contactPerson: 'Seafood Manager',
        email: 'orders@seafoodexpress.com',
        phone: '+1-555-0303',
        description: 'Fresh seafood and fish supplier'
      },
      { 
        name: 'Restaurant Supply Co', 
        supplierNumber: 'RST-SUP-004',
        contactPerson: 'Supply Manager',
        email: 'orders@restaurantsupply.com',
        phone: '+1-555-0304',
        description: 'Dry goods, beverages, and restaurant supplies'
      }
    ]

    console.log('\n📦 Creating suppliers...')
    const createdSuppliers = []
    for (const s of suppliers) {
      const supplier = await prisma.businessSuppliers.upsert({
        where: { businessType_supplierNumber: { businessType: 'restaurant', supplierNumber: s.supplierNumber } },
        update: { 
          name: s.name,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          notes: s.description,
          updatedAt: new Date()
        },
        create: {
          businessType: 'restaurant',
          name: s.name,
          supplierNumber: s.supplierNumber,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          notes: s.description,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      createdSuppliers.push(supplier)
      console.log(`  ✅ ${supplier.name}`)
    }

    // Expanded menu with realistic pricing
    const items = [
      // Appetizers
      { name: 'Garlic Bread', sku: 'RST-GARBR-001', category: 'Appetizers', basePrice: 5.99, costPrice: 1.80, attributes: { vegetarian: true }, initialStock: 50 },
      { name: 'Caesar Salad', sku: 'RST-SAL-001', category: 'Appetizers', basePrice: 8.99, costPrice: 3.50, attributes: { glutenFree: false }, initialStock: 35 },
      { name: 'Bruschetta', sku: 'RST-BRUS-001', category: 'Appetizers', basePrice: 7.99, costPrice: 2.80, attributes: { vegetarian: true }, initialStock: 40 },
      { name: 'Chicken Wings (8pc)', sku: 'RST-WINGS-001', category: 'Appetizers', basePrice: 9.99, costPrice: 4.20, attributes: { spicy: true }, initialStock: 45 },
      { name: 'Soup of the Day', sku: 'RST-SOUP-001', category: 'Appetizers', basePrice: 6.99, costPrice: 2.00, attributes: { vegetarian: true }, initialStock: 30 },
      
      // Main Courses
      { name: 'Grilled Chicken Breast', sku: 'RST-CHIK-001', category: 'Main Courses', basePrice: 16.99, costPrice: 7.50, attributes: { temperatureZone: 'hot', glutenFree: true }, initialStock: 40 },
      { name: 'Spaghetti Bolognese', sku: 'RST-SPAG-001', category: 'Main Courses', basePrice: 14.99, costPrice: 5.80, attributes: { vegetarian: false }, initialStock: 45 },
      { name: 'Margherita Pizza', sku: 'RST-PIZ-001', category: 'Main Courses', basePrice: 13.99, costPrice: 4.50, attributes: { vegetarian: true }, initialStock: 50 },
      { name: 'Beef Burger & Fries', sku: 'RST-BURG-001', category: 'Main Courses', basePrice: 15.99, costPrice: 6.80, attributes: {}, initialStock: 55 },
      { name: 'Grilled Salmon', sku: 'RST-SAL-002', category: 'Main Courses', basePrice: 22.99, costPrice: 12.50, attributes: { glutenFree: true }, initialStock: 25 },
      { name: 'Vegetable Stir Fry', sku: 'RST-STIR-001', category: 'Main Courses', basePrice: 12.99, costPrice: 4.80, attributes: { vegetarian: true, vegan: true }, initialStock: 35 },
      { name: 'Ribeye Steak 10oz', sku: 'RST-STEAK-001', category: 'Main Courses', basePrice: 28.99, costPrice: 16.00, attributes: { glutenFree: true }, initialStock: 20 },
      
      // Desserts
      { name: 'Chocolate Brownie', sku: 'RST-BROWN-001', category: 'Desserts', basePrice: 6.99, costPrice: 2.20, attributes: { containsNuts: false }, initialStock: 35 },
      { name: 'Tiramisu', sku: 'RST-TIRA-001', category: 'Desserts', basePrice: 7.99, costPrice: 2.80, attributes: {}, initialStock: 30 },
      { name: 'Cheesecake', sku: 'RST-CAKE-001', category: 'Desserts', basePrice: 6.99, costPrice: 2.50, attributes: {}, initialStock: 28 },
      { name: 'Ice Cream Sundae', sku: 'RST-ICE-001', category: 'Desserts', basePrice: 5.99, costPrice: 1.80, attributes: {}, initialStock: 40 },
      
      // Beverages
      { name: 'Coca-Cola 330ml', sku: 'RST-COLA-001', category: 'Beverages', basePrice: 2.99, costPrice: 0.80, attributes: {}, initialStock: 150 },
      { name: 'Orange Juice 250ml', sku: 'RST-OJ-001', category: 'Beverages', basePrice: 3.99, costPrice: 1.20, attributes: { chilled: true }, initialStock: 80 },
      { name: 'Sparkling Water 500ml', sku: 'RST-WAT-001', category: 'Beverages', basePrice: 2.49, costPrice: 0.60, attributes: {}, initialStock: 100 },
      { name: 'Coffee', sku: 'RST-COF-001', category: 'Beverages', basePrice: 3.49, costPrice: 0.90, attributes: { hot: true }, initialStock: 60 },
      { name: 'Iced Tea', sku: 'RST-TEA-001', category: 'Beverages', basePrice: 3.99, costPrice: 1.00, attributes: { chilled: true }, initialStock: 70 }
    ]

    console.log(`\n🍽️ Creating ${items.length} menu items...`)
    for (const it of items) {
      const catId = createdCats[it.category]
      const { product, variant } = await createMenuItemWithStock(businessId, catId, it, it.initialStock)
      console.log(`✅ ${product.name} - ${it.initialStock} units (cost: $${it.costPrice}, price: $${it.basePrice})`)

        // Attach sample images for demo products (use placeholders)
        try {
          const sampleImages = [
            `/uploads/images/placeholder-food-1.svg`,
            `/uploads/images/placeholder-food-2.svg`,
            `/uploads/images/placeholder-food-3.svg`
          ]

          // delete existing images for product (idempotent)
          await prisma.productImages.deleteMany({ where: { productId: product.id } }).catch(() => {})

          const imgData = sampleImages.map((url, idx) => ({
            id: `${product.id}-img-${idx}`,
            productId: product.id,
            imageUrl: url,
            altText: `${product.name} image ${idx + 1}`,
            isPrimary: idx === 0,
            sortOrder: idx,
            imageSize: 'MEDIUM',
            businessType: 'restaurant',
            createdAt: new Date(),
            updatedAt: new Date()
          }))

          await prisma.productImages.createMany({ data: imgData })
        } catch (err) {
          console.error('Failed to attach product images for', product.id, err)
        }
    }

    // Create raw ingredient inventory for realistic restaurant operations
    console.log(`\n🥬 Creating ingredient inventory...`)
    // Map ingredient categories to existing menu categories for now
    const ingredientCategoryMap = {
      'Proteins': 'Main Courses',
      'Vegetables': 'Appetizers',
      'Dairy': 'Appetizers', 
      'Pantry': 'Appetizers',
      'Beverages': 'Beverages',
      'Supplies': 'Appetizers'
    }
    
    const ingredients = [
      // Proteins
      { name: 'Chicken Breast', sku: 'ING-CHKB-001', category: 'Proteins', costPrice: 3.50, initialStock: 80, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 7, ingredientType: 'Proteins' } },
      { name: 'Ground Beef', sku: 'ING-BEEF-001', category: 'Proteins', costPrice: 4.20, initialStock: 60, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 5, ingredientType: 'Proteins' } },
      { name: 'Salmon Fillet', sku: 'ING-SALM-001', category: 'Proteins', costPrice: 8.50, initialStock: 40, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 3, ingredientType: 'Proteins' } },
      { name: 'Pork Chops', sku: 'ING-PORK-001', category: 'Proteins', costPrice: 4.80, initialStock: 50, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 5, ingredientType: 'Proteins' } },
      { name: 'Shrimp', sku: 'ING-SHRP-001', category: 'Proteins', costPrice: 12.00, initialStock: 30, unit: 'lb', attributes: { storageTemp: 'frozen', shelfLife: 90, ingredientType: 'Proteins' } },
      
      // Vegetables
      { name: 'Tomatoes', sku: 'ING-TOMT-001', category: 'Vegetables', costPrice: 1.20, initialStock: 100, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 7 } },
      { name: 'Lettuce', sku: 'ING-LETT-001', category: 'Vegetables', costPrice: 1.50, initialStock: 80, unit: 'head', attributes: { storageTemp: 'refrigerated', shelfLife: 5 } },
      { name: 'Onions', sku: 'ING-ONON-001', category: 'Vegetables', costPrice: 0.80, initialStock: 120, unit: 'lb', attributes: { storageTemp: 'room', shelfLife: 30 } },
      { name: 'Bell Peppers', sku: 'ING-PEPS-001', category: 'Vegetables', costPrice: 1.80, initialStock: 70, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 7 } },
      { name: 'Mushrooms', sku: 'ING-MUSH-001', category: 'Vegetables', costPrice: 3.20, initialStock: 50, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 5 } },
      { name: 'Spinach', sku: 'ING-SPIN-001', category: 'Vegetables', costPrice: 2.50, initialStock: 60, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 5 } },
      { name: 'Carrots', sku: 'ING-CARR-001', category: 'Vegetables', costPrice: 0.90, initialStock: 100, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 14 } },
      
      // Dairy
      { name: 'Whole Milk', sku: 'ING-MILK-001', category: 'Dairy', costPrice: 3.20, initialStock: 40, unit: 'gal', attributes: { storageTemp: 'refrigerated', shelfLife: 7 } },
      { name: 'Heavy Cream', sku: 'ING-CREM-001', category: 'Dairy', costPrice: 4.50, initialStock: 30, unit: 'qt', attributes: { storageTemp: 'refrigerated', shelfLife: 14 } },
      { name: 'Butter', sku: 'ING-BUTR-001', category: 'Dairy', costPrice: 3.80, initialStock: 50, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 30 } },
      { name: 'Mozzarella Cheese', sku: 'ING-MOZZ-001', category: 'Dairy', costPrice: 5.20, initialStock: 45, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 21 } },
      { name: 'Parmesan Cheese', sku: 'ING-PARM-001', category: 'Dairy', costPrice: 8.50, initialStock: 35, unit: 'lb', attributes: { storageTemp: 'refrigerated', shelfLife: 60 } },
      { name: 'Eggs', sku: 'ING-EGGS-001', category: 'Dairy', costPrice: 2.80, initialStock: 60, unit: 'dozen', attributes: { storageTemp: 'refrigerated', shelfLife: 21 } },
      
      // Pantry
      { name: 'Flour (All-Purpose)', sku: 'ING-FLOR-001', category: 'Pantry', costPrice: 0.60, initialStock: 200, unit: 'lb', attributes: { storageTemp: 'room', shelfLife: 180 } },
      { name: 'Sugar', sku: 'ING-SUGR-001', category: 'Pantry', costPrice: 0.50, initialStock: 150, unit: 'lb', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Salt', sku: 'ING-SALT-001', category: 'Pantry', costPrice: 0.30, initialStock: 100, unit: 'lb', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Olive Oil', sku: 'ING-OILV-001', category: 'Pantry', costPrice: 8.50, initialStock: 40, unit: 'gal', attributes: { storageTemp: 'room', shelfLife: 180 } },
      { name: 'Pasta (Spaghetti)', sku: 'ING-PAST-001', category: 'Pantry', costPrice: 1.20, initialStock: 120, unit: 'lb', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Rice', sku: 'ING-RICE-001', category: 'Pantry', costPrice: 0.80, initialStock: 150, unit: 'lb', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Tomato Sauce', sku: 'ING-TOMS-001', category: 'Pantry', costPrice: 2.50, initialStock: 80, unit: 'qt', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Garlic', sku: 'ING-GARL-001', category: 'Pantry', costPrice: 1.50, initialStock: 60, unit: 'lb', attributes: { storageTemp: 'room', shelfLife: 60 } },
      
      // Beverages
      { name: 'Coca-Cola Syrup', sku: 'ING-COLA-SYR', category: 'Beverages', costPrice: 45.00, initialStock: 10, unit: 'box', attributes: { storageTemp: 'room', shelfLife: 90 } },
      { name: 'Orange Juice (Fresh)', sku: 'ING-OJ-FRSH', category: 'Beverages', costPrice: 8.50, initialStock: 25, unit: 'gal', attributes: { storageTemp: 'refrigerated', shelfLife: 7 } },
      { name: 'Bottled Water', sku: 'ING-WATR-BTL', category: 'Beverages', costPrice: 0.25, initialStock: 200, unit: 'bottle', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Coffee Beans', sku: 'ING-COFF-BNS', category: 'Beverages', costPrice: 12.50, initialStock: 40, unit: 'lb', attributes: { storageTemp: 'room', shelfLife: 90 } },
      { name: 'Tea Bags', sku: 'ING-TEA-BAGS', category: 'Beverages', costPrice: 8.00, initialStock: 30, unit: 'box', attributes: { storageTemp: 'room', shelfLife: 365 } },
      
      // Supplies
      { name: 'Paper Napkins', sku: 'SUP-NAPK-001', category: 'Supplies', costPrice: 15.00, initialStock: 50, unit: 'case', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Disposable Cups', sku: 'SUP-CUPS-001', category: 'Supplies', costPrice: 18.00, initialStock: 40, unit: 'case', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Paper Plates', sku: 'SUP-PLAT-001', category: 'Supplies', costPrice: 22.00, initialStock: 35, unit: 'case', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'Plastic Utensils', sku: 'SUP-UTEN-001', category: 'Supplies', costPrice: 16.00, initialStock: 45, unit: 'case', attributes: { storageTemp: 'room', shelfLife: 365 } },
      { name: 'To-Go Containers', sku: 'SUP-CONT-001', category: 'Supplies', costPrice: 28.00, initialStock: 30, unit: 'case', attributes: { storageTemp: 'room', shelfLife: 365 } }
    ]

    for (const ing of ingredients) {
      // Map ingredient category to existing menu category
      const mappedCategory = ingredientCategoryMap[ing.category]
      const catId = createdCats[mappedCategory]
      
      // Ingredients don't have a selling price, only cost
      // Store the original ingredient category in attributes for filtering
      const ingredientData = { 
        ...ing, 
        basePrice: 0,
        attributes: { 
          ...ing.attributes, 
          ingredientType: ing.category 
        }
      }
      const { product, variant } = await createMenuItemWithStock(businessId, catId, ingredientData, ing.initialStock)
      console.log(`✅ ${product.name} (${ing.category}) - ${ing.initialStock} ${ing.unit} (cost: $${ing.costPrice})`)
    }

    // Create a few sample orders referencing created products (idempotent upsert)
    try {
      const products = await prisma.businessProducts.findMany({ where: { businessId } })
      if (products.length > 0) {
        console.log('\n🍽️ Creating sample restaurant orders...')
        const sampleOrders = [
          { orderNumber: 'RST-SMP-001', items: [{ name: 'Grilled Chicken', qty: 1 }, { name: 'Coca-Cola 330ml', qty: 1 }], status: 'COMPLETED' },
          { orderNumber: 'RST-SMP-002', items: [{ name: 'Spaghetti Bolognese', qty: 2 }], status: 'PROCESSING' },
          { orderNumber: 'RST-SMP-003', items: [{ name: 'Garlic Bread', qty: 3 }, { name: 'Orange Juice 250ml', qty: 2 }], status: 'PENDING' }
        ]

        for (const o of sampleOrders) {
          const existing = await prisma.businessOrders.findFirst({ where: { businessId, orderNumber: o.orderNumber } })
          const orderData = {
            businessId,
            orderNumber: o.orderNumber,
            orderType: 'SALE',
            status: o.status,
            paymentStatus: o.status === 'COMPLETED' ? 'PAID' : 'PENDING',
            subtotal: 0,
            taxAmount: 0,
            totalAmount: 0,
            businessType: 'restaurant',
            notes: 'Seed sample order',
            attributes: { demoSeed: true }
          }

          const order = await prisma.businessOrders.upsert({ where: { businessId_orderNumber: { businessId, orderNumber: o.orderNumber } }, update: { ...orderData, updatedAt: new Date() }, create: { ...orderData, createdAt: new Date(), updatedAt: new Date() } })

          // Build order items by looking up product variants (prefer Regular variant if exists)
          let subtotal = 0
          await prisma.businessOrderItems.deleteMany({ where: { orderId: order.id } }).catch(() => {})
          for (const it of o.items) {
            const prod = products.find(p => p.name === it.name)
            if (!prod) continue
            // Prefer 'Regular' variant
            const variant = await prisma.productVariants.findFirst({ where: { productId: prod.id, name: 'Regular' } })
            const chosen = variant || await prisma.productVariants.findFirst({ where: { productId: prod.id } })
            if (!chosen) continue
            const unitPrice = Number(chosen.price || prod.basePrice || 0)
            const totalPrice = Math.round((unitPrice * it.qty + Number.EPSILON) * 100) / 100
            subtotal += totalPrice
            await prisma.businessOrderItems.create({ data: { id: `${order.id}-item-${chosen.id}-${Math.random().toString(36).slice(2,8)}`, orderId: order.id, productVariantId: chosen.id, quantity: it.qty, unitPrice, totalPrice, createdAt: new Date() } })
          }

          const tax = Math.round((subtotal * 0.15 + Number.EPSILON) * 100) / 100
          const total = Math.round((subtotal + tax + Number.EPSILON) * 100) / 100
          await prisma.businessOrders.update({ where: { id: order.id }, data: { subtotal, taxAmount: tax, totalAmount: total } })

          console.log('Created/updated sample order', order.orderNumber, 'total', total)

          // Create a kitchen ticket as a separate businessOrder record to simulate kitchen workflows
          const ticketNumber = `${order.orderNumber}-KITCH`
          // Prisma OrderType enum does not include a kitchen-specific value.
          // Use a valid enum value (SERVICE) and mark the record as a kitchen ticket via attributes.
          const ticketData = {
            businessId,
            orderNumber: ticketNumber,
            orderType: 'KITCHEN_TICKET',
            status: o.status === 'PENDING' ? 'PENDING' : 'PROCESSING',
            paymentStatus: 'PENDING',
            subtotal: 0,
            taxAmount: 0,
            totalAmount: 0,
            businessType: 'restaurant',
            notes: 'Kitchen ticket (seed)',
            attributes: { parentOrderId: order.id, ticketStatus: 'OPEN', ticketType: 'KITCHEN', demoSeed: true }
          }

          await prisma.businessOrders.upsert({ where: { businessId_orderNumber: { businessId, orderNumber: ticketNumber } }, update: { ...ticketData, updatedAt: new Date() }, create: { ...ticketData, createdAt: new Date(), updatedAt: new Date() } })
          console.log('Created kitchen ticket for', order.orderNumber)
        }
      }
    } catch (err) {
      console.error('Error creating sample orders/kitchen tickets:', err)
    }

    console.log(`\n✅ Restaurant demo seed complete:`)
    console.log(`   📋 ${items.length} menu items`)
    console.log(`   🥬 ${ingredients.length} ingredients`)
    console.log(`   📦 ${items.length + ingredients.length} total inventory items`)
  } catch (err) {
    console.error('Restaurant seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) seed()
