/**
 * Validate the actual backup file against the live database.
 * Run: node --env-file=.env.local scripts/test-validate-backup.js <path-to-backup.json.gz>
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { PrismaClient } = require('@prisma/client')

// Same TABLE_TO_MODEL_MAPPING as backup-validation.ts
const TABLE_TO_MODEL_MAPPING = {
  customerLaybys: 'customerLayby',
  customerLaybyPayments: 'customerLaybyPayment',
  customerDisplayAds: 'customerDisplayAd',
  eodPaymentBatches: 'eODPaymentBatch',
  cashBucketEntries: 'cashBucketEntry',
  groupedEODRuns: 'groupedEODRun',
  groupedEODRunDates: 'groupedEODRunDate',
  cashAllocationReports: 'cashAllocationReport',
  cashAllocationLineItems: 'cashAllocationLineItem',
  pettyCashTransactions: 'pettyCashTransaction',
  businessLoans: 'businessLoan',
  businessLoanManagers: 'businessLoanManager',
  businessLoanExpenses: 'businessLoanExpense',
  businessLoanPreLockRepayments: 'businessLoanPreLockRepayment',
  loanWithdrawalRequests: 'loanWithdrawalRequest',
  expenseAccountAutoDeposits: 'expenseAccountAutoDeposit',
  businessRentConfigs: 'businessRentConfig',
  appNotifications: 'appNotification',
  posTerminalConfigs: 'posTerminalConfig',
  chickenBatches: 'chickenBatch',
  chickenFeedLogs: 'chickenFeedLog',
  chickenMedicationLogs: 'chickenMedicationLog',
  chickenWeightLogs: 'chickenWeightLog',
  chickenVaccinationSchedules: 'chickenVaccinationSchedule',
  chickenVaccinationLogs: 'chickenVaccinationLog',
  chickenBirdWeights: 'chickenBirdWeight',
  chickenInventoryMovements: 'chickenInventoryMovement',
  chickenUtilityCosts: 'chickenUtilityCost',
  chickenLaborLogs: 'chickenLaborLog',
  paymentReversalLogs: 'paymentReversalLog',
}
const KNOWN_PARTIAL = new Set(['images'])
const SKIP_SCOPING = new Set(['externalClockIn'])

function findModel(prisma, name) {
  if (TABLE_TO_MODEL_MAPPING[name]) return TABLE_TO_MODEL_MAPPING[name]
  if (prisma[name]) return name
  const camel = name.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  if (prisma[camel]) return camel
  const lower = name.toLowerCase().replace(/_/g, '')
  for (const k of Object.keys(prisma)) {
    if (k.toLowerCase().replace(/_/g, '') === lower) return k
  }
  return name
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: node test-validate-backup.js <backup.json.gz>')
    process.exit(1)
  }

  console.log(`\nLoading backup: ${path.basename(filePath)}`)
  const raw = fs.readFileSync(filePath)
  const json = zlib.gunzipSync(raw).toString('utf8')
  const backup = JSON.parse(json)

  const bd = backup.businessData || backup
  const tableNames = Object.keys(bd).filter(k => k !== 'metadata' && Array.isArray(bd[k]))
  const businessIds = backup.metadata?.backedUpBusinessIds || []

  console.log(`Tables in backup: ${tableNames.length}`)
  console.log(`Businesses: ${businessIds.length}\n`)

  const prisma = new PrismaClient()

  let exact = 0, partial = 0, missing = 0, mismatch = 0
  const problems = []

  for (const key of tableNames) {
    const backupCount = bd[key].length
    const modelName = findModel(prisma, key)
    const model = prisma[modelName]

    if (!model || typeof model.count !== 'function') {
      console.log(`  ✗  ${key.padEnd(40)} backup=${backupCount}  DB=UNKNOWN (model '${modelName}' not found)`)
      missing++
      problems.push({ key, backupCount, dbCount: -1, reason: `model '${modelName}' not found` })
      continue
    }

    let dbCount = null
    if (businessIds.length > 0 && !SKIP_SCOPING.has(key)) {
      try {
        dbCount = await model.count({ where: { OR: [{ businessId: { in: businessIds } }, { businessId: null }] } })
      } catch { dbCount = null }
    }
    if (dbCount === null) dbCount = await model.count()

    if (KNOWN_PARTIAL.has(key)) {
      console.log(`  ~  ${key.padEnd(40)} backup=${String(backupCount).padStart(5)}  DB=${String(dbCount).padStart(5)}  (partial by design)`)
      partial++
    } else if (backupCount === dbCount) {
      console.log(`  ✓  ${key.padEnd(40)} ${String(backupCount).padStart(5)} records`)
      exact++
    } else {
      const diff = dbCount - backupCount
      const sign = diff > 0 ? `+${diff}` : `${diff}`
      console.log(`  ✗  ${key.padEnd(40)} backup=${String(backupCount).padStart(5)}  DB=${String(dbCount).padStart(5)}  (${sign})`)
      mismatch++
      problems.push({ key, backupCount, dbCount, diff })
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  Exact matches:        ${exact}`)
  console.log(`  Partial (by design):  ${partial}`)
  console.log(`  Model not found:      ${missing}`)
  console.log(`  Count mismatches:     ${mismatch}`)
  if (problems.length) {
    console.log(`\n  Problems:`)
    for (const p of problems) console.log(`    ${p.key}: ${JSON.stringify(p)}`)
  }
  console.log(missing + mismatch === 0 ? '\n  ✅  Validation PASSED\n' : '\n  ❌  Validation FAILED\n')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
