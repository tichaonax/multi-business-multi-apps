import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { generatePayrollExcel } from '../src/lib/payroll/excel-generator'

function getWorkingDaysInMonth(year: number, month: number) {
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
            employee: { select: { id: true, employeeNumber: true, fullName: true, nationalId: true, dateOfBirth: true, hireDate: true, terminationDate: true } },
            payrollEntryBenefits: { include: { benefitType: { select: { id: true, name: true } } } }
          },
          orderBy: { employeeName: 'asc' }
        }
      }
    })

    if (!period) return console.log('No approved payroll period found to export.')

    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } })
    const exporterId = adminUser ? adminUser.id : 'system'

    const excelRows = period.payrollEntries.map((e: any) => ({
      employeeNumber: e.employeeNumber || e.employee?.employeeNumber || '',
      employeeName: e.employeeFullName || e.employeeName || (e.employee ? `${e.employee.fullName || ''}` : ''),
      nationalId: e.employee?.nationalId || e.nationalId || '',
      dateOfBirth: e.employee?.dateOfBirth || e.dateOfBirth || null,
      hireDate: e.employee?.hireDate || e.hireDate || new Date(),
      terminationDate: e.employee?.terminationDate || e.terminationDate || null,
      workDays: e.workDays || 0,
      baseSalary: Number(e.baseSalary || 0),
      commission: Number(e.commission || 0),
      livingAllowance: Number(e.livingAllowance || 0),
      vehicleAllowance: Number(e.vehicleAllowance || 0),
      travelAllowance: Number(e.travelAllowance || 0),
      overtimePay: Number(e.overtimePay || 0),
      advanceDeductions: Number(e.advanceDeductions || 0),
      loanDeductions: Number(e.loanDeductions || 0),
      miscDeductions: Number(e.miscDeductions || 0),
      grossPay: Number(e.grossPay || 0),
      totalDeductions: Number(e.totalDeductions || 0),
      netPay: Number(e.netPay || 0),
      payrollEntryBenefits: (e.payrollEntryBenefits || []).map((b: any) => ({ id: b.id, benefitTypeId: b.benefitTypeId, benefitName: b.benefitName, amount: Number(b.amount || 0), isActive: b.isActive })),
      mergedBenefits: (e.mergedBenefits || []).map((m: any) => ({ id: m.id, benefitName: m.benefitName, amount: Number(m.amount || 0) })),
      totalBenefitsAmount: Number(e.totalBenefitsAmount || 0),
      contract: e.contract || null,
      cumulativeSickDays: e.cumulativeSickDays || 0,
      cumulativeLeaveDays: e.cumulativeLeaveDays || 0,
      cumulativeAbsenceDays: e.cumulativeAbsenceDays || 0,
      absenceDeduction: e.absenceDeduction || e.absenceAmount || 0,
      adjustmentsTotal: e.adjustmentsTotal || 0,
      adjustmentsAsDeductions: e.adjustmentsAsDeductions || 0
    }))

    // Ensure period has safe date fields before calling generator
    const safePeriod = Object.assign({}, period, {
      periodStart: period.periodStart || new Date(),
      periodEnd: period.periodEnd || new Date()
    })

    // Call the real generator
    const excelBuffer = await generatePayrollExcel(safePeriod as any, excelRows as any, period.business.name)

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthName = monthNames[period.month - 1]
    const fileName = `Payroll_${period.year}_${monthName}_${Date.now()}.xlsx`
    const exportsDir = path.join(process.cwd(), 'public', 'exports', 'payroll')
    await mkdir(exportsDir, { recursive: true })
    const filePath = path.join(exportsDir, fileName)
    await writeFile(filePath, excelBuffer)

    const fileUrl = `/exports/payroll/${fileName}`
    const fileSize = excelBuffer.length

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
      notes: 'Automated test export (real generator)',
      exportedAt: new Date()
    }})

    console.log('Created export record:', newExport.id)
  } catch (err) {
    console.error('Export runner error:', err)
  } finally {
    await prisma.$disconnect()
  }
})()
