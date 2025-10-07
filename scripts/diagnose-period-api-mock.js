// Diagnostic: emulate server-side enrichment done in /api/payroll/periods/[periodId]/route.ts
// Usage: node scripts/diagnose-period-api-mock.js PP-KhQ1m6QGECSU

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const periodId = process.argv[2]
  if (!periodId) { console.error('Usage: node scripts/diagnose-period-api-mock.js <periodId>'); process.exit(1) }

  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { payrollEntries: true, business: true }
  })
  if (!period) { console.error('Period not found'); process.exit(2) }

  // Build prior period ids
  const priorPeriods = await prisma.payrollPeriod.findMany({
    where: { businessId: period.businessId, periodStart: { lt: period.periodStart } },
    select: { id: true }
  })
  const priorIds = priorPeriods.map(p => p.id)

  // Cumulative sums from prior payroll entries
  let cumulativeByEmployee = {}
  if (priorIds.length > 0) {
    const grouped = await prisma.payrollEntry.groupBy({
      by: ['employeeId'],
      where: { payrollPeriodId: { in: priorIds } },
      _sum: { sickDays: true, leaveDays: true, absenceDays: true }
    })
    for (const g of grouped) {
      if (!g.employeeId) continue
      cumulativeByEmployee[g.employeeId] = {
        cumulativeSickDays: Number(g._sum.sickDays ?? 0),
        cumulativeLeaveDays: Number(g._sum.leaveDays ?? 0),
        cumulativeAbsenceDays: Number(g._sum.absenceDays ?? 0)
      }
    }
  }

  // Load adjustments for this period's entries
  const entryIds = period.payrollEntries.map(e => e.id)
  const adjustments = await prisma.payrollAdjustment.findMany({ where: { payrollEntryId: { in: entryIds } } })
  const adjustmentsByEntry = {}
  for (const a of adjustments) {
    if (!adjustmentsByEntry[a.payrollEntryId]) adjustmentsByEntry[a.payrollEntryId] = []
    adjustmentsByEntry[a.payrollEntryId].push(a)
  }

  // For each entry, build returnedEntry similar to API
  for (const entry of period.payrollEntries) {
    const empId = entry.employeeId
    const cumulative = empId ? (cumulativeByEmployee[empId] || { cumulativeSickDays: 0, cumulativeLeaveDays: 0, cumulativeAbsenceDays: 0 }) : { cumulativeSickDays: 0, cumulativeLeaveDays: 0, cumulativeAbsenceDays: 0 }

    // normalize payrollAdjustments
    const rawList = adjustmentsByEntry[entry.id] || []
    let payrollAdjustmentsForEntry = undefined
    try {
      const deductionTypes = new Set(['penalty', 'loan', 'loan_payment', 'loan payment', 'advance', 'advance_payment', 'advance payment', 'loanpayment'])
      if (Array.isArray(rawList) && rawList.length > 0) {
        payrollAdjustmentsForEntry = rawList.map(a => {
          const signed = Number(a.amount || 0)
          const rawType = String(a.adjustmentType || a.type || '').toLowerCase()
          const isDeductionType = deductionTypes.has(rawType)
          return {
            id: a.id,
            payrollEntryId: a.payrollEntryId,
            amount: Math.abs(Number(signed || 0)),
            storedAmount: Number(signed || 0),
            isAddition: isDeductionType ? false : (Number(signed) >= 0),
            type: a.adjustmentType ?? a.type,
            description: a.reason ?? a.description ?? '',
            createdAt: a.createdAt
          }
        })
      }
    } catch (err) { }

    let adjustmentsTotalForReturn = Number((entry).adjustmentsTotal || 0)
    let adjustmentsAsDeductionsForReturn = Number((entry).adjustmentsAsDeductions || 0)
    if (Array.isArray(payrollAdjustmentsForEntry) && payrollAdjustmentsForEntry.length > 0) {
      const derivedAdditions = payrollAdjustmentsForEntry.reduce((s, a) => {
        const amt = Number(a.storedAmount || 0)
        return s + (a.isAddition ? Math.abs(amt) : 0)
      }, 0)
      // Exclude 'absence' adjustments from deductions so they are shown separately
      const derivedDeductions = payrollAdjustmentsForEntry.reduce((s, a) => {
        const rawType = String(a.type || '').toLowerCase()
        if (rawType === 'absence') return s
        const amt = Number(a.storedAmount || 0)
        return s + (!a.isAddition ? Math.abs(amt) : 0)
      }, 0)
      adjustmentsTotalForReturn = derivedAdditions
      adjustmentsAsDeductionsForReturn = derivedDeductions
    }

    const advances = Number(entry.advanceDeductions || 0)
    const loans = Number(entry.loanDeductions || 0)
    const misc = Number(entry.miscDeductions || 0)
    const derivedTotalDeductions = advances + loans + misc + adjustmentsAsDeductionsForReturn
    const serverTotalDeductions = Number(entry.totalDeductions || 0)
    const totalDeductionsForReturn = serverTotalDeductions !== derivedTotalDeductions ? derivedTotalDeductions : serverTotalDeductions

    // compute absenceDeduction: sum payrollAdjustments of type 'absence' if present, else per-day
    let absenceDeduction = 0
    try {
      if (Array.isArray(payrollAdjustmentsForEntry) && payrollAdjustmentsForEntry.length > 0) {
        for (const a of payrollAdjustmentsForEntry) {
          const rawType = String(a.type || '').toLowerCase()
          if (rawType === 'absence') {
            absenceDeduction += Math.abs(Number(a.storedAmount || 0))
          }
        }
      }
    } catch (e) { }
    if (!absenceDeduction || absenceDeduction === 0) {
      const absenceDays = Number(entry.absenceDays || entry.cumulativeAbsenceDays || 0)
      // approximate per-day using entry.baseSalary and working days of month
      let workingDays = 22
      try {
        const d = new Date(period.periodStart)
        const month = d.getMonth() + 1
        const year = d.getFullYear()
        const daysInMonth = new Date(year, month, 0).getDate()
        let cnt = 0
        for (let dd = 1; dd <= daysInMonth; dd++) {
          const dt = new Date(year, month - 1, dd)
          const day = dt.getDay()
          if (day !== 0 && day !== 6) cnt++
        }
        workingDays = cnt
      } catch (e) { }
      const perDay = workingDays > 0 ? (Number(entry.baseSalary || 0) / workingDays) : 0
      absenceDeduction = perDay * absenceDays
    }

    const returned = {
      id: entry.id,
      employeeId: entry.employeeId,
      employeeNumber: entry.employeeNumber,
      // include current entry's day counts in cumulative totals
      cumulativeSickDays: Number(cumulative.cumulativeSickDays || 0) + Number(entry.sickDays || 0),
      cumulativeLeaveDays: Number(cumulative.cumulativeLeaveDays || 0) + Number(entry.leaveDays || 0),
      cumulativeAbsenceDays: Number(cumulative.cumulativeAbsenceDays || 0) + Number(entry.absenceDays || 0),
      payrollAdjustments: payrollAdjustmentsForEntry,
      adjustmentsTotal: adjustmentsTotalForReturn,
      adjustmentsAsDeductions: adjustmentsAsDeductionsForReturn,
      totalDeductions: totalDeductionsForReturn,
      absenceDeduction
    }

    if ((entry.employeeNumber || '') === 'EMP1001') {
      console.log('API-like returned entry for EMP1001:')
      console.log(JSON.stringify(returned, null, 2))
    }
  }

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
