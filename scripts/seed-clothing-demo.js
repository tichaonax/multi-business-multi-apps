const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Generate realistic barcodes for clothing products
 * @param {string} productName - Product name
 * @param {string} sku - Product SKU
 * @returns {Object} - Barcode data
 */
function generateClothingBarcode(productName, sku) {
  // Clothing products often use various barcode types
  const barcodeTypes = ['UPC_A', 'EAN_13', 'CODE128']
  const type = barcodeTypes[Math.floor(Math.random() * barcodeTypes.length)]

  let code, isUniversal

  if (type === 'UPC_A') {
    // Generate UPC-A (12 digits) - common for retail clothing
    const prefix = '8' // Retail/clothing prefix
    const uniqueId = sku.replace(/[^0-9]/g, '').slice(-5).padStart(5, '0')
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    const baseCode = prefix + uniqueId + randomPart // 1 + 5 + 5 = 11 digits
    const checkDigit = calculateUPCCheckDigit(fullBase)
    code = fullBase + checkDigit
    isUniversal = true
  } else if (type === 'EAN_13') {
    // Generate EAN-13 (13 digits) - common for international fashion
    const prefix = '890' // Fashion/apparel prefix
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
    // Generate Code 128 (alphanumeric) - for custom fashion items
    code = 'CLO' + sku.replace(/[^A-Z0-9]/g, '').slice(-8).padStart(8, '0')
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
    console.log('🔍 Checking for existing clothing demo businesses...')

    const now = new Date()

    // STEP 1: Ensure categories exist (auto-seed if missing)
    await ensureCategoriesExist()

    // STEP 2: Check for existing demo businesses
    const existingDemoBusinesses = await prisma.businesses.findMany({
      where: {
        type: 'clothing',
        OR: [
          { isDemo: true },
          { name: { contains: '[Demo]' } },
          { id: { contains: 'demo' } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    })

    let business
    const businessId = 'clothing-demo-business'

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
          description: 'Demo business for testing - safe to delete',
          updatedAt: now
        }
      })

      // Clean up any other demo businesses with wrong IDs
      const otherDemos = await prisma.businesses.findMany({
        where: {
          type: 'clothing',
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
          name: 'Clothing [Demo]',
          type: 'clothing',
          description: 'Demo business for testing - safe to delete',
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
          name: 'Clothing [Demo]',
          type: 'clothing',
          description: 'Demo business for testing - safe to delete',
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

      // Create barcode entries in the new ProductBarcodes table
      const barcodeData = generateClothingBarcode(p.name, p.sku)
      
      // Create barcode for the product
      await createProductBarcode(prod.id, null, barcodeData)
      
      // Create barcodes for all variants
      for (const v of p.variants || []) {
        const variant = await prisma.productVariants.findFirst({ where: { sku: v.sku } })
        if (variant) {
          await createProductBarcode(prod.id, variant.id, barcodeData)
        }
      }
      
      console.log(`✅ ${prod.name} - ${p.variants.length} variants (cost: $${p.costPrice}, price: $${p.basePrice})`)
      console.log(`   📱 Added barcode: ${barcodeData.code} (${barcodeData.type})`)
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
