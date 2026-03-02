/**
 * Seed Demo Customers — All Businesses
 * Creates realistic customers for all 4 demo businesses, then links a portion
 * of existing completed orders to those customers and updates totalSpent.
 *
 * Idempotent — safe to run multiple times.
 * Run: node scripts/seed-demo-customers-all-businesses.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Deterministic hash (same as attendance seed — ensures stable "randomness")
// ---------------------------------------------------------------------------
function hash(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}
function rnd(seed) { return (hash(seed) % 100000) / 100000 }

// ---------------------------------------------------------------------------
// Customer name pool — Zimbabwe / Southern African names
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Tendai','Rumbidzai','Tapiwa','Chipo','Nyasha','Tatenda','Blessing','Simba',
  'Farai','Rutendo','Takudzwa','Tafadzwa','Kudzai','Fungai','Tawanda','Rudo',
  'Tinashe','Mazvita','Tariro','Shamiso','Gamuchirai','Tinotenda','Munyaradzi',
  'Zvenyika','Tonderai','Chenai','Nokuthaba','Sihle','Nkosilathi','Lungelo',
  'Bongani','Sipho','Thabo','Zanele','Nomsa','Lerato','Kagiso','Kemi',
  'Chukwuemeka','Adaeze','Obiageli','Emeka','Chidinma'
]
const LAST_NAMES = [
  'Moyo','Ncube','Dube','Sibanda','Ndlovu','Mpofu','Gumbo','Mutasa','Mapfumo',
  'Mushonga','Mwale','Banda','Phiri','Tembo','Zimba','Zulu','Nkosi','Khumalo',
  'Mahlangu','Gwaze','Hungwe','Chirwa','Nyoni','Chigumba','Mazvarirwa',
  'Mukwevho','Mhlanga','Tshuma','Nyamande','Mthombeni'
]

function getName(seed) {
  const fi = Math.floor(rnd(`${seed}-fn`) * FIRST_NAMES.length)
  const li = Math.floor(rnd(`${seed}-ln`) * LAST_NAMES.length)
  return { firstName: FIRST_NAMES[fi], lastName: LAST_NAMES[li] }
}

function getPhone(seed) {
  const n = Math.floor(rnd(`${seed}-ph`) * 9000000) + 1000000
  return `+263 77${String(n).slice(0, 1)} ${String(n).slice(1, 4)} ${String(n).slice(4)}`
}

function getDob(seed) {
  const age = 22 + Math.floor(rnd(`${seed}-age`) * 33) // 22–54
  const year = new Date().getFullYear() - age
  const month = 1 + Math.floor(rnd(`${seed}-mon`) * 12)
  const day = 1 + Math.floor(rnd(`${seed}-day`) * 28)
  return new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
}

// ---------------------------------------------------------------------------
// Customer definitions per business type
// Format: { prefix, businessType, customers: [{...}] }
// ---------------------------------------------------------------------------
const BUSINESS_CONFIGS = [
  {
    businessType: 'restaurant',
    prefix: 'REST',
    customers: [
      // VIP (5)
      { num: '001', type: 'VIP',        segment: 'VIP',     loyalty: 1800 },
      { num: '002', type: 'VIP',        segment: 'VIP',     loyalty: 1500 },
      { num: '003', type: 'VIP',        segment: 'VIP',     loyalty: 2000 },
      { num: '004', type: 'VIP',        segment: 'VIP',     loyalty: 1200 },
      { num: '005', type: 'VIP',        segment: 'VIP',     loyalty: 900  },
      // Regular (20)
      { num: '006', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 220 },
      { num: '007', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 180 },
      { num: '008', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 310 },
      { num: '009', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 95  },
      { num: '010', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 270 },
      { num: '011', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 150 },
      { num: '012', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 200 },
      { num: '013', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 130 },
      { num: '014', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 285 },
      { num: '015', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 175 },
      { num: '016', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 240 },
      { num: '017', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 90  },
      { num: '018', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 160 },
      { num: '019', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 120 },
      { num: '020', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 195 },
      { num: '021', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 250 },
      { num: '022', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 80  },
      { num: '023', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 300 },
      { num: '024', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 145 },
      { num: '025', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 210 },
      // New (5)
      { num: '026', type: 'INDIVIDUAL', segment: 'New',     loyalty: 30  },
      { num: '027', type: 'INDIVIDUAL', segment: 'New',     loyalty: 15  },
      { num: '028', type: 'INDIVIDUAL', segment: 'New',     loyalty: 50  },
      { num: '029', type: 'INDIVIDUAL', segment: 'New',     loyalty: 0   },
      { num: '030', type: 'INDIVIDUAL', segment: 'New',     loyalty: 25  },
    ],
  },
  {
    businessType: 'grocery',
    prefix: 'GRO',
    customers: [
      // VIP (3)
      { num: '001', type: 'VIP',       segment: 'VIP',      loyalty: 1600 },
      { num: '002', type: 'VIP',       segment: 'VIP',      loyalty: 1100 },
      { num: '003', type: 'VIP',       segment: 'VIP',      loyalty: 900  },
      // Wholesale (4)
      { num: '004', type: 'WHOLESALE', segment: 'Wholesale', loyalty: 500  },
      { num: '005', type: 'WHOLESALE', segment: 'Wholesale', loyalty: 400  },
      { num: '006', type: 'WHOLESALE', segment: 'Wholesale', loyalty: 320  },
      { num: '007', type: 'WHOLESALE', segment: 'Wholesale', loyalty: 280  },
      // Regular (11)
      { num: '008', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 190 },
      { num: '009', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 140 },
      { num: '010', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 260 },
      { num: '011', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 110 },
      { num: '012', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 220 },
      { num: '013', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 85  },
      { num: '014', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 175 },
      { num: '015', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 230 },
      { num: '016', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 160 },
      { num: '017', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 200 },
      { num: '018', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 130 },
      // New (7)
      { num: '019', type: 'INDIVIDUAL', segment: 'New',     loyalty: 20  },
      { num: '020', type: 'INDIVIDUAL', segment: 'New',     loyalty: 45  },
      { num: '021', type: 'INDIVIDUAL', segment: 'New',     loyalty: 0   },
      { num: '022', type: 'INDIVIDUAL', segment: 'New',     loyalty: 30  },
      { num: '023', type: 'INDIVIDUAL', segment: 'New',     loyalty: 10  },
      { num: '024', type: 'INDIVIDUAL', segment: 'New',     loyalty: 50  },
      { num: '025', type: 'INDIVIDUAL', segment: 'New',     loyalty: 5   },
    ],
  },
  {
    businessType: 'hardware',
    prefix: 'HW',
    customers: [
      // VIP contractors (2)
      { num: '001', type: 'VIP',        segment: 'VIP',        loyalty: 1400 },
      { num: '002', type: 'VIP',        segment: 'VIP',        loyalty: 800  },
      // Contractors (4)
      { num: '003', type: 'CONTRACTOR', segment: 'Contractor', loyalty: 350  },
      { num: '004', type: 'CONTRACTOR', segment: 'Contractor', loyalty: 280  },
      { num: '005', type: 'CONTRACTOR', segment: 'Contractor', loyalty: 420  },
      { num: '006', type: 'CONTRACTOR', segment: 'Contractor', loyalty: 190  },
      // Wholesale/trade (4)
      { num: '007', type: 'WHOLESALE',  segment: 'Wholesale',  loyalty: 600  },
      { num: '008', type: 'WHOLESALE',  segment: 'Wholesale',  loyalty: 450  },
      { num: '009', type: 'WHOLESALE',  segment: 'Wholesale',  loyalty: 380  },
      { num: '010', type: 'WHOLESALE',  segment: 'Wholesale',  loyalty: 310  },
      // Regular (5)
      { num: '011', type: 'INDIVIDUAL', segment: 'Regular',    loyalty: 120  },
      { num: '012', type: 'INDIVIDUAL', segment: 'Regular',    loyalty: 90   },
      { num: '013', type: 'INDIVIDUAL', segment: 'Regular',    loyalty: 150  },
      // New (2)
      { num: '014', type: 'INDIVIDUAL', segment: 'New',        loyalty: 20   },
      { num: '015', type: 'INDIVIDUAL', segment: 'New',        loyalty: 0    },
    ],
  },
  {
    businessType: 'clothing',
    prefix: 'CLO',
    customers: [
      // VIP (3)
      { num: '001', type: 'VIP',        segment: 'VIP',     loyalty: 1700 },
      { num: '002', type: 'VIP',        segment: 'VIP',     loyalty: 1300 },
      { num: '003', type: 'VIP',        segment: 'VIP',     loyalty: 1000 },
      // Regular (12)
      { num: '004', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 240 },
      { num: '005', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 180 },
      { num: '006', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 300 },
      { num: '007', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 150 },
      { num: '008', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 210 },
      { num: '009', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 120 },
      { num: '010', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 270 },
      { num: '011', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 195 },
      { num: '012', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 135 },
      { num: '013', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 225 },
      { num: '014', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 165 },
      { num: '015', type: 'INDIVIDUAL', segment: 'Regular', loyalty: 290 },
      // New (5)
      { num: '016', type: 'INDIVIDUAL', segment: 'New',     loyalty: 40  },
      { num: '017', type: 'INDIVIDUAL', segment: 'New',     loyalty: 0   },
      { num: '018', type: 'INDIVIDUAL', segment: 'New',     loyalty: 25  },
      { num: '019', type: 'INDIVIDUAL', segment: 'New',     loyalty: 50  },
      { num: '020', type: 'INDIVIDUAL', segment: 'New',     loyalty: 10  },
    ],
  },
]

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function seedCustomers() {
  console.log('\n👥 Seeding demo customers for all businesses...\n')

  let totalCreated = 0
  let totalLinked = 0

  for (const config of BUSINESS_CONFIGS) {
    // Find the demo business for this type
    const business = await prisma.businesses.findFirst({
      where: { type: config.businessType, isDemo: true },
    })
    if (!business) {
      console.log(`⚠️  No demo business found for type "${config.businessType}" — skipping`)
      continue
    }

    console.log(`📍 ${business.name} (${business.id})`)
    const createdCustomers = []

    for (const c of config.customers) {
      const customerNumber = `${config.prefix}-CUST-${c.num}`
      const existing = await prisma.businessCustomers.findFirst({
        where: { businessId: business.id, customerNumber },
      })
      if (existing) {
        createdCustomers.push(existing)
        continue
      }

      const { firstName, lastName } = getName(`${config.prefix}-${c.num}`)
      const name = `${firstName} ${lastName}`
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${c.num}@gmail.com`
      const phone = getPhone(`${config.prefix}-${c.num}`)
      const dob = getDob(`${config.prefix}-${c.num}`)

      const customer = await prisma.businessCustomers.create({
        data: {
          businessId: business.id,
          customerNumber,
          name,
          email,
          phone,
          dateOfBirth: dob,
          city: 'Bulawayo',
          country: 'Zimbabwe',
          customerType: c.type,
          segment: c.segment,
          loyaltyPoints: c.loyalty,
          totalSpent: 0,
          isActive: true,
          businessType: config.businessType,
          updatedAt: new Date(),
        },
      })
      createdCustomers.push(customer)
      totalCreated++
    }

    console.log(`  ✅ ${createdCustomers.length} customers ready (${totalCreated} new)`)

    // --- Link existing completed orders to customers ---
    const unlinkedOrders = await prisma.businessOrders.findMany({
      where: {
        businessId: business.id,
        customerId: null,
        status: 'COMPLETED',
        orderType: 'SALE',
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (unlinkedOrders.length === 0) {
      console.log(`  ℹ️  No unlinked orders to assign`)
      continue
    }

    // Assign ~45% of orders; VIP customers get ~3x more orders than regulars
    const weights = createdCustomers.map(c =>
      c.segment === 'VIP' ? 3 : c.segment === 'Regular' ? 1.5 : 0.5
    )
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    // Link every other 2 out of 5 orders = ~40%, using prime-step for spread
    let linked = 0
    const step = 2  // link 2 out of every 5 = 40%
    for (let i = 0; i < unlinkedOrders.length; i++) {
      if (i % 5 >= step) continue  // skip 3 of every 5

      // Pick a customer weighted using index-based determinism
      const roll = ((i * 7919) % 100000) / 100000 * totalWeight  // prime multiple for spread
      let cum = 0
      let chosen = createdCustomers[0]
      for (let j = 0; j < createdCustomers.length; j++) {
        cum += weights[j]
        if (roll <= cum) { chosen = createdCustomers[j]; break }
      }

      await prisma.businessOrders.update({
        where: { id: unlinkedOrders[i].id },
        data: { customerId: chosen.id },
      })
      linked++
    }

    totalLinked += linked
    console.log(`  🔗 Linked ${linked} of ${unlinkedOrders.length} orders to customers`)

    // --- Update totalSpent per customer ---
    for (const customer of createdCustomers) {
      const agg = await prisma.businessOrders.aggregate({
        where: { customerId: customer.id, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      })
      const spent = agg._sum.totalAmount ?? 0
      if (Number(spent) > 0) {
        await prisma.businessCustomers.update({
          where: { id: customer.id },
          data: { totalSpent: spent },
        })
      }
    }

    console.log(`  💰 Updated totalSpent for all customers`)
  }

  console.log(`\n✅ Customer seed complete`)
  console.log(`   👥 ${totalCreated} new customers created`)
  console.log(`   🔗 ${totalLinked} orders linked to customers`)
}

async function main() {
  try {
    await seedCustomers()
  } catch (err) {
    console.error('Customer seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

module.exports = { seedCustomers }
