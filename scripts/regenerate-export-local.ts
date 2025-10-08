const path = require('path')
const fs = require('fs/promises')
const { prisma } = require('../src/lib/prisma')

async function run(payrollPeriodId: string) {
  if (!payrollPeriodId) {
    console.error('Usage: node scripts/regenerate-export-local.ts <payrollPeriodId>')
    process.exit(1)
  }

  console.log('Loading payroll period', payrollPeriodId)
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: payrollPeriodId },
    include: {
      business: { select: { name: true } },
      payrollEntries: {
        include: {
          payrollEntryBenefits: { include: { benefitType: { select: { id: true, name: true } } } }
        }
      }
    }
  })

  if (!period) {
    console.error('Payroll period not found')
    process.exit(1)
  }

  // compute totals for each entry using helper (defensive require)
  let computeTotalsForEntry: any = null
  try {
    const helper = require('../src/lib/payroll/helpers')
    computeTotalsForEntry = helper.computeTotalsForEntry
  } catch (e) {
    console.warn('Could not load computeTotalsForEntry helper, falling back to minimal totals', e && e.message)
  }

  const enrichedEntries = []
  for (const entry of period.payrollEntries) {
    let totals: any = { combined: [], benefitsTotal: 0, grossPay: entry.grossPay || 0, netPay: entry.netPay || 0 }
    if (computeTotalsForEntry) {
      try {
        totals = await computeTotalsForEntry(entry.id)
      } catch (e) {
        console.warn('computeTotalsForEntry failed for', entry.id)
      }
    }

    enrichedEntries.push(Object.assign({}, entry, {
      payrollEntryBenefits: entry.payrollEntryBenefits || [],
      mergedBenefits: totals.combined || [],
      totalBenefitsAmount: Number(totals.benefitsTotal || 0),
      grossPay: Number(totals.grossPay ?? Number(entry.grossPay || 0)),
      netPay: Number(totals.netPay ?? Number(entry.netPay || 0))
    }))
  }

  let generatePayrollExcel: any = null
  try {
    const gen = require('../src/lib/payroll/excel-generator')
    generatePayrollExcel = gen.generatePayrollExcel
  } catch (e) {
    console.error('Could not load generatePayrollExcel:', e && e.message)
    process.exit(1)
  }

  const buffer = await generatePayrollExcel(
    {
      year: period.year,
      month: period.month,
      periodStart: period.periodStart || new Date(),
      periodEnd: period.periodEnd || new Date(),
      status: period.status
    },
    enrichedEntries.map(e => ({
      employeeNumber: e.employeeNumber,
      employeeName: e.employeeName,
      nationalId: e.nationalId,
      dateOfBirth: e.dateOfBirth,
      hireDate: e.hireDate,
      terminationDate: e.terminationDate,
      workDays: e.workDays,
      baseSalary: Number(e.baseSalary || 0),
      commission: Number(e.commission || 0),
      overtimePay: Number(e.overtimePay || 0),
      advanceDeductions: Number(e.advanceDeductions || 0),
      loanDeductions: Number(e.loanDeductions || 0),
      miscDeductions: Number(e.miscDeductions || 0),
      grossPay: Number(e.grossPay || 0),
      totalDeductions: Number(e.totalDeductions || 0),
      netPay: Number(e.netPay || 0),
      mergedBenefits: e.mergedBenefits || [],
      totalBenefitsAmount: Number(e.totalBenefitsAmount || 0),
      payrollEntryBenefits: (e.payrollEntryBenefits || []).map(b => ({ id: b.id, benefitTypeId: b.benefitTypeId, benefitName: b.benefitName, amount: Number(b.amount || 0), isActive: b.isActive }))
    })),
    period.business?.name || 'Business'
  )

  const exportsDir = path.join(process.cwd(), 'public', 'exports', 'payroll')
  await fs.mkdir(exportsDir, { recursive: true })
  const fileName = `local_Regenerated_${period.year}_${String(period.month).padStart(2,'0')}_${Date.now()}.xlsx`
  const filePath = path.join(exportsDir, fileName)
  await fs.writeFile(filePath, buffer)
  console.log('Wrote file:', filePath)

  // Update DB: create a new payrollExport record to simulate
  const created = await prisma.payrollExport.create({ data: {
    payrollPeriodId: payrollPeriodId,
    fileName,
    fileUrl: `/exports/payroll/${fileName}`,
    fileSize: buffer.length,
    exportedAt: new Date()
  }})

  console.log('Created payrollExport id:', created.id)
  process.exit(0)
}

const arg = process.argv[2]
run(arg).catch(err => { console.error(err); process.exit(1) })
