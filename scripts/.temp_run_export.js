const { PrismaClient } = require('@prisma/client')
const { nanoid } = require('nanoid')
const path = require('path')
const { writeFile, mkdir } = require('fs/promises')
// Avoid importing TypeScript modules (server-side TS files). Inline small helper.
function getWorkingDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  let cnt = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d)
    const day = dt.getDay()
    if (day !== 0 && day !== 6) cnt++
  }
  return cnt
}

;(async () => {
  const prisma = new PrismaClient()
  try {
    console.log('Finding latest approved payroll period...')
    const period = await prisma.payrollPeriod.findFirst({
      where: { status: 'approved' },
      orderBy: { periodStart: 'desc' },
      include: {
        business: { select: { name: true } },
        payrollEntries: {
          include: {
            employee: {
              select: { id: true, employeeNumber: true, fullName: true, nationalId: true, dateOfBirth: true, hireDate: true, terminationDate: true }
            },
            payrollEntryBenefits: { include: { benefitType: { select: { id: true, name: true } } } }
          },
          orderBy: { employeeName: 'asc' }
        }
      }
    })

    if (!period) return console.log('No approved payroll period found to export.')

    // Use a system user id if no session; pick the first admin user
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } })
    const exporterId = adminUser ? adminUser.id : 'system'

    // Build enriched entries similar to the route
    const employeeIds = Array.from(new Set(period.payrollEntries.map(e => e.employeeId).filter(Boolean)))
    const contracts = await prisma.employeeContract.findMany({ where: { employeeId: { in: employeeIds } }, orderBy: { startDate: 'desc' }, include: { contract_benefits: { include: { benefitType: { select: { id: true, name: true, type: true, defaultAmount: true } } } } } })
    const latestContractByEmployee = {}
    for (const c of contracts) if (!latestContractByEmployee[c.employeeId]) latestContractByEmployee[c.employeeId] = c

    const timeTrackings = await prisma.employeeTimeTracking.findMany({ where: { employeeId: { in: employeeIds }, year: period.year, month: period.month } })
    const timeTrackingByEmployee = {}
    for (const t of timeTrackings) timeTrackingByEmployee[t.employeeId] = t

    const monthRequiredWorkDays = getWorkingDaysInMonth(period.year, period.month)

    // Try to load the real TypeScript generator using ts-node if available
    let excelBuffer
    try {
      require('ts-node/register')
      const gen = require('../src/lib/payroll/excel-generator')
      if (gen && typeof gen.generatePayrollExcel === 'function') {
        const excelRows = period.payrollEntries.map(e => ({
          employeeNumber: e.employeeNumber,
          employeeName: e.employeeFullName || e.employeeName,
          payrollEntryBenefits: (e.payrollEntryBenefits || []).map(b => ({ id: b.id, benefitTypeId: b.benefitTypeId, benefitName: b.benefitName, amount: Number(b.amount || 0), isActive: b.isActive })),
          mergedBenefits: [],
          totalBenefitsAmount: 0,
          baseSalary: Number(e.baseSalary || 0),
          commission: Number(e.commission || 0),
          overtimePay: Number(e.overtimePay || 0),
          grossPay: Number(e.grossPay || 0),
          netPay: Number(e.netPay || 0)
        }))
        excelBuffer = await gen.generatePayrollExcel({ year: period.year, month: period.month, periodStart: period.periodStart || new Date(), periodEnd: period.periodEnd || new Date(), status: period.status }, excelRows, period.business.name)
      }
    } catch (err) {
      console.warn('ts-node import failed, falling back to placeholder buffer:', err && err.message)
    }

    if (!excelBuffer) {
      // Fallback to a placeholder buffer if generation failed
      excelBuffer = Buffer.from('Payroll export placeholder')
    }

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthName = monthNames[period.month - 1]
    const fileName = `Payroll_${period.year}_${monthName}_${Date.now()}.xlsx`
    const exportsDir = path.join(process.cwd(), 'public', 'exports', 'payroll')
    await mkdir(exportsDir, { recursive: true })
    const filePath = path.join(exportsDir, fileName)
    await writeFile(filePath, excelBuffer)

    const fileUrl = `/exports/payroll/${fileName}`
    const fileSize = excelBuffer.length

    // Create payroll export record
    const newExport = await prisma.payrollExport.create({ data: {
      id: `EX-${nanoid(12)}`,
      payrollPeriodId: period.id,
      businessId: period.businessId,
      year: period.year,
      month: period.month,
      fileName,
      fileUrl,
      fileSize,
      format: 'excel',
      includesMonths: [period.month],
      employeeCount: period.payrollEntries.length,
      totalGrossPay: Number(period.totalGrossPay?.toString?.() || 0),
      totalNetPay: Number(period.totalNetPay?.toString?.() || 0),
      exportedBy: exporterId,
      generationType: 'single_month',
      notes: 'Automated test export',
      exportedAt: new Date()
    }})

    console.log('Created export record:', newExport.id)
  } catch (err) {
    console.error('Export script error:', err)
  } finally {
    await prisma.$disconnect()
  }
})()
