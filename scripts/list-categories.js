const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listCategories() {
  const globalCats = await prisma.expenseCategories.findMany({
    where: { domainId: null },
    select: { id: true, name: true, emoji: true, requiresSubcategory: true }
  })

  console.log('\n📋 Global Categories (Flat):')
  globalCats.forEach(c => console.log(`  ${c.emoji} ${c.name} - ID: ${c.id.substring(0, 8)}...`))

  const domains = await prisma.expenseDomains.findMany({
    select: { id: true, name: true, emoji: true }
  })

  console.log('\n📁 Domains (Hierarchical):')
  domains.forEach(d => console.log(`  ${d.emoji} ${d.name} - ID: ${d.id.substring(0, 8)}...`))

  await prisma.$disconnect()
}

listCategories()
