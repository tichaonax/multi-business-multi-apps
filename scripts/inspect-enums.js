const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function inspect() {
  try {
    const enums = await prisma.$queryRawUnsafe(`
      SELECT t.typname as enum_name, e.enumlabel as enum_label
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      ORDER BY t.typname, e.enumsortorder
    `)

    const map = {}
    for (const row of enums) {
      const name = row.enum_name
      map[name] = map[name] || []
      map[name].push(row.enum_label)
    }

    console.log('Detected enums:')
    for (const k of Object.keys(map)) {
      console.log(`- ${k}: ${map[k].join(', ')}`)
    }

    const orderEnumEntries = Object.entries(map).find(([k]) => k.toLowerCase().includes('order'))
    if (orderEnumEntries) {
      const [name, labels] = orderEnumEntries
      console.log('\nOrder enum detected as', name)
      console.log('Contains KITCHEN_TICKET?', labels.includes('KITCHEN_TICKET'))
    } else {
      console.log('\nNo order-like enum found')
    }
  } catch (err) {
    console.error('Inspect failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

inspect()
