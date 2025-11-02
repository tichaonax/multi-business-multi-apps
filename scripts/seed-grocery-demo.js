const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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
        barcode: productData.barcode || null,
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
      product = await prisma.businessProducts.create({ data: { businessId, name: productData.name, description: productData.description || '', sku: null, barcode: productData.barcode || null, categoryId: categoryId || undefined, basePrice: productData.basePrice, costPrice: productData.costPrice || null, businessType: 'grocery', isActive: true, attributes: productData.attributes || {}, createdAt: new Date(), updatedAt: new Date() } })
    }
  }

  // Create default variant (idempotent by sku)
  const variantSku = productData.sku || `${product.name.replace(/\s+/g, '-').toUpperCase()}-DFT`
  const variantId = `${product.id}-variant-default`
  const variant = await prisma.productVariants.upsert({
    where: { sku: variantSku },
    update: { price: productData.basePrice, stockQuantity: initialStock || 0, isActive: true },
    create: {
      id: variantId,
      productId: product.id,
      name: 'Default',
      sku: variantSku,
      barcode: productData.barcode || null,
      price: productData.basePrice,
      stockQuantity: initialStock || 0,
      isActive: true,
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

  return { product, variant }
}

async function seed() {
  try {
    const businessId = 'grocery-demo-business'

    console.log('Seeding grocery demo data for', businessId)

    // STEP 1: Ensure categories exist (auto-seed if missing)
    await ensureCategoriesExist()

    // STEP 2: Ensure business exists
    const now = new Date()
    const business = await prisma.businesses.upsert({
      where: { id: businessId },
      update: { 
        name: 'Grocery [Demo]',
        description: 'Demo business for testing - safe to delete',
        isDemo: true,
        updatedAt: now 
      },
      create: {
        id: businessId,
        name: 'Grocery [Demo]',
        type: 'grocery',
        description: 'Demo business for testing - safe to delete',
        isActive: true,
        isDemo: true,
        createdAt: now,
        updatedAt: now
      }
    })
    console.log('Using business for grocery demo:', businessId)

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

    // Products with realistic cost prices (organized by available categories)
    const products = [
      // Fresh Produce
      { name: 'Bananas', sku: 'PROD-BAN-001', category: 'Fresh Produce', basePrice: 0.69, costPrice: 0.25, attributes: { pluCode: '4011', temperatureZone: 'ambient', organicCertified: false }, initialStock: 120 },
      { name: 'Roma Tomatoes', sku: 'PROD-TOM-001', category: 'Fresh Produce', basePrice: 1.29, costPrice: 0.50, attributes: { pluCode: '4087', temperatureZone: 'ambient' }, initialStock: 80 },
      { name: 'Iceberg Lettuce', sku: 'PROD-LET-001', category: 'Fresh Produce', basePrice: 1.99, costPrice: 0.85, attributes: { temperatureZone: 'refrigerated' }, initialStock: 45 },
      { name: 'Red Apples', sku: 'PROD-APP-001', category: 'Fresh Produce', basePrice: 0.89, costPrice: 0.35, attributes: { pluCode: '4016' }, initialStock: 95 },
      { name: 'Carrots 1kg', sku: 'PROD-CAR-001', category: 'Fresh Produce', basePrice: 1.49, costPrice: 0.60, attributes: { pluCode: '4562' }, initialStock: 70 },
      { name: 'Onions 1kg', sku: 'PROD-ONI-001', category: 'Fresh Produce', basePrice: 1.29, costPrice: 0.50, attributes: { pluCode: '4093' }, initialStock: 85 },
      
      // Dairy Products (includes eggs, cheese, milk, yogurt)
      { name: 'Whole Milk 1L', sku: 'PROD-MLK-001', category: 'Dairy Products', basePrice: 2.49, costPrice: 1.20, attributes: { storageTemp: 'refrigerated', expirationDays: 7 }, initialStock: 40 },
      { name: 'Large Eggs (Dozen)', sku: 'PROD-EGG-001', category: 'Dairy Products', basePrice: 3.99, costPrice: 2.10, attributes: { storageTemp: 'refrigerated', expirationDays: 21 }, initialStock: 60 },
      { name: 'Cheddar Cheese 500g', sku: 'PROD-CHE-001', category: 'Dairy Products', basePrice: 6.99, costPrice: 3.80, attributes: { storageTemp: 'refrigerated' }, initialStock: 35 },
      { name: 'Greek Yogurt 500g', sku: 'PROD-YOG-001', category: 'Dairy Products', basePrice: 4.49, costPrice: 2.40, attributes: { storageTemp: 'refrigerated', expirationDays: 14 }, initialStock: 50 },
      { name: 'Butter 250g', sku: 'PROD-BUT-001', category: 'Dairy Products', basePrice: 3.99, costPrice: 2.00, attributes: { storageTemp: 'refrigerated' }, initialStock: 55 },
      { name: 'Cream Cheese 200g', sku: 'PROD-CRM-001', category: 'Dairy Products', basePrice: 2.99, costPrice: 1.50, attributes: { storageTemp: 'refrigerated' }, initialStock: 40 },
      
      // Meat & Seafood
      { name: 'Ground Beef 80/20 1lb', sku: 'PROD-BEEF-001', category: 'Meat & Seafood', basePrice: 5.99, costPrice: 3.50, attributes: { storageTemp: 'refrigerated', expirationDays: 3 }, initialStock: 30 },
      { name: 'Chicken Breast 1lb', sku: 'PROD-CHK-001', category: 'Meat & Seafood', basePrice: 7.99, costPrice: 4.80, attributes: { storageTemp: 'refrigerated', expirationDays: 3 }, initialStock: 25 },
      { name: 'Salmon Fillet 1lb', sku: 'PROD-SAL-001', category: 'Meat & Seafood', basePrice: 12.99, costPrice: 8.50, attributes: { storageTemp: 'refrigerated', expirationDays: 2 }, initialStock: 18 },
      { name: 'Pork Chops 1lb', sku: 'PROD-PORK-001', category: 'Meat & Seafood', basePrice: 6.49, costPrice: 3.80, attributes: { storageTemp: 'refrigerated', expirationDays: 3 }, initialStock: 22 },
      
      // Bakery
      { name: 'Sourdough Loaf', sku: 'PROD-BREAD-001', category: 'Bakery', basePrice: 3.50, costPrice: 1.50, attributes: { expirationDays: 2 }, initialStock: 25 },
      { name: 'Croissants (6 pack)', sku: 'PROD-CRO-001', category: 'Bakery', basePrice: 5.99, costPrice: 2.80, attributes: { expirationDays: 2 }, initialStock: 20 },
      { name: 'Bagels (6 pack)', sku: 'PROD-BAG-001', category: 'Bakery', basePrice: 4.49, costPrice: 2.00, attributes: { expirationDays: 3 }, initialStock: 30 },
      { name: 'Donuts (6 pack)', sku: 'PROD-DON-001', category: 'Bakery', basePrice: 4.99, costPrice: 2.20, attributes: { expirationDays: 1 }, initialStock: 18 },
      
      // Pantry & Canned Goods (includes frozen, pantry staples, snacks)
      { name: 'Olive Oil Extra Virgin 1L', sku: 'PROD-OIL-001', category: 'Pantry & Canned Goods', basePrice: 12.99, costPrice: 8.00, attributes: {}, initialStock: 15 },
      { name: 'Spaghetti 500g', sku: 'PROD-PAS-001', category: 'Pantry & Canned Goods', basePrice: 1.99, costPrice: 0.85, attributes: {}, initialStock: 80 },
      { name: 'Rice 2kg', sku: 'PROD-RIC-001', category: 'Pantry & Canned Goods', basePrice: 4.99, costPrice: 2.50, attributes: {}, initialStock: 50 },
      { name: 'Canned Tomatoes 400g', sku: 'PROD-CAN-TOM-001', category: 'Pantry & Canned Goods', basePrice: 1.49, costPrice: 0.70, attributes: {}, initialStock: 100 },
      { name: 'Frozen Peas 1kg', sku: 'PROD-FZN-PEAS-001', category: 'Pantry & Canned Goods', basePrice: 2.99, costPrice: 1.00, attributes: { storageTemp: 'frozen' }, initialStock: 60 },
      { name: 'Frozen Pizza', sku: 'PROD-FZN-PIZ-001', category: 'Pantry & Canned Goods', basePrice: 6.99, costPrice: 3.20, attributes: { storageTemp: 'frozen' }, initialStock: 40 },
      { name: 'Ice Cream 1L', sku: 'PROD-FZN-ICE-001', category: 'Pantry & Canned Goods', basePrice: 5.49, costPrice: 2.80, attributes: { storageTemp: 'frozen' }, initialStock: 35 },
      { name: 'Potato Chips 150g', sku: 'PROD-CHIP-001', category: 'Pantry & Canned Goods', basePrice: 1.79, costPrice: 0.70, attributes: {}, initialStock: 90 },
      { name: 'Chocolate Bar 100g', sku: 'PROD-CHOC-001', category: 'Pantry & Canned Goods', basePrice: 2.49, costPrice: 1.10, attributes: {}, initialStock: 120 },
      { name: 'Mixed Nuts 200g', sku: 'PROD-NUT-001', category: 'Pantry & Canned Goods', basePrice: 5.99, costPrice: 3.20, attributes: {}, initialStock: 40 },
      
      // Beverages
      { name: 'Cola 330ml', sku: 'PROD-COLA-001', category: 'Beverages', basePrice: 1.25, costPrice: 0.50, attributes: {}, initialStock: 200 },
      { name: 'Orange Juice 1L', sku: 'PROD-OJ-001', category: 'Beverages', basePrice: 3.99, costPrice: 2.00, attributes: { storageTemp: 'refrigerated' }, initialStock: 45 },
      { name: 'Bottled Water 1.5L', sku: 'PROD-WAT-001', category: 'Beverages', basePrice: 0.99, costPrice: 0.40, attributes: {}, initialStock: 150 },
      { name: 'Coffee Beans 500g', sku: 'PROD-COF-001', category: 'Beverages', basePrice: 14.99, costPrice: 8.50, attributes: {}, initialStock: 25 },
      { name: 'Green Tea Bags 100pk', sku: 'PROD-TEA-001', category: 'Beverages', basePrice: 5.99, costPrice: 3.00, attributes: {}, initialStock: 35 }
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
