import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'
import { generatePayrollExcel } from '@/lib/payroll/excel-generator'
import { getWorkingDaysInMonth } from '@/lib/payroll/helpers'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(session.user, 'canExportPayroll')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const data = await req.json()
    const { payrollPeriodId } = data
    if (!payrollPeriodId) return NextResponse.json({ error: 'Missing payrollPeriodId' }, { status: 400 })

    // Find most recent export record for this period
    const existing = await prisma.payrollExport.findFirst({ where: { payrollPeriodId }, orderBy: { exportedAt: 'desc' } })
    if (!existing) return NextResponse.json({ error: 'No existing export found for this period' }, { status: 404 })

    // Load the period and entries similarly to the original export flow
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
      include: {
        business: { select: { name: true } },
        payrollEntries: {
          include: {
            payrollEntryBenefits: { include: { benefitType: { select: { id: true, name: true } } } },
            employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true, fullName: true, jobTitles: { select: { title: true } }, primaryBusinessId: true } }
          }
        }
      }
    })
    if (!period) return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })

    if (period.status !== 'exported') {
      // allow regeneration only for exported periods
      return NextResponse.json({ error: 'Can only regenerate exports for periods with status exported' }, { status: 400 })
    }

    // Build enriched entries (reuse computeTotalsForEntry via helper route to keep parity)
    const enrichedEntries: any[] = []

    // Load latest contracts for employees in this period so we can use contract.jobTitle/pdfGenerationData.jobTitle
    const employeeIds = Array.from(new Set((period.payrollEntries || []).map((e: any) => e.employeeId).filter(Boolean)))
    let latestContractByEmployee: Record<string, any> = {}
    if (employeeIds.length > 0) {
      // pdfGenerationData is a JSON scalar field; select scalar fields and related jobTitles
      const contracts = await prisma.employeeContract.findMany({
        where: { employeeId: { in: employeeIds } },
        orderBy: { startDate: 'desc' },
        select: { id: true, employeeId: true, pdfGenerationData: true, startDate: true, endDate: true, jobTitles: { select: { title: true } } }
      })
      for (const c of contracts) {
        if (!latestContractByEmployee[c.employeeId]) latestContractByEmployee[c.employeeId] = c
      }
    }

    for (const entry of period.payrollEntries) {
      // attach the employee's latest contract if available
      const contract = entry.employeeId ? latestContractByEmployee[entry.employeeId] : null
      let totals: any = { combined: [], benefitsTotal: 0, grossPay: entry.grossPay || 0, netPay: entry.netPay || 0 }
      try {
        const { computeTotalsForEntry } = await import('@/lib/payroll/helpers')
        totals = await computeTotalsForEntry(entry.id)
      } catch (e) {
        // fallback to sensible defaults if helper import fails
        totals = { combined: [], benefitsTotal: 0, grossPay: entry.grossPay || 0, netPay: entry.netPay || 0, totalDeductions: entry.totalDeductions || 0 }
      }

      // Normalize deductions/adjustments like the period API so exports match the preview
      const advances = Number(entry.advanceDeductions || 0)
      const loans = Number(entry.loanDeductions || 0)
      const misc = Number(entry.miscDeductions || 0)
      const adjustmentsAsDeductions = Number(totals.adjustmentsAsDeductions || 0)
      const derivedTotalDeductions = advances + loans + misc + adjustmentsAsDeductions
      const serverTotalDeductionsVal = (entry.totalDeductions !== undefined && entry.totalDeductions !== null) ? Number(entry.totalDeductions) : null
      const totalDeductions = (serverTotalDeductionsVal !== derivedTotalDeductions && derivedTotalDeductions !== 0) ? derivedTotalDeductions : (serverTotalDeductionsVal ?? derivedTotalDeductions)

      const additionsTotal = Number(totals.additionsTotal || 0)
      const absenceDeduction = Number(totals.absenceDeduction || 0)

      const grossFromTotals = Number(totals.grossPay ?? Number(entry.grossPay || 0))
  // For export, do NOT subtract deductions here — third-party processor will apply them.
  // Net (incl Benefits) for the export should reflect gross (grossInclBenefits).
  const netComputed = grossFromTotals

      enrichedEntries.push({
        ...entry,
        payrollEntryBenefits: entry.payrollEntryBenefits || [],
        mergedBenefits: totals.combined || [],
        totalBenefitsAmount: Number(totals.benefitsTotal || 0),
        grossPay: grossFromTotals,
        // expose adjustments and derived deduction fields so excelRows picks them up
        adjustmentsTotal: additionsTotal,
        adjustmentsAsDeductions: adjustmentsAsDeductions,
        totalDeductions: totalDeductions,
        absenceDeduction: absenceDeduction,
        // Ensure netPay matches gross for exported file (third-party will apply deductions)
        netPay: Number(totals.netPay ?? netComputed),
        // attach resolved contract and employee objects for generator to use
        contract: contract || null,
        employee: entry.employee || null
      })
    }

    // Ensure enriched entries include derived presentational fields so the generator
    // sees the same workDays, cumulative counts and primaryBusiness shortName as
    // the period API. This prevents missing days/company/job titles in exports.
    try {
      const employeePrimaryBusinessIds = Array.from(new Set(enrichedEntries.map((e: any) => (e.employee?.primaryBusinessId) || (e.primaryBusiness?.id) || null).filter(Boolean))) as string[]
      const empBusinesses = employeePrimaryBusinessIds.length > 0 ? await prisma.business.findMany({ where: { id: { in: employeePrimaryBusinessIds } }, select: { id: true, name: true, type: true } }) : []
      const empBusinessById: Record<string, any> = {}
      for (const b of empBusinesses) empBusinessById[b.id] = b

      const computeShortName = (name?: string) => {
        if (!name) return undefined
        const parts = String(name).split(/\s+/).filter(Boolean)
        if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase()
        const acronym = parts.map(p => p[0]).join('').slice(0, 4).toUpperCase()
        return acronym
      }

      for (const ee of enrichedEntries) {
        try {
          // attach primaryBusiness if we can resolve from employee.primaryBusinessId
          const pbId = ee.employee?.primaryBusinessId || ee.primaryBusiness?.id || null
          ee.primaryBusiness = pbId ? (empBusinessById[pbId] || ee.primaryBusiness || null) : (ee.primaryBusiness || null)
          // If contract contains an explicit company name for pdf generation, prefer that per-entry
          const contractCompanyName = ee.contract?.pdfGenerationData?.companyName || ee.contract?.companyName
          if (contractCompanyName) {
            ee.primaryBusiness = ee.primaryBusiness || {}
            ;(ee.primaryBusiness as any).name = contractCompanyName
            ;(ee.primaryBusiness as any).shortName = computeShortName(contractCompanyName)
          } else if (ee.primaryBusiness && !ee.primaryBusiness.shortName) {
            ;(ee.primaryBusiness as any).shortName = computeShortName(((ee.primaryBusiness) as any).name)
          }

          // Ensure workDays is present: prefer stored positive value, otherwise use month required working days
          const monthRequired = getWorkingDaysInMonth(period.year, period.month)
          ee.workDays = (ee.workDays && Number(ee.workDays) > 0) ? Number(ee.workDays) : monthRequired

          // Ensure cumulative counts are present so preview & excel match
          ee.cumulativeSickDays = (ee.cumulativeSickDays !== undefined && ee.cumulativeSickDays !== null) ? Number(ee.cumulativeSickDays) : Number(ee.sickDays || 0)
          ee.cumulativeLeaveDays = (ee.cumulativeLeaveDays !== undefined && ee.cumulativeLeaveDays !== null) ? Number(ee.cumulativeLeaveDays) : Number(ee.leaveDays || 0)
          ee.cumulativeAbsenceDays = (ee.cumulativeAbsenceDays !== undefined && ee.cumulativeAbsenceDays !== null) ? Number(ee.cumulativeAbsenceDays) : Number(ee.absenceDays || 0)

          // Attach job title from employee or contract fallback for generator
          ee.jobTitle = ee.employee?.jobTitles?.title || ee.contract?.pdfGenerationData?.jobTitle || ee.jobTitle || ee.employeeJobTitle || ''
        } catch (err) {
          // non-fatal
        }
      }
    } catch (attachErr) {
      console.warn('Failed to attach primary business / compute workDays for regenerate:', attachErr)
    }

    let excelRows = enrichedEntries.map(entry => ({
      employeeNumber: entry.employeeNumber,
      employeeName: entry.employeeName,
      jobTitle: entry.jobTitle || '',
      // include primaryBusiness info per entry so generator can pick correct shortName
  primaryBusiness: (entry.primaryBusiness && { name: entry.primaryBusiness.name, shortName: entry.primaryBusiness.shortName }) || (entry.contract && entry.contract.pdfGenerationData && entry.contract.pdfGenerationData.businessName ? { name: entry.contract.pdfGenerationData.businessName, shortName: undefined } : undefined) || (entry.employee && entry.employee.primaryBusinessId ? { name: undefined, shortName: undefined } : undefined),
      employee: entry.employee || null,
      contract: entry.contract || null,
      cumulativeSickDays: entry.cumulativeSickDays ?? entry.sickDays ?? 0,
      cumulativeLeaveDays: entry.cumulativeLeaveDays ?? entry.leaveDays ?? 0,
      cumulativeAbsenceDays: entry.cumulativeAbsenceDays ?? entry.absenceDays ?? 0,
      adjustmentsTotal: Number(entry.adjustmentsTotal || 0),
      adjustmentsAsDeductions: Number(entry.adjustmentsAsDeductions || 0),
      absenceFraction: entry.absenceFraction ?? entry.absenceFractionDays ?? null,
      nationalId: entry.nationalId,
      dateOfBirth: entry.dateOfBirth,
      hireDate: entry.hireDate,
      terminationDate: entry.terminationDate,
      workDays: entry.workDays,
      baseSalary: Number(entry.baseSalary || 0),
      commission: Number(entry.commission || 0),
      overtimePay: Number(entry.overtimePay || 0),
      advanceDeductions: Number(entry.advanceDeductions || 0),
      loanDeductions: Number(entry.loanDeductions || 0),
      miscDeductions: Number(entry.miscDeductions || 0),
      grossPay: Number(entry.grossPay || 0),
      totalDeductions: Number(entry.totalDeductions || 0),
      netPay: Number(entry.netPay || 0),
      mergedBenefits: entry.mergedBenefits || [],
      totalBenefitsAmount: Number(entry.totalBenefitsAmount || 0),
      payrollEntryBenefits: (entry.payrollEntryBenefits || []).map((b: any) => ({ id: b.id, benefitTypeId: b.benefitTypeId, benefitName: b.benefitName, amount: Number(b.amount || 0), isActive: b.isActive }))
    }))

    // Group rows by primary company (prefer shortName, then name) and sort each group by employee last name
    try {
      const rowsByCompany: Map<string, { displayName: string; rows: any[] }> = new Map()
      for (const r of excelRows) {
        const companyDisplay = (r.primaryBusiness && (r.primaryBusiness.shortName || r.primaryBusiness.name)) || ''
        const key = String(companyDisplay || '').trim() || 'ZZZ'
        const normalized = key.toUpperCase()
        if (!rowsByCompany.has(normalized)) rowsByCompany.set(normalized, { displayName: companyDisplay, rows: [] })
        rowsByCompany.get(normalized)!.rows.push(r)
      }

      const sortedCompanyKeys = Array.from(rowsByCompany.keys()).sort()
      const sortedRows: any[] = []
      for (const k of sortedCompanyKeys) {
        const group = rowsByCompany.get(k)!.rows
        group.sort((a, b) => {
          const aLast = (a.employee && a.employee.lastName) || ''
          const bLast = (b.employee && b.employee.lastName) || ''
          return String(aLast).localeCompare(String(bLast))
        })
        sortedRows.push(...group)
      }

      excelRows = sortedRows
    } catch (sortErr) {
      // non-fatal: fall back to unsorted excelRows if grouping/sorting fails
      console.warn('Failed to group/sort excel rows by company/lastName for regenerate:', sortErr)
    }

    // (debug dump removed)

    const excelBuffer = await generatePayrollExcel(
      {
        year: period.year,
        month: period.month,
        periodStart: period.periodStart || new Date(),
        periodEnd: period.periodEnd || new Date(),
        status: period.status
      },
      excelRows as any,
      period.business.name
    )

    // Save new file (overwrite old file)
    const exportsDir = path.join(process.cwd(), 'public', 'exports', 'payroll')
    await mkdir(exportsDir, { recursive: true })
    const fileName = `Payroll_${period.year}_${String(period.month).padStart(2, '0')}_${Date.now()}.xlsx`
    const filePath = path.join(exportsDir, fileName)
    await writeFile(filePath, excelBuffer)

    // Remove old file if exists
    try {
      if (existing.fileName) {
        const oldPath = path.join(process.cwd(), 'public', 'exports', 'payroll', existing.fileName)
        await unlink(oldPath).catch(() => null)
      }
    } catch (e) { /* ignore */ }

    const fileUrl = `/exports/payroll/${fileName}`
    const fileSize = excelBuffer.length

    // Update export record and its timestamps
  const updated = await prisma.payrollExport.update({ where: { id: existing.id }, data: { fileName, fileUrl, fileSize, exportedAt: new Date(), exportedBy: session.user.id } })

  return NextResponse.json({ message: 'Export regenerated', export: updated, fileUrl }, { status: 200 })
  } catch (error) {
    console.error('Regenerate export error:', error)
    return NextResponse.json({ error: 'Failed to regenerate export' }, { status: 500 })
  }
}
