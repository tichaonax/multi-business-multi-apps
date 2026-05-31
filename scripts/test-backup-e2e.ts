/**
 * End-to-End Backup/Restore Test
 * Calls createCleanBackup() then restoreCleanBackup() on live DB.
 * Restore uses upsert — safe to run on production data (no deletes).
 */

import { PrismaClient } from '@prisma/client'
import { createCleanBackup } from '../src/lib/backup-clean'
import { restoreCleanBackup } from '../src/lib/restore-clean'
import { validateBackupRestore } from '../src/lib/backup-validation'

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
  // Restaurant Delivery Service (MBM-184)
  'deliveryCustomerAccounts', 'deliveryAccountTransactions', 'deliveryRuns', 'deliveryOrderMeta', 'deliveryStatusHistory',
  // Business Asset Management (MBM-185)
  'assetCategories', 'businessAssets', 'assetDepreciationEntries', 'assetMaintenanceLogs', 'assetImages',
  // Inventory Expiry Tracking (MBM-186)
  'itemExpiryBatches', 'expiryActions',
  // Policy Management (MBM-189)
  'policyTemplates', 'policies', 'policyVersions', 'policyAssignments', 'policyAcknowledgments',
  // Payment Cancellation & Manager Override (MBM-192)
  'managerOverrideCodes', 'managerOverrideCodeHistory', 'managerOverrideLogs', 'orderCancellations',
  // Expense Account Access & Combo Requests (MBM-201)
  'expenseAccountUserAccess', 'comboPaymentRequests', 'comboPaymentRequestSections', 'comboPaymentRequestItems',
  // Vehicle Renewal Workflow & Issuing Authorities
  'vehicleRenewalReceipts', 'vehicleExemptions', 'issuingAuthorities',
  // Leave Policies (MBM-202/203)
  'leavePolicies',
  // Restaurant Credit Payments (MBM-204/205)
  'restaurantCreditPayments',
  // Expense Payment Receipts (MBM-194)
  'expensePaymentReceipts',
  // Chat Targeted Replies (MBM-210)
  'chatMessageRecipients',
  // Supplier / Contractor / Payee Category System (MBM-220)
  'supplierCategoryGroups', 'supplierCategories',
  'contractorCategoryGroups', 'contractorCategories',
  'payeeCategoryGroups', 'payeeCategories',
  // Warehouse Import (MBM-222)
  'warehouseBatches', 'warehouseItems',
  // Warehouse Reference Locking (MBM-224)
  'warehouseReferenceLocks',
  // Warehouse Order Refs / Manifest Qty (MBM-225)
  'warehouseOrderRefs',
  // Scale Integration (MBM-226)
  'weightPricingRules', 'livestockPurchaseSessions', 'livestockPurchaseLines',
  // Vendor Profiles (MBM-227)
  'livestockVendorProfiles',
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

  // ── Phase 2.5: Pre-restore validation ─────────────────────────────────────
  console.log('\nPhase 2.5: validateBackupRestore() — pre-restore (backup vs current DB)...\n')
  const preValidation = await validateBackupRestore(prisma, backup)
  console.log(`  Tables:               ${preValidation.totalTables}`)
  console.log(`  Exact matches:        ${preValidation.exactMatches}`)
  console.log(`  Expected differences: ${preValidation.expectedDifferences}`)
  console.log(`  Unexpected mismatches:${preValidation.unexpectedMismatches}`)
  console.log(`  Overall status:       ${preValidation.overallStatus}`)

  if (preValidation.overallStatus === 'error') {
    console.log('\n  Unexpected mismatches (pre-restore):')
    preValidation.results
      .filter(r => r.status === 'unexpected-mismatch')
      .forEach(r => console.log(`    ✗ ${r.tableName}: backup=${r.backupCount}, db=${r.databaseCount} — ${r.notes}`))
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

  // ── Phase 4.5: Post-restore validation ────────────────────────────────────
  console.log('\nPhase 4.5: validateBackupRestore() — post-restore (backup vs DB with restore result)...\n')
  const postValidation = await validateBackupRestore(prisma, backup, result)
  console.log(`  Tables:               ${postValidation.totalTables}`)
  console.log(`  Exact matches:        ${postValidation.exactMatches}`)
  console.log(`  Expected differences: ${postValidation.expectedDifferences}`)
  console.log(`  Unexpected mismatches:${postValidation.unexpectedMismatches}`)
  console.log(`  Overall status:       ${postValidation.overallStatus}`)

  if (postValidation.overallStatus === 'error') {
    console.log('\n  Unexpected mismatches (post-restore):')
    postValidation.results
      .filter(r => r.status === 'unexpected-mismatch')
      .forEach(r => console.log(`    ✗ ${r.tableName}: backup=${r.backupCount}, db=${r.databaseCount} — ${r.notes}`))
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  FINAL RESULTS')
  console.log('══════════════════════════════════════════════════════')
  const issues = missing + restoreMissed + (result.errors > 0 ? result.errors : 0)
    + (postValidation.overallStatus === 'error' ? postValidation.unexpectedMismatches : 0)
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
