const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Generate realistic barcodes for grocery products
 * @param {string} productName - Product name
 * @param {string} sku - Product SKU
 * @returns {Object} - Barcode data
 */
function generateGroceryBarcode(productName, sku) {
  // Common UPC-A prefixes for different product categories
  const categoryPrefixes = {
    'Fresh Produce': '4', // 4xxxxxx for produce
    'Dairy Products': '0', // 0xxxxxx for dairy
    'Meat & Seafood': '2', // 2xxxxxx for meat
    'Bakery': '8', // 8xxxxxx for bakery
    'Pantry & Canned Goods': '0', // 0xxxxxx for pantry
    'Beverages': '0' // 0xxxxxx for beverages
  }

  // Extract category from product name or use default
  let category = 'Pantry & Canned Goods' // default
  for (const [cat, prefix] of Object.entries(categoryPrefixes)) {
    if (productName.toLowerCase().includes(cat.toLowerCase().split(' ')[0])) {
      category = cat
      break
    }
  }

  const prefix = categoryPrefixes[category] || '0'

  // Generate a unique 11-digit number (UPC-A needs 12 digits total, last is check digit)
  const uniqueId = sku.split('-').pop().padStart(5, '0').slice(-5)
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
    where: { businessType: 'grocery', businessId: null }
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
      businessType: 'grocery', 
      name,
      businessId: null  // Type-based categories have NULL businessId
    }
  })
}

