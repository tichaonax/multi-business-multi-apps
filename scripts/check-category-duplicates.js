const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDuplicates() {
  console.log('Checking for duplicate categories under new constraint [businessType, domainId, name]...\n')

  const result = await prisma.$queryRaw`
    SELECT
      "businessType",
      "domainId",
      name,
      COUNT(*) as count,
      array_agg(id) as ids
    FROM business_categories
    GROUP BY "businessType", "domainId", name
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `

  if (result.length === 0) {
    console.log('✅ No duplicates found! Safe to apply the new unique constraint.\n')
  } else {
    console.log(`❌ Found ${result.length} duplicate groups:\n`)
    result.forEach((dup, idx) => {
      console.log(`${idx + 1}. businessType: ${dup.businessType}, domainId: ${dup.domainId || 'NULL'}, name: "${dup.name}"`)
      console.log(`   Count: ${dup.count}`)
      console.log(`   IDs: ${dup.ids.join(', ')}`)
      console.log('')
    })
  }

  await prisma.$disconnect()
}

checkDuplicates().catch(console.error)
