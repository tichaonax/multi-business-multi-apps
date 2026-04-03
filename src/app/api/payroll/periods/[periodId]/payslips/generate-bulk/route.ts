import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'
import { loadBrackets, loadTaxConstants, calculatePaye, calculateAidsLevy, calculateNssa } from '@/lib/payroll/paye-calc'
import puppeteer from 'puppeteer'
import { generateBulkPayslipsHTML, PayslipEntry } from '@/lib/payroll/payslip-generator'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * POST /api/payroll/periods/[periodId]/payslips/generate-bulk
 * Generates a single PDF containing one payslip per employee for the period.
 * Returns the PDF as a binary download.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    // Load period with entries and business info (benefits/adjustments resolved via computeTotalsForEntry)
    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            shortName: true,
            address: true,
            type: true,
            umbrellaBusinessName: true,
            umbrellaBusinessAddress: true,
            umbrellaBusinessPhone: true,
          },
        },
        payroll_entries: {
          include: {
            employees: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true,
                employeeNumber: true,
                nationalId: true,
                hireDate: true,
                primaryBusinessId: true,
                job_titles: { select: { title: true } },
              },
            },
          },
          orderBy: [{ employeeName: 'asc' }],
        },
      },
    })

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    const biz = period.businesses

    // Fetch the umbrella business record (single record with isUmbrellaBusiness=true)
    // This is where "Umbrella Business Details" settings are stored — name, address, phone
    const umbrellaBiz = await prisma.businesses.findFirst({
      where: { isUmbrellaBusiness: true } as any,
      select: { umbrellaBusinessName: true, umbrellaBusinessAddress: true, umbrellaBusinessPhone: true } as any,
    }) as { umbrellaBusinessName: string | null; umbrellaBusinessAddress: string | null; umbrellaBusinessPhone: string | null } | null

    // Batch-fetch per diem from perDiemEntries (same source as export route)
    const employeeIds = period.payroll_entries
      .map((e) => (e as any).employeeId as string)
      .filter(Boolean)

    const perDiemRows = employeeIds.length > 0
      ? await prisma.perDiemEntries.groupBy({
          by: ['employeeId'],
          where: {
            payrollYear: period.year,
            payrollMonth: period.month,
            approvalStatus: { in: ['approved', 'pending'] },
            employeeId: { in: employeeIds },
          },
          _sum: { amount: true },
        })
      : []
    const perDiemByEmployee: Record<string, number> = {}
    for (const row of perDiemRows) {
      if (row.employeeId) perDiemByEmployee[row.employeeId] = Number(row._sum.amount ?? 0)
    }

    // Batch-fetch latest contracts per employee (same as export route) — needed for contractual basic salary (NSSA base)
    const latestContracts = employeeIds.length > 0
      ? await prisma.employeeContracts.findMany({
          where: { employeeId: { in: employeeIds } },
          orderBy: { startDate: 'desc' },
          select: { id: true, employeeId: true, baseSalary: true, pdfGenerationData: true },
        })
      : []
    const latestContractByEmployee: Record<string, any> = {}
    for (const c of latestContracts) {
      if (!latestContractByEmployee[c.employeeId]) latestContractByEmployee[c.employeeId] = c
    }

    // Batch-fetch each employee's primary business for payslip header
    const primaryBizIds = [...new Set(
      period.payroll_entries
        .map((e) => (e.employees as any)?.primaryBusinessId as string | null)
        .filter(Boolean) as string[]
    )]
    const primaryBizList = primaryBizIds.length > 0
      ? await prisma.businesses.findMany({
          where: { id: { in: primaryBizIds } },
          select: { id: true, name: true, address: true, umbrellaBusinessName: true, umbrellaBusinessAddress: true, umbrellaBusinessPhone: true },
        })
      : []
    const primaryBizById: Record<string, { name: string; address: string | null; umbrellaBusinessName: string | null; umbrellaBusinessAddress: string | null; umbrellaBusinessPhone: string | null }> = {}
    for (const b of primaryBizList) primaryBizById[b.id] = { name: b.name, address: b.address, umbrellaBusinessName: b.umbrellaBusinessName ?? null, umbrellaBusinessAddress: b.umbrellaBusinessAddress ?? null, umbrellaBusinessPhone: b.umbrellaBusinessPhone ?? null }

    // Load tax brackets once (same as export route) for fresh PAYE calculation
    const taxYear = period.year
    const [monthlyBrackets, taxConstants] = await Promise.all([
      loadBrackets(taxYear, 'MONTHLY'),
      loadTaxConstants(taxYear),
    ])

    // Batch-fetch approved clock-in OT adjustments (same source as export route)
    const allEntryIds = period.payroll_entries.map((e) => e.id)
    const clockInOTRows = allEntryIds.length > 0
      ? await prisma.payrollAdjustments.findMany({
          where: {
            payrollEntryId: { in: allEntryIds },
            isClockInAdjustment: true,
            status: 'approved',
          } as any,
          select: { payrollEntryId: true, adjustmentType: true, amount: true },
        })
      : []
    const clockInOTByEntry: Record<string, number> = {}
    for (const a of clockInOTRows) {
      const t = String((a as any).adjustmentType || '').toLowerCase()
      if ((t === 'overtime_credit' || t === 'overtime') && a.payrollEntryId) {
        clockInOTByEntry[a.payrollEntryId] = (clockInOTByEntry[a.payrollEntryId] || 0) + Math.abs(Number(a.amount || 0))
      }
    }

    // Build per-entry payslip data using computeTotalsForEntry (same as export route)
    // so that merged benefits (incl. contract PDF benefits) and gross/net match the spreadsheet.
    const entries: PayslipEntry[] = []
    for (const e of period.payroll_entries) {
      const emp = e.employees
      const empId = (e as any).employeeId as string | null

      // Use the same totals helper as the export so benefits and gross match exactly
      const totals = await computeTotalsForEntry(e.id, period.month)

      // Per diem from perDiemEntries table (same as export route)
      const perDiem = empId ? (perDiemByEmployee[empId] || 0) : 0

      // Clock-in OT added to standardOvertimePay (same as export route)
      const clockInOT = clockInOTByEntry[e.id] || 0

      // Gross = taxable earnings + per diem (per diem shown on payslip but not taxed)
      const grossFromTotals = totals.grossPay
      const grossPay = grossFromTotals + perDiem

      // Statutory deductions — PAYE on taxable gross only (exclude per diem)
      // NSSA is based on contractual basic salary only (same as export route)
      const contract = empId ? latestContractByEmployee[empId] : null
      const contractualBasicSalary = Number(
        contract?.pdfGenerationData?.basicSalary
        ?? contract?.baseSalary
        ?? Number(e.baseSalary || 0)
      )
      const payeAmt = calculatePaye(grossFromTotals, monthlyBrackets)
      const aidsLevyAmt = calculateAidsLevy(payeAmt, taxConstants.aidsLevyRate)
      const nssaEmployeeAmt = calculateNssa(contractualBasicSalary, taxConstants.nssaEmployeeRate)

      // Net = Gross minus statutory AND personal deductions
      const netPay = Math.round(Math.max(0,
        grossPay
        - nssaEmployeeAmt
        - payeAmt
        - aidsLevyAmt
        - (totals.totalDeductions || 0)
      ))

      // Benefits from merged list (includes contract PDF benefits like Living Allowance)
      const benefits = (totals.mergedBenefits || [])
        .filter((b: any) => b.isActive !== false)
        .map((b: any) => ({
          name: b.benefitName || b.name || 'Benefit',
          amount: Number(b.amount || 0),
        }))

      // Adjustments additions (exclude clock-in OT which goes into OT column)
      const adjustmentsAdditions = Math.max(0, (totals.additionsTotal || 0) - clockInOT)

      const employeeName = emp
        ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.fullName || e.employeeName || ''
        : e.employeeName || ''

      entries.push({
        employeeName,
        employeeNumber: emp?.employeeNumber || e.employeeNumber || '',
        nationalId: emp?.nationalId || e.nationalId || null,
        jobTitle: (emp as any)?.job_titles?.title ?? null,
        hireDate: emp?.hireDate ?? e.hireDate,

        periodMonth: period.month,
        periodYear: period.year,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,

        // Use employee's primary business for the payslip body, umbrella for the header
        businessName: (emp as any)?.primaryBusinessId
          ? (primaryBizById[(emp as any).primaryBusinessId]?.name ?? biz.name)
          : biz.name,
        businessShortName: null,
        businessAddress: (emp as any)?.primaryBusinessId
          ? (primaryBizById[(emp as any).primaryBusinessId]?.address ?? biz.address ?? null)
          : (biz.address ?? null),
        umbrellaBusinessName: umbrellaBiz?.umbrellaBusinessName ?? null,
        umbrellaBusinessAddress: umbrellaBiz?.umbrellaBusinessAddress ?? null,
        umbrellaBusinessPhone: umbrellaBiz?.umbrellaBusinessPhone ?? null,

        workDays: Number(e.workDays),
        sickDays: Number(e.sickDays),
        leaveDays: Number(e.leaveDays),
        absenceDays: Number(e.absenceDays),

        contractualBasicSalary: Number(e.baseSalary),
        proratedBasicSalary: Number(e.baseSalary),
        commission: Number(e.commission),
        standardOvertimePay: (totals.standardOvertimePay || 0) + clockInOT,
        doubleOvertimePay: totals.doubleOvertimePay || 0,
        perDiem,
        cashInLieu: Number(e.cashInLieu),
        adjustmentsAdditions,
        benefits,
        grossPay,

        absenceDeduction: totals.absenceDeduction || 0,
        nssaEmployee: nssaEmployeeAmt,
        payeAmount: payeAmt,
        aidsLevy: aidsLevyAmt,
        advanceDeductions: Number(e.advanceDeductions),
        loanDeductions: Number(e.loanDeductions),
        miscDeductions: Number(e.miscDeductions),
        totalDeductions: totals.totalDeductions || 0,

        netPay,
      })
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    const periodLabel = `${monthNames[period.month - 1]} ${period.year}`
    const html = generateBulkPayslipsHTML(entries, periodLabel)

    // Generate PDF via puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })

      const fileName = `payslips-${biz.shortName || biz.name}-${periodLabel.replace(' ', '-')}.pdf`

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (err: any) {
    console.error('[payslips/generate-bulk] Error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to generate payslips' }, { status: 500 })
  }
}


