require('dotenv').config({ path: 'config/service.env' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function normalizeName(s) {
  if (!s) return ''
  try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
}

async function computeForEntry(entry) {
  // Recompute merged benefits (persisted + contract)
  const entryId = entry.id
  const persistedBenefits = await prisma.payrollEntryBenefit.findMany({ where: { payrollEntryId: entryId }, include: { benefitType: true } }).catch(()=>[])
  const mergedByKey = new Map()
  const keyFor = (o) => { if(!o) return ''; if (o.benefitTypeId) return String(o.benefitTypeId); const n = normalizeName(o.benefitName || o.name || o.benefitType?.name || ''); return n||'' }
  for (const pb of persistedBenefits) {
    const k = keyFor(pb) || String(pb.id)
    mergedByKey.set(k, { id: pb.id, benefitTypeId: pb.benefitTypeId||null, benefitName: pb.benefitName||pb.benefitType?.name||'', amount: Number(pb.amount||0), isActive: pb.isActive !== false, source: 'manual' })
  }

  // contract
  let contract = null
  try { const empId = entry.employee?.id || entry.employeeId; if (empId) contract = await prisma.employeeContract.findFirst({ where: { employeeId: empId }, orderBy: { startDate: 'desc' } }) } catch(e){ contract = null }
  if (contract && contract.pdfGenerationData && Array.isArray(contract.pdfGenerationData.benefits)) {
    for (const cb of contract.pdfGenerationData.benefits) {
      const amount = Number(cb.amount || 0)
      if (!amount || amount === 0) continue
      const k = keyFor(cb) || `contract-${Math.random().toString(36).slice(2,8)}`
      mergedByKey.set(k, { benefitTypeId: cb.benefitTypeId || null, benefitName: cb.name || cb.benefitType?.name || '', amount, isActive: true, source: 'contract' })
    }
  }
  const mergedBenefits = Array.from(mergedByKey.values())
  const benefitsTotal = mergedBenefits.filter(b => b.isActive !== false).reduce((s,b)=> s + Number(b.amount||0), 0)

  // base salary fallback
  let baseSalary = Number(entry.baseSalary ?? 0)
  if ((!baseSalary || baseSalary === 0) && contract) {
    try { if (contract.baseSalary != null) baseSalary = Number(contract.baseSalary); else if (contract.pdfGenerationData && contract.pdfGenerationData.basicSalary) baseSalary = Number(contract.pdfGenerationData.basicSalary || 0) } catch(e){ baseSalary = Number(contract.baseSalary||0) }
  }

  const commission = Number(entry.commission ?? 0)

  // Compute hourlyRate following precedence and fallback to annualized 6*9*52
  let hourlyRate = Number(entry.hourlyRate ?? 0)
  if ((!hourlyRate || hourlyRate === 0) && entry.employee && entry.employee.hourlyRate) hourlyRate = Number(entry.employee.hourlyRate || 0)
  if ((!hourlyRate || hourlyRate === 0) && contract) {
    try {
      const compType = (contract.pdfGenerationData && contract.pdfGenerationData.compensationType) || ''
      const contractBasic = contract.pdfGenerationData && contract.pdfGenerationData.basicSalary ? Number(contract.pdfGenerationData.basicSalary || 0) : 0
      // Only use contract basic as an hourly rate when compensationType says 'hour' AND the value is plausibly hourly (<= 200)
      if (typeof compType === 'string' && compType.toLowerCase().includes('hour') && contractBasic > 0 && contractBasic <= 200) {
        hourlyRate = contractBasic
      }
    } catch(e){}
  }
  if ((!hourlyRate || hourlyRate === 0) && baseSalary) {
    try {
      const annualSalary = Number(baseSalary) * 12
      const hoursPerYear = 6 * 9 * 52 // 2808
      hourlyRate = annualSalary / Math.max(1, hoursPerYear)
    } catch(e){}
  }

  const overtimeHours = Number(entry.overtimeHours ?? 0)
  const overtimePayComputed = (overtimeHours && hourlyRate) ? Number(Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100) : 0

  // adjustments
  let additionsTotal = 0
  let adjustmentsAsDeductions = 0
  try { const adjustments = await prisma.payrollAdjustment.findMany({ where: { payrollEntryId: entryId } }); for (const a of adjustments) { const amt = Number(a.amount || 0); if (amt >= 0) additionsTotal += amt; else adjustmentsAsDeductions += Math.abs(amt) } } catch(e){ additionsTotal=0; adjustmentsAsDeductions=0 }

  const totalDeductionsComposed = Number(entry.totalDeductions ?? 0) + adjustmentsAsDeductions
  const grossPay = Number(baseSalary) + Number(commission) + Number(overtimePayComputed) + Number(benefitsTotal) + Number(additionsTotal)
  const netGross = grossPay

  return {
    entryId,
    baseSalary,
    benefitsTotal,
    additionsTotal,
    adjustmentsAsDeductions,
    totalDeductionsComposed,
    hourlyRate,
    overtimeHours,
    overtimePayComputed,
    grossPay,
    netGross,
    mergedBenefits
  }
}

async function runForEmployee(employeeNumber, dry=true, inspect=false) {
  console.log('Running payroll recompute for employee:', employeeNumber, 'dry=', dry)
  const entries = await prisma.payrollEntry.findMany({ where: { employeeNumber: employeeNumber }, include: { employee: true } })
  if (!entries || entries.length === 0) {
    console.log('No payroll entries found for employeeNumber', employeeNumber)
    return
  }

  const updates = []
  const affectedPeriods = new Map()
  for (const e of entries) {
    const comp = await computeForEntry(e)
    if (!comp) continue
    console.log('Entry:', e.id)
    console.log('  stored overtimePay:', Number(e.overtimePay || 0), 'computed overtimePay:', comp.overtimePayComputed)
    console.log('  stored grossPay:', Number(e.grossPay || 0), 'computed grossPay:', comp.grossPay)
    console.log('  stored totalDeductions:', Number(e.totalDeductions || 0), 'computed totalDeductions:', comp.totalDeductionsComposed)
    if (inspect) {
      console.log('  --- inspection details ---')
      console.log('  entry.baseSalary:', Number(e.baseSalary || 0))
    console.log('  entry.hourlyRate:', Number(e.hourlyRate || 0))
      console.log('  contract baseSalary (if any):', comp.baseSalary)
      console.log('  employee.hourlyRate:', e.employee && e.employee.hourlyRate ? Number(e.employee.hourlyRate) : 0)
      try {
        const contractRaw = await prisma.employeeContract.findFirst({ where: { employeeId: e.employee?.id || e.employeeId }, orderBy: { startDate: 'desc' } })
        console.log('  contract.pdfGenerationData.basicSalary:', contractRaw && contractRaw.pdfGenerationData ? (contractRaw.pdfGenerationData.basicSalary || null) : null)
        console.log('  contract.pdfGenerationData.compensationType:', contractRaw && contractRaw.pdfGenerationData ? (contractRaw.pdfGenerationData.compensationType || null) : null)
      } catch (err) { /* ignore */ }
      console.log('  overtimeHours:', Number(e.overtimeHours || 0))
      console.log('  hourlyRate used:', comp.hourlyRate)
      console.log('  annualSalary (monthly * 12):', Number(comp.baseSalary || 0) * 12)
      console.log('  hoursPerYear used (6*9*52):', 6 * 9 * 52)
      console.log('  overtime multiplier:', 1.5)
      console.log('  overtime calculation: overtimeHours * hourlyRate * 1.5 =', `${Number(e.overtimeHours || 0)} * ${comp.hourlyRate} * 1.5 = ${comp.overtimePayComputed}`)
      console.log('  gross breakdown: baseSalary + commission + overtime + benefitsTotal + additions =', `${comp.baseSalary} + ${Number(e.commission||0)} + ${comp.overtimePayComputed} + ${comp.benefitsTotal} + ${comp.additionsTotal} = ${comp.grossPay}`)
      console.log('  --- end inspection ---')
    }
    updates.push({ id: e.id, comp, payrollPeriodId: e.payrollPeriodId })
    if (e.payrollPeriodId) affectedPeriods.set(e.payrollPeriodId, true)
  }

  if (!dry) {
    // apply updates and recalc affected periods
    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.payrollEntry.update({ where: { id: u.id }, data: {
          baseSalary: u.comp.baseSalary,
          benefitsTotal: u.comp.benefitsTotal,
          adjustmentsTotal: u.comp.additionsTotal,
          totalDeductions: u.comp.totalDeductionsComposed,
          grossPay: u.comp.grossPay,
          netPay: u.comp.netGross,
          overtimePay: u.comp.overtimePayComputed,
          updatedAt: new Date()
        }})
      }

      // recompute each affected period aggregates
      for (const periodId of Array.from(affectedPeriods.keys())) {
        const entriesForPeriod = await tx.payrollEntry.findMany({ where: { payrollPeriodId: periodId } })
        const totalGross = entriesForPeriod.reduce((s, en) => s + Number(en.grossPay || 0), 0)
        const totalDeductions = entriesForPeriod.reduce((s, en) => s + Number(en.totalDeductions || 0), 0)
        const totalNet = entriesForPeriod.reduce((s, en) => s + Number(en.netPay || 0), 0)
        await tx.payrollPeriod.update({ where: { id: periodId }, data: { totalGrossPay: totalGross, totalDeductions: totalDeductions, totalNetPay: totalNet, updatedAt: new Date() } })
      }
    })
    console.log('Applied updates for', updates.length, 'entries')
  } else {
    console.log('Dry run: no changes applied. Entries processed:', updates.length)
  }
}

if (require.main === module) {
  const employeeNumber = process.argv[2]
  const action = process.argv[3] || 'dry'
  const inspectFlag = process.argv.includes('inspect') || process.argv.includes('--inspect')
  if (!employeeNumber) {
    console.error('Usage: node scripts/fix-payroll-for-employee.js <EMPLOYEE_NUMBER> [apply|dry] [inspect]')
    process.exit(1)
  }
  const dry = action !== 'apply'
  runForEmployee(employeeNumber, dry, inspectFlag).then(()=>{ console.log('done'); process.exit(0) }).catch(err=>{ console.error(err); process.exit(1) })
}
