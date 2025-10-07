import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function computeShortName(name?: string) {
  if (!name) return null
  const parts = String(name).split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase()
  const acronym = parts.map((p) => p[0]).join('').slice(0, 4).toUpperCase()
  return acronym
}

async function main() {
  const businesses = await prisma.business.findMany({ select: { id: true, name: true, shortName: true } })
  console.log(`Found ${businesses.length} businesses`)
  let updated = 0
  for (const b of businesses) {
    const computed = computeShortName(b.name)
    if (!b.shortName || b.shortName !== computed) {
      await prisma.business.update({ where: { id: b.id }, data: { shortName: computed } })
      updated++
    }
  }
  console.log(`Updated ${updated} businesses`) 
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
