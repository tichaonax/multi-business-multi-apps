import { prisma } from '../src/lib/prisma'

async function checkBusinessesAndCategories() {
  console.log('=== Businesses and Categories Analysis ===\n')

  const businesses = await prisma.businesses.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      _count: {
        select: {
          business_categories: true
        }
      }
    },
    orderBy: {
      type: 'asc'
    }
  })

  console.log('Businesses by Type:')
  console.log('Type            | Business Name                  | Categories')
  console.log('----------------+--------------------------------+-----------')
  businesses.forEach((b: any) => {
    console.log(`${b.type.padEnd(15)} | ${b.name.padEnd(30)} | ${b._count.business_categories}`)
  })

  console.log('\n=== Category Counts by Business Type ===\n')

  const categoryCountsByType = await prisma.businessCategories.groupBy({
    by: ['businessType'],
    _count: {
      id: true
    },
    orderBy: {
      businessType: 'asc'
    }
  })

  categoryCountsByType.forEach((row: any) => {
    console.log(`${row.businessType}: ${row._count.id} categories`)
  })

  console.log('\n=== Sample Categories (First 5 per type) ===\n')

  const sampleCategories = await prisma.businessCategories.findMany({
    select: {
      businessType: true,
      name: true,
      businessId: true,
      isUserCreated: true
    },
    orderBy: [
      { businessType: 'asc' },
      { name: 'asc' }
    ],
    take: 20
  })

  let currentType = ''
  sampleCategories.forEach((cat: any) => {
    if (cat.businessType !== currentType) {
      console.log(`\n${cat.businessType}:`)
      currentType = cat.businessType
    }
    console.log(`  - ${cat.name} (${cat.isUserCreated ? 'user-created' : 'system'})`)
  })

  await prisma.$disconnect()
}

checkBusinessesAndCategories().catch(console.error)
