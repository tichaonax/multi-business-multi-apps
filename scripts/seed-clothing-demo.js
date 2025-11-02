const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Ensure type-based categories exist before seeding demo data
 */
async function ensureCategoriesExist() {
  const categoriesExist = await prisma.businessCategories.findFirst({
    where: { businessType: 'clothing', businessId: null }
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
    const businessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'clothing-demo-business'
    console.log('Seeding clothing demo data for', businessId)

    // STEP 1: Ensure categories exist (auto-seed if missing)
    await ensureCategoriesExist()

    // STEP 2: Ensure business exists (reuse if found, otherwise create)
    const now = new Date()
    const business = await prisma.businesses.upsert({
      where: { id: businessId },
      update: { 
        name: 'Clothing [Demo]',
        description: 'Demo business for testing - safe to delete',
        isDemo: true,
        updatedAt: now 
      },
      create: { 
        id: businessId, 
        name: 'Clothing [Demo]', 
        type: 'clothing', 
        description: 'Demo business for testing - safe to delete', 
        isActive: true, 
        isDemo: true,
        createdAt: now, 
        updatedAt: now 
      }
    })
    console.log('Using business for clothing demo:', businessId)

    // Get existing type-based categories (no need to create them - they're seeded by seed-type-categories.js)
    // We'll use the standard category IDs from the type-based seeding
    const mensFashionCat = await prisma.businessCategories.findFirst({
      where: { businessType: 'clothing', name: "Men's Fashion", businessId: null }
    })
    const womensFashionCat = await prisma.businessCategories.findFirst({
      where: { businessType: 'clothing', name: "Women's Fashion", businessId: null }
    })
    const accessoriesCat = await prisma.businessCategories.findFirst({
      where: { businessType: 'clothing', name: 'Accessories', businessId: null }
    })

    if (!mensFashionCat || !womensFashionCat || !accessoriesCat) {
      console.error('❌ Type-based categories not found! Please run: npm run seed:categories first')
      process.exitCode = 1
      return
    }

    console.log('✅ Using type-based categories:', {
      mensFashion: mensFashionCat.id,
      womensFashion: womensFashionCat.id,
      accessories: accessoriesCat.id
    })

    // Get subcategories for proper assignment
    const mensShirtsSub = await prisma.inventorySubcategories.findFirst({
      where: { categoryId: mensFashionCat.id, name: { in: ['Shirts', 'Shirts & Tops'] } }
    })
    const womensDressesSub = await prisma.inventorySubcategories.findFirst({
      where: { categoryId: womensFashionCat.id, name: 'Dresses' }
    })

    // STEP 4: Create Suppliers (type-based for clothing businesses)
    const suppliers = [
      { 
        name: 'Fashion Forward Imports', 
        supplierNumber: 'CLO-SUP-001',
        contactPerson: 'Import Manager',
        email: 'orders@fashionforward.com',
        phone: '+1-555-0201',
        description: "Men's and women's apparel supplier"
      },
      { 
        name: 'Quality Fabrics Co', 
        supplierNumber: 'CLO-SUP-002',
        contactPerson: 'Fabric Manager',
        email: 'orders@qualityfabrics.com',
        phone: '+1-555-0202',
        description: 'Textile and fabric supplier'
      },
      { 
        name: 'Accessory Warehouse', 
        supplierNumber: 'CLO-SUP-003',
        contactPerson: 'Accessories Manager',
        email: 'orders@accessorywarehouse.com',
        phone: '+1-555-0203',
        description: 'Belts, bags, and accessories supplier'
      }
    ]

    console.log('\n📦 Creating suppliers...')
    const createdSuppliers = []
    for (const s of suppliers) {
      const supplier = await prisma.businessSuppliers.upsert({
        where: { businessType_supplierNumber: { businessType: 'clothing', supplierNumber: s.supplierNumber } },
        update: { 
          name: s.name,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          notes: s.description,
          updatedAt: now
        },
        create: {
          businessType: 'clothing',
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

    // Expanded product list with realistic pricing and variants
    const products = [
      { 
        id: `${businessId}-prod-tshirt`, 
        name: "Men's Cotton T-Shirt", 
        sku: 'CLO-TSHIRT-001', 
        categoryId: mensFashionCat.id,
        subcategoryId: mensShirtsSub?.id || null,
        basePrice: 19.99, 
        costPrice: 7.50, 
        variants: [ 
          { sku: 'CLO-TSHIRT-001-S-BLK', name: 'S / Black', price: 19.99, stock: 35 }, 
          { sku: 'CLO-TSHIRT-001-M-BLK', name: 'M / Black', price: 19.99, stock: 50 }, 
          { sku: 'CLO-TSHIRT-001-L-BLK', name: 'L / Black', price: 19.99, stock: 40 }, 
          { sku: 'CLO-TSHIRT-001-M-WHT', name: 'M / White', price: 19.99, stock: 30 },
          { sku: 'CLO-TSHIRT-001-L-WHT', name: 'L / White', price: 19.99, stock: 25 }
        ] 
      },
      { 
        id: `${businessId}-prod-jeans`, 
        name: "Men's Denim Jeans", 
        sku: 'CLO-JEANS-001', 
        categoryId: mensFashionCat.id,
        subcategoryId: mensShirtsSub?.id || null,
        basePrice: 59.99, 
        costPrice: 28.00, 
        variants: [ 
          { sku: 'CLO-JEANS-001-32', name: 'W32 / Blue', price: 59.99, stock: 20 }, 
          { sku: 'CLO-JEANS-001-34', name: 'W34 / Blue', price: 59.99, stock: 25 }, 
          { sku: 'CLO-JEANS-001-36', name: 'W36 / Blue', price: 59.99, stock: 18 }
        ] 
      },
      { 
        id: `${businessId}-prod-dress`, 
        name: "Women's Floral Dress", 
        sku: 'CLO-DRESS-001', 
        categoryId: womensFashionCat.id,
        subcategoryId: womensDressesSub?.id || null,
        basePrice: 49.99, 
        costPrice: 22.00, 
        variants: [ 
          { sku: 'CLO-DRESS-001-06', name: 'Size 6 / Floral', price: 49.99, stock: 10 },
          { sku: 'CLO-DRESS-001-08', name: 'Size 8 / Floral', price: 49.99, stock: 15 }, 
          { sku: 'CLO-DRESS-001-10', name: 'Size 10 / Floral', price: 49.99, stock: 12 },
          { sku: 'CLO-DRESS-001-12', name: 'Size 12 / Floral', price: 49.99, stock: 8 }
        ] 
      },
      { 
        id: `${businessId}-prod-blouse`, 
        name: "Women's Silk Blouse", 
        sku: 'CLO-BLOUSE-001', 
        categoryId: womensFashionCat.id,
        subcategoryId: womensDressesSub?.id || null,
        basePrice: 39.99, 
        costPrice: 18.50, 
        variants: [ 
          { sku: 'CLO-BLOUSE-001-S', name: 'S / Cream', price: 39.99, stock: 20 }, 
          { sku: 'CLO-BLOUSE-001-M', name: 'M / Cream', price: 39.99, stock: 28 }, 
          { sku: 'CLO-BLOUSE-001-L', name: 'L / Cream', price: 39.99, stock: 22 }
        ] 
      },
      { 
        id: `${businessId}-prod-jacket`, 
        name: "Women's Leather Jacket", 
        sku: 'CLO-JACKET-001', 
        categoryId: womensFashionCat.id,
        subcategoryId: womensDressesSub?.id || null,
        basePrice: 149.99, 
        costPrice: 78.00, 
        variants: [ 
          { sku: 'CLO-JACKET-001-S', name: 'S / Black', price: 149.99, stock: 8 }, 
          { sku: 'CLO-JACKET-001-M', name: 'M / Black', price: 149.99, stock: 12 }, 
          { sku: 'CLO-JACKET-001-L', name: 'L / Black', price: 149.99, stock: 10 }
        ] 
      },
      { 
        id: `${businessId}-prod-belt`, 
        name: "Leather Belt", 
        sku: 'CLO-BELT-001', 
        categoryId: accessoriesCat.id,
        subcategoryId: null,
        basePrice: 29.99, 
        costPrice: 12.50, 
        variants: [ 
          { sku: 'CLO-BELT-001-32', name: '32" / Brown', price: 29.99, stock: 25 }, 
          { sku: 'CLO-BELT-001-34', name: '34" / Brown', price: 29.99, stock: 30 }, 
          { sku: 'CLO-BELT-001-36', name: '36" / Black', price: 29.99, stock: 28 }
        ] 
      },
      { 
        id: `${businessId}-prod-scarf`, 
        name: "Wool Scarf", 
        sku: 'CLO-SCARF-001', 
        categoryId: accessoriesCat.id,
        subcategoryId: null,
        basePrice: 24.99, 
        costPrice: 10.00, 
        variants: [ 
          { sku: 'CLO-SCARF-001-GRY', name: 'One Size / Grey', price: 24.99, stock: 40 }, 
          { sku: 'CLO-SCARF-001-RED', name: 'One Size / Red', price: 24.99, stock: 35 }
        ] 
      }
    ]

    console.log(`\n👔 Creating ${products.length} clothing products...`)
    let totalVariants = 0
    
    for (const p of products) {
      // Upsert product
      const prod = await prisma.businessProducts.upsert({
        where: { businessId_sku: { businessId, sku: p.sku } },
        update: { description: p.name, basePrice: p.basePrice, costPrice: p.costPrice, categoryId: p.categoryId, subcategoryId: p.subcategoryId, attributes: {}, updatedAt: now },
        create: { businessId, name: p.name, description: p.name, sku: p.sku, barcode: null, categoryId: p.categoryId, subcategoryId: p.subcategoryId, basePrice: p.basePrice, costPrice: p.costPrice, businessType: 'clothing', isActive: true, attributes: {}, createdAt: now, updatedAt: now }
      }).catch(() => null)

      if (!prod) continue

      // Create variants
      for (const v of p.variants || []) {
        const variant = await prisma.productVariants.upsert({
          where: { sku: v.sku },
          update: { price: v.price, stockQuantity: v.stock, isActive: true, updatedAt: now },
          create: { productId: prod.id, name: v.name, sku: v.sku, barcode: null, price: v.price, stockQuantity: v.stock, isActive: true, createdAt: now, updatedAt: now }
        }).catch(() => null)

        // initial stock movements
        if (variant && v.stock && v.stock > 0) {
          const movementId = `${variant.id}-stock-1`
          await prisma.businessStockMovements.createMany({ data: [{ id: movementId, businessId, productVariantId: variant.id, movementType: 'PURCHASE_RECEIVED', quantity: v.stock, unitCost: p.costPrice || null, reference: 'Seed initial stock', reason: 'Initial demo stock', businessType: 'clothing', businessProductId: prod.id, createdAt: now }], skipDuplicates: true }).catch(() => null)
          totalVariants++
        }
      }
      
      console.log(`✅ ${prod.name} - ${p.variants.length} variants (cost: $${p.costPrice}, price: $${p.basePrice})`)
    }

    console.log(`\n✅ Clothing demo seed complete - ${products.length} products, ${totalVariants} variants created`)
  } catch (err) {
    console.error('Clothing seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

module.exports = { seed }

if (require.main === module) seed()
