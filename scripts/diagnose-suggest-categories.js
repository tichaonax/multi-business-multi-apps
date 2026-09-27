// Read-only diagnostic for the Move-to-Business "Suggest" feature.
// Dumps the actual category/subcategory tree a business sees, so we can
// tell whether a business's real data has any subcategory tier at all
// (in which case "Suggest" showing only Domain > Category is correct)
// versus subcategories existing but not being picked up (a real bug).
//
// Usage:
//   node scripts/diagnose-suggest-categories.js "HXI Fashions"
//   node scripts/diagnose-suggest-categories.js "HXI Fashions" underwear
//
// Makes NO writes -- every call below is a Prisma findMany/findFirst.

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const businessNameArg = process.argv[2] || 'HXI Fashions'
  const domainFilter = (process.argv[3] || '').toLowerCase()

  const business = await prisma.businesses.findFirst({
    where: { name: { contains: businessNameArg, mode: 'insensitive' } },
    select: { id: true, name: true, type: true },
  })
  if (!business) {
    console.log(`No business found matching "${businessNameArg}"`)
    return
  }
  console.log(`\nBusiness: ${business.name} (${business.id}, type=${business.type})\n`)

  const cats = await prisma.businessCategories.findMany({
    where: {
      isActive: true,
      OR: [
        { businessId: null, businessType: business.type },
        { businessId: null, businessType: 'universal' },
        { businessId: business.id },
      ],
    },
    include: {
      domain: { select: { id: true, name: true } },
      _count: { select: { other_business_categories: true, inventory_subcategories: true } },
    },
    orderBy: [{ domainId: 'asc' }, { name: 'asc' }],
  })

  console.log(`Total categories visible to this business: ${cats.length}`)

  const byId = new Map(cats.map(c => [c.id, c]))
  const filtered = domainFilter
    ? cats.filter(c =>
        (c.domain?.name || '').toLowerCase().includes(domainFilter) ||
        (c.name || '').toLowerCase().includes(domainFilter))
    : cats

  console.log(`Matching "${domainFilter || '(all)'}" : ${filtered.length}\n`)
  console.log('─'.repeat(100))

  for (const c of filtered) {
    const isGroup = !!(c.attributes && c.attributes.isGroup === true)
    const parent = c.parentId ? byId.get(c.parentId) : null
    console.log(
      `${c.emoji || '  '} ${c.name}` +
      `  [id=${c.id.slice(0, 8)}]` +
      `  domainId=${c.domainId ? c.domainId.slice(0, 8) : 'null'}(${c.domain?.name || '-'})` +
      `  parentId=${c.parentId ? c.parentId.slice(0, 8) : 'null'}(${parent?.name || '-'})` +
      `  isGroup=${isGroup}` +
      `  childCategories=${c._count.other_business_categories}` +
      `  invSubcategories=${c._count.inventory_subcategories}`
    )
  }

  // Also directly hit the same endpoint the client calls, to rule out a
  // difference between the raw DB state and what that specific route returns.
  const catIds = filtered.map(c => c.id)
  const directSubs = await prisma.inventorySubcategories.findMany({
    where: { categoryId: { in: catIds } },
    select: { id: true, name: true, categoryId: true, isDefault: true },
  })
  console.log(`\nInventorySubcategories rows for these ${catIds.length} category ids: ${directSubs.length}`)
  directSubs.slice(0, 30).forEach(s => {
    const cat = byId.get(s.categoryId)
    console.log(`  • ${s.name}  (under ${cat?.name || s.categoryId}, isDefault=${s.isDefault})`)
  })
  if (directSubs.length > 30) console.log(`  ... and ${directSubs.length - 30} more`)

  const catIdsQueryString = catIds.join(',')
  console.log(`\ncategoryIds query string length (all visible categories): ${catIdsQueryString.length} chars`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
