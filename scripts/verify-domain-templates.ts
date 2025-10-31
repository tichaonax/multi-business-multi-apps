import { prisma } from '../src/lib/prisma'

async function verifyDomainTemplates() {
  console.log('=== Domain Templates Verification ===\n')

  const domains = await prisma.inventoryDomains.findMany({
    select: {
      id: true,
      name: true,
      businessType: true,
      isActive: true,
      isSystemTemplate: true,
      _count: {
        select: {
          business_categories: true
        }
      }
    },
    orderBy: {
      businessType: 'asc'
    }
  })

  console.log('Type         | Name                    | Active | System | Categories')
  console.log('-------------+-------------------------+--------+--------+-----------')
  
  domains.forEach((d: any) => {
    console.log(
      `${d.businessType.padEnd(12)} | ${d.name.padEnd(23)} | ${d.isActive ? 'Yes' : 'No'}    | ${d.isSystemTemplate ? 'Yes' : 'No'}    | ${d._count.business_categories}`
    )
  })

  console.log(`\nTotal templates: ${domains.length}`)
  console.log('\n✅ Domain template verification complete\n')

  await prisma.$disconnect()
}

verifyDomainTemplates().catch(console.error)
