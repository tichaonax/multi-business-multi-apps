/**
 * Seed Home Appliance Expense Categories
 *
 * Adds appliance expense categories as global categories (domainId: null)
 * so they appear in all contexts: personal, business, hardware, restaurant, etc.
 *
 * Structure:
 *   - 5 parent categories (Purchase, Repair, Operating Costs, Logistics, Stock & Loss)
 *   - Subcategories per appliance group for Purchase and Repair parents
 *   - Flat subcategories for Operating Costs, Logistics, and Stock & Loss
 *
 * Safe to re-run — skips existing entries.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const applianceTypes = [
  { suffix: 'refrigeration', name: 'Refrigeration',    emoji: '❄️',  description: 'Fridges, freezers, beverage coolers and their parts' },
  { suffix: 'cooking',       name: 'Cooking',          emoji: '🍳',  description: 'Stoves, ovens, microwaves, air fryers and small cooking appliances' },
  { suffix: 'laundry',       name: 'Laundry',          emoji: '🧺',  description: 'Washing machines, dryers and laundry parts' },
  { suffix: 'climate',       name: 'Climate Control',  emoji: '🌬️',  description: 'AC units, fans, heaters and climate control parts' },
  { suffix: 'cleaning',      name: 'Cleaning',         emoji: '🧹',  description: 'Vacuums, steam mops, floor care equipment and parts' },
  { suffix: 'entertainment', name: 'Entertainment',    emoji: '📺',  description: 'TVs, sound systems, game consoles and accessories' },
  { suffix: 'general',       name: 'General',          emoji: '🏠',  description: 'General or mixed appliance expenses' },
]

const CATEGORIES = [
  {
    id: 'cat-appl-purchase',
    name: 'Appliance Purchase & Replacement',
    emoji: '🛒',
    color: '#3B82F6',
    description: 'New appliance purchases, replacement units, upgrades and bulk buys',
    requiresSubcategory: true,
    subcategories: applianceTypes.map(t => ({ id: `sub-appl-pur-${t.suffix}`, name: t.name, emoji: t.emoji, description: t.description })),
  },
  {
    id: 'cat-appl-repair',
    name: 'Appliance Repair & Maintenance',
    emoji: '🔧',
    color: '#F59E0B',
    description: 'Service calls, labour, replacement parts, diagnostics and preventive maintenance',
    requiresSubcategory: true,
    subcategories: applianceTypes.map(t => ({ id: `sub-appl-rep-${t.suffix}`, name: t.name, emoji: t.emoji, description: t.description })),
  },
  {
    id: 'cat-appl-operating',
    name: 'Appliance Operating Costs',
    emoji: '⚡',
    color: '#10B981',
    description: 'Electricity, water, gas usage, warranty and insurance costs for appliances',
    requiresSubcategory: false,
    subcategories: [
      { id: 'sub-appl-op-electricity', name: 'Electricity Usage',  emoji: '⚡',  description: 'Power consumption costs' },
      { id: 'sub-appl-op-water',       name: 'Water Usage',        emoji: '💧',  description: 'Water consumption costs' },
      { id: 'sub-appl-op-gas',         name: 'Gas Usage',          emoji: '🔥',  description: 'Gas consumption costs' },
      { id: 'sub-appl-op-warranty',    name: 'Warranty & Insurance', emoji: '🛡️', description: 'Warranty fees and insurance premiums' },
    ],
  },
  {
    id: 'cat-appl-logistics',
    name: 'Appliance Logistics & Setup',
    emoji: '🚚',
    color: '#8B5CF6',
    description: 'Delivery, installation, setup, disposal and relocation of appliances',
    requiresSubcategory: false,
    subcategories: [
      { id: 'sub-appl-log-delivery',     name: 'Delivery Fees',          emoji: '🚚',  description: 'Shipping and delivery charges' },
      { id: 'sub-appl-log-installation', name: 'Installation Fees',      emoji: '🛠️',  description: 'Professional installation charges' },
      { id: 'sub-appl-log-disposal',     name: 'Removal & Disposal',     emoji: '🗑️',  description: 'Old unit removal and disposal fees' },
      { id: 'sub-appl-log-relocation',   name: 'Relocation Costs',       emoji: '🔄',  description: 'Costs to move appliances between locations' },
    ],
  },
  {
    id: 'cat-appl-loss',
    name: 'Appliance Stock & Loss',
    emoji: '📉',
    color: '#EF4444',
    description: 'Damaged units, theft, returns, warranty replacements and write-offs',
    requiresSubcategory: false,
    subcategories: [
      { id: 'sub-appl-loss-damaged',   name: 'Damaged Units',          emoji: '💥',  description: 'Appliances damaged beyond use' },
      { id: 'sub-appl-loss-theft',     name: 'Theft & Loss',           emoji: '🕵️',  description: 'Stolen or lost appliances' },
      { id: 'sub-appl-loss-returns',   name: 'Returned Units',         emoji: '↩️',  description: 'Customer or supplier returns' },
      { id: 'sub-appl-loss-warranty',  name: 'Warranty Replacements',  emoji: '🛡️',  description: 'Units replaced under warranty' },
      { id: 'sub-appl-loss-writeoff',  name: 'Write-offs',             emoji: '🧾',  description: 'Written-off appliance inventory' },
    ],
  },
]

async function seed() {
  console.log('🌱 Seeding home appliance expense categories...\n')

  let categoriesCreated = 0
  let categoriesSkipped = 0
  let subcategoriesCreated = 0
  let subcategoriesSkipped = 0

  for (const cat of CATEGORIES) {
    // Upsert category
    const existing = await prisma.expenseCategories.findFirst({
      where: { name: cat.name, domainId: null },
    })

    let categoryId

    if (existing) {
      console.log(`⏭️  Category "${cat.emoji} ${cat.name}" already exists — skipping`)
      categoryId = existing.id
      categoriesSkipped++
    } else {
      const created = await prisma.expenseCategories.create({
        data: {
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color,
          description: cat.description,
          requiresSubcategory: cat.requiresSubcategory,
          isDefault: true,
          isUserCreated: false,
          domainId: null,
        },
      })
      console.log(`✅ Created category "${cat.emoji} ${cat.name}" (${created.id})`)
      categoryId = created.id
      categoriesCreated++
    }

    // Upsert subcategories
    for (const sub of cat.subcategories) {
      const existingSub = await prisma.expenseSubcategories.findFirst({
        where: { categoryId, name: sub.name },
      })

      if (existingSub) {
        console.log(`   ⏭️  Subcategory "${sub.emoji} ${sub.name}" already exists`)
        subcategoriesSkipped++
      } else {
        await prisma.expenseSubcategories.create({
          data: {
            id: sub.id,
            categoryId,
            name: sub.name,
            emoji: sub.emoji,
            description: sub.description,
            isDefault: true,
            isUserCreated: false,
          },
        })
        console.log(`   ✅ Created subcategory "${sub.emoji} ${sub.name}"`)
        subcategoriesCreated++
      }
    }

    console.log()
  }

  console.log('─'.repeat(50))
  console.log(`Categories:    ${categoriesCreated} created, ${categoriesSkipped} skipped`)
  console.log(`Subcategories: ${subcategoriesCreated} created, ${subcategoriesSkipped} skipped`)
  console.log('✅ Done.\n')
}

seed()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
