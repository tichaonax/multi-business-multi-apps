#!/usr/bin/env node
/**
 * MBM-294 Phase 3 — Step 2: match-or-create pass for the source catalog's
 * category taxonomy, plus the reference-image import.
 *
 * Reads scripts/mbm294-extracted/manifest.json (produced by
 * mbm294-extract-catalog-taxonomy.js) and, per project-plan §3.2/§3.6:
 *
 *   - For each top-level category from the source catalog: fuzzy-matches
 *     against existing `InventoryDomains` (businessType='clothing'). Match
 *     found -> use it. No match -> create a new domain.
 *   - For each subcategory under it: fuzzy-matches against existing
 *     `BusinessCategories` under the resolved domain. Match found -> use it.
 *     No match -> create a new category.
 *   - Either way, the resolved domain gets the imported images associated
 *     via `CategoryReferenceImages.domainId` (images attach at the domain
 *     tier only — see plan §2.1, the source catalog's galleries have no
 *     subcategory-level link).
 *   - Atomic per image (§3.6 no-harm guarantee): an image whose source file
 *     isn't present on this machine is skipped and logged, never a partial
 *     row.
 *   - After importing, picks each domain's best 2-3 icon candidates (skipping
 *     images that repeat across many domains, since those are generic
 *     placeholder icons, not representative of any one domain) and sets
 *     `InventoryDomains.iconImageId` to the top candidate.
 *
 * Writes scripts/mbm294-extracted/match-report.json for review — informational,
 * not a gate.
 *
 * Safety: this is a one-time script (§3.6), not meant to be re-run against an
 * already-imported database. Refuses to run if CategoryReferenceImages
 * already has rows for this businessType, unless --force is passed.
 *
 * Usage: node scripts/mbm294-import-categories-and-images.js [--force] [--dry-run]
 */

const fs = require('fs')
const path = require('path')
const leven = require('leven')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const BUSINESS_TYPE = 'clothing'
const MATCH_THRESHOLD = 0.82
const ICON_CANDIDATES_PER_DOMAIN = 3
// An image hash used across more than this many domains is treated as a
// generic/reused placeholder icon, not representative of any single domain.
const PLACEHOLDER_DOMAIN_COUNT = 3

const EXTRACT_DIR = path.join(__dirname, 'mbm294-extracted')
const MANIFEST_PATH = path.join(EXTRACT_DIR, 'manifest.json')
const IMAGES_DIR = path.join(EXTRACT_DIR, 'images')

const FORCE = process.argv.includes('--force')
const DRY_RUN = process.argv.includes('--dry-run')

// Known synonym pairs between the source catalog's naming and this app's
// existing clothing taxonomy, found during the plan's live-DB audit (§2.2) —
// plain string-distance can't catch these since the wording is genuinely
// different, not just reordered/pluralized. Domain-matching only; the
// subcategory vocabulary (hundreds of specific garment names) is too large
// to hand-curate, so it relies on substring/edit-distance alone.
const DOMAIN_ALIASES = [
  ['shoes', 'footwear'],
  ['beauty and healthy', 'beauty'],
  ['home textile', 'home and textiles'],
  ['underwear and sleepwear', 'underwear and lingerie'],
  ['jewelry and accessories', 'jewellery and watches'],
  ['sports and outdoor', 'sportswear and activewear'],
]

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\bclothing\b/g, '')
    .replace(/s\b/g, '') // crude de-pluralization
    .replace(/\s+/g, ' ')
    .trim()
}

// Alias entries are written in plain English, not pre-normalized — run them
// through the same normalize() as everything else so de-pluralization etc.
// stays consistent (e.g. "Shoes" -> "shoe" must compare against the alias's
// own "shoes" -> "shoe", not the raw string).
const NORMALIZED_DOMAIN_ALIASES = DOMAIN_ALIASES.map(([x, y]) => [normalize(x), normalize(y)])

function isAliasPair(na, nb) {
  return NORMALIZED_DOMAIN_ALIASES.some(([x, y]) => (na === x && nb === y) || (na === y && nb === x))
}

