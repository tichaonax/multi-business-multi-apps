/**
 * Seed Meal Program Demo — Restaurant Only
 * Creates MealProgramParticipants, MealProgramEligibleItems, and 60 days
 * of MealProgramTransactions (Mon–Fri, ~85% daily attendance).
 *
 * Idempotent — safe to run multiple times.
 * Run: node scripts/seed-meal-program-demo.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const BUSINESS_ID = 'restaurant-demo-business'

// Deterministic hash — same input always gives same output
function hash(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}
// Better distribution using two hash rounds
function rnd(seed) {
  const h1 = hash(seed)
  const h2 = hash(`${seed}-r2`)
  return ((h1 * 31 + h2) % 100000) / 100000
}

// Eligible menu item names to look up
const ELIGIBLE_ITEM_NAMES = [
  'Garlic Bread',
  'Soup of the Day',
  'Caesar Salad',
  'Coca-Cola 330ml',
]

// Subsidy per meal (restaurant covers 50 cents)
const SUBSIDY_AMOUNT = 0.50

async function seedMealProgram() {
  console.log('\n🍽️  Seeding restaurant meal program...\n')

  const business = await prisma.businesses.findUnique({ where: { id: BUSINESS_ID } })
  if (!business) {
    console.log(`ℹ️  Business "${BUSINESS_ID}" not found — skipping meal program seed (demo data not required).`)
    return
  }

  // Resolve a creator/seller user (manager or admin fallback)
  let creatorUser = await prisma.users.findUnique({ where: { email: 'marcus.thompson@restaurant-demo.com' } })
  if (!creatorUser) creatorUser = await prisma.users.findUnique({ where: { email: 'admin@business.local' } })
  if (!creatorUser) {
    console.error('❌ No admin/manager user found. Create admin user first.')
    process.exitCode = 1
    return
  }
  console.log(`👤 Using registrar: ${creatorUser.email}`)

  // Find the expense account for meal subsidy charges
  // businessId may be null (created by restaurant seed without businessId) so search broadly
  let expenseAccount = await prisma.expenseAccounts.findFirst({
    where: { businessId: BUSINESS_ID, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!expenseAccount) {
    // Fallback: find by name pattern (restaurant seed creates "Restaurant [Demo] Expense Account")
    expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { accountName: { contains: 'Restaurant' }, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  }
  if (!expenseAccount) {
    // Create a minimal expense account for the restaurant
    expenseAccount = await prisma.expenseAccounts.create({
      data: {
        accountNumber: `EXP-REST-MEAL-${Date.now()}`,
        accountName: 'Restaurant Meal Program Account',
        description: 'Expense account for employee meal program subsidies',
        balance: 5000,
        isActive: true,
        createdBy: creatorUser.id,
        businessId: BUSINESS_ID,
      },
    })
    console.log(`  ✅ Created meal program expense account`)
  }
  console.log(`💰 Charging subsidies to: ${expenseAccount.accountName}\n`)

  // -------------------------------------------------------------------------
  // Step A — Participants: all active employees at the restaurant
  // -------------------------------------------------------------------------
  const employees = await prisma.employees.findMany({
    where: { primaryBusinessId: BUSINESS_ID, isActive: true },
    select: { id: true, fullName: true, userId: true },
  })
  if (employees.length === 0) {
    console.log('⚠️  No employees found for restaurant. Run seed-demo-employees.js first.')
    return
  }

  console.log(`👥 Registering ${employees.length} employees as meal program participants...`)
  const participants = []
  for (const emp of employees) {
    const existing = await prisma.mealProgramParticipants.findFirst({
      where: { businessId: BUSINESS_ID, employeeId: emp.id },
    })
    if (existing) {
      participants.push(existing)
      console.log(`  ⏭️  Already registered: ${emp.fullName}`)
      continue
    }
    const participant = await prisma.mealProgramParticipants.create({
      data: {
        businessId: BUSINESS_ID,
        participantType: 'EMPLOYEE',
        employeeId: emp.id,
        isActive: true,
        registeredBy: creatorUser.id,
        notes: 'Demo participant — seeded',
      },
    })
    participants.push(participant)
    console.log(`  ✅ Registered: ${emp.fullName}`)
  }

  // -------------------------------------------------------------------------
  // Step B — Eligible Items: look up by name from restaurant menu
  // -------------------------------------------------------------------------
  console.log('\n🥗 Marking eligible meal items...')
  const eligibleProductIds = []
  for (const itemName of ELIGIBLE_ITEM_NAMES) {
    const product = await prisma.businessProducts.findFirst({
      where: { businessId: BUSINESS_ID, name: itemName, isActive: true },
      select: { id: true, name: true, basePrice: true },
    })
    if (!product) {
      console.log(`  ⚠️  Product not found: "${itemName}" — skipping`)
      continue
    }
    const existing = await prisma.mealProgramEligibleItems.findFirst({
      where: { businessId: BUSINESS_ID, productId: product.id },
    })
    if (!existing) {
      await prisma.mealProgramEligibleItems.create({
        data: {
          businessId: BUSINESS_ID,
          productId: product.id,
          isActive: true,
          notes: 'Staff meal item',
          createdBy: creatorUser.id,
        },
      })
    }
    eligibleProductIds.push({ id: product.id, name: product.name, price: Number(product.basePrice) })
    console.log(`  ✅ ${product.name} ($${product.basePrice})`)
  }

  if (eligibleProductIds.length === 0) {
    console.log('⚠️  No eligible items found — skipping transactions')
    return
  }

  // Get the default product variant for each eligible product
  const eligibleVariants = []
  for (const prod of eligibleProductIds) {
    const variant = await prisma.productVariants.findFirst({
      where: { productId: prod.id },
      select: { id: true, price: true, sku: true },
    })
    if (variant) eligibleVariants.push({ ...prod, variantId: variant.id, variantPrice: Number(variant.price || prod.price) })
  }

  if (eligibleVariants.length === 0) {
    console.log('⚠️  No eligible product variants found — skipping transactions')
    return
  }

  // -------------------------------------------------------------------------
  // Step C — 60 days of meal transactions (Mon–Fri, ~85% attendance)
  // -------------------------------------------------------------------------
  console.log('\n📅 Generating 60 days of meal transactions...')

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const days = []
  for (let i = 59; i >= 0; i--) {
    days.push(new Date(today.getTime() - i * 86400000))
  }

  let txCount = 0

  for (const participant of participants) {
    // Get employee userId for soldByUserId (required field)
    const emp = employees.find(e => e.id === participant.employeeId)
    const soldByUserId = emp?.userId ?? creatorUser.id  // fallback to manager

    let empTx = 0
    for (const day of days) {
      const dow = day.getUTCDay()
      if (dow === 0 || dow === 6) continue  // weekdays only

      // ~85% chance of having a meal
      const seed = `meal-${participant.id}-${day.toISOString().slice(0,10)}`
      if (rnd(seed) > 0.85) continue

      const dateStr = day.toISOString().slice(0,10).replace(/-/g,'')
      const orderNumber = `MEAL-${participant.employeeId.slice(0,8)}-${dateStr}`

      // Idempotent: skip if order already exists
      const existingOrder = await prisma.businessOrders.findFirst({
        where: { businessId: BUSINESS_ID, orderNumber },
      })
      if (existingOrder) { empTx++; continue }

      // Pick an eligible item deterministically
      const itemIdx = Math.floor(rnd(`${seed}-item`) * eligibleVariants.length)
      const item = eligibleVariants[itemIdx]
      const itemPrice = item.variantPrice

      const subsidyAmount = Math.min(SUBSIDY_AMOUNT, itemPrice)
      const cashAmount = Math.max(0, Math.round((itemPrice - subsidyAmount) * 100) / 100)
      const totalAmount = itemPrice

      // Meal time: 12:00–12:30 PM Zimbabwe (UTC+2) = 10:00–10:30 AM UTC
      const mealMinute = Math.floor(rnd(`${seed}-time`) * 30)
      const mealTime = new Date(day.getTime() + (10 * 60 + mealMinute) * 60000)

      // Create the business order
      const order = await prisma.businessOrders.create({
        data: {
          businessId: BUSINESS_ID,
          orderNumber,
          orderType: 'SALE',
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          paymentMethod: 'CASH',
          subtotal: itemPrice,
          taxAmount: 0,
          totalAmount,
          businessType: 'restaurant',
          notes: 'Staff meal — meal program',
          attributes: { mealProgram: true, subsidyApplied: true },
          createdAt: mealTime,
          updatedAt: mealTime,
          transactionDate: mealTime,
        },
      })

      // Create order item
      await prisma.businessOrderItems.create({
        data: {
          orderId: order.id,
          productVariantId: item.variantId,
          quantity: 1,
          unitPrice: itemPrice,
          totalPrice: itemPrice,
          createdAt: mealTime,
        },
      })

      // Create meal program transaction
      await prisma.mealProgramTransactions.create({
        data: {
          businessId: BUSINESS_ID,
          participantId: participant.id,
          orderId: order.id,
          expenseAccountId: expenseAccount.id,
          soldByUserId: creatorUser.id,
          soldByEmployeeId: emp?.id ?? null,
          subsidyAmount,
          cashAmount,
          totalAmount,
          subsidizedProductId: item.id,
          subsidizedProductName: item.name,
          subsidizedIsEligibleItem: true,
          transactionDate: mealTime,
          itemsSummary: [{ name: item.name, qty: 1, price: itemPrice, subsidy: subsidyAmount }],
          notes: 'Demo meal transaction',
        },
      })

      empTx++
      txCount++
    }
    console.log(`  ✅ ${employees.find(e => e.id === participant.employeeId)?.fullName ?? participant.id} — ${empTx} meals`)
  }

  console.log(`\n✅ Meal program seed complete`)
  console.log(`   👥 ${participants.length} participants`)
  console.log(`   🥗 ${eligibleVariants.length} eligible items`)
  console.log(`   🍽️  ${txCount} meal transactions created`)
}

async function main() {
  try {
    await seedMealProgram()
  } catch (err) {
    console.error('Meal program seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()

module.exports = { seedMealProgram }
