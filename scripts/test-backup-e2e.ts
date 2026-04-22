/**
 * End-to-End Backup/Restore Test
 * Calls createCleanBackup() then restoreCleanBackup() on live DB.
 * Restore uses upsert — safe to run on production data (no deletes).
 */

import { PrismaClient } from '@prisma/client'
import { createCleanBackup } from '../src/lib/backup-clean'
import { restoreCleanBackup } from '../src/lib/restore-clean'

const NEW_TABLE_KEYS = [
  // EOD / Cash Box
  'eodPaymentBatches', 'paymentBatchSubmissions', 'cashBucketEntries',
  'groupedEODRuns', 'groupedEODRunDates', 'cashAllocationReports',
  'cashAllocationLineItems', 'pettyCashRequests', 'pettyCashTransactions',
  'paymentReversalLogs', 'paymentNotes',
  // Employees
  'perDiemEntries', 'employeeAbsences', 'employeeLoginLog', 'externalClockIn',
  // Business Loans
  'businessLoans', 'businessLoanManagers',
  'businessLoanExpenses', 'businessLoanPreLockRepayments', 'loanWithdrawalRequests',
  // Expense Accounts
  'expenseAccountAutoDeposits', 'businessRentConfigs', 'appNotifications',
  // Payroll
  'payrollSlips', 'payrollZimraRemittances', 'payrollPaymentVouchers',
  'accountOutgoingLoans', 'accountOutgoingLoanPayments',
  // Promotions, Coupons, Meal Program
  'promoCampaigns', 'customerRewards', 'coupons', 'couponUsages',
  'mealProgramParticipants', 'mealProgramEligibleItems', 'mealProgramTransactions',
  // Supplier Payments
  'supplierPaymentRequests', 'supplierPaymentRequestItems',
  'supplierPaymentRequestPartials', 'supplierRatings',
  // Saved Data / Display / Receipts
  'savedReports', 'customerDisplayAds', 'posTerminalConfigs', 'receiptSequences', 'reprintLog',
  // Clothing Bales
  'clothingBaleCategories', 'clothingBales', 'clothingBaleBogoHistory', 'clothingLabelPrintHistory',
  // Chicken Run
  'chickenRunSettings', 'chickenVaccinationSchedules',
  'chickenBatches', 'chickenMortality', 'chickenFeedLogs', 'chickenMedicationLogs',
  'chickenWeightLogs', 'chickenVaccinationLogs', 'chickenCulling', 'chickenInventory',
  'chickenBirdWeights', 'chickenInventoryMovements', 'chickenUtilityCosts', 'chickenLaborLogs',
  // Stock Take
  'stockTakeDrafts', 'stockTakeDraftItems', 'stockTakeReports', 'stockTakeReportEmployees',
  // Custom Bulk Products
  'customBulkProducts',
  // Restaurant Prep Inventory Tracking (MBM-183)
  'menuItemInventoryConfigs', 'menuItemInventoryBatches',
  // Invoices & Quotations (MBM-178)
  'invoices', 'invoiceItems',
  // Salesperson EOD Reports (MBM-187)
  'salespersonEodReports',
]

async function main() {
  const prisma = new PrismaClient()

  console.log('\n══════════════════════════════════════════════════════')
  console.log('  END-TO-END BACKUP → RESTORE TEST')
  console.log('══════════════════════════════════════════════════════\n')

  // ── Phase 1: Create Backup ─────────────────────────────────────────────────
  console.log('Phase 1: createCleanBackup()...')
  const t0 = Date.now()
  const backup = await createCleanBackup(prisma, {
    backupType: 'full',
    includeDemoData: true,
    includeBusinessData: true,
    createdBy: 'e2e-test',
  })
  console.log(`  Done in ${Date.now() - t0}ms`)
  console.log(`  Total records: ${backup.metadata.stats.totalRecords}`)
  console.log(`  Total tables:  ${backup.metadata.stats.totalTables}`)

  // ── Phase 2: Check new table keys present ─────────────────────────────────
  console.log('\nPhase 2: Verifying new table keys in backup.businessData...\n')
  let missing = 0
  let populated = 0
  let empty = 0

  for (const key of NEW_TABLE_KEYS) {
    const val = backup.businessData[key]
    if (val === undefined) {
      console.log(`  ✗  ${key} — KEY MISSING from backup`)
      missing++
    } else if (Array.isArray(val) && val.length > 0) {
      console.log(`  ✓  ${key} — ${val.length} records`)
      populated++
    } else {
      console.log(`  ○  ${key} — empty array (no data)`)
      empty++
    }
  }
  console.log(`\n  Keys present: ${populated + empty}/${NEW_TABLE_KEYS.length}  |  With data: ${populated}  |  Missing: ${missing}`)

  if (missing > 0) {
    console.log('\n  ❌ Backup phase failed — aborting restore test')
    await prisma.$disconnect()
    process.exit(1)
  }

  // ── Phase 3: Restore (upsert — idempotent, safe on live DB) ───────────────
  console.log('\nPhase 3: restoreCleanBackup() — upsert mode (idempotent)...\n')
  const t1 = Date.now()
  let progressLines = 0

  const result = await restoreCleanBackup(prisma, backup, {
    batchSize: 50,
    onProgress: (model, processed, total) => {
      if (NEW_TABLE_KEYS.includes(model) || progressLines < 5) {
        process.stdout.write(`  ↻  ${model}: ${processed}/${total}\r`)
        progressLines++
      }
    },
    onError: (model, recordId, error) => {
      console.log(`\n  ⚠  ${model} [${recordId}]: ${error}`)
    },
  })

  process.stdout.write('\n')
  console.log(`\n  Restore finished in ${Date.now() - t1}ms`)
  console.log(`  Processed:  ${result.processed}`)
  console.log(`  Errors:     ${result.errors}`)
  console.log(`  Skipped:    ${result.skippedRecords}`)
  console.log(`    FK errors:         ${result.skippedReasons.foreignKeyErrors}`)
  console.log(`    Validation errors: ${result.skippedReasons.validationErrors}`)
  console.log(`    Other:             ${result.skippedReasons.otherErrors}`)

  // ── Phase 4: Verify new tables were touched in restore ────────────────────
  console.log('\nPhase 4: Checking restore model counts for new tables...\n')
  let restoreMissed = 0
  for (const key of NEW_TABLE_KEYS) {
    const count = result.modelCounts?.[key]
    if (backup.businessData[key]?.length > 0) {
      if (!count || count.attempted === 0) {
        console.log(`  ✗  ${key} — had ${backup.businessData[key].length} records in backup but 0 attempted in restore`)
        restoreMissed++
      } else {
        console.log(`  ✓  ${key} — ${count.successful}/${count.attempted} restored (${count.skipped} skipped)`)
      }
    }
    // empty tables silently pass
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  FINAL RESULTS')
  console.log('══════════════════════════════════════════════════════')
  const issues = missing + restoreMissed + (result.errors > 0 ? result.errors : 0)
  if (issues === 0) {
    console.log('  ✅  BACKUP + RESTORE FULLY VERIFIED\n')
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
