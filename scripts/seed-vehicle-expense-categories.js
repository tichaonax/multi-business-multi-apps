/**
 * Seed Vehicle Expense Categories
 *
 * Adds categories and subcategories under the existing "Vehicle" ExpenseDomain.
 * Safe to re-run — skips any entry that already exists by name.
 *
 * Structure (maps to the 3-level expense system):
 *   ExpenseDomain  : Vehicle  (already exists — domain-vehicle)
 *   ExpenseCategory: top-level sections from the MD file
 *   ExpenseSubcategory: sub-sections from the MD file
 *
 * Note: the leaf items listed in the MD file (e.g. "Engine repair", "Tires")
 * are one level deeper than the system supports — they serve as descriptive
 * context for the subcategory, not separate records.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const VEHICLE_DOMAIN_ID = 'domain-vehicle'

const CATEGORIES = [
  {
    id: 'cat-veh-repairs',
    name: 'Vehicle Repairs',
    emoji: '🛠️',
    color: '#EF4444',
    description: 'All repair work on vehicles — mechanical, electrical, and body',
    requiresSubcategory: true,
    subcategories: [
      { id: 'sub-veh-rep-auto',   name: 'Auto Repair Services', emoji: '🔧', description: 'Engine, brakes, transmission, suspension, electrical, exhaust, AC and steering repairs' },
      { id: 'sub-veh-rep-parts',  name: 'Replacement Parts',    emoji: '🧩', description: 'Tires, batteries, wipers, lights, belts, sensors, hoses and other replacement parts' },
    ],
  },
  {
    id: 'cat-veh-maintenance',
    name: 'Maintenance and Service',
    emoji: '🛢️',
    color: '#F59E0B',
    description: 'Scheduled maintenance and consumables that keep vehicles running',
    requiresSubcategory: true,
    subcategories: [
      { id: 'sub-veh-mnt-routine',  name: 'Routine Maintenance',    emoji: '🛢️', description: 'Oil changes, tune-ups, tire rotations, filter replacements, inspections and spark plugs' },
      { id: 'sub-veh-mnt-fluids',   name: 'Fluids and Consumables', emoji: '🧪', description: 'Motor oil, transmission fluid, brake fluid, coolant, power steering fluid, washer fluid and grease' },
    ],
  },
  {
    id: 'cat-veh-upkeep',
    name: 'Vehicle Upkeep',
    emoji: '🚘',
    color: '#3B82F6',
    description: 'Cleaning, detailing and accessories that maintain vehicle condition',
    requiresSubcategory: true,
    subcategories: [
      { id: 'sub-veh-upk-cleaning',    name: 'Cleaning and Detailing',         emoji: '🧽', description: 'Car washes, interior and exterior cleaning, waxing, tire shine and upholstery care' },
      { id: 'sub-veh-upk-accessories', name: 'Accessories and Install',         emoji: '🧰', description: 'Seat covers, floor mats, phone mounts, dash cams, roof racks, tool kits and security accessories' },
    ],
  },
  {
    id: 'cat-veh-operating',
    name: 'Operating Costs',
    emoji: '⛽',
    color: '#10B981',
    description: 'Day-to-day costs of running and using vehicles',
    requiresSubcategory: true,
    subcategories: [
      { id: 'sub-veh-op-fuel',   name: 'Fuel and Charging',    emoji: '⛽', description: 'Gasoline, diesel, electric charging, fuel additives and fuel station fees' },
      { id: 'sub-veh-op-road',   name: 'Road and Travel Costs', emoji: '🛣️', description: 'Tolls, parking fees, traffic fines, road permits and trip expenses' },
    ],
  },
  {
    id: 'cat-veh-compliance',
    name: 'Ownership and Compliance',
    emoji: '📄',
    color: '#8B5CF6',
    description: 'Legal, registration, insurance and compliance obligations',
    requiresSubcategory: true,
    subcategories: [
      { id: 'sub-veh-cmp-registration', name: 'Registration and Licensing', emoji: '🪪', description: 'Registration fees, inspection fees, license plates, title fees and renewals' },
      { id: 'sub-veh-cmp-insurance',    name: 'Insurance and Protection',   emoji: '🛡️', description: 'Auto insurance, collision, comprehensive coverage, roadside assistance and warranty plans' },
    ],
  },
  {
    id: 'cat-veh-fleet',
    name: 'Fleet and Business Use',
    emoji: '🚚',
    color: '#06B6D4',
    description: 'Costs specific to business-use vehicles and fleet management',
    requiresSubcategory: true,
    subcategories: [
      { id: 'sub-veh-flt-costs', name: 'Business Vehicle Costs', emoji: '🧑‍🔧', description: 'Fleet maintenance, business fuel, driver reimbursements, delivery vehicle costs and service contracts' },
      { id: 'sub-veh-flt-admin', name: 'Vehicle Administration',  emoji: '📋',   description: 'Logbook and mileage tracking, vehicle records, lease payments and fleet management fees' },
    ],
  },
]

async function seed() {
  console.log('🌱 Seeding vehicle expense categories...\n')

  // Confirm domain exists
  const domain = await prisma.expenseDomains.findUnique({ where: { id: VEHICLE_DOMAIN_ID } })
  if (!domain) {
    console.error(`❌ Vehicle domain "${VEHICLE_DOMAIN_ID}" not found. Aborting.`)
    process.exit(1)
  }
  console.log(`✅ Found domain: ${domain.emoji} ${domain.name}\n`)

  let categoriesCreated = 0
  let categoriesSkipped = 0
  let subcategoriesCreated = 0
  let subcategoriesSkipped = 0

  for (const cat of CATEGORIES) {
    const existing = await prisma.expenseCategories.findFirst({
      where: { name: cat.name, domainId: VEHICLE_DOMAIN_ID },
    })

    let categoryId

    if (existing) {
      console.log(`⏭️  Category "${cat.emoji} ${cat.name}" already exists`)
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
          domainId: VEHICLE_DOMAIN_ID,
        },
      })
      console.log(`✅ Created category "${cat.emoji} ${cat.name}" (${created.id})`)
      categoryId = created.id
      categoriesCreated++
    }

    for (const sub of cat.subcategories) {
      const existingSub = await prisma.expenseSubcategories.findFirst({
        where: { categoryId, name: sub.name },
      })

      if (existingSub) {
        console.log(`   ⏭️  "${sub.emoji} ${sub.name}" already exists`)
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
        console.log(`   ✅ "${sub.emoji} ${sub.name}"`)
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
