require('dotenv').config({ path: 'config/service.env' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function normalizeName(s) {
  if (!s) return ''
  try { return String(s).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g,' ').toLowerCase() }
}

async function computeDerivedTotalsForEntry(entry) {
  const entryId = entry.id

  // load persisted benefits
  let persistedBenefits = []
  try {
    persistedBenefits = await prisma.payrollEntryBenefit.findMany({ where: { payrollEntryId: entryId }, include: { benefitType: true } })
  } catch (e) { persistedBenefits = [] }

  // contract benefits
  let contract = null
  try {
    const empId = entry.employeeId || (entry.employee && entry.employee.id)
    if (empId) contract = await prisma.employeeContracts.findFirst({ where: { employeeId: empId }, orderBy: { startDate: 'desc' } })
  } catch (e) { contract = null }

  const contractBenefits = []
  if (contract && contract.pdfGenerationData && Array.isArray(contract.pdfGenerationData.benefits)) {
    for (const cb of contract.pdfGenerationData.benefits) {
      const amount = Number(cb.amount || 0)
      if (!amount || amount === 0) continue
      contractBenefits.push({ benefitTypeId: cb.benefitTypeId || null, benefitName: cb.name || '', amount, source: 'contract' })
    }
  }

  // merge persisted and contract (persisted wins)
  const mergedByKey = new Map()
  const keyFor = (x) => String(x.benefitTypeId || normalizeName(x.benefitName || x.name || ''))
  for (const cb of contractBenefits) mergedByKey.set(keyFor(cb), { ...cb, isActive: true })
  for (const pb of persistedBenefits) mergedByKey.set(keyFor(pb) || String(pb.id || Math.random()), { id: pb.id, benefitTypeId: pb.benefitTypeId || null, benefitName: pb.benefitName || pb.name || '', amount: Number(pb.amount||0), isActive: pb.isActive !== false, source: pb.source || 'manual' })

  const mergedBenefits = Array.from(mergedByKey.values())
  const benefitsTotal = mergedBenefits.filter(b => b.isActive !== false).reduce((s,b)=> s + Number(b.amount||0), 0)

  // base salary fallback
  let baseSalary = Number(entry.baseSalary || 0)
  if ((!baseSalary || baseSalary === 0) && contract) {
    try { if (contract.baseSalary != null) baseSalary = Number(contract.baseSalary); else if (contract.pdfGenerationData && contract.pdfGenerationData.basicSalary) baseSalary = Number(contract.pdfGenerationData.basicSalary || 0) } catch (e) { baseSalary = Number(contract.baseSalary || 0) }
  }

  const commission = Number(entry.commission || 0)

  // overtime pay: prefer stored overtimePay
  let overtimePay = Number(entry.overtimePay || 0)

  // adjustments
  let additionsTotal = 0
  let adjustmentsAsDeductions = 0
  try {
    const adjustments = await prisma.payrollAdjustment.findMany({ where: { payrollEntryId: entryId } })
    for (const a of adjustments) {
      const amt = Number(a.amount || 0)
      if (amt >= 0) additionsTotal += amt
      else {
        const rawType = String(a.adjustmentType || '').toLowerCase()
        if (rawType === 'absence') {
          // skip absence
        } else {
          adjustmentsAsDeductions += Math.abs(amt)
        }
      }
    }
  } catch (e) { additionsTotal = 0; adjustmentsAsDeductions = 0 }

  const advances = Number(entry.advanceDeductions || 0)
  const loans = Number(entry.loanDeductions || 0)
  const misc = Number(entry.miscDeductions || 0)
  const derivedTotalDeductions = advances + loans + misc + adjustmentsAsDeductions

  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal
  const netPay = grossPay - derivedTotalDeductions

  return { derivedTotalDeductions, grossPay, netPay }
}

async function fixPeriod(periodId) {
  const entries = await prisma.payrollEntry.findMany({ where: { payrollPeriodId: periodId } })
  if (!entries || entries.length === 0) {
    console.log('No entries found for period', periodId)
    return
  }

  let sumGross = 0, sumDeductions = 0, sumNet = 0
  for (const e of entries) {
    const t = await computeDerivedTotalsForEntry(e)
    // Update entry only if values differ (idempotent)
    const updateData = {}
    if (Number(e.totalDeductions || 0) !== Number(t.derivedTotalDeductions)) updateData.totalDeductions = String(t.derivedTotalDeductions)
    // Update netPay and grossPay fields to match derived values
    if (Number(e.grossPay || 0) !== Number(t.grossPay)) updateData.grossPay = String(t.grossPay)
    if (Number(e.netPay || 0) !== Number(t.netPay)) updateData.netPay = String(t.netPay)

    if (Object.keys(updateData).length > 0) {
      await prisma.payrollEntry.update({ where: { id: e.id }, data: updateData })
      console.log('Updated entry', e.id, updateData)
    }

    sumGross += Number(t.grossPay || 0)
    sumDeductions += Number(t.derivedTotalDeductions || 0)
    sumNet += Number(t.netPay || 0)
  }

  // Update payrollPeriod totals
  await prisma.payrollPeriod.update({ where: { id: periodId }, data: { totalGrossPay: String(sumGross), totalDeductions: String(sumDeductions), totalNetPay: String(sumNet) } })
  console.log('Updated period totals', { sumGross, sumDeductions, sumNet })
}

if (require.main === module) {
  const periodId = process.argv[2]
  if (!periodId) {
    console.error('Usage: node scripts/fix-period-totals.js <PAYROLL_PERIOD_ID>')
    process.exit(1)
  }
  fixPeriod(periodId).then(()=>{ console.log('Done'); prisma.$disconnect(); }).catch(err=>{ console.error('Failed', err); prisma.$disconnect(); process.exit(1) })
}