async function createProductWithStock(businessId, categoryId, productData, initialStock = 0) {
  let product

  // Prefer upsert by sku (there is a unique constraint @@unique([businessId, sku]))
  if (productData.sku) {
    product = await prisma.businessProducts.upsert({
      where: { businessId_sku: { businessId, sku: productData.sku } },
      update: { description: productData.description || '', basePrice: productData.basePrice, costPrice: productData.costPrice || null, attributes: productData.attributes || {}, updatedAt: new Date() },
      create: {
        businessId,
        name: productData.name,
        description: productData.description || '',
        sku: productData.sku,
        categoryId: categoryId || undefined,
        basePrice: productData.basePrice,
        costPrice: productData.costPrice || null,
        businessType: 'grocery',
        isActive: true,
        attributes: productData.attributes || {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
    include: { business_categories: true }
    })
  } else {
    // No sku provided: try finding by businessId+name, then update or create
    const existing = await prisma.businessProducts.findFirst({ where: { businessId, name: productData.name } })
    if (existing) {
      product = await prisma.businessProducts.update({ where: { id: existing.id }, data: { description: productData.description || '', basePrice: productData.basePrice, costPrice: productData.costPrice || null, attributes: productData.attributes || {}, updatedAt: new Date() } })
    } else {
      product = await prisma.businessProducts.create({ data: { businessId, name: productData.name, description: productData.description || '', sku: null, categoryId: categoryId || undefined, basePrice: productData.basePrice, costPrice: productData.costPrice || null, businessType: 'grocery', isActive: true, attributes: productData.attributes || {}, createdAt: new Date(), updatedAt: new Date() } })
    }
  }

  // Create default variant (idempotent by product ID, not SKU)
  const variantId = `${product.id}-variant-default`
  const variant = await prisma.productVariants.upsert({
    where: { id: variantId },
    update: { price: productData.basePrice, stockQuantity: initialStock || 0, isActive: true, updatedAt: new Date() },
    create: {
      id: variantId,
      productId: product.id,
      name: 'Default',
      sku: `${product.id}-DFT`, // Always use product ID for variant SKU to ensure uniqueness
      price: productData.basePrice,
      stockQuantity: initialStock || 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  // If initial stock specified, create a stock movement
  if (initialStock && initialStock > 0) {
    const movementId = `${variant.id}-stock-1`
    await prisma.businessStockMovements.createMany({
      data: [{
        id: movementId,
        businessId,
        productVariantId: variant.id,
        movementType: 'PURCHASE_RECEIVED',
        quantity: initialStock,
        unitCost: productData.costPrice || null,
        reference: 'Seed initial stock',
        reason: 'Initial demo stock',
        businessType: 'grocery',
        businessProductId: product.id,
        createdAt: new Date()
      }],
      skipDuplicates: true
    })

    await prisma.productVariants.update({ where: { id: variant.id }, data: { stockQuantity: initialStock } })
  }

  // Create product attributes
    if (productData.attributes) {
    const attrData = Object.entries(productData.attributes).map(([key, value], idx) => ({ id: `${product.id}-attr-${idx}-${key}`, productId: product.id, key, value: String(value) }))
    // Upsert naive: delete existing attributes for this product and recreate for idempotence
    await prisma.productAttributes.deleteMany({ where: { productId: product.id } }).catch(() => {})
    if (attrData.length > 0) await prisma.productAttributes.createMany({ data: attrData, skipDuplicates: true })
  }

  // Create barcode entries in the new ProductBarcodes table
  if (productData.sku) {
    const barcodeData = generateGroceryBarcode(productData.name, productData.sku)
    
    // Create barcode for the product
    await createProductBarcode(product.id, null, barcodeData)
    
    // Create barcode for the variant (same barcode for now)
    await createProductBarcode(product.id, variant.id, barcodeData)
    
    console.log(`   📱 Added barcode: ${barcodeData.code} (${barcodeData.type})`)
  }

  return { product, variant }
}

async function seed() {
  try {
    console.log('🔍 Checking for existing grocery demo businesses...')

    const now = new Date()
    const createNew = process.env.CREATE_NEW === 'true' || process.argv.includes('--new')

    // STEP 1: Ensure categories exist (auto-seed if missing)
    await ensureCategoriesExist()

    // STEP 2: Check for existing demo businesses
    const existingDemoBusinesses = await prisma.businesses.findMany({
      where: {
        type: 'grocery',
        isDemo: true
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`   Found ${existingDemoBusinesses.length} existing grocery demo business(es)`)

    let business
    let businessId

    // Check if a specific business ID is targeted (e.g., for reseeding)
    const targetBusinessId = process.env.TARGET_BUSINESS_ID
    if (targetBusinessId) {
      business = existingDemoBusinesses.find(b => b.id === targetBusinessId)
      if (!business) {
        throw new Error(`Target business "${targetBusinessId}" not found`)
      }
      businessId = business.id
      console.log(`🎯 Targeting specific business: "${business.name}" (${businessId})`)
    } else if (createNew || existingDemoBusinesses.length === 0) {
      // Create a new demo business with unique ID

      // Find the next available number (including legacy business without number)
      const demoNumbers = existingDemoBusinesses
        .map(b => {
          const match = b.id.match(/^grocery-demo-(\d+)$/)
          if (match) return parseInt(match[1])
          // Legacy business "grocery-demo-business" counts as #1
          if (b.id === 'grocery-demo-business') return 1
          return 0
        })
        .filter(n => n > 0)

      const nextNumber = demoNumbers.length > 0 ? Math.max(...demoNumbers) + 1 : 1
      businessId = `grocery-demo-${nextNumber}`
      const businessName = `Grocery [Demo ${nextNumber}]`

      console.log(`📝 Creating new demo business: ${businessName}`)

      business = await prisma.businesses.create({
        data: {
          id: businessId,
          name: businessName,
          type: 'grocery',
          description: `Demo business #${nextNumber} for testing - safe to delete`,
          isActive: true,
          isDemo: true,
          createdAt: now,
          updatedAt: now
        }
      })

      console.log(`✅ Created new demo business: "${business.name}" (${businessId})`)
    } else {
      // Reuse the first existing demo business (default behavior for backwards compatibility)
      business = existingDemoBusinesses[0]
      businessId = business.id

      console.log(`✅ Reusing existing demo business: "${business.name}" (${businessId})`)
      console.log(`   💡 Tip: Run with --new flag to create an additional demo business`)

      // Update to ensure isDemo flag is set and rename if it's the legacy ID
      const updateData = {
        isDemo: true,
        description: business.description || 'Demo business for testing - safe to delete',
        updatedAt: now
      }

      // If this is the legacy "grocery-demo-business", rename it to "Grocery [Demo 1]"
      if (business.id === 'grocery-demo-business' && !business.name.includes('[Demo 1]')) {
        console.log(`   Updating legacy business name to include number...`)
        updateData.name = 'Grocery [Demo 1]'
      }

      business = await prisma.businesses.update({
        where: { id: businessId },
        data: updateData
      })
    }

    console.log(`\n📦 Seeding products for: ${business.name}`)
    console.log(`   Business ID: ${businessId}\n`)

    // Categories - use existing type-based category names
    const categories = [
      { name: 'Fresh Produce', desc: 'Fruits and vegetables' },
      { name: 'Dairy Products', desc: 'Dairy products and eggs' }, // Changed from 'Dairy & Eggs'
      { name: 'Meat & Seafood', desc: 'Fresh meat and seafood' },
      { name: 'Bakery', desc: 'Baked goods and bread' },
      { name: 'Pantry & Canned Goods', desc: 'Canned goods, dry goods, spices' }, // Changed from 'Pantry Staples'
      { name: 'Beverages', desc: 'Drinks and beverages' }
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

    // STEP 3: Create Suppliers (type-based for grocery businesses)
    const suppliers = [
      { 
        name: 'Fresh Farm Produce Co', 
        supplierNumber: 'GRO-SUP-001',
        contactPerson: 'Farm Manager',
        email: 'orders@freshfarm.com',
        phone: '+1-555-0101',
        description: 'Fresh fruits and vegetables supplier'
      },
      { 
        name: 'Dairy Delights Distributors', 
        supplierNumber: 'GRO-SUP-002',
        contactPerson: 'Dairy Manager',
        email: 'orders@dairydelights.com',
        phone: '+1-555-0102',
        description: 'Dairy products and eggs supplier'
      },
      { 
        name: 'Prime Meats & Seafood', 
        supplierNumber: 'GRO-SUP-003',
        contactPerson: 'Meat Manager',
        email: 'orders@primemeats.com',
        phone: '+1-555-0103',
        description: 'Fresh meat and seafood supplier'
      },
      { 
        name: 'Pantry Goods Wholesale', 
        supplierNumber: 'GRO-SUP-004',
        contactPerson: 'Warehouse Manager',
        email: 'orders@pantrygoods.com',
        phone: '+1-555-0104',
        description: 'Canned goods, dry goods, and beverages supplier'
      }
    ]

    console.log('\n📦 Creating suppliers...')
    const createdSuppliers = []
    for (const s of suppliers) {
      const supplier = await prisma.businessSuppliers.upsert({
        where: { businessType_supplierNumber: { businessType: 'grocery', supplierNumber: s.supplierNumber } },
        update: { 
          name: s.name,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          notes: s.description,
          updatedAt: now
        },
        create: {
          businessType: 'grocery',
          name: s.name,
          supplierNumber: s.supplierNumber,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          notes: s.description,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
      })
      createdSuppliers.push(supplier)
      console.log(`  ✅ ${supplier.name}`)
    }

    // Products with realistic cost prices (organized by available categories)
    const products = [
      // Fresh Produce
      { name: 'Bananas', sku: 'PROD-BAN-001', category: 'Fresh Produce', basePrice: 0.69, costPrice: 0.25, attributes: { pluCode: '4011', temperatureZone: 'ambient', organicCertified: false, unitType: 'weight', unit: 'lb', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 2 }, initialStock: 120 },
      { name: 'Roma Tomatoes', sku: 'PROD-TOM-001', category: 'Fresh Produce', basePrice: 1.29, costPrice: 0.50, attributes: { pluCode: '4087', temperatureZone: 'ambient', unitType: 'weight', unit: 'lb', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 2 }, initialStock: 80 },
      { name: 'Iceberg Lettuce', sku: 'PROD-LET-001', category: 'Fresh Produce', basePrice: 1.99, costPrice: 0.85, attributes: { temperatureZone: 'refrigerated', unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 2 }, initialStock: 45 },
      { name: 'Red Apples', sku: 'PROD-APP-001', category: 'Fresh Produce', basePrice: 0.89, costPrice: 0.35, attributes: { pluCode: '4016', unitType: 'weight', unit: 'lb', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 3 }, initialStock: 95 },
      { name: 'Carrots 1kg', sku: 'PROD-CAR-001', category: 'Fresh Produce', basePrice: 1.49, costPrice: 0.60, attributes: { pluCode: '4562', unitType: 'weight', unit: 'kg', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 2 }, initialStock: 70 },
      { name: 'Onions 1kg', sku: 'PROD-ONI-001', category: 'Fresh Produce', basePrice: 1.29, costPrice: 0.50, attributes: { pluCode: '4093', unitType: 'weight', unit: 'kg', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 2 }, initialStock: 85 },
      
      // Dairy Products (includes eggs, cheese, milk, yogurt)
      { name: 'Whole Milk 1L', sku: 'PROD-MLK-001', category: 'Dairy Products', basePrice: 2.49, costPrice: 1.20, attributes: { storageTemp: 'refrigerated', expirationDays: 7, unitType: 'each', unit: 'liter', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 3 }, initialStock: 40 },
      { name: 'Large Eggs (Dozen)', sku: 'PROD-EGG-001', category: 'Dairy Products', basePrice: 3.99, costPrice: 2.10, attributes: { storageTemp: 'refrigerated', expirationDays: 21, unitType: 'each', unit: 'dozen', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 60 },
      { name: 'Cheddar Cheese 500g', sku: 'PROD-CHE-001', category: 'Dairy Products', basePrice: 6.99, costPrice: 3.80, attributes: { storageTemp: 'refrigerated', unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 5 }, initialStock: 35 },
      { name: 'Greek Yogurt 500g', sku: 'PROD-YOG-001', category: 'Dairy Products', basePrice: 4.49, costPrice: 2.40, attributes: { storageTemp: 'refrigerated', expirationDays: 14, unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 50 },
      { name: 'Butter 250g', sku: 'PROD-BUT-001', category: 'Dairy Products', basePrice: 3.99, costPrice: 2.00, attributes: { storageTemp: 'refrigerated', unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 55 },
      { name: 'Cream Cheese 200g', sku: 'PROD-CRM-001', category: 'Dairy Products', basePrice: 2.99, costPrice: 1.50, attributes: { storageTemp: 'refrigerated', unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 3 }, initialStock: 40 },
      
      // Meat & Seafood
      { name: 'Ground Beef 80/20 1lb', sku: 'PROD-BEEF-001', category: 'Meat & Seafood', basePrice: 5.99, costPrice: 3.50, attributes: { storageTemp: 'refrigerated', expirationDays: 3, unitType: 'weight', unit: 'lb', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 5 }, initialStock: 30 },
      { name: 'Chicken Breast 1lb', sku: 'PROD-CHK-001', category: 'Meat & Seafood', basePrice: 7.99, costPrice: 4.80, attributes: { storageTemp: 'refrigerated', expirationDays: 3, unitType: 'weight', unit: 'lb', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 6 }, initialStock: 25 },
      { name: 'Salmon Fillet 1lb', sku: 'PROD-SAL-001', category: 'Meat & Seafood', basePrice: 12.99, costPrice: 8.50, attributes: { storageTemp: 'refrigerated', expirationDays: 2, unitType: 'weight', unit: 'lb', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 8 }, initialStock: 18 },
      { name: 'Pork Chops 1lb', sku: 'PROD-PORK-001', category: 'Meat & Seafood', basePrice: 6.49, costPrice: 3.80, attributes: { storageTemp: 'refrigerated', expirationDays: 3, unitType: 'weight', unit: 'lb', taxable: false, weightRequired: true, snapEligible: true, loyaltyPoints: 5 }, initialStock: 22 },
      
      // Bakery
      { name: 'Sourdough Loaf', sku: 'PROD-BREAD-001', category: 'Bakery', basePrice: 3.50, costPrice: 1.50, attributes: { expirationDays: 2, unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 3 }, initialStock: 25 },
      { name: 'Croissants (6 pack)', sku: 'PROD-CRO-001', category: 'Bakery', basePrice: 5.99, costPrice: 2.80, attributes: { expirationDays: 2, unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 20 },
      { name: 'Bagels (6 pack)', sku: 'PROD-BAG-001', category: 'Bakery', basePrice: 4.49, costPrice: 2.00, attributes: { expirationDays: 3, unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 30 },
      { name: 'Donuts (6 pack)', sku: 'PROD-DON-001', category: 'Bakery', basePrice: 4.99, costPrice: 2.20, attributes: { expirationDays: 1, unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 18 },
      
      // Pantry & Canned Goods (includes frozen, pantry staples, snacks)
      { name: 'Olive Oil Extra Virgin 1L', sku: 'PROD-OIL-001', category: 'Pantry & Canned Goods', basePrice: 12.99, costPrice: 8.00, attributes: { unitType: 'each', unit: 'liter', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 8 }, initialStock: 15 },
      { name: 'Spaghetti 500g', sku: 'PROD-PAS-001', category: 'Pantry & Canned Goods', basePrice: 1.99, costPrice: 0.85, attributes: { unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 2 }, initialStock: 80 },
      { name: 'Rice 2kg', sku: 'PROD-RIC-001', category: 'Pantry & Canned Goods', basePrice: 4.99, costPrice: 2.50, attributes: { unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 50 },
      { name: 'Canned Tomatoes 400g', sku: 'PROD-CAN-TOM-001', category: 'Pantry & Canned Goods', basePrice: 1.49, costPrice: 0.70, attributes: { unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 2 }, initialStock: 100 },
      { name: 'Frozen Peas 1kg', sku: 'PROD-FZN-PEAS-001', category: 'Pantry & Canned Goods', basePrice: 2.99, costPrice: 1.00, attributes: { storageTemp: 'frozen', unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 3 }, initialStock: 60 },
      { name: 'Frozen Pizza', sku: 'PROD-FZN-PIZ-001', category: 'Pantry & Canned Goods', basePrice: 6.99, costPrice: 3.20, attributes: { storageTemp: 'frozen', unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 5 }, initialStock: 40 },
      { name: 'Ice Cream 1L', sku: 'PROD-FZN-ICE-001', category: 'Pantry & Canned Goods', basePrice: 5.49, costPrice: 2.80, attributes: { storageTemp: 'frozen', unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 35 },
      { name: 'Potato Chips 150g', sku: 'PROD-CHIP-001', category: 'Pantry & Canned Goods', basePrice: 1.79, costPrice: 0.70, attributes: { unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 2 }, initialStock: 90 },
      { name: 'Chocolate Bar 100g', sku: 'PROD-CHOC-001', category: 'Pantry & Canned Goods', basePrice: 2.49, costPrice: 1.10, attributes: { unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 2 }, initialStock: 120 },
      { name: 'Mixed Nuts 200g', sku: 'PROD-NUT-001', category: 'Pantry & Canned Goods', basePrice: 5.99, costPrice: 3.20, attributes: { unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 5 }, initialStock: 40 },
      
      // Beverages
      { name: 'Cola 330ml', sku: 'PROD-COLA-001', category: 'Beverages', basePrice: 1.25, costPrice: 0.50, attributes: { unitType: 'each', unit: 'each', taxable: true, weightRequired: false, snapEligible: true, loyaltyPoints: 1 }, initialStock: 200 },
      { name: 'Orange Juice 1L', sku: 'PROD-OJ-001', category: 'Beverages', basePrice: 3.99, costPrice: 2.00, attributes: { storageTemp: 'refrigerated', unitType: 'each', unit: 'liter', taxable: true, weightRequired: false, snapEligible: true, loyaltyPoints: 3 }, initialStock: 45 },
      { name: 'Bottled Water 1.5L', sku: 'PROD-WAT-001', category: 'Beverages', basePrice: 0.99, costPrice: 0.40, attributes: { unitType: 'each', unit: 'each', taxable: true, weightRequired: false, snapEligible: true, loyaltyPoints: 1 }, initialStock: 150 },
      { name: 'Coffee Beans 500g', sku: 'PROD-COF-001', category: 'Beverages', basePrice: 14.99, costPrice: 8.50, attributes: { unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 10 }, initialStock: 25 },
      { name: 'Green Tea Bags 100pk', sku: 'PROD-TEA-001', category: 'Beverages', basePrice: 5.99, costPrice: 3.00, attributes: { unitType: 'each', unit: 'each', taxable: false, weightRequired: false, snapEligible: true, loyaltyPoints: 4 }, initialStock: 35 }
    ]

    console.log(`\n📦 Creating ${products.length} grocery products...`)
    for (const p of products) {
      const catId = createdCats[p.category]
      const { product, variant } = await createProductWithStock(businessId, catId, p, p.initialStock)
      console.log(`✅ ${product.name} - ${p.initialStock} units (cost: $${p.costPrice}, price: $${p.basePrice})`)
    }

    console.log(`\n✅ Grocery demo seed complete - ${products.length} products created`)
  } catch (err) {
    console.error('Grocery seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}
// Export for in-process usage
module.exports = { seed }

if (require.main === module) seed()
