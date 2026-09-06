/**
 * End-to-End Incremental Backup Test (Phase 5, MBM-294 §3.5)
 *
 * Verifies the watermark filter and the full+incremental restore cycle,
 * entirely read-only against real existing data — no synthetic rows are
 * created. A full backup's own `Images` rows already span a real range of
 * `createdAt` timestamps (employee photos, business logos, product photos,
 * the MBM-294 category-image import, etc.), so a watermark picked from that
 * real spread is enough to prove the filter actually filters, without
 * writing anything to the database to manufacture a test case.
 *
 * Restore uses upsert — safe to run on production data (no deletes), same
 * as scripts/test-backup-e2e.ts.
 */

import { PrismaClient } from '@prisma/client'
import { createCleanBackup } from '../src/lib/backup-clean'
import { restoreCleanBackup } from '../src/lib/restore-clean'
import { validateBackupRestore } from '../src/lib/backup-validation'

async function main() {
  const prisma = new PrismaClient()

  console.log('\n══════════════════════════════════════════════════════')
  console.log('  INCREMENTAL BACKUP → RESTORE TEST')
  console.log('══════════════════════════════════════════════════════\n')

  // ── Phase 1: Full backup (the base) ────────────────────────────────────────
  console.log('Phase 1: createCleanBackup() — full (base)...')
  const t0 = Date.now()
  const full = await createCleanBackup(prisma, {
    backupType: 'full',
    includeDemoData: true,
    includeBusinessData: true,
    createdBy: 'incremental-e2e-test',
  })
  console.log(`  Done in ${Date.now() - t0}ms`)
  const fullImages = (full.businessData.images || []) as Array<{ id: string; createdAt: Date | string }>
  console.log(`  Total images in full backup: ${fullImages.length}`)

  if (fullImages.length < 4) {
    console.log('\n  ⚠️  Not enough Images rows in this database to pick a meaningful watermark split — skipping (not a failure).')
    await prisma.$disconnect()
    process.exit(0)
  }

  // ── Phase 2: Pick a real watermark from the existing spread ────────────────
  const sorted = [...fullImages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const splitIndex = Math.floor(sorted.length / 2)
  const since = new Date(sorted[splitIndex].createdAt).toISOString()
  const expectedAfter = sorted.filter(i => new Date(i.createdAt).getTime() > new Date(since).getTime())
  const expectedAtOrBefore = sorted.filter(i => new Date(i.createdAt).getTime() <= new Date(since).getTime())
  console.log(`\nPhase 2: Watermark picked from real data: ${since}`)
  console.log(`  Expected included (createdAt > since): ${expectedAfter.length}`)
  console.log(`  Expected excluded (createdAt <= since): ${expectedAtOrBefore.length}`)

  // ── Phase 3: Incremental backup using that watermark ───────────────────────
  console.log('\nPhase 3: createCleanBackup() — incremental (since watermark)...')
  const t1 = Date.now()
  const incremental = await createCleanBackup(prisma, {
    backupType: 'full',
    includeDemoData: true,
    includeBusinessData: true,
    createdBy: 'incremental-e2e-test',
    since,
    baseBackupTimestamp: full.metadata.timestamp,
    baseSourceNodeId: full.metadata.sourceNodeId,
  })
  console.log(`  Done in ${Date.now() - t1}ms`)
  const incImages = (incremental.businessData.images || []) as Array<{ id: string; createdAt: Date | string }>
  console.log(`  Total images in incremental backup: ${incImages.length}`)

  let issues = 0

  // ── Phase 4: Verify the filter is actually correct ─────────────────────────
  console.log('\nPhase 4: Verifying watermark filter correctness...\n')

  if (incImages.length !== expectedAfter.length) {
    console.log(`  ✗  Expected ${expectedAfter.length} images after watermark, got ${incImages.length}`)
    issues++
  } else {
    console.log(`  ✓  Image count matches expected (${incImages.length})`)
  }

  const incIds = new Set(incImages.map(i => i.id))
  const wronglyIncluded = expectedAtOrBefore.filter(i => incIds.has(i.id))
  if (wronglyIncluded.length > 0) {
    console.log(`  ✗  ${wronglyIncluded.length} image(s) created at/before the watermark were wrongly included`)
    issues++
  } else {
    console.log('  ✓  No pre-watermark images leaked into the incremental backup')
  }

  const missingFromIncremental = expectedAfter.filter(i => !incIds.has(i.id))
  if (missingFromIncremental.length > 0) {
    console.log(`  ✗  ${missingFromIncremental.length} post-watermark image(s) are missing from the incremental backup`)
    issues++
  } else {
    console.log('  ✓  Every post-watermark image is present')
  }

  if (incremental.metadata.incremental?.since !== since) {
    console.log(`  ✗  metadata.incremental.since mismatch: expected ${since}, got ${incremental.metadata.incremental?.since}`)
    issues++
  } else {
    console.log('  ✓  metadata.incremental.since recorded correctly')
  }

  // Every other table should be a full snapshot — same counts either way.
  const nonImageKeys = Object.keys(full.businessData).filter(k => k !== 'images')
  let tableMismatches = 0
  for (const key of nonImageKeys) {
    const fullCount = Array.isArray(full.businessData[key]) ? full.businessData[key].length : undefined
    const incCount = Array.isArray(incremental.businessData[key]) ? incremental.businessData[key].length : undefined
    if (fullCount !== incCount) {
      console.log(`  ✗  ${key}: full=${fullCount}, incremental=${incCount} — should be identical (only images is watermark-filtered)`)
      tableMismatches++
    }
  }
  if (tableMismatches === 0) {
    console.log(`  ✓  All ${nonImageKeys.length} non-image tables are identical between full and incremental (as designed)`)
  } else {
    issues += tableMismatches
  }

  // ── Phase 5: Restore full, then incremental on top (idempotent upsert) ─────
  console.log('\nPhase 5: restoreCleanBackup() — full, then incremental on top...\n')
  const t2 = Date.now()
  const fullRestore = await restoreCleanBackup(prisma, full, { batchSize: 50 })
  console.log(`  Full restore:        ${fullRestore.processed} processed, ${fullRestore.errors} errors, ${Date.now() - t2}ms`)

  const t3 = Date.now()
  const incRestore = await restoreCleanBackup(prisma, incremental, { batchSize: 50 })
  console.log(`  Incremental restore: ${incRestore.processed} processed, ${incRestore.errors} errors, ${Date.now() - t3}ms`)

  if (fullRestore.errors > 0 || incRestore.errors > 0) {
    console.log(`  ✗  Restore reported errors (full=${fullRestore.errors}, incremental=${incRestore.errors})`)
    issues++
  } else {
    console.log('  ✓  Both restores completed with 0 errors')
  }

  // ── Phase 6: Post-restore validation against the full backup ──────────────
  console.log('\nPhase 6: validateBackupRestore() — DB should match the FULL backup after both restores...\n')
  const postValidation = await validateBackupRestore(prisma, full, incRestore)
  console.log(`  Tables:               ${postValidation.totalTables}`)
  console.log(`  Exact matches:        ${postValidation.exactMatches}`)
  console.log(`  Expected differences: ${postValidation.expectedDifferences}`)
  console.log(`  Unexpected mismatches:${postValidation.unexpectedMismatches}`)
  console.log(`  Overall status:       ${postValidation.overallStatus}`)

  if (postValidation.overallStatus === 'error') {
    console.log('\n  Unexpected mismatches:')
    postValidation.results
      .filter(r => r.status === 'unexpected-mismatch')
      .forEach(r => console.log(`    ✗ ${r.tableName}: backup=${r.backupCount}, db=${r.databaseCount} — ${r.notes}`))
    issues += postValidation.unexpectedMismatches
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  FINAL RESULTS')
  console.log('══════════════════════════════════════════════════════')
  if (issues === 0) {
    console.log('  ✅  INCREMENTAL BACKUP + RESTORE FULLY VERIFIED\n')
  } else {
    console.log(`  ❌  ${issues} issue(s) — see output above\n`)
  }

  await prisma.$disconnect()
  process.exit(issues === 0 ? 0 : 1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
