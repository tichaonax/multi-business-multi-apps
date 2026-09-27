// Read-only coverage report for the clothing category "grouping" migrations
// (20260908120001_group_clothing_categories + the case-insensitive follow-up
// 20260927033908_fix_clothing_category_reparent_casing).
//
// Answers, with real numbers against whatever database it's run on:
//   - how many of the 1,804 expected leaf categories are already correctly
//     parented under their group
//   - how many the case-insensitive fix will newly catch
//   - how many STILL don't match anything at all -- these are typo/renamed/
//     missing candidates that no amount of case-insensitivity can fix, and
//     need a manual look
//
// Usage:
//   node scripts/diagnose-clothing-reparent-coverage.js
//
// Makes NO writes.

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function extractExpectations() {
  const srcPath = path.join(__dirname, '..', 'prisma/migrations/20260908120001_group_clothing_categories/migration.sql')
  const lines = fs.readFileSync(srcPath, 'utf8').split('\n').map(l => l.replace(/\r$/, ''))
  const re = /^UPDATE business_categories SET "parentId" = '([0-9a-zA-Z_-]+)', "updatedAt" = NOW\(\) WHERE "businessType" = 'clothing' AND name = '((?:[^']|'')*)' AND \(id != '([0-9a-zA-Z_-]+)'\);$/
  const out = []
  for (const line of lines) {
    const m = line.match(re)
    if (m) out.push({ groupId: m[1], name: m[2].replace(/''/g, "'") })
  }
  return out
}

// Cheap Levenshtein distance -- fine at this vocabulary size.
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

async function main() {
  const expectations = extractExpectations()
  console.log(`Expected leaf categories (from the original migration): ${expectations.length}`)

  const groupRows = await prisma.businessCategories.findMany({
    where: { id: { in: [...new Set(expectations.map(e => e.groupId))] } },
    select: { id: true, name: true },
  })
  const groupNameById = new Map(groupRows.map(g => [g.id, g.name]))

  // Pull every clothing category once; do all matching in memory.
  const allClothingCats = await prisma.businessCategories.findMany({
    where: { businessType: 'clothing', isActive: true },
    select: { id: true, name: true, parentId: true },
  })
  const byNormName = new Map()
  for (const c of allClothingCats) {
    const norm = c.name.trim().toLowerCase()
    if (!byNormName.has(norm)) byNormName.set(norm, [])
    byNormName.get(norm).push(c)
  }

  let alreadyCorrect = 0
  let fixedByCaseInsensitive = 0
  const stillUnmatched = []

  for (const exp of expectations) {
    const matches = byNormName.get(exp.name.trim().toLowerCase()) || []
    if (matches.length === 0) {
      stillUnmatched.push(exp)
      continue
    }
    const alreadyParented = matches.some(m => m.parentId === exp.groupId)
    if (alreadyParented) alreadyCorrect++
    else fixedByCaseInsensitive++
  }

  console.log(`\nAlready correctly parented (before the casing fix): ${alreadyCorrect}`)
  console.log(`Newly fixed by the case-insensitive migration:        ${fixedByCaseInsensitive}`)
  console.log(`STILL unmatched (no row with this name at all):       ${stillUnmatched.length}`)

  if (stillUnmatched.length > 0) {
    console.log('\n--- Still-unmatched expected names (likely typos, renames, or removed categories) ---')
    // Build a frequency table of individual words across the FULL expected
    // name list, so a rare misspelled word can be matched against a common
    // correctly-spelled one (e.g. lone "Underwaer" vs. common "Underwear").
    const wordFreq = new Map()
    for (const e of expectations) {
      for (const w of e.name.toLowerCase().split(/[\s,./&'-]+/).filter(Boolean)) {
        wordFreq.set(w, (wordFreq.get(w) || 0) + 1)
      }
    }
    const commonWords = [...wordFreq.entries()].filter(([, n]) => n >= 5).map(([w]) => w)

    for (const exp of stillUnmatched) {
      const group = groupNameById.get(exp.groupId) || exp.groupId
      const words = exp.name.toLowerCase().split(/[\s,./&'-]+/).filter(Boolean)
      const suggestions = []
      for (const w of words) {
        if (wordFreq.get(w) >= 5 || w.length < 5) continue // already common enough, or too short to bother
        for (const cw of commonWords) {
          if (Math.abs(cw.length - w.length) > 2) continue
          if (editDistance(w, cw) <= 2) suggestions.push(`"${w}" -> "${cw}"?`)
        }
      }
      console.log(`  • "${exp.name}"  (expected under: ${group})${suggestions.length ? '  possible typo: ' + suggestions.join(', ') : ''}`)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
