#!/usr/bin/env node
/**
 * MBM-294 Phase 3 — Step 1: extract the source catalog's category/subcategory
 * taxonomy and reference images from the source .ods file into a local
 * manifest + image folder, ready for the match-or-create import script.
 *
 * Does NOT touch the database. Read-only against the .ods, write-only to
 * scripts/mbm294-extracted/ (gitignored — see project-plan §3.6: image files
 * travel outside git).
 *
 * Usage: node scripts/mbm294-extract-catalog-taxonomy.js [path-to-ods]
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const JSZip = require('jszip')
const xml2js = require('xml2js')

const ODS_PATH = process.argv[2] || 'C:/Users/ticha/Documents/Category Data/HXI-Fashion-Categories-With-Images.ods'
const OUT_DIR = path.join(__dirname, 'mbm294-extracted')
const IMAGES_DIR = path.join(OUT_DIR, 'images')

// Sheets that are index/summary lists, not real domain data — see MBM-294
// plan §2 analysis.
const SKIP_SHEETS = new Set(['Categories', 'Categories-1', 'Categories_2'])
const NOISE_SUBCATEGORY_NAMES = new Set(['view all', 'view allnew this week'])

function cellText(cell) {
  const p = cell['text:p']
  if (!p) return ''
  const arr = Array.isArray(p) ? p : [p]
  return arr
    .map((x) => (typeof x === 'string' ? x : x && x._ ? x._ : ''))
    .join(' ')
    .trim()
}

async function main() {
  if (!fs.existsSync(ODS_PATH)) {
    console.error(`Source file not found: ${ODS_PATH}`)
    process.exit(1)
  }
  fs.mkdirSync(IMAGES_DIR, { recursive: true })

  console.log(`Reading ${ODS_PATH} ...`)
  const buf = fs.readFileSync(ODS_PATH)
  const zip = await JSZip.loadAsync(buf)
  const contentXml = await zip.file('content.xml').async('string')

  console.log('Parsing content.xml ...')
  const parsed = await xml2js.parseStringPromise(contentXml, {
    explicitArray: true,
    mergeAttrs: false,
    explicitCharkey: false,
    charkey: '_',
  })
  const tables =
    parsed['office:document-content']['office:body'][0]['office:spreadsheet'][0]['table:table'] || []

  /** @type {Record<string, { subcategories: Set<string>, images: Array<{hash:string, ext:string, sourceUrl:string}> }>} */
  const domains = {}

  function ensureDomain(name) {
    if (!domains[name]) domains[name] = { subcategories: new Set(), images: [] }
    return domains[name]
  }

  for (const table of tables) {
    const name = table['$']['table:name']
    if (name.startsWith('__Anonymous_Sheet_DB__')) continue
    if (SKIP_SHEETS.has(name)) continue

    const isImagesSheet = name.endsWith('-Images')
    const domainName = isImagesSheet ? name.slice(0, -'-Images'.length) : name
    const domain = ensureDomain(domainName)

    if (isImagesSheet) {
      if (!table['table:shapes']) continue
      for (const shapesBlock of table['table:shapes']) {
        const frames = shapesBlock['draw:frame'] || []
        for (const frame of frames) {
          if (!frame['draw:image']) continue
          for (const img of frame['draw:image']) {
            const href = img['$']['xlink:href'] // e.g. Pictures/xxxx.png
            const sourceUrl = frame['$']['draw:name'] || null
            const file = zip.file(href)
            if (!file) continue
            const data = await file.async('nodebuffer')
            const hash = crypto.createHash('sha256').update(data).digest('hex')
            const ext = path.extname(href) || '.png'
            domain.images.push({ hash, ext, sourceUrl })
            const outPath = path.join(IMAGES_DIR, `${hash}${ext}`)
            if (!fs.existsSync(outPath)) fs.writeFileSync(outPath, data)
          }
        }
      }
    } else {
      const rows = table['table:table-row'] || []
      let lastJoined = null
      for (const row of rows) {
        const cells = row['table:table-cell'] || []
        const texts = cells.map(cellText).filter(Boolean)
        const joined = texts.join(' | ')
        // Consecutive duplicate rows are a LibreOffice AutoFilter artifact
        // (each name appears twice) — not real repeated data.
        if (joined && joined !== lastJoined) {
          if (!NOISE_SUBCATEGORY_NAMES.has(joined.toLowerCase())) {
            domain.subcategories.add(joined)
          }
        }
        lastJoined = joined || lastJoined
      }
    }
  }

  const manifest = {}
  let totalSubcategories = 0
  let totalImageRefs = 0
  let totalUniqueImages = 0
  const globalHashes = new Set()

  for (const [domainName, data] of Object.entries(domains)) {
    const uniqueImages = Array.from(new Map(data.images.map((i) => [i.hash, i])).values())
    manifest[domainName] = {
      subcategories: Array.from(data.subcategories).sort(),
      images: uniqueImages,
    }
    totalSubcategories += manifest[domainName].subcategories.length
    totalImageRefs += data.images.length
    uniqueImages.forEach((i) => globalHashes.add(i.hash))
  }
  totalUniqueImages = globalHashes.size

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log('')
  console.log('✅ Extraction complete')
  console.log(`   Domains:                  ${Object.keys(manifest).length}`)
  console.log(`   Subcategory names (total, pre-match): ${totalSubcategories}`)
  console.log(`   Image references (with per-domain dupes): ${totalImageRefs}`)
  console.log(`   Unique image files written:    ${totalUniqueImages}`)
  console.log(`   Manifest: ${path.join(OUT_DIR, 'manifest.json')}`)
  console.log(`   Images:   ${IMAGES_DIR}`)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
