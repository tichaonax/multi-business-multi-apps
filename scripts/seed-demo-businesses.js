const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedDemoBusinesses() {
  const now = new Date()
  const demoBusinesses = [
    { id: 'restaurant-demo', name: 'Restaurant Demo', type: 'restaurant' },
    { id: 'grocery-demo-business', name: 'Grocery Demo', type: 'grocery' },
    { id: 'hardware-demo-business', name: 'Hardware Demo Store', type: 'hardware' },
    { id: 'construction-demo-business', name: 'Construction Demo', type: 'construction' },
    { id: 'clothing-demo-business', name: 'Clothing Demo', type: 'clothing' }
  ]

  const created = []
  for (const b of demoBusinesses) {
    const data = {
      id: b.id,
      name: b.name,
      type: b.type,
      description: `${b.name} (seed)`,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }

    const rec = await prisma.business.upsert({ where: { id: b.id }, update: { ...data, updatedAt: now }, create: data })
    created.push(rec.id)
  }

  return created
}

async function unseedDemoBusinesses() {
  const ids = ['restaurant-demo', 'grocery-demo-business', 'hardware-demo-business', 'construction-demo-business', 'clothing-demo-business']
  // Delete in safe order (cascade relations may exist)
  for (const id of ids) {
    try {
      await prisma.business.deleteMany({ where: { id } })
    } catch (err) {
      // ignore errors; best-effort cleanup
      console.warn('Failed to remove business', id, err.message)
    }
  }
  return ids
}

// CLI support - require explicit confirmation to run
if (require.main === module) {
  const cmd = process.argv[2]
  const force = process.argv.includes('--force') || process.env.ALLOW_SEED_DEMO === 'true'
  if (!force) {
    console.error('Demo seeding is disabled by default. Re-run with --force or set ALLOW_SEED_DEMO=true to proceed.')
    process.exit(2)
  }

  ;(async () => {
    try {
      if (cmd === 'down' || cmd === 'unseed') {
        const res = await unseedDemoBusinesses()
        console.log('Unseeded demo businesses:', res)
      } else {
        const res = await seedDemoBusinesses()
        console.log('Seeded demo businesses:', res)
      }
      process.exit(0)
    } catch (err) {
      console.error('Demo business seed/unseed failed:', err)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  })()
}

module.exports = { seedDemoBusinesses, unseedDemoBusinesses }
