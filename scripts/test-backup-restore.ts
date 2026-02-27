/**
 * Live backup/validate/restore integration test
 * Run: npx ts-node --transpile-only --project tsconfig.server.json scripts/test-backup-restore.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { createCleanBackup } from '../src/lib/backup-clean'
import { restoreCleanBackup, validateBackupData } from '../src/lib/restore-clean'

const prisma = new PrismaClient()

const TABLES_TO_VERIFY = [
  'receiptSequences',
  'supplierPaymentRequests',
  'supplierPaymentRequestItems',
  'supplierPaymentRequestPartials',
  'supplierRatings',
  'chatRooms',
  'chatMessages',
  'chatParticipants',
  'auditLogs',
]

async function main() {
  console.log('\n========================================')
  console.log('  BACKUP / VALIDATE / RESTORE TEST')
  console.log('========================================\n')

  // ── STEP 1: BACKUP ────────────────────────────────────────────────────────
  console.log('STEP 1: Creating full backup...')
  const t0 = Date.now()

  const backup = await createCleanBackup(prisma, {
    backupType: 'full',
    includeDeviceData: false,
    includeDemoData: true,
    includeAuditLogs: true,
    createdBy: 'test-script',
  })

  const backupMs = Date.now() - t0
  console.log(`  ✅ Backup created in ${backupMs}ms`)
  console.log(`  Version   : ${backup.metadata.version}`)
  console.log(`  Timestamp : ${backup.metadata.timestamp}`)
  console.log(`  Total records: ${backup.metadata.stats.totalRecords}`)
  console.log(`  Total tables : ${backup.metadata.stats.totalTables}`)
  console.log(`  Businesses backed up: ${backup.metadata.backedUpBusinessIds?.length ?? 'N/A'}`)

  // ── STEP 2: VERIFY NEW TABLES IN BACKUP ───────────────────────────────────
  console.log('\nSTEP 2: Verifying newly added tables appear in backup...')
  const bd = backup.businessData as Record<string, any[]>
  let allPresent = true
  for (const table of TABLES_TO_VERIFY) {
    const arr = bd[table]
    const present = Array.isArray(arr)
    const count = present ? arr.length : 0
    const icon = present ? '✅' : '❌'
    console.log(`  ${icon} ${table.padEnd(40)} ${count} row(s)`)
    if (!present) allPresent = false
  }
  if (!allPresent) {
    console.error('\n❌ Some expected tables are MISSING from the backup output!')
    process.exit(1)
  }

  // ── STEP 3: SAVE BACKUP TO DISK ────────────────────────────────────────────
  const outPath = path.join(__dirname, '..', 'test-backup-output.json')
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2))
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2)
  console.log(`\nSTEP 3: Backup saved → test-backup-output.json (${sizeMB} MB)`)

  // ── STEP 4: VALIDATE ───────────────────────────────────────────────────────
  console.log('\nSTEP 4: Validating backup structure...')
  const validation = validateBackupData(backup)
  if (validation.valid) {
    console.log('  ✅ Validation passed')
  } else {
    console.error('  ❌ Validation FAILED:', validation.errors)
    process.exit(1)
  }

  // ── STEP 5: RESTORE (same-device, upsert-safe) ────────────────────────────
  console.log('\nSTEP 5: Running restore (upsert — no data loss)...')
  const t1 = Date.now()
  const errors: string[] = []

  const result = await restoreCleanBackup(prisma, backup, {
    batchSize: 100,
    onProgress: (model, processed, total) => {
      if (processed === total) process.stdout.write(`  ↺ ${model}: ${total} records\n`)
    },
    onError: (model, id, error) => {
      errors.push(`${model}[${id}]: ${error}`)
    },
  })

  const restoreMs = Date.now() - t1
  console.log(`\n  ✅ Restore completed in ${restoreMs}ms`)
  console.log(`  Processed     : ${result.processed}`)
  console.log(`  Errors        : ${result.errors}`)
  console.log(`  Skipped       : ${result.skippedRecords}`)
  console.log(`    FK errors   : ${result.skippedReasons.foreignKeyErrors}`)
  console.log(`    Validation  : ${result.skippedReasons.validationErrors}`)
  console.log(`    Other       : ${result.skippedReasons.otherErrors}`)

  if (errors.length > 0) {
    console.warn(`\n  ⚠️  ${errors.length} non-fatal error(s):`)
    errors.slice(0, 20).forEach(e => console.warn('   ', e))
    if (errors.length > 20) console.warn(`   ...and ${errors.length - 20} more`)
  }

  // ── STEP 6: SPOT CHECK NEW TABLES IN DB ───────────────────────────────────
  console.log('\nSTEP 6: Spot-checking DB row counts after restore...')
  const checks: Record<string, () => Promise<number>> = {
    'receiptSequences'              : () => (prisma as any).receiptSequences.count(),
    'supplierPaymentRequests'       : () => (prisma as any).supplierPaymentRequests.count(),
    'supplierPaymentRequestItems'   : () => (prisma as any).supplierPaymentRequestItems.count(),
    'supplierPaymentRequestPartials': () => (prisma as any).supplierPaymentRequestPartials.count(),
    'supplierRatings'               : () => (prisma as any).supplierRatings.count(),
    'chatRooms'                     : () => (prisma as any).chatRooms.count(),
    'chatMessages'                  : () => (prisma as any).chatMessages.count(),
    'chatParticipants'              : () => (prisma as any).chatParticipants.count(),
  }

  for (const [table, countFn] of Object.entries(checks)) {
    const backupCount = (bd[table] ?? []).length
    const dbCount = await countFn()
    const match = dbCount >= backupCount
    const icon = match ? '✅' : '⚠️ '
    console.log(`  ${icon} ${table.padEnd(40)} backup=${backupCount}  db=${dbCount}`)
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n========================================')
  if (result.errors === 0 && result.skippedReasons.foreignKeyErrors === 0) {
    console.log('  ✅ ALL STEPS PASSED — backup & restore OK')
  } else {
    console.log(`  ⚠️  Completed with ${result.errors} error(s) / ${result.skippedReasons.foreignKeyErrors} FK error(s)`)
    console.log('     Review the error log above for details.')
  }
  console.log('========================================\n')
}

main()
  .catch(e => {
    console.error('\n💥 Fatal error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
