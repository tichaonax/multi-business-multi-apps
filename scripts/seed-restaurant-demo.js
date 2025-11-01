const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function upsertCategory(businessId, name, description) {
  // create a stable id for category so upserts are idempotent
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const id = `${businessId}-cat-${slug}`
  const now = new Date()
  return prisma.businessCategories.upsert({
    where: { businessType_name: { businessType: 'restaurant', name } },
    update: { description, updatedAt: now },
    create: { id, businessId, name, description, businessType: 'restaurant', isActive: true, createdAt: now, updatedAt: now }
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
        barcode: itemData.barcode || null,
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
      product = await prisma.businessProducts.create({ data: { businessId, name: itemData.name, description: itemData.description || '', sku: null, barcode: itemData.barcode || null, categoryId: categoryId || undefined, basePrice: itemData.basePrice, costPrice: itemData.costPrice || null, businessType: 'restaurant', isActive: true, attributes: itemData.attributes || {}, createdAt: new Date(), updatedAt: new Date() } })
    }
  }

  // Create default variant
  const variantSku = itemData.sku || `${product.name.replace(/\s+/g, '-').toUpperCase()}-DFT`
  const variant = await prisma.productVariants.upsert({
    where: { sku: variantSku },
    update: { price: itemData.basePrice, stockQuantity: initialStock || 0, isActive: true, updatedAt: new Date() },
    create: {
      id: `${product.id}-variant-${variantSku}`,
      productId: product.id,
      name: 'Default',
      sku: variantSku,
      barcode: itemData.barcode || null,
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
      const sku = `${product.name.replace(/\s+/g, '-').toUpperCase()}-${s.name.toUpperCase().slice(0,3)}`.replace(/[^A-Z0-9-]/g, '')
      const price = Math.round((itemData.basePrice * s.factor + Number.EPSILON) * 100) / 100
      await prisma.productVariants.upsert({
        where: { sku },
        update: { price, stockQuantity: initialStock || 0, isActive: true, name: s.name, updatedAt: new Date() },
        create: { id: `${product.id}-variant-${sku}`, productId: product.id, name: s.name, sku, barcode: itemData.barcode || null, price, stockQuantity: initialStock || 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }
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

  return { product, variant }
}

async function seed() {
  try {
  const businessId = 'restaurant-demo'

    console.log('Seeding restaurant demo data for', businessId)

    // Ensure the demo business exists (idempotent)
    const business = await prisma.businesses.upsert({
      where: { id: businessId },
      update: {},
      create: {
        id: businessId,
        name: 'Restaurant Demo',
        type: 'restaurant',
        description: 'Demo restaurant business created by seed script',
        isActive: true
      }
    })

    const categories = [
      { name: 'Starters', desc: 'Appetizers and small plates' },
      { name: 'Mains', desc: 'Main courses' },
      { name: 'Desserts', desc: 'Sweet treats' },
      { name: 'Drinks', desc: 'Beverages and soft drinks' }
    ]

    const createdCats = {}
    for (const c of categories) {
      const cat = await upsertCategory(businessId, c.name, c.desc)
      createdCats[c.name] = cat.id
    }

    const items = [
      { name: 'Garlic Bread', sku: 'RST-GARBR-001', category: 'Starters', basePrice: 3.5, costPrice: 1.0, attributes: { vegetarian: true }, initialStock: 50 },
      { name: 'Caesar Salad', sku: 'RST-SAL-001', category: 'Starters', basePrice: 6.5, costPrice: 2.5, attributes: { glutenFree: false }, initialStock: 30 },
      { name: 'Grilled Chicken', sku: 'RST-CHIK-001', category: 'Mains', basePrice: 12.5, costPrice: 6.0, attributes: { temperatureZone: 'hot' }, initialStock: 40 },
      { name: 'Spaghetti Bolognese', sku: 'RST-SPAG-001', category: 'Mains', basePrice: 10.0, costPrice: 4.0, attributes: { vegetarian: false }, initialStock: 35 },
      { name: 'Chocolate Brownie', sku: 'RST-BROWN-001', category: 'Desserts', basePrice: 4.5, costPrice: 1.2, attributes: { containsNuts: false }, initialStock: 20 },
      { name: 'Coca-Cola 330ml', sku: 'RST-COLA-001', category: 'Drinks', basePrice: 1.5, costPrice: 0.4, attributes: {}, initialStock: 120 },
      { name: 'Orange Juice 250ml', sku: 'RST-OJ-001', category: 'Drinks', basePrice: 2.0, costPrice: 0.6, attributes: { chilled: true }, initialStock: 80 }
    ]

    for (const it of items) {
      const catId = createdCats[it.category]
      const { product, variant } = await createMenuItemWithStock(businessId, catId, it, it.initialStock)
        console.log('Created menu item', product.name, 'variant', variant.sku, 'stock', it.initialStock)

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

    console.log('Restaurant demo seed complete')
  } catch (err) {
    console.error('Restaurant seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) seed()
