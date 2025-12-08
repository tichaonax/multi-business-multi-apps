const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCategories() {
  console.log('Checking for duplicate/conflicting categories...\n')

  // Check categories that are causing errors
  const problematicNames = ['Less Comforter', 'T-Shirts', 'Ladies Outfit', 'Jombo For Kids', 'Jumpsuit For Women']

  for (const name of problematicNames) {
    const categories = await prisma.businessCategories.findMany({
      where: {
        businessType: 'clothing',
        name: name
      },
      select: {
        id: true,
        name: true,
        businessType: true,
        domainId: true,
        businessId: true,
        domain: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (categories.length > 0) {
      console.log(`\nCategory: "${name}"`)
      console.log(`  Found ${categories.length} instances:`)
      categories.forEach(cat => {
        console.log(`    - ID: ${cat.id}`)
        console.log(`      Domain: ${cat.domain?.name || 'NULL'} (${cat.domainId || 'NULL'})`)
        console.log(`      BusinessId: ${cat.businessId || 'NULL'}`)
      })
    } else {
      console.log(`\nCategory: "${name}" - NOT FOUND`)
    }
  }

  console.log('\n\nAll clothing categories summary:')
  const allCategories = await prisma.businessCategories.findMany({
    where: { businessType: 'clothing' },
    select: {
      name: true,
      domainId: true
    }
  })

  console.log(`Total clothing categories: ${allCategories.length}`)

  // Group by domainId
  const byDomain = {}
  allCategories.forEach(cat => {
    const domain = cat.domainId || 'NULL'
    if (!byDomain[domain]) byDomain[domain] = 0
    byDomain[domain]++
  })

  console.log('\nBy domain:')
  Object.entries(byDomain).forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count} categories`)
  })

  await prisma.$disconnect()
}

checkCategories().catch(console.error)
