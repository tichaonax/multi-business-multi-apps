require('dotenv').config({ path: 'config/service.env' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function computeForEntry(entryId) {
  // replicate computeTotalsForEntry logic to avoid ts-node dependency
  const entry = await prisma.payrollEntry.findUnique({ where: { id: entryId }, include: { employee: true } })
  if (!entry) return null

  // compute combined persisted benefits
  const persistedBenefits = await prisma.payrollEntryBenefit.findMany({ where: { payrollEntryId: entryId }, include: { benefitType: true } }).catch(()=>[])
  const normalizeName = (s) => { if(!s) return ''; try{return String(s).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()}catch(e){return String(s).trim().replace(/\s+/g,' ').toLowerCase()} }
  const mergedByKey = new Map()
  const keyFor = (obj) => { if(!obj) return ''; if(obj.benefitTypeId) return String(obj.benefitTypeId); const n = normalizeName(obj.benefitName || obj.name || obj.benefitType?.name || ''); return n||'' }
  for (const pb of persistedBenefits) { const k = keyFor(pb) || String(pb.id); mergedByKey.set(k, { id: pb.id, benefitTypeId: pb.benefitTypeId||null, benefitName: pb.benefitName || pb.benefitType?.name || '', amount: Number(pb.amount||0), isActive: pb.isActive !== false, source: 'manual' }) }
  const combined = Array.from(mergedByKey.values())

  // contract
  let contract=null
  try{ const empId = entry.employee?.id || entry.employeeId; if(empId) contract = await prisma.employeeContract.findFirst({ where: { employeeId: empId }, orderBy: { startDate: 'desc' } }) }catch(e){contract=null}
  const contractBenefits = []
  if (contract && contract.pdfGenerationData && Array.isArray(contract.pdfGenerationData.benefits)) {
    for (const cb of contract.pdfGenerationData.benefits) {
      const amount = Number(cb.amount || 0)
      if (!amount || amount === 0) continue
      contractBenefits.push({ benefitTypeId: cb.benefitTypeId || null, benefitName: cb.name || '', amount, source: 'contract' })
    }
  }
  for (const cb of contractBenefits) mergedByKey.set(String(cb.benefitTypeId || normalizeName(cb.benefitName)), { ...cb, isActive: true })
  for (const pb of combined) mergedByKey.set(String(pb.benefitTypeId || normalizeName(pb.benefitName || pb.name)), { id: pb.id, benefitTypeId: pb.benefitTypeId||null, benefitName: pb.benefitName||pb.name||'', amount: Number(pb.amount||0), isActive: pb.isActive !== false, source: pb.source || 'manual' })

  const mergedBenefits = Array.from(mergedByKey.values())
  const benefitsTotal = mergedBenefits.filter(b => b.isActive !== false).reduce((s,b) => s + Number(b.amount||0), 0)

  let baseSalary = Number(entry.baseSalary ?? 0)
  if((!baseSalary || baseSalary===0) && contract) {
    try { if (contract.baseSalary != null) baseSalary = Number(contract.baseSalary); else if (contract.pdfGenerationData && contract.pdfGenerationData.basicSalary) baseSalary = Number(contract.pdfGenerationData.basicSalary || 0)}catch(e){baseSalary=Number(contract.baseSalary||0)}
  }

  const commission = Number(entry.commission ?? 0)
  const overtimePay = Number(entry.overtimePay ?? 0)

  let additionsTotal = 0
  let adjustmentsAsDeductions = 0
  try{ const adjustments = await prisma.payrollAdjustment.findMany({ where: { payrollEntryId: entryId } }); for(const a of adjustments){ const amt = Number(a.amount || 0); if (amt>=0) additionsTotal += amt; else adjustmentsAsDeductions += Math.abs(amt) } }catch(e){ additionsTotal=0; adjustmentsAsDeductions=0 }

  const totalDeductionsComposed = Number(entry.totalDeductions ?? 0) + adjustmentsAsDeductions
  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal
  const netGross = grossPay

  return { entryId, grossPay, netGross, totalDeductionsComposed, benefitsTotal, baseSalary, additionsTotal, adjustmentsAsDeductions, mergedBenefits }
}

async function run(dryRun=true) {
  console.log('Starting payroll netGross fix. dryRun=', dryRun)
  const periods = await prisma.payrollPeriod.findMany({ select: { id: true } })
  for(const p of periods) {
    const entries = await prisma.payrollEntry.findMany({ where: { payrollPeriodId: p.id }, select: { id: true } })
    let periodGross = 0
    let periodDeductions = 0
    let periodNet = 0
    const updates = []
    for(const e of entries) {
      const comp = await computeForEntry(e.id)
      if (!comp) continue
      periodGross += Number(comp.grossPay || 0)
      periodDeductions += Number(comp.totalDeductionsComposed || 0)
      periodNet += Number(comp.netGross || 0)
      updates.push({ id: e.id, comp })
    }

    console.log(`Period ${p.id}: entries=${entries.length} gross=${periodGross} deductions=${periodDeductions} netGross=${periodNet}`)
    if (!dryRun) {
      // perform transactional updates
      await prisma.$transaction(async (tx) => {
        for(const u of updates) {
          await tx.payrollEntry.update({ where: { id: u.id }, data: { baseSalary: u.comp.baseSalary, benefitsTotal: u.comp.benefitsTotal, adjustmentsTotal: u.comp.additionsTotal, totalDeductions: u.comp.totalDeductionsComposed, grossPay: u.comp.grossPay, netPay: u.comp.netGross, updatedAt: new Date() } })
        }
        await tx.payrollPeriod.update({ where: { id: p.id }, data: { totalGrossPay: periodGross, totalDeductions: periodDeductions, totalNetPay: periodNet, updatedAt: new Date() } })
      })
      console.log('Persisted updates for period', p.id)
    }

  }
}

if (require.main === module) {
  const arg = process.argv[2] || 'dry'
  const dry = arg === 'dry'
  run(dry).then(()=>{ console.log('done') ; process.exit(0) }).catch(err=>{ console.error(err); process.exit(1) })
}
