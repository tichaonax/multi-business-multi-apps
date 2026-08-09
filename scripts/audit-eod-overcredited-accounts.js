/**
 * Read-only audit: finds EOD auto-deposits (rent transfers, expense/loan auto-deposits,
 * payroll EOD contributions) that were made without enough real cash to back them.
 *
 * Background (MBM-252): before the fix, these deposits were gated on
 * businessAccounts.balance (credited for every payment method, not just cash), so an
 * account could show as "funded" on a day with heavy card/EcoCash sales and little
 * actual cash. This script does NOT write anything to the database — it only reports.
 *
 * For each business:
 *   - Per EOD date: compares that day's counted cash (cashCounted + confirmedEcocashAmount
 *     from SavedReports) against the EOD auto-deposits dated that day (rent transfer +
 *     expense/loan auto-deposits + payroll EOD contribution).
 *   - Aggregate: total cash ever counted at EOD vs. total ever auto-deposited, and the
 *     business's current live CashBucketEntry balance (a negative balance is definitive
 *     proof of historical over-allocation, independent of any day-by-day attribution).
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-eod-overcredited-accounts.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function dateKey(d) {
  const dt = new Date(d)
  return dt.toISOString().slice(0, 10)
}

function money(n) {
  return `$${Number(n).toFixed(2)}`
}

async function auditBusiness(business) {
  const [eodReports, expenseDeposits, payrollDeposits, bucketRows] = await Promise.all([
    prisma.savedReports.findMany({
      where: { businessId: business.id, reportType: 'END_OF_DAY' },
      select: { reportDate: true, cashCounted: true, confirmedEcocashAmount: true },
      orderBy: { reportDate: 'asc' },
    }),
    prisma.expenseAccountDeposits.findMany({
      where: {
        sourceBusinessId: business.id,
        sourceType: { in: ['EOD_RENT_TRANSFER', 'EOD_AUTO_DEPOSIT'] },
      },
      select: {
        amount: true,
        depositDate: true,
        sourceType: true,
        expenseAccount: { select: { accountName: true } },
      },
    }),
    prisma.payrollAccountDeposits.findMany({
      where: { businessId: business.id, transactionType: 'EOD_AUTO_CONTRIBUTION' },
      select: { amount: true, depositDate: true },
    }),
    prisma.cashBucketEntry.groupBy({
      by: ['direction'],
      where: { businessId: business.id },
      _sum: { amount: true },
    }),
  ])

  if (eodReports.length === 0 && expenseDeposits.length === 0 && payrollDeposits.length === 0) {
    return null // nothing to audit for this business
  }

  const liveInflow = Number(bucketRows.find(r => r.direction === 'INFLOW')?._sum.amount ?? 0)
  const liveOutflow = Number(bucketRows.find(r => r.direction === 'OUTFLOW')?._sum.amount ?? 0)
  const liveBucketBalance = liveInflow - liveOutflow

  // Group all EOD auto-deposits by date
  const allocatedByDate = new Map() // dateKey -> { total, items: [{label, amount}] }
  const addAllocation = (date, label, amount) => {
    const key = dateKey(date)
    if (!allocatedByDate.has(key)) allocatedByDate.set(key, { total: 0, items: [] })
    const entry = allocatedByDate.get(key)
    entry.total += Number(amount)
    entry.items.push({ label, amount: Number(amount) })
  }
  for (const d of expenseDeposits) {
    const label = d.sourceType === 'EOD_RENT_TRANSFER' ? 'Rent transfer' : (d.expenseAccount?.accountName ?? 'Expense auto-deposit')
    addAllocation(d.depositDate, label, d.amount)
  }
  for (const d of payrollDeposits) {
    addAllocation(d.depositDate, 'Payroll EOD contribution', d.amount)
  }

  const cashByDate = new Map() // dateKey -> cash available that day
  for (const r of eodReports) {
    const cash = Number(r.cashCounted ?? 0) + Number(r.confirmedEcocashAmount ?? 0)
    cashByDate.set(dateKey(r.reportDate), cash)
  }

  const flaggedDays = []
  let totalCashCounted = 0
  for (const cash of cashByDate.values()) totalCashCounted += cash
  let totalAllocated = 0

  for (const [date, alloc] of allocatedByDate) {
    totalAllocated += alloc.total
    const cashAvailable = cashByDate.get(date) ?? 0
    if (alloc.total > cashAvailable + 0.01) {
      flaggedDays.push({
        date,
        cashAvailable,
        allocated: alloc.total,
        overage: alloc.total - cashAvailable,
        items: alloc.items,
      })
    }
  }

  const aggregateOverage = totalAllocated - totalCashCounted
  const hasIssue = flaggedDays.length > 0 || liveBucketBalance < -0.01 || aggregateOverage > 0.01

  return {
    business,
    hasIssue,
    liveBucketBalance,
    totalCashCounted,
    totalAllocated,
    aggregateOverage,
    flaggedDays: flaggedDays.sort((a, b) => a.date.localeCompare(b.date)),
  }
}

async function main() {
  console.log('================================================================')
  console.log(' EOD OVER-CREDIT AUDIT (read-only — no database writes) — MBM-252')
  console.log('================================================================')
  console.log('')

  const businesses = await prisma.businesses.findMany({
    select: { id: true, name: true, type: true, isDemo: true },
    orderBy: { name: 'asc' },
  })

  const results = []
  for (const business of businesses) {
    const result = await auditBusiness(business)
    if (result) results.push(result)
  }

  const flagged = results.filter(r => r.hasIssue)
  const clean = results.filter(r => !r.hasIssue)

  console.log(`Businesses audited: ${results.length} (${flagged.length} flagged, ${clean.length} clean)`)
  console.log('')

  if (flagged.length === 0) {
    console.log('No historical over-allocation detected.')
  } else {
    for (const r of flagged) {
      const demoTag = r.business.isDemo ? ' [DEMO]' : ''
      console.log('----------------------------------------------------------------')
      console.log(`${r.business.name}${demoTag}  (${r.business.type}, id=${r.business.id})`)
      console.log(`  Live CashBucketEntry balance: ${money(r.liveBucketBalance)}${r.liveBucketBalance < 0 ? '  <-- NEGATIVE' : ''}`)
      console.log(`  Total EOD cash counted (all time):    ${money(r.totalCashCounted)}`)
      console.log(`  Total EOD auto-deposits (all time):   ${money(r.totalAllocated)}`)
      if (r.aggregateOverage > 0.01) {
        console.log(`  Aggregate overage:                    ${money(r.aggregateOverage)}  <-- allocated more than was ever counted`)
      }
      if (r.flaggedDays.length > 0) {
        console.log(`  Flagged days (${r.flaggedDays.length}):`)
        for (const d of r.flaggedDays) {
          console.log(`    ${d.date}: cash available ${money(d.cashAvailable)}, allocated ${money(d.allocated)}, overage ${money(d.overage)}`)
          for (const item of d.items) {
            console.log(`        - ${item.label}: ${money(item.amount)}`)
          }
        }
      }
      console.log('')
    }
  }

  console.log('================================================================')
  console.log('Summary')
  console.log('================================================================')
  console.log(`Total businesses with a historical shortfall: ${flagged.length}`)
  const totalOverage = flagged.reduce((s, r) => s + Math.max(r.aggregateOverage, -r.liveBucketBalance, 0), 0)
  console.log(`Sum of aggregate overage across flagged businesses (rough order of magnitude): ${money(totalOverage)}`)
  console.log('')
  console.log('This report does not modify any data. If corrections are needed, they will be')
  console.log('written as a reviewed SQL migration under prisma/migrations/, not applied directly.')
}

main()
  .catch(err => {
    console.error('Audit failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
