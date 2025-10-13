const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seed() {
  try {
    const businessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'hardware-demo-business'

  // Create business if not exists
    const existing = await prisma.businesses.findUnique({ where: { id: businessId } })
    if (!existing) {
      // Use businessType to match other seed scripts and Prisma schema
      // The Business model requires a 'type' scalar; set it to the same as businessType for demo businesses
      await prisma.businesses.create({ data: { id: businessId, name: 'Hardware Demo Store', type: 'hardware' } })
    }

  const now = new Date()

    // Categories
    const cat1 = await prisma.businessCategories.upsert({
      where: { id: `${businessId}-cat-fasteners` },
      update: {},
      create: { id: `${businessId}-cat-fasteners`, businessId, businessType: 'hardware', name: 'Fasteners & Hardware', updatedAt: now }
    })

    const cat2 = await prisma.businessCategories.upsert({
      where: { id: `${businessId}-cat-tools` },
      update: {},
      create: { id: `${businessId}-cat-tools`, businessId, businessType: 'hardware', name: 'Tools', updatedAt: now }
    })

    // Suppliers
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

    // Products
    const p1 = await prisma.businessProducts.upsert({
      where: { id: `${businessId}-prod-1` },
      update: {},
      create: {
        id: `${businessId}-prod-1`,
        businessId,
        businessType: 'hardware',
        name: 'Hex Bolt M8 x 30mm',
        sku: 'HB-M8-30',
        basePrice: 0.12,
        categoryId: cat1.id,
        description: 'Standard hex bolt for general purpose'
        ,
        updatedAt: now
      }
    })

    const p2 = await prisma.businessProducts.upsert({
      where: { id: `${businessId}-prod-2` },
      update: {},
      create: {
        id: `${businessId}-prod-2`,
        businessId,
        businessType: 'hardware',
        name: 'Cordless Drill - 18V',
        sku: 'DR-18V-001',
        basePrice: 89.99,
        categoryId: cat2.id,
        description: 'Lightweight cordless drill for DIY tasks'
        ,
        updatedAt: now
      }
    })

    // Variants / images
    const v1 = await prisma.productVariants.upsert({
      where: { id: `${p1.id}-variant-default` },
      update: {},
      create: { id: `${p1.id}-variant-default`, productId: p1.id, sku: `${p1.sku}-STD`, price: p1.basePrice, stockQuantity: 500, updatedAt: now }
    }).catch(() => null)

    const v2 = await prisma.productVariants.upsert({
      where: { id: `${p2.id}-variant-default` },
      update: {},
      create: { id: `${p2.id}-variant-default`, productId: p2.id, sku: `${p2.sku}-STD`, price: p2.basePrice, stockQuantity: 25, updatedAt: now }
    }).catch(() => null)

    await prisma.productImages.createMany({
      data: [
        { id: `${p1.id}-img-1`, productId: p1.id, imageUrl: '/images/seed/hardware/hex-bolt.jpg', altText: 'Hex Bolt', businessType: 'hardware' },
        { id: `${p2.id}-img-1`, productId: p2.id, imageUrl: '/images/seed/hardware/drill.jpg', altText: 'Cordless Drill', businessType: 'hardware' }
      ],
      skipDuplicates: true
    }).catch(() => null)

    // Initial stock movements
    await prisma.businessStockMovements.createMany({
      data: [
        { id: `${p1.id}-stock-1`, businessId, productVariantId: `${p1.id}-variant-default`, movementType: 'PURCHASE_RECEIVED', quantity: 500, notes: 'Initial seed stock', createdAt: new Date(), businessType: 'hardware' },
        { id: `${p2.id}-stock-1`, businessId, productVariantId: `${p2.id}-variant-default`, movementType: 'PURCHASE_RECEIVED', quantity: 25, notes: 'Initial seed stock', createdAt: new Date(), businessType: 'hardware' }
      ],
      skipDuplicates: true
    }).catch(() => null)

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
