const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Generate realistic barcodes for hardware products
 * @param {string} productName - Product name
 * @param {string} sku - Product SKU
 * @returns {Object} - Barcode data
 */
function generateHardwareBarcode(productName, sku) {
  // Hardware products often use various barcode types
  const barcodeTypes = ['UPC_A', 'EAN_13', 'CODE128']
  const type = barcodeTypes[Math.floor(Math.random() * barcodeTypes.length)]

  let code, isUniversal

  if (type === 'UPC_A') {
    // Generate UPC-A (12 digits)
    const prefix = '6' // Hardware/tools often use 6xxxxxx
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
    // Generate EAN-13 (13 digits)
    const prefix = '590' // European hardware prefix
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
    // Generate Code 128 (alphanumeric)
    code = 'HW' + sku.replace(/[^A-Z0-9]/g, '').slice(-8).padStart(8, '0')
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

  // Create/update variant with stable SKU (idempotent)
  const variantId = `${product.id}-variant-default`
  const variantSku = `${productData.sku}-STD`

  const variant = await prisma.productVariants.upsert({
    where: { id: variantId },
    update: { price: productData.basePrice, stockQuantity: initialStock, updatedAt: now },
    create: {
      id: variantId,
      productId: product.id,
      sku: variantSku,
      price: productData.basePrice,
      stockQuantity: initialStock,
      createdAt: now,
      updatedAt: now,
    },
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

  // Create barcode entries in the new ProductBarcodes table
  const barcodeData = generateHardwareBarcode(productData.name, productData.sku)
  
  // Create barcode for the product
  await createProductBarcode(product.id, null, barcodeData)
  
  // Create barcode for the variant (same barcode for now)
  await createProductBarcode(product.id, variant.id, barcodeData)

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

/**
 * Create business account and expense account for a business
 * Mirrors the behavior from /api/admin/businesses/route.ts
 */
async function createBusinessAccounts(businessId, businessName, creatorId = 'admin-system-user-default') {
  const INCOME_AMOUNT = 12000    // Opening credit on business account (represents accumulated sales)
  const EXPENSE_TRANSFER = 4000  // Transfer from business account → expense account

  // 1. Create business account if missing
  const existingBizAccount = await prisma.businessAccounts.findUnique({ where: { businessId } })
  if (!existingBizAccount) {
    await prisma.businessAccounts.create({
      data: { businessId, balance: 0, updatedAt: new Date(), createdBy: creatorId },
    })
    console.log(`  ✅ Created business account for ${businessName}`)
  } else {
    console.log(`  ℹ️  Business account already exists for ${businessName}`)
  }

  // 2. Create expense account if missing, or link if businessId was null
  const existingAccounts = await prisma.expenseAccounts.count()
  const accountNumber = `EXP-${String(existingAccounts + 1).padStart(3, '0')}`
  let expenseAccount = await prisma.expenseAccounts.findFirst({
    where: { accountName: `${businessName} Expense Account` }
  })
  if (!expenseAccount) {
    expenseAccount = await prisma.expenseAccounts.create({
      data: {
        accountNumber, accountName: `${businessName} Expense Account`,
        description: `Default expense account for ${businessName}`,
        balance: 0, lowBalanceThreshold: 500, isActive: true, createdBy: creatorId, businessId,
      },
    })
    console.log(`  ✅ Created expense account: ${accountNumber} - ${businessName} Expense Account`)
  } else if (!expenseAccount.businessId) {
    await prisma.expenseAccounts.update({ where: { id: expenseAccount.id }, data: { businessId } })
    console.log(`  ✅ Linked expense account to business: ${businessName}`)
  } else {
    console.log(`  ℹ️  Expense account already exists for ${businessName}`)
  }

  // 3. Remove any wrong MANUAL demo deposits (backwards-compat cleanup)
  await prisma.expenseAccountDeposits.deleteMany({
    where: { expenseAccountId: expenseAccount.id, sourceType: 'MANUAL' }
  })

  // 4. Seed business account income (CREDIT) if not already done
  const existingCredit = await prisma.businessTransactions.findFirst({
    where: { businessId, type: 'CREDIT', referenceType: 'SEED' }
  })
  if (!existingCredit) {
    await prisma.businessTransactions.create({
      data: {
        businessId, type: 'CREDIT', amount: INCOME_AMOUNT,
        description: `Owner investment — opening capital (demo seed)`,
        balanceAfter: INCOME_AMOUNT, createdBy: creatorId,
        referenceType: 'SEED', referenceId: businessId,
      }
    })
    await prisma.businessAccounts.update({ where: { businessId }, data: { balance: INCOME_AMOUNT } })
    console.log(`  ✅ Credited $${INCOME_AMOUNT} to business account`)
  }

  // 5. Transfer from business → expense account (BUSINESS-type deposit)
  const existingDeposit = await prisma.expenseAccountDeposits.findFirst({
    where: { expenseAccountId: expenseAccount.id, sourceType: 'BUSINESS' }
  })
  if (!existingDeposit) {
    const credits = await prisma.businessTransactions.aggregate({
      where: { businessId, type: { in: ['CREDIT', 'deposit', 'transfer', 'loan_received'] } }, _sum: { amount: true }
    })
    const debits = await prisma.businessTransactions.aggregate({
      where: { businessId, type: { in: ['DEBIT', 'withdrawal', 'loan_disbursement', 'loan_payment'] } }, _sum: { amount: true }
    })
    const trueBalance = Number(credits._sum.amount || 0) - Math.abs(Number(debits._sum.amount || 0))
    const balanceAfter = trueBalance - EXPENSE_TRANSFER

    await prisma.expenseAccountDeposits.create({
      data: {
        expenseAccountId: expenseAccount.id, sourceType: 'BUSINESS', sourceBusinessId: businessId,
        amount: EXPENSE_TRANSFER, depositDate: new Date(),
        autoGeneratedNote: `Transfer from ${businessName} for operating expenses`, createdBy: creatorId,
      }
    })
    await prisma.businessTransactions.create({
      data: {
        businessId, type: 'DEBIT', amount: -EXPENSE_TRANSFER,
        description: `Transfer to ${businessName} Expense Account`,
        balanceAfter, createdBy: creatorId,
        referenceType: 'EXPENSE_DEPOSIT', referenceId: expenseAccount.id,
      }
    })
    await prisma.businessAccounts.update({ where: { businessId }, data: { balance: balanceAfter } })
    await prisma.expenseAccounts.update({ where: { id: expenseAccount.id }, data: { balance: EXPENSE_TRANSFER } })
    console.log(`  ✅ Transferred $${EXPENSE_TRANSFER} to expense account (business balance: $${balanceAfter})`)
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

    // Create business account and expense account
    await createBusinessAccounts(businessId, business.name)

    // STEP 3: Get type-based categories
    const [cat1, cat2, cat3, cat4, cat5] = await Promise.all([
      prisma.businessCategories.findFirst({ where: { businessType: 'hardware', name: 'Hand Tools',         businessId: null } }),
      prisma.businessCategories.findFirst({ where: { businessType: 'hardware', name: 'Power Tools',        businessId: null } }),
      prisma.businessCategories.findFirst({ where: { businessType: 'hardware', name: 'Building Materials', businessId: null } }),
      prisma.businessCategories.findFirst({ where: { businessType: 'hardware', name: 'Plumbing',           businessId: null } }),
      prisma.businessCategories.findFirst({ where: { businessType: 'hardware', name: 'Electrical',         businessId: null } }),
    ])

    if (!cat1 || !cat2 || !cat3 || !cat4 || !cat5) {
      console.error('❌ Hardware categories still not found after seeding!')
      process.exitCode = 1
      return
    }

    console.log('✅ Using type-based categories:', {
      handTools: cat1.id, powerTools: cat2.id, buildingMaterials: cat3.id, plumbing: cat4.id, electrical: cat5.id
    })

    // STEP 4: Create Suppliers (type-scoped, stable IDs)
    const supplier = await prisma.businessSuppliers.upsert({
      where: { businessType_supplierNumber: { businessType: 'hardware', supplierNumber: 'HW-SUP-001' } },
      update: { name: 'BuildPro Hardware Wholesale', updatedAt: now },
      create: {
        businessType: 'hardware',
        supplierNumber: 'HW-SUP-001',
        name: 'BuildPro Hardware Wholesale',
        contactPerson: 'Procurement Manager',
        email: 'orders@buildprowholesale.com',
        phone: '+263-77-100-0001',
        notes: 'Main hardware and tools wholesale supplier',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    })
    console.log('✅ Created supplier:', supplier.name)

    // STEP 5: Create Products — all 5 hardware categories
    const products = [
      // --- Hand Tools ---
      { sku: 'HW-HAM-CL16',    name: 'Claw Hammer 16oz',           description: 'Fibreglass handle claw hammer',            basePrice: 8.50,   costPrice: 4.00,  categoryId: cat1.id, stock: 40 },
      { sku: 'HW-HAM-SL2KG',   name: 'Sledgehammer 2kg',           description: 'Heavy-duty sledgehammer with long handle',  basePrice: 18.00,  costPrice: 9.00,  categoryId: cat1.id, stock: 15 },
      { sku: 'HW-SDR-PH2',     name: 'Phillips Screwdriver PH2',   description: 'Professional chrome-vanadium screwdriver',  basePrice: 3.50,   costPrice: 1.50,  categoryId: cat1.id, stock: 80 },
      { sku: 'HW-SDR-FLAT',    name: 'Flat-Head Screwdriver 6"',   description: 'Flat-blade screwdriver for general use',    basePrice: 2.50,   costPrice: 1.00,  categoryId: cat1.id, stock: 80 },
      { sku: 'HW-WRN-ADJ10',   name: 'Adjustable Wrench 10"',      description: '10-inch adjustable spanner wrench',         basePrice: 7.00,   costPrice: 3.20,  categoryId: cat1.id, stock: 35 },
      { sku: 'HW-WRN-SOCK12',  name: 'Socket Set 1/2" Drive 12pc', description: 'CrV socket set with ratchet handle',        basePrice: 22.00,  costPrice: 11.00, categoryId: cat1.id, stock: 20 },
      { sku: 'HW-MES-5M',      name: 'Tape Measure 5m',            description: 'Self-locking retractable tape measure',     basePrice: 4.50,   costPrice: 2.00,  categoryId: cat1.id, stock: 60 },
      { sku: 'HW-LVL-60',      name: 'Spirit Level 60cm',          description: 'Aluminium spirit level with 3 vials',       basePrice: 9.00,   costPrice: 4.50,  categoryId: cat1.id, stock: 25 },
      { sku: 'HW-PLR-COM',     name: 'Combination Pliers 8"',      description: 'Multi-purpose combination pliers',          basePrice: 5.00,   costPrice: 2.20,  categoryId: cat1.id, stock: 50 },
      { sku: 'HW-CHI-WOOD25',  name: 'Wood Chisel 25mm',           description: 'High-carbon steel wood chisel',             basePrice: 4.00,   costPrice: 1.80,  categoryId: cat1.id, stock: 30 },
      { sku: 'HW-HBT-M8',      name: 'Hex Bolts M8 x 30mm (20pk)','description': 'Grade 8.8 hex bolts, pack of 20',         basePrice: 1.80,   costPrice: 0.70,  categoryId: cat1.id, stock: 200 },
      { sku: 'HW-NUT-M8',      name: 'Hex Nuts M8 (50pk)',         description: 'Zinc-plated hex nuts, pack of 50',          basePrice: 1.20,   costPrice: 0.45,  categoryId: cat1.id, stock: 250 },
      { sku: 'HW-WDB-HAND',    name: 'Hand Saw 22"',               description: '8 TPI crosscut handsaw',                   basePrice: 11.00,  costPrice: 5.00,  categoryId: cat1.id, stock: 22 },

      // --- Power Tools ---
      { sku: 'HW-DRL-18V',     name: 'Cordless Drill 18V',         description: '18V Li-ion drill with 2-speed gearbox',    basePrice: 65.00,  costPrice: 38.00, categoryId: cat2.id, stock: 20 },
      { sku: 'HW-DRL-IMP20V',  name: 'Impact Driver 20V',          description: 'High-torque impact driver with LED',        basePrice: 75.00,  costPrice: 44.00, categoryId: cat2.id, stock: 15 },
      { sku: 'HW-SAW-CIR7',    name: 'Circular Saw 7.25"',         description: 'Electric circular saw 1200W',              basePrice: 95.00,  costPrice: 55.00, categoryId: cat2.id, stock: 12 },
      { sku: 'HW-SAW-JIG',     name: 'Jigsaw 500W',                description: 'Variable-speed jigsaw with orbital action',basePrice: 55.00,  costPrice: 32.00, categoryId: cat2.id, stock: 10 },
      { sku: 'HW-GRN-ANG4',    name: 'Angle Grinder 4.5"',         description: '850W angle grinder with guard',            basePrice: 48.00,  costPrice: 28.00, categoryId: cat2.id, stock: 25 },
      { sku: 'HW-SND-ORB',     name: 'Orbital Sander 1/4 sheet',   description: 'Random orbital sander 200W',               basePrice: 38.00,  costPrice: 22.00, categoryId: cat2.id, stock: 14 },
      { sku: 'HW-DRL-HAMM',    name: 'Hammer Drill 800W',          description: '2-function hammer drill with keyless chuck',basePrice: 55.00,  costPrice: 32.00, categoryId: cat2.id, stock: 18 },
      { sku: 'HW-GEN-1KVA',    name: 'Generator 1KVA',             description: 'Portable petrol generator, recoil start',  basePrice: 280.00, costPrice: 180.00,categoryId: cat2.id, stock: 5 },

      // --- Building Materials ---
      { sku: 'HW-CEM-50KG',    name: 'Portland Cement 50kg',       description: 'Grade 32.5R ordinary Portland cement',     basePrice: 12.00,  costPrice: 8.50,  categoryId: cat3.id, stock: 80 },
      { sku: 'HW-PAI-WHT5L',   name: 'White Gloss Paint 5L',       description: 'Interior/exterior oil-based gloss paint',  basePrice: 18.00,  costPrice: 11.00, categoryId: cat3.id, stock: 30 },
      { sku: 'HW-PAI-EML5L',   name: 'Emulsion Paint 5L',          description: 'Interior water-based emulsion paint',      basePrice: 14.00,  costPrice: 8.50,  categoryId: cat3.id, stock: 40 },
      { sku: 'HW-ROLL-9IN',    name: 'Paint Roller 9" Set',         description: 'Paint roller with tray and sleeve',        basePrice: 4.50,   costPrice: 2.00,  categoryId: cat3.id, stock: 50 },
      { sku: 'HW-BRUSH-3IN',   name: 'Paint Brush 3"',             description: 'Synthetic bristle paint brush',            basePrice: 1.50,   costPrice: 0.60,  categoryId: cat3.id, stock: 120 },
      { sku: 'HW-SAND-80G',    name: 'Sandpaper 80 Grit (10pk)',   description: 'Aluminium oxide sandpaper sheets',         basePrice: 2.50,   costPrice: 1.00,  categoryId: cat3.id, stock: 80 },
      { sku: 'HW-PLY-12MM',    name: 'Plywood Sheet 12mm 8x4',     description: 'Marine-grade plywood 2440x1220x12mm',      basePrice: 28.00,  costPrice: 18.00, categoryId: cat3.id, stock: 20 },
      { sku: 'HW-NAIL-3IN',    name: 'Common Nails 3" (1kg)',       description: 'Bright common wire nails, 1kg box',        basePrice: 1.80,   costPrice: 0.80,  categoryId: cat3.id, stock: 150 },
      { sku: 'HW-PUTTY-KNF',   name: 'Putty Knife 4"',             description: 'Flexible stainless steel putty knife',     basePrice: 2.00,   costPrice: 0.80,  categoryId: cat3.id, stock: 45 },
      { sku: 'HW-CAULK-WH',    name: 'Silicone Sealant White',     description: 'All-purpose silicone caulk, white',        basePrice: 3.50,   costPrice: 1.60,  categoryId: cat3.id, stock: 60 },

      // --- Plumbing ---
      { sku: 'HW-PPV-20MM',    name: 'PVC Pipe 20mm x 6m',         description: 'Class 10 pressure PVC pipe',               basePrice: 5.00,   costPrice: 2.80,  categoryId: cat4.id, stock: 40 },
      { sku: 'HW-PPV-32MM',    name: 'PVC Pipe 32mm x 6m',         description: 'Class 10 pressure PVC pipe',               basePrice: 8.50,   costPrice: 5.00,  categoryId: cat4.id, stock: 30 },
      { sku: 'HW-ELB-20MM',    name: 'PVC Elbow 90° 20mm',         description: 'Solvent-weld 90-degree elbow fitting',     basePrice: 0.60,   costPrice: 0.25,  categoryId: cat4.id, stock: 200 },
      { sku: 'HW-TEE-20MM',    name: 'PVC Tee 20mm',               description: 'Equal tee solvent-weld fitting',           basePrice: 0.80,   costPrice: 0.35,  categoryId: cat4.id, stock: 150 },
      { sku: 'HW-BALL-20MM',   name: 'Ball Valve 20mm',            description: 'Brass ball valve with lever handle',       basePrice: 4.50,   costPrice: 2.50,  categoryId: cat4.id, stock: 35 },
      { sku: 'HW-TAP-SINK',    name: 'Pillar Tap (Pair)',           description: 'Chrome-plated brass pillar taps',          basePrice: 12.00,  costPrice: 6.50,  categoryId: cat4.id, stock: 20 },
      { sku: 'HW-PTFE-12MM',   name: 'PTFE Thread Seal Tape',      description: '12mm x 10m plumber\'s thread tape',        basePrice: 0.80,   costPrice: 0.30,  categoryId: cat4.id, stock: 300 },
      { sku: 'HW-FLX-HOSE',    name: 'Flexible Hose 300mm',        description: 'Braided stainless flexible connector',     basePrice: 2.50,   costPrice: 1.20,  categoryId: cat4.id, stock: 60 },

      // --- Electrical ---
      { sku: 'HW-WIR-2.5R',    name: 'Electrical Wire 2.5mm² Red 10m',  description: 'Single-core PVC insulated wire',     basePrice: 8.00,   costPrice: 5.00,  categoryId: cat5.id, stock: 50 },
      { sku: 'HW-WIR-2.5B',    name: 'Electrical Wire 2.5mm² Black 10m','description': 'Single-core PVC insulated wire',   basePrice: 8.00,   costPrice: 5.00,  categoryId: cat5.id, stock: 50 },
      { sku: 'HW-WIR-6MM',     name: 'Electrical Wire 6mm² 10m',        description: 'Heavy-duty single-core PVC wire',    basePrice: 14.00,  costPrice: 9.00,  categoryId: cat5.id, stock: 30 },
      { sku: 'HW-SW-1GANG',    name: 'Light Switch 1-Gang',             description: 'Flush-mount 1-gang light switch',   basePrice: 1.80,   costPrice: 0.80,  categoryId: cat5.id, stock: 100 },
      { sku: 'HW-SW-2GANG',    name: 'Light Switch 2-Gang',             description: 'Flush-mount 2-gang light switch',   basePrice: 2.50,   costPrice: 1.10,  categoryId: cat5.id, stock: 80 },
      { sku: 'HW-SKT-13A',     name: 'Power Socket 13A Double',         description: '13A double switched power outlet',  basePrice: 3.50,   costPrice: 1.60,  categoryId: cat5.id, stock: 90 },
      { sku: 'HW-BLB-LED9W',   name: 'LED Bulb 9W E27',                 description: '9W cool-white LED Edison-screw bulb',basePrice: 2.20,   costPrice: 1.00,  categoryId: cat5.id, stock: 120 },
      { sku: 'HW-BLB-LED15W',  name: 'LED Bulb 15W E27',                description: '15W warm-white LED Edison-screw',   basePrice: 3.50,   costPrice: 1.60,  categoryId: cat5.id, stock: 80 },
      { sku: 'HW-CB-20A',      name: 'Circuit Breaker 20A',              description: 'Single-pole 20A MCB DIN-rail mount',basePrice: 5.50,   costPrice: 3.00,  categoryId: cat5.id, stock: 40 },
      { sku: 'HW-EXTL-3M',     name: 'Extension Lead 3m 4-way',         description: '4-socket extension reel 3m cable',  basePrice: 7.00,   costPrice: 4.00,  categoryId: cat5.id, stock: 35 },
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

    console.log(`\n✅ Seeded ${products.length} hardware products across 5 categories with realistic pricing`)

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
