const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seed() {
  try {
    const businessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'clothing-demo-business'
    console.log('Seeding clothing demo data for', businessId)

    // Ensure business exists
    let business = await prisma.businesses.findUnique({ where: { id: businessId } })
    const now = new Date()
    if (!business) {
      business = await prisma.businesses.create({ data: { id: businessId, name: 'Clothing Demo', type: 'clothing', description: 'Auto-created for demo', isActive: true, createdAt: now, updatedAt: now } })
      console.log('Created placeholder business for clothing demo:', businessId)
    }

    // Categories / Collections
    const categories = [
      { id: `${businessId}-cat-tops`, name: 'Tops', desc: 'Shirts, tees, and blouses' },
      { id: `${businessId}-cat-dresses`, name: 'Dresses', desc: 'Dresses and gowns' },
      { id: `${businessId}-cat-bottoms`, name: 'Bottoms', desc: 'Pants, shorts, skirts' },
      { id: `${businessId}-cat-accessories`, name: 'Accessories', desc: 'Belts, hats, scarves' }
    ]

    for (const c of categories) {
      await prisma.businessCategories.upsert({ where: { id: c.id }, update: { description: c.desc, updatedAt: now }, create: { id: c.id, businessId, businessType: 'clothing', name: c.name, description: c.desc, isActive: true, createdAt: now, updatedAt: now } }).catch(() => null)
    }

    // Sample products with variants (sizes/colors)
    const products = [
      { id: `${businessId}-prod-tshirt`, name: "Men's T-Shirt", sku: 'CLO-TSHIRT-001', categoryId: `${businessId}-cat-tops`, basePrice: 19.99, costPrice: 6.5, variants: [ { idSuffix: 'medium-black', sku: 'CLO-TSHIRT-001-M-BLK', name: 'M / Black', price: 19.99, stock: 50 }, { idSuffix: 'large-black', sku: 'CLO-TSHIRT-001-L-BLK', name: 'L / Black', price: 19.99, stock: 40 }, { idSuffix: 'medium-white', sku: 'CLO-TSHIRT-001-M-WHT', name: 'M / White', price: 19.99, stock: 30 } ] },
      { id: `${businessId}-prod-dress`, name: "Women's Floral Dress", sku: 'CLO-DRESS-001', categoryId: `${businessId}-cat-dresses`, basePrice: 49.99, costPrice: 18.0, variants: [ { idSuffix: 'size-8-floral', sku: 'CLO-DRESS-001-08', name: 'Size 8 / Floral', price: 49.99, stock: 12 }, { idSuffix: 'size-10-floral', sku: 'CLO-DRESS-001-10', name: 'Size 10 / Floral', price: 49.99, stock: 8 } ] }
    ]

    for (const p of products) {
      // Upsert product
      const prod = await prisma.businessProducts.upsert({
        where: { id: p.id },
        update: { description: p.name, basePrice: p.basePrice, costPrice: p.costPrice, attributes: {} },
        create: { id: p.id, businessId, name: p.name, description: p.name, sku: p.sku, barcode: null, categoryId: p.categoryId, basePrice: p.basePrice, costPrice: p.costPrice, businessType: 'clothing', isActive: true, attributes: {}, updatedAt: now }
      }).catch(() => null)

      if (!prod) continue

      // Create variants
      for (const v of p.variants || []) {
        const variantId = `${prod.id}-variant-${v.idSuffix}`
        await prisma.productVariants.upsert({
          where: { id: variantId },
          update: { price: v.price, stockQuantity: v.stock, isActive: true },
          create: { id: variantId, productId: prod.id, name: v.name, sku: v.sku, barcode: null, price: v.price, stockQuantity: v.stock, isActive: true, updatedAt: now }
        }).catch(() => null)

        // initial stock movements
        if (v.stock && v.stock > 0) {
          const movementId = `${variantId}-stock-1`
          await prisma.businessStockMovements.createMany({ data: [{ id: movementId, businessId, productVariantId: variantId, movementType: 'PURCHASE_RECEIVED', quantity: v.stock, unitCost: p.costPrice || null, reference: 'Seed initial stock', reason: 'Initial demo stock', businessType: 'clothing', businessProductId: prod.id, createdAt: now }], skipDuplicates: true }).catch(() => null)
        }
      }
    }

    // Sample images (paths assumed to exist in public/images/seed/clothing)
    await prisma.productImages.createMany({ data: [ { id: `${businessId}-prod-tshirt-img-1`, productId: `${businessId}-prod-tshirt`, imageUrl: '/images/seed/clothing/tshirt.jpg', altText: "Men's T-Shirt", businessType: 'clothing' }, { id: `${businessId}-prod-dress-img-1`, productId: `${businessId}-prod-dress`, imageUrl: '/images/seed/clothing/dress.jpg', altText: "Women's Dress", businessType: 'clothing' } ], skipDuplicates: true }).catch(() => null)

    console.log('Clothing demo seed complete')
  } catch (err) {
    console.error('Clothing seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

module.exports = { seed }

if (require.main === module) seed()
