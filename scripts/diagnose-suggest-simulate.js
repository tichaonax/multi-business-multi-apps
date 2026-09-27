// Read-only simulation of the Move-to-Business "Suggest" scoring algorithm,
// run directly against a real database, so a bad/irrelevant top-5 result can
// be diagnosed against the ACTUAL data on whichever server it's run on
// instead of guessing from a screenshot.
//
// Usage:
//   node scripts/diagnose-suggest-simulate.js "HXI Fashions" "Men's Underwear - Comfortable Breathable Plus Size Boxer Briefs for Boys, High School Students, Loose-Fit Fashionable Square-Cut Shorts"
//
// Makes NO writes.

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function isGroupCategory(c) { return !!(c.attributes && c.attributes.isGroup === true) }

async function main() {
  const businessNameArg = process.argv[2]
  const productName = process.argv[3]
  if (!businessNameArg || !productName) {
    console.log('Usage: node scripts/diagnose-suggest-simulate.js "<business name>" "<product name>"')
    return
  }

  const business = await prisma.businesses.findFirst({ where: { name: { contains: businessNameArg, mode: 'insensitive' } } })
  if (!business) { console.log(`No business found matching "${businessNameArg}"`); return }
  console.log(`Business: ${business.name} (${business.id}, type=${business.type})`)

  const allCats = await prisma.businessCategories.findMany({
    where: {
      isActive: true,
      OR: [
        { businessId: null, businessType: business.type },
        { businessId: null, businessType: 'universal' },
        { businessId: business.id },
      ],
    },
    include: { domain: { select: { id: true, name: true, emoji: true } } },
  })
  console.log('allCats:', allCats.length)

  const catIds = allCats.map(c => c.id)
  const realSubcategories = await prisma.inventorySubcategories.findMany({ where: { categoryId: { in: catIds } } })
  console.log('realSubcategories:', realSubcategories.length)

  const uniqDomains = [...new Map(allCats.map(c => c.domain).filter(Boolean).map(d => [d.id, d])).values()]

  const catById = new Map(allCats.map(c => [c.id, c]))
  const groupIds = new Set(allCats.filter(isGroupCategory).map(c => c.id))

  const STOP_WORDS = new Set(['for', 'and', 'the', 'with', 'of', 'in', 'to', 'a', 'an', 'by', 'at', 'on', 'or', 'its', 'as'])
  const tokens = productName.toLowerCase().split(/[\s,./\\-]+/).filter(t => t.length >= 2 && !STOP_WORDS.has(t))
  console.log('tokens:', tokens)

  function countMatches(text) {
    const words = text.toLowerCase().split(/[\s,./\\-]+/).filter(Boolean)
    return tokens.filter(t => {
      if (words.includes(t)) return true
      if (t.length > 3 && t.endsWith('s') && words.includes(t.slice(0, -1))) return true
      if (words.some(w => w.length > 3 && w.endsWith('s') && w.slice(0, -1) === t)) return true
      return false
    }).length
  }

  function resolveDomainId(cat) {
    let current = cat
    const seen = new Set()
    while (current) {
      if (current.domainId) return current.domainId
      if (!current.parentId || seen.has(current.id)) return null
      seen.add(current.id)
      current = catById.get(current.parentId)
    }
    return null
  }
  function resolveDomain(cat) {
    const id = resolveDomainId(cat)
    return id ? uniqDomains.find(d => d.id === id) : undefined
  }
  function isCategoryTier(c) { return !!c.domainId || groupIds.has(c.id) }

  const hasChildCategory = new Set()
  for (const c of allCats) {
    if (c.parentId && !isGroupCategory(c)) hasChildCategory.add(c.parentId)
  }

  const scored = []
  for (const cat of allCats) {
    if (isGroupCategory(cat)) continue
    const dom = resolveDomain(cat)
    const parent = cat.parentId ? catById.get(cat.parentId) : undefined
    const parentIsCategoryTier = !!(parent && isCategoryTier(parent))
    if (parentIsCategoryTier) {
      const ownScore = countMatches(cat.name) * 3
      const parentScore = countMatches(parent.name) * 2
      const domScore = dom ? countMatches(dom.name) * 1 : 0
      const total = ownScore + parentScore + domScore
      if (total === 0) continue
      scored.push({ domainName: dom?.name ?? '', categoryName: parent.name, subCategoryName: cat.name, score: total })
    } else {
      if (hasChildCategory.has(cat.id)) continue
      const ownScore = countMatches(cat.name) * 3
      const domScore = dom ? countMatches(dom.name) * 1 : 0
      const total = ownScore + domScore
      if (total === 0) continue
      scored.push({ domainName: dom?.name ?? '', categoryName: cat.name, subCategoryName: '', score: total })
    }
  }
  for (const sub of realSubcategories) {
    const cat = sub.categoryId ? catById.get(sub.categoryId) : undefined
    if (!cat) continue
    const dom = resolveDomain(cat)
    const subScore = countMatches(sub.name) * 3
    const catScore = countMatches(cat.name) * 2
    const domScore = dom ? countMatches(dom.name) * 1 : 0
    const total = subScore + catScore + domScore
    if (total === 0) continue
    scored.push({ domainName: dom?.name ?? '', categoryName: cat.name, subCategoryName: sub.name, score: total })
  }

  scored.sort((a, b) => b.score - a.score)
  console.log(`\ntotal scored candidates: ${scored.length}`)
  console.log('\nTOP 15:')
  scored.slice(0, 15).forEach(s => console.log(`  [${s.score}] ${s.domainName} > ${s.categoryName}${s.subCategoryName ? ' > ' + s.subCategoryName : ''}`))
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
