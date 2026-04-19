/**
 * fix-custom-bulk-remaining-count.js
 *
 * Reconciles remainingCount for all custom bulk products by reading
 * actual sales from business_order_items (where attributes.customBulkId is set).
 *
 * Usage:
 *   node scripts/fix-custom-bulk-remaining-count.js          # dry run (report only)
 *   node scripts/fix-custom-bulk-remaining-count.js --apply  # apply fixes
 *
 * Note: Only sales recorded with customBulkId in order attributes are counted.
 * Sales made before the fix was deployed (no customBulkId in attributes) cannot
 * be identified automatically — those will need manual adjustment.
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DRY_RUN = !process.argv.includes('--apply')

async function main() {
  console.log(`\n📦 Custom Bulk Products — Remaining Count Reconciliation`)
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes written)' : '✏️  APPLY mode'}`)
  console.log('─'.repeat(60))

  // 1. Sum quantities sold per customBulkId from order items
  const salesRows = await prisma.$queryRaw`
    SELECT
      attributes->>'customBulkId' AS bulk_id,
      SUM(quantity)::int           AS total_sold
    FROM business_order_items
    WHERE attributes->>'customBulkId' IS NOT NULL
    GROUP BY attributes->>'customBulkId'
  `

  const salesMap = {}
  for (const row of salesRows) {
    salesMap[row.bulk_id] = Number(row.total_sold)
  }

  console.log(`\nFound ${salesRows.length} custom bulk product(s) with recorded sales.\n`)

  // 2. Load all custom bulk products (active + inactive)
  const allBulk = await prisma.customBulkProducts.findMany({
    orderBy: [{ businessId: 'asc' }, { createdAt: 'desc' }],
    include: { business: { select: { name: true } } },
  })

  if (allBulk.length === 0) {
    console.log('No custom bulk products found in database.')
    return
  }

  let totalFixed = 0
  let totalDeactivated = 0
  let totalAlreadyCorrect = 0

  for (const p of allBulk) {
    const totalSold  = salesMap[p.id] ?? 0
    const correct    = Math.max(0, p.itemCount - totalSold)
    const current    = p.remainingCount
    const needsUpdate = current !== correct
    const shouldDeactivate = correct <= 0 && p.isActive

    const bizName = p.business?.name ?? p.businessId

    if (!needsUpdate && !shouldDeactivate) {
      console.log(`✅ [${bizName}] ${p.name} (${p.batchNumber})`)
      console.log(`   itemCount=${p.itemCount}  sold=${totalSold}  remaining=${current}  → no change needed`)
      totalAlreadyCorrect++
      continue
    }

    console.log(`${DRY_RUN ? '🔍' : '🔧'} [${bizName}] ${p.name} (${p.batchNumber})`)
    console.log(`   itemCount=${p.itemCount}  sold=${totalSold}  current remaining=${current}  → correct remaining=${correct}${shouldDeactivate ? '  [will deactivate]' : ''}`)

    if (!DRY_RUN) {
      await prisma.customBulkProducts.update({
        where: { id: p.id },
        data: {
          remainingCount: correct,
          ...(shouldDeactivate ? { isActive: false } : {}),
        },
      })
    }

    if (needsUpdate) totalFixed++
    if (shouldDeactivate) totalDeactivated++
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`Summary:`)
  console.log(`  Already correct : ${totalAlreadyCorrect}`)
  console.log(`  Need fixing     : ${totalFixed}`)
  console.log(`  Auto-deactivated: ${totalDeactivated}`)

  if (DRY_RUN && (totalFixed > 0 || totalDeactivated > 0)) {
    console.log(`\n⚠️  DRY RUN — no changes were written.`)
    console.log(`   Run with --apply to apply the fixes above.`)
  } else if (!DRY_RUN) {
    console.log(`\n✅ Done — database has been updated.`)
  }

  console.log()
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