function similarity(a, b, { aliases = false } = {}) {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (aliases && isAliasPair(na, nb)) return 0.99
  // Substring containment: catches "Appliances" vs "Home Appliances", etc. —
  // require the shorter name to be at least half the length of the longer
  // one so short generic words (e.g. "Bag") don't spuriously match anything
  // containing them.
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) {
    const shorter = Math.min(na.length, nb.length)
    const longer = Math.max(na.length, nb.length)
    if (shorter / longer >= 0.5) return 0.9
  }
  const dist = leven(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  return 1 - dist / maxLen
}

function bestMatch(name, candidates, opts) {
  let best = null
  let bestScore = 0
  for (const c of candidates) {
    const score = similarity(name, c.name, opts)
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return bestScore >= MATCH_THRESHOLD ? { ...best, score: bestScore } : null
}

function mimeTypeFor(ext) {
  switch (ext.toLowerCase()) {
    case '.gif':
      return 'image/gif'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Manifest not found at ${MANIFEST_PATH} — run mbm294-extract-catalog-taxonomy.js first.`)
    process.exit(1)
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))

  const existingCount = await prisma.categoryReferenceImages.count({ where: { businessType: BUSINESS_TYPE } })
  if (existingCount > 0 && !FORCE) {
    console.error(
      `CategoryReferenceImages already has ${existingCount} row(s) for businessType='${BUSINESS_TYPE}'. ` +
        `This looks like the import already ran on this server. Re-run with --force if you really want to proceed ` +
        `(will create additional rows, not replace existing ones).`
    )
    process.exit(1)
  }
  if (DRY_RUN) console.log('--dry-run: no database writes will be made.\n')

  let domainList = await prisma.inventoryDomains.findMany({
    where: { businessType: BUSINESS_TYPE },
    select: { id: true, name: true },
  })

  const matchReport = {
    generatedAt: new Date().toISOString(),
    businessType: BUSINESS_TYPE,
    matchThreshold: MATCH_THRESHOLD,
    domains: [],
    images: { uniqueImported: 0, linksCreated: 0, skippedMissingFile: 0 },
  }

  // hash -> { imageId, domainNames: Set<string> } — built across the whole
  // run so we can (a) share one Images row across domains that reference the
  // same bytes, and (b) later detect cross-domain placeholder icons.
  const hashInfo = new Map()

  for (const [sourceDomainName, data] of Object.entries(manifest)) {
    const domainMatch = bestMatch(sourceDomainName, domainList, { aliases: true })
    let domainId
    let domainAction

    if (domainMatch) {
      domainId = domainMatch.id
      domainAction = `matched existing domain "${domainMatch.name}" (score ${domainMatch.score.toFixed(2)})`
    } else if (DRY_RUN) {
      domainId = `dry-run-${sourceDomainName}`
      domainAction = 'would create new domain'
    } else {
      const created = await prisma.inventoryDomains.create({
        data: { name: sourceDomainName, emoji: '📦', businessType: BUSINESS_TYPE, isSystemTemplate: false },
      })
      domainId = created.id
      domainList.push({ id: domainId, name: sourceDomainName })
      domainAction = 'created new domain'
    }

    // Subcategories -> BusinessCategories under this domain. Fetch real
    // existing categories even in dry-run mode as long as the domain itself
    // is real (matched, not a would-be-created placeholder) so the preview
    // is accurate.
    const domainIsReal = !String(domainId).startsWith('dry-run-')
    let existingCats = domainIsReal
      ? await prisma.businessCategories.findMany({
          where: { businessType: BUSINESS_TYPE, domainId },
          select: { id: true, name: true },
        })
      : []
    const categoryResults = []
    for (const subName of data.subcategories) {
      const catMatch = bestMatch(subName, existingCats)
      if (catMatch) {
        categoryResults.push({ sourceName: subName, action: `matched "${catMatch.name}" (score ${catMatch.score.toFixed(2)})` })
        continue
      }
      if (DRY_RUN) {
        categoryResults.push({ sourceName: subName, action: 'would create new category' })
        continue
      }
      try {
        const createdCat = await prisma.businessCategories.create({
          data: { name: subName, businessType: BUSINESS_TYPE, domainId, isUserCreated: false, updatedAt: new Date() },
        })
        existingCats.push({ id: createdCat.id, name: subName })
        categoryResults.push({ sourceName: subName, action: 'created new category' })
      } catch (e) {
        if (e.code === 'P2002') {
          categoryResults.push({ sourceName: subName, action: 'skipped — unique-constraint conflict (likely created by a concurrent run)' })
        } else {
          throw e
        }
      }
    }

    // Images -> Images + CategoryReferenceImages.domainId
    let imagesLinked = 0
    for (const img of data.images) {
      const filePath = path.join(IMAGES_DIR, `${img.hash}${img.ext}`)
      if (!fs.existsSync(filePath)) {
        matchReport.images.skippedMissingFile++
        continue // no-harm guarantee — skip-and-log, never a partial row (§3.6)
      }

      let entry = hashInfo.get(img.hash)
      if (!entry) {
        let imageId = `dry-run-${img.hash}`
        if (!DRY_RUN) {
          const fileBuf = fs.readFileSync(filePath)
          const createdImg = await prisma.images.create({
            data: { data: fileBuf, mimeType: mimeTypeFor(img.ext), size: fileBuf.length },
          })
          imageId = createdImg.id
        }
        entry = { imageId, domainNames: new Set() }
        hashInfo.set(img.hash, entry)
        matchReport.images.uniqueImported++
      }
      entry.domainNames.add(sourceDomainName)

      if (!DRY_RUN) {
        await prisma.categoryReferenceImages.create({
          data: {
            imageId: entry.imageId,
            domainId,
            businessType: BUSINESS_TYPE,
            sourceUrl: img.sourceUrl,
            isUserUploaded: false,
          },
        })
      }
      matchReport.images.linksCreated++
      imagesLinked++
    }

    const created = categoryResults.filter((c) => c.action.startsWith('created') || c.action.startsWith('would create')).length
    const matched = categoryResults.filter((c) => c.action.startsWith('matched')).length
    matchReport.domains.push({
      sourceName: sourceDomainName,
      resolvedDomainId: domainId,
      domainAction,
      subcategoriesTotal: categoryResults.length,
      subcategoriesCreated: created,
      subcategoriesMatched: matched,
      imagesLinked,
      categoryDetails: categoryResults,
    })

    console.log(
      `✔ ${sourceDomainName} -> ${domainAction} | subcats: ${categoryResults.length} (${created} new, ${matched} matched) | images linked: ${imagesLinked}`
    )
  }

  // Icon selection — skip hashes that repeat across too many domains (generic
  // placeholders), prefer ones specific to this domain, first-by-manifest-order.
  if (!DRY_RUN) {
    console.log('\nPicking domain icon candidates...')
    for (const domainEntry of matchReport.domains) {
      const domainName = domainEntry.sourceName
      const domainImages = manifest[domainName].images.filter((img) => hashInfo.has(img.hash))
      const candidates = domainImages
        .filter((img) => hashInfo.get(img.hash).domainNames.size <= PLACEHOLDER_DOMAIN_COUNT)
        .slice(0, ICON_CANDIDATES_PER_DOMAIN)
      const fallback = domainImages.slice(0, ICON_CANDIDATES_PER_DOMAIN)
      const chosen = candidates.length > 0 ? candidates : fallback

      if (chosen.length === 0) continue
      const iconImageId = hashInfo.get(chosen[0].hash).imageId
      await prisma.inventoryDomains.update({
        where: { id: domainEntry.resolvedDomainId },
        data: { iconImageId },
      })
      domainEntry.iconCandidates = chosen.map((c) => hashInfo.get(c.hash).imageId)
      domainEntry.iconImageId = iconImageId
    }
  }

  fs.writeFileSync(path.join(EXTRACT_DIR, 'match-report.json'), JSON.stringify(matchReport, null, 2))

  console.log('')
  console.log(DRY_RUN ? '✅ Dry run complete — no changes written.' : '✅ Import complete.')
  console.log(`   Domains processed:        ${matchReport.domains.length}`)
  console.log(`   Unique images imported:   ${matchReport.images.uniqueImported}`)
  console.log(`   Category-image links:     ${matchReport.images.linksCreated}`)
  console.log(`   Skipped (file missing):   ${matchReport.images.skippedMissingFile}`)
  console.log(`   Match report: ${path.join(EXTRACT_DIR, 'match-report.json')}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('FATAL:', e)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
