/**
 * Test: Verify vehicles (including null businessId) and payroll account
 * deposits/payments are captured in backup.
 */
import { PrismaClient } from '@prisma/client'
import { createCleanBackup } from '../src/lib/backup-clean'
import { restoreCleanBackup } from '../src/lib/restore-clean'
import { validateBackupRestore } from '../src/lib/backup-validation'

const prisma = new PrismaClient()

async function main() {
  try {
    // ─── STEP 1: Count DB records (including null businessId) ─────────────
    const [dbVehicles, dbPayrollDeposits, dbPayrollPayments] = await Promise.all([
      prisma.vehicles.findMany(),
      prisma.payrollAccountDeposits.findMany(),
      prisma.payrollAccountPayments.findMany()
    ])

    console.log(`\n[DB] vehicles: ${dbVehicles.length} records`)
    dbVehicles.forEach((v: any) => console.log(`  - ${v.id} businessId=${v.businessId ?? 'null'}`))
    console.log(`[DB] payrollAccountDeposits: ${dbPayrollDeposits.length} records`)
    console.log(`[DB] payrollAccountPayments: ${dbPayrollPayments.length} records`)

    // ─── STEP 2: Create backup ────────────────────────────────────────────
    console.log('\n[BACKUP] Creating full backup...')
    const backup = await createCleanBackup(prisma, {
      backupType: 'full',
      includeDemoData: false,
      includeDeviceData: false,
      includeAuditLogs: false
    })

    const bd = backup.businessData
    const backupVehicles = bd.vehicles || []
    const backupDeposits = bd.payrollAccountDeposits || []
    const backupPayments = bd.payrollAccountPayments || []

    console.log(`\n[BACKUP] vehicles captured: ${backupVehicles.length}`)
    backupVehicles.forEach((v: any) => console.log(`  - ${v.id} businessId=${v.businessId ?? 'null'}`))
    console.log(`[BACKUP] payrollAccountDeposits captured: ${backupDeposits.length}`)
    console.log(`[BACKUP] payrollAccountPayments captured: ${backupPayments.length}`)

    // Check backedUpBusinessIds in metadata
    const backedUpIds = backup.metadata.backedUpBusinessIds
    console.log(`\n[BACKUP] backedUpBusinessIds: ${backedUpIds ? backedUpIds.length + ' businesses' : 'NOT SET'}`)

    // ─── STEP 3: Validate counts ──────────────────────────────────────────
    const vehicleMatch = backupVehicles.length === dbVehicles.length
    const depositMatch = backupDeposits.length === dbPayrollDeposits.length
    const paymentMatch = backupPayments.length === dbPayrollPayments.length

    console.log(`\n[VALIDATE] vehicles:              ${vehicleMatch ? '✅ PASS' : '❌ FAIL'} (DB: ${dbVehicles.length}, Backup: ${backupVehicles.length})`)
    console.log(`[VALIDATE] payrollAccountDeposits: ${depositMatch ? '✅ PASS' : '❌ FAIL'} (DB: ${dbPayrollDeposits.length}, Backup: ${backupDeposits.length})`)
    console.log(`[VALIDATE] payrollAccountPayments: ${paymentMatch ? '✅ PASS' : '❌ FAIL'} (DB: ${dbPayrollPayments.length}, Backup: ${backupPayments.length})`)

    // ─── STEP 4: Restore and run full validation ──────────────────────────
    console.log('\n[RESTORE] Running idempotent restore...')
    const restoreResult = await restoreCleanBackup(prisma, backup, {
      onProgress: () => {},
      onError: (model, id, error) => {
        console.error(`  [restore ERROR] ${model} ${id}: ${error}`)
      }
    })

    console.log(`[RESTORE] processed=${restoreResult.processed} errors=${restoreResult.errors} skipped=${restoreResult.skippedRecords}`)

    console.log('\n[VALIDATION] Running backup validation...')
    const summary = await validateBackupRestore(prisma, backup, restoreResult)

    console.log(`\n[VALIDATION] Overall status: ${summary.overallStatus.toUpperCase()}`)
    console.log(`  exactMatches:         ${summary.exactMatches}`)
    console.log(`  expectedDifferences:  ${summary.expectedDifferences}`)
    console.log(`  unexpectedMismatches: ${summary.unexpectedMismatches}`)

    if (summary.unexpectedMismatches > 0) {
      console.log('\n❌ Unexpected mismatches:')
      summary.results
        .filter(r => r.status === 'unexpected-mismatch')
        .forEach(r => console.log(`  - ${r.tableName}: backup=${r.backupCount}, db=${r.databaseCount} — ${r.notes ?? ''}`))
    }

    // ─── Final summary ────────────────────────────────────────────────────
    const allPassed = vehicleMatch && depositMatch && paymentMatch && summary.unexpectedMismatches === 0
    console.log(`\n${'='.repeat(55)}`)
    console.log(`OVERALL: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
    console.log('='.repeat(55))

    process.exit(allPassed ? 0 : 1)
  } catch (e: any) {
    console.error('\n[FATAL]', e.message)
    console.error(e.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
