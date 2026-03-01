/**
 * Seed clothing bale categories and bales for the clothing demo business.
 * Idempotent — safe to run multiple times.
 * Run: node scripts/seed-clothing-bales-demo.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const BUSINESS_ID = 'clothing-demo-business'

// ---------------------------------------------------------------------------
// Bale categories (stable UUIDs so re-runs stay idempotent)
// ---------------------------------------------------------------------------
const BALE_CATEGORIES = [
  { id: 'bale-cat-ladies-tshirts',    name: 'Ladies T-Shirts',        description: 'Assorted ladies t-shirts and tops from mixed bales' },
  { id: 'bale-cat-gents-jeans',       name: 'Gents Jeans',            description: 'Men\'s denim jeans — various washes and cuts' },
  { id: 'bale-cat-kids-mixed',        name: 'Kids Mixed Clothing',    description: 'Mixed children\'s wear — boys and girls 2-12 yrs' },
  { id: 'bale-cat-ladies-dresses',    name: 'Ladies Dresses',         description: 'Casual and formal ladies dresses' },
  { id: 'bale-cat-gents-shirts',      name: 'Gents Shirts',           description: 'Men\'s formal and casual shirts' },
  { id: 'bale-cat-ladies-skirts',     name: 'Ladies Skirts',          description: 'Assorted ladies skirts — mini, midi, maxi' },
  { id: 'bale-cat-baby-wear',         name: 'Baby Wear',              description: 'Baby clothing 0-24 months — onesies, rompers, sets' },
  { id: 'bale-cat-gents-trousers',    name: 'Gents Trousers',         description: 'Men\'s trousers — chinos, slacks, cargo' },
  { id: 'bale-cat-ladies-jackets',    name: 'Ladies Jackets & Coats', description: 'Ladies outerwear — jackets, blazers, coats' },
  { id: 'bale-cat-gents-suits',       name: 'Gents Suits',            description: 'Men\'s suits and blazers' },
  { id: 'bale-cat-mixed-shoes',       name: 'Mixed Shoes',            description: 'Assorted second-hand shoes — ladies and gents' },
  { id: 'bale-cat-ladies-jeans',      name: 'Ladies Jeans',           description: 'Women\'s denim jeans — skinny, bootcut, wide leg' },
]

// ---------------------------------------------------------------------------
// Bale stock data for Urban Threads clothing demo
// batchNumber is unique per business
// unitPrice = selling price per item (USD)
// costPrice = total cost of the whole bale (USD)
// itemCount = total items received in bale
// remainingCount = items still in stock (some already sold in demo)
// ---------------------------------------------------------------------------
const BALES = [
  {
    id: 'bale-demo-001',
    categoryId: 'bale-cat-ladies-tshirts',
    batchNumber: 'BALE-2025-001',
    sku: 'BALE-LDT-001',
    barcode: 'BAL001LDT',
    itemCount: 35,
    remainingCount: 22,
    unitPrice: 3.50,
    costPrice: 85.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Mixed colour ladies t-shirts — mostly M/L sizes',
  },
  {
    id: 'bale-demo-002',
    categoryId: 'bale-cat-gents-jeans',
    batchNumber: 'BALE-2025-002',
    sku: 'BALE-GNJ-001',
    barcode: 'BAL002GNJ',
    itemCount: 20,
    remainingCount: 14,
    unitPrice: 8.00,
    costPrice: 120.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Gents blue denim jeans — waist 30-38',
  },
  {
    id: 'bale-demo-003',
    categoryId: 'bale-cat-kids-mixed',
    batchNumber: 'BALE-2025-003',
    sku: 'BALE-KMX-001',
    barcode: 'BAL003KMX',
    itemCount: 52,
    remainingCount: 38,
    unitPrice: 2.00,
    costPrice: 65.00,
    bogoActive: true,
    bogoRatio: 3,
    notes: '3-for-$5 deal. Mixed kids wear ages 2-10',
  },
  {
    id: 'bale-demo-004',
    categoryId: 'bale-cat-ladies-dresses',
    batchNumber: 'BALE-2025-004',
    sku: 'BALE-LDD-001',
    barcode: 'BAL004LDD',
    itemCount: 28,
    remainingCount: 18,
    unitPrice: 5.00,
    costPrice: 95.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Assorted ladies dresses — casual & semi-formal',
  },
  {
    id: 'bale-demo-005',
    categoryId: 'bale-cat-gents-shirts',
    batchNumber: 'BALE-2025-005',
    sku: 'BALE-GNS-001',
    barcode: 'BAL005GNS',
    itemCount: 40,
    remainingCount: 31,
    unitPrice: 4.00,
    costPrice: 110.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Mixed gents shirts — formal and casual, M/L/XL',
  },
  {
    id: 'bale-demo-006',
    categoryId: 'bale-cat-ladies-skirts',
    batchNumber: 'BALE-2025-006',
    sku: 'BALE-LDS-001',
    barcode: 'BAL006LDS',
    itemCount: 30,
    remainingCount: 24,
    unitPrice: 3.00,
    costPrice: 60.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Assorted ladies skirts — mini, midi, maxi',
  },
  {
    id: 'bale-demo-007',
    categoryId: 'bale-cat-baby-wear',
    batchNumber: 'BALE-2025-007',
    sku: 'BALE-BBW-001',
    barcode: 'BAL007BBW',
    itemCount: 60,
    remainingCount: 45,
    unitPrice: 1.50,
    costPrice: 55.00,
    bogoActive: true,
    bogoRatio: 5,
    notes: '5-for-$6 deal. Baby onesies, rompers, sets 0-24 months',
  },
  {
    id: 'bale-demo-008',
    categoryId: 'bale-cat-gents-trousers',
    batchNumber: 'BALE-2025-008',
    sku: 'BALE-GNT-001',
    barcode: 'BAL008GNT',
    itemCount: 25,
    remainingCount: 19,
    unitPrice: 5.50,
    costPrice: 90.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Gents chinos and slacks — waist 30-36',
  },
  {
    id: 'bale-demo-009',
    categoryId: 'bale-cat-ladies-jackets',
    batchNumber: 'BALE-2025-009',
    sku: 'BALE-LDJ-001',
    barcode: 'BAL009LDJ',
    itemCount: 18,
    remainingCount: 12,
    unitPrice: 9.00,
    costPrice: 110.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Ladies jackets and light coats — S/M/L',
  },
  {
    id: 'bale-demo-010',
    categoryId: 'bale-cat-gents-suits',
    batchNumber: 'BALE-2025-010',
    sku: 'BALE-GNS-002',
    barcode: 'BAL010GNS',
    itemCount: 10,
    remainingCount: 7,
    unitPrice: 18.00,
    costPrice: 130.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Gents 2-piece suits — dark colours, sizes 38-44',
  },
  {
    id: 'bale-demo-011',
    categoryId: 'bale-cat-mixed-shoes',
    batchNumber: 'BALE-2025-011',
    sku: 'BALE-MSH-001',
    barcode: 'BAL011MSH',
    itemCount: 30,
    remainingCount: 20,
    unitPrice: 6.00,
    costPrice: 120.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Mixed second-hand shoes — ladies 36-40, gents 40-45',
  },
  {
    id: 'bale-demo-012',
    categoryId: 'bale-cat-ladies-jeans',
    batchNumber: 'BALE-2025-012',
    sku: 'BALE-LDJ-002',
    barcode: 'BAL012LDJ',
    itemCount: 24,
    remainingCount: 17,
    unitPrice: 7.00,
    costPrice: 115.00,
    bogoActive: false,
    bogoRatio: 1,
    notes: 'Ladies denim jeans — skinny and bootcut, sizes 8-16',
  },
]

async function seedBaleCategoriesAndBales() {
  console.log('\n🧺 Seeding clothing bale categories...')
  const categoryMap = {}

  for (const cat of BALE_CATEGORIES) {
    const record = await prisma.clothingBaleCategories.upsert({
      where: { name: cat.name },
      update: { description: cat.description, isActive: true },
      create: {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        isActive: true,
      },
    })
    categoryMap[cat.id] = record.id
    console.log(`  ✅ ${cat.name}`)
  }

  // Confirm the business exists
  const business = await prisma.businesses.findUnique({ where: { id: BUSINESS_ID } })
  if (!business) {
    console.error(`❌ Business "${BUSINESS_ID}" not found. Run seed-clothing-demo.js first.`)
    process.exitCode = 1
    return
  }

  console.log(`\n🧺 Seeding ${BALES.length} clothing bales for ${business.name}...`)

  for (const bale of BALES) {
    const resolvedCategoryId = categoryMap[bale.categoryId] ?? bale.categoryId
    await prisma.clothingBales.upsert({
      where: { businessId_batchNumber: { businessId: BUSINESS_ID, batchNumber: bale.batchNumber } },
      update: {
        categoryId: resolvedCategoryId,
        sku: bale.sku,
        barcode: bale.barcode,
        itemCount: bale.itemCount,
        remainingCount: bale.remainingCount,
        unitPrice: bale.unitPrice,
        costPrice: bale.costPrice,
        bogoActive: bale.bogoActive,
        bogoRatio: bale.bogoRatio,
        notes: bale.notes,
        isActive: true,
      },
      create: {
        id: bale.id,
        businessId: BUSINESS_ID,
        categoryId: resolvedCategoryId,
        batchNumber: bale.batchNumber,
        sku: bale.sku,
        barcode: bale.barcode,
        itemCount: bale.itemCount,
        remainingCount: bale.remainingCount,
        unitPrice: bale.unitPrice,
        costPrice: bale.costPrice,
        bogoActive: bale.bogoActive,
        bogoRatio: bale.bogoRatio,
        notes: bale.notes,
        isActive: true,
      },
    })

    const bogoLabel = bale.bogoActive ? ` [BOGO ${bale.bogoRatio}-for-deal]` : ''
    console.log(
      `  ✅ ${bale.batchNumber} | ${BALE_CATEGORIES.find(c => c.id === bale.categoryId)?.name}` +
      ` | ${bale.remainingCount}/${bale.itemCount} items | $${bale.unitPrice}/ea` +
      ` | cost $${bale.costPrice}${bogoLabel}`
    )
  }

  console.log(`\n✅ Bale seed complete — ${BALE_CATEGORIES.length} categories, ${BALES.length} bales`)
}

async function main() {
  try {
    await seedBaleCategoriesAndBales()
  } catch (err) {
    console.error('Bale seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

module.exports = { seedBaleCategoriesAndBales }

if (require.main === module) main()
