const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function upsertCategory(businessId, name, description) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
  const id = `${businessId}-cat-${slug}`
  return prisma.businessCategories.upsert({
    where: { businessId_name: { businessId, name } },
    update: { description },
    create: { id, businessId, name, description, businessType: 'grocery', updatedAt: new Date() }
  })
}

async function createProductWithStock(businessId, categoryId, productData, initialStock = 0) {
  let product

  // Prefer upsert by sku (there is a unique constraint @@unique([businessId, sku]))
  if (productData.sku) {
    const prodId = `${businessId}-prod-${productData.sku}`
    product = await prisma.businessProducts.upsert({
      where: { businessId_sku: { businessId, sku: productData.sku } },
      update: { description: productData.description || '', basePrice: productData.basePrice, costPrice: productData.costPrice || null, attributes: productData.attributes || {} },
      create: {
        id: prodId,
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
        updatedAt: new Date()
      },
    include: { business_categories: true }
    })
  } else {
    // No sku provided: try finding by businessId+name, then update or create
    const existing = await prisma.businessProducts.findFirst({ where: { businessId, name: productData.name } })
    if (existing) {
      product = await prisma.businessProducts.update({ where: { id: existing.id }, data: { description: productData.description || '', basePrice: productData.basePrice, costPrice: productData.costPrice || null, attributes: productData.attributes || {} } })
    } else {
      const prodId = `${businessId}-prod-${productData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')}`
      product = await prisma.businessProducts.create({ data: { id: prodId, businessId, name: productData.name, description: productData.description || '', sku: null, barcode: productData.barcode || null, categoryId: categoryId || undefined, basePrice: productData.basePrice, costPrice: productData.costPrice || null, businessType: 'grocery', isActive: true, attributes: productData.attributes || {}, updatedAt: new Date() } })
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

    // Ensure business exists (create placeholder if missing)
    let business = await prisma.businesses.findUnique({ where: { id: businessId } })
    const now = new Date()
    if (!business) {
      business = await prisma.businesses.create({ data: { id: businessId, name: 'Grocery Demo', type: 'grocery', description: 'Auto-created for demo', isActive: true, createdAt: now, updatedAt: now } })
      console.log('Created placeholder business for grocery demo:', businessId)
    }

    // Categories
    const categories = [
      { name: 'Fresh Produce', desc: 'Fruits and vegetables' },
      { name: 'Dairy & Eggs', desc: 'Dairy products and eggs' },
      { name: 'Meat & Seafood', desc: 'Fresh meat and seafood' },
      { name: 'Bakery', desc: 'Baked goods and bread' },
      { name: 'Frozen Foods', desc: 'Frozen food items' },
      { name: 'Pantry Staples', desc: 'Canned goods, dry goods, spices' },
      { name: 'Beverages', desc: 'Drinks and beverages' },
      { name: 'Snacks & Candy', desc: 'Snacks, chips, candy' }
    ]

    const createdCats = {}
    for (const c of categories) {
      const cat = await upsertCategory(businessId, c.name, c.desc)
      createdCats[c.name] = cat.id
    }

    // Products (seed a small set across categories)
    const products = [
      { name: 'Bananas', sku: 'PROD-BAN-001', category: 'Fresh Produce', basePrice: 0.69, costPrice: 0.25, attributes: { pluCode: '4011', temperatureZone: 'ambient', organicCertified: false }, initialStock: 120 },
      { name: 'Roma Tomatoes', sku: 'PROD-TOM-001', category: 'Fresh Produce', basePrice: 1.29, costPrice: 0.5, attributes: { pluCode: '4087', temperatureZone: 'ambient' }, initialStock: 80 },
      { name: 'Whole Milk 1L', sku: 'PROD-MLK-001', category: 'Dairy & Eggs', basePrice: 2.49, costPrice: 1.2, attributes: { storageTemp: 'refrigerated', expirationDays: 7 }, initialStock: 40 },
      { name: 'Ground Beef 80/20 1lb', sku: 'PROD-BEEF-001', category: 'Meat & Seafood', basePrice: 5.99, costPrice: 3.5, attributes: { storageTemp: 'refrigerated', expirationDays: 3 }, initialStock: 30 },
      { name: 'Sourdough Loaf', sku: 'PROD-BREAD-001', category: 'Bakery', basePrice: 3.5, costPrice: 1.5, attributes: { expirationDays: 2 }, initialStock: 25 },
      { name: 'Frozen Peas 1kg', sku: 'PROD-FZN-PEAS-001', category: 'Frozen Foods', basePrice: 2.99, costPrice: 1.0, attributes: { storageTemp: 'frozen' }, initialStock: 60 },
      { name: 'Olive Oil Extra Virgin 1L', sku: 'PROD-OIL-001', category: 'Pantry Staples', basePrice: 12.99, costPrice: 8.0, attributes: {}, initialStock: 5 },
      { name: 'Cola 330ml', sku: 'PROD-COLA-001', category: 'Beverages', basePrice: 1.25, costPrice: 0.5, attributes: {}, initialStock: 200 },
      { name: 'Salted Potato Chips 150g', sku: 'PROD-CHIP-001', category: 'Snacks & Candy', basePrice: 1.79, costPrice: 0.7, attributes: {}, initialStock: 90 }
    ]

    for (const p of products) {
      const catId = createdCats[p.category]
      const { product, variant } = await createProductWithStock(businessId, catId, p, p.initialStock)
      console.log('Created product', product.name, 'variant', variant.sku, 'stock', p.initialStock)
    }

    console.log('Grocery demo seed complete')
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
