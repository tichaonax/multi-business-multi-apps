require('dotenv').config({ path: 'config/service.env' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function normalizeName(s) {
  if (!s) return ''
  try { return String(s).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g,' ').toLowerCase() }
}

async function computeCombinedBenefitsForEntry(entryId) {
  // load persisted benefits
  let persistedBenefits = []
  try {
    persistedBenefits = await prisma.payrollEntryBenefit.findMany({ where: { payrollEntryId: entryId }, include: { benefitType: true } })
  } catch (e) {
    persistedBenefits = []
  }

  const mergedByKey = new Map()
  const keyFor = (obj) => {
    if (!obj) return ''
    if (obj.benefitTypeId) return String(obj.benefitTypeId)
    const n = normalizeName(obj.benefitName || obj.name || obj.benefitType?.name || '')
    return n || ''
  }

  for (const pb of persistedBenefits) {
    const k = keyFor(pb) || String(pb.id)
    mergedByKey.set(k, {
      id: pb.id,
      benefitTypeId: pb.benefitTypeId || null,
      benefitName: pb.benefitName || pb.benefitType?.name || '',
      amount: Number(pb.amount || 0),
      isActive: pb.isActive !== false,
      source: 'manual'
    })
  }

  const merged = Array.from(mergedByKey.values())
  const benefitsTotal = merged.filter(b => b.isActive !== false).reduce((s,b)=> s + Number(b.amount||0),0)
  return { combined: merged, benefitsTotal }
}

async function computeTotalsForEntry(entryId) {
  const entry = await prisma.payrollEntry.findUnique({ where: { id: entryId }, include: { employee: true } })
  if (!entry) return null

  const { combined } = await computeCombinedBenefitsForEntry(entryId)

  // fetch contract
  let contract = null
  try {
    const empId = entry.employee?.id || entry.employeeId
    if (empId) contract = await prisma.employeeContract.findFirst({ where: { employeeId: empId }, orderBy: { startDate: 'desc' } })
  } catch (e) { contract = null }

  const contractBenefits = []
  if (contract && contract.pdfGenerationData && Array.isArray(contract.pdfGenerationData.benefits)) {
    for (const cb of contract.pdfGenerationData.benefits) {
      const amount = Number(cb.amount || 0)
      if (!amount || amount === 0) continue
      contractBenefits.push({ benefitTypeId: cb.benefitTypeId || null, benefitName: cb.name || '', amount, source: 'contract' })
    }
  }

  const mergedByKey = new Map()
  const keyFor = (x) => String(x.benefitTypeId || normalizeName(x.benefitName || x.name || ''))
  for (const cb of contractBenefits) mergedByKey.set(keyFor(cb), { ...cb, isActive: true })
  for (const pb of combined) mergedByKey.set(keyFor(pb) || String(pb.id || Math.random()), { id: pb.id, benefitTypeId: pb.benefitTypeId || null, benefitName: pb.benefitName || pb.name || '', amount: Number(pb.amount||0), isActive: pb.isActive !== false, source: pb.source || 'manual' })

  const mergedBenefits = Array.from(mergedByKey.values())
  const benefitsTotal = mergedBenefits.filter(b => b.isActive !== false).reduce((s,b)=> s + Number(b.amount||0), 0)

  let baseSalary = Number(entry.baseSalary ?? 0)
  if ((!baseSalary || baseSalary === 0) && contract) {
    try {
      if (contract.baseSalary != null) baseSalary = Number(contract.baseSalary)
      else if (contract.pdfGenerationData && contract.pdfGenerationData.basicSalary) baseSalary = Number(contract.pdfGenerationData.basicSalary || 0)
    } catch (e) { baseSalary = Number(contract.baseSalary || 0) }
  }

  const commission = Number(entry.commission ?? 0)
  const overtimePay = Number(entry.overtimePay ?? 0)

  let additionsTotal = 0
  let adjustmentsAsDeductions = 0
  try {
    const adjustments = await prisma.payrollAdjustment.findMany({ where: { payrollEntryId: entryId } })
    for (const a of adjustments) {
      const amt = Number(a.amount || 0)
      if (amt >= 0) additionsTotal += amt
      else adjustmentsAsDeductions += Math.abs(amt)
    }
  } catch (e) { additionsTotal = 0; adjustmentsAsDeductions = 0 }

  const totalDeductions = Number(entry.totalDeductions ?? 0) + adjustmentsAsDeductions
  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal
  const netPay = grossPay - totalDeductions

  return { grossPay, netPay, benefitsTotal, mergedBenefits, baseSalary, additionsTotal, adjustmentsAsDeductions, totalDeductions }
}

(async ()=>{
  try {
    const id = process.argv[2] || 'PE-hIr6sTmqXFfA'
    const totals = await computeTotalsForEntry(id)
    console.log(JSON.stringify(totals, null, 2))
    process.exit(0)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
})()
