import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkingDaysInMonth, computeTotalsForEntry } from '@/lib/payroll/helpers'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'
import { generatePayrollExcel } from '@/lib/payroll/excel-generator'
import { generateMultiTabPayrollExcel, getYearToDatePeriods, regeneratePeriodEntries } from '@/lib/payroll/multi-tab-excel-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

import { randomBytes } from 'crypto';
// working days helper is imported from shared helpers

// GET /api/payroll/exports
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    const year = searchParams.get('year')

    const where: any = {}

    if (businessId) {
      where.businessId = businessId
    }

    if (year) {
      where.year = parseInt(year)
    }

    const exports = await prisma.payrollExports.findMany({
      where,
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        exporter: {
          select: { id: true, name: true, email: true }
        },
        payrollPeriod: {
          select: {
            id: true,
            year: true,
            month: true,
            status: true
          }
        }
      },
      orderBy: { exportedAt: 'desc' }
    })

    return NextResponse.json(exports)
  } catch (error) {
    console.error('Payroll exports fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll exports' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/exports - Generate Excel export
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user, 'canExportPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      payrollPeriodId,
      businessId,
      generationType,
      includesMonths,
      notes,
      includePastPeriods = false  // NEW: Multi-tab YTD export flag
    } = data

    // Validation
    if (!payrollPeriodId || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify period exists
    const period = await prisma.payrollPeriods.findUnique({
      where: { id: payrollPeriodId },
      include: {
        businesses: {
          select: { name: true, isUmbrellaBusiness: true, umbrellaBusinessName: true }
        },
        payrollEntries: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
                fullName: true,
                nationalId: true,
                dateOfBirth: true,
                hireDate: true,
                terminationDate: true,
                jobTitles: { select: { title: true } },
                primaryBusinessId: true
              }
            },
            payrollEntryBenefits: {
              // Include all persisted payroll entry benefits (including inactive overrides).
              // Previously we filtered to active benefits only which caused a mismatch
              // between `payrollEntryBenefits` and `mergedBenefits` (the latter is
              // computed from persisted + inferred benefits). Returning all persisted
              // benefits keeps the export payload consistent.
              include: {
                benefitType: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { employeeName: 'asc' }
        }
      }
    })

    if (!period) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Period must be approved before export
    if (period.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved payroll periods can be exported' },
        { status: 400 }
      )
    }

    // Calculate totals
    const totalGrossPay = parseFloat(period.totalGrossPay.toString())
    const totalNetPay = parseFloat(period.totalNetPay.toString())
    const employeeCount = period.payrollEntries.length

    // Generate filename
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = monthNames[period.month - 1]

    // NEW: Multi-tab year-to-date export workflow
    if (includePastPeriods) {
      console.log(`Generating multi-tab YTD export for period ${payrollPeriodId}`)

      // Get all approved periods in the same year up to this month
      const ytdPeriods = await getYearToDatePeriods(businessId, payrollPeriodId)

      if (ytdPeriods.length === 0) {
        return NextResponse.json(
          { error: 'No approved periods found for year-to-date export' },
          { status: 400 }
        )
      }

      console.log(`Found ${ytdPeriods.length} periods for YTD export`)

      // Build tabs for each period
      const tabs = []
      const allMonths = []

      for (const p of ytdPeriods) {
        const isCurrentPeriod = p.id === payrollPeriodId
        allMonths.push(p.month)

        // Regenerate entries for past periods, use current data for current period
        const entries = isCurrentPeriod
          ? period.payrollEntries // Current period uses already-loaded data
          : await regeneratePeriodEntries(p.id) // Past periods use regeneration

        tabs.push({
          period: p,
          entries,
          isRegenerated: !isCurrentPeriod
        })

        console.log(`  - ${monthNames[p.month - 1]} ${p.year}: ${entries.length} entries ${isCurrentPeriod ? '(current)' : '(regenerated)'}`)
      }

      // Generate multi-tab Excel
      const exportBusinessName = period.businesses.isUmbrellaBusiness && period.businesses.umbrellaBusinessName
        ? period.businesses.umbrellaBusinessName
        : period.businesses.name

      const excelBuffer = await generateMultiTabPayrollExcel(tabs, exportBusinessName)

      // Save file
      const fileName = `Payroll_YTD_${period.year}_${monthName}_${Date.now()}.xlsx`
      const exportsDir = path.join(process.cwd(), 'public', 'exports', 'payroll')
      await mkdir(exportsDir, { recursive: true })

      const filePath = path.join(exportsDir, fileName)
      await writeFile(filePath, excelBuffer)

      const fileUrl = `/exports/payroll/${fileName}`
      const fileSize = excelBuffer.length

      // Create export record
      const exportRecord = await prisma.$transaction(async (tx) => {
        const newExport = await tx.payrollExport.create({
          data: {
            id: `EX-${nanoid(12)}`,
            payrollPeriodId,
            businessId,
            year: period.year,
            month: period.month,
            fileName,
            fileUrl,
            fileSize,
            format: 'excel',
            includesMonths: allMonths,
            employeeCount,
            totalGrossPay,
            totalNetPay,
            exportedBy: session.user.id,
            generationType: 'year_to_date',
            notes: notes || `Year-to-date export with ${ytdPeriods.length} tabs`,
            exportedAt: new Date()
          },
          include: {
            businesses: {
              select: { id: true, name: true, type: true }
            },
            exporter: {
              select: { id: true, name: true, email: true }
            }
          }
        })

        // Update period status to exported
        await tx.payrollPeriod.update({
          where: { id: payrollPeriodId },
          data: {
            status: 'exported',
            exportedAt: new Date(),
            updatedAt: new Date()
          }
        })

        return newExport
      })

      console.log(`Multi-tab export complete: ${fileName} (${ytdPeriods.length} tabs, ${fileSize} bytes)`)
      return NextResponse.json(exportRecord, { status: 201 })
    }

    // Standard single-month export (existing workflow)
    const fileName = `Payroll_${period.year}_${monthName}_${Date.now()}.xlsx`

    // Prepare entries with mergedBenefits and totals (match period route merging logic)
    const enrichedEntries = []

    // Fetch contracts for employees in this period to merge contract benefits
    const employeeIds = Array.from(new Set(period.payrollEntries.map(e => (e as any).employeeId).filter(Boolean)))
    // Fetch employee primaryBusinessId mapping so we can attach business info to exported rows
    const employeesForBusiness = await prisma.employees.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, primaryBusinessId: true }
    })
    const employeePrimaryBusinessIdMap: Record<string, string | null> = {}
    for (const e of employeesForBusiness) employeePrimaryBusinessIdMap[e.id] = e.primaryBusinessId || null
    const primaryBusinessIds = Array.from(new Set(Object.values(employeePrimaryBusinessIdMap).filter(Boolean))) as string[]
    const businesses = primaryBusinessIds.length > 0 ? await prisma.businesses.findMany({ where: { id: { in: primaryBusinessIds } }, select: { id: true, name: true, type: true } }) : []
    const businessById: Record<string, any> = {}
    for (const b of businesses) businessById[b.id] = b
    // Compute canonical shortName for export consistency
    const computeShortName = (name?: string) => {
      if (!name) return undefined
      const parts = String(name).split(/\s+/).filter(Boolean)
      if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase()
      const acronym = parts.map(p => p[0]).join('').slice(0, 4).toUpperCase()
      return acronym
    }
    for (const id of Object.keys(businessById)) {
      try {
        if (!businessById[id].shortName) businessById[id].shortName = computeShortName(businessById[id].name)
      } catch (err) {
        // ignore
      }
    }
    const contracts = await prisma.employeeContracts.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        employeeId: true,
        pdfGenerationData: true,
        primaryBusinessId: true,
        startDate: true,
        endDate: true,
        jobTitles: { select: { title: true } },
        contract_benefits: { include: { benefitType: { select: { id: true, name: true, type: true, defaultAmount: true } } } }
      }
    })

    const latestContractByEmployee: Record<string, any> = {}
    for (const c of contracts) {
      if (!latestContractByEmployee[c.employeeId]) latestContractByEmployee[c.employeeId] = c
    }

    // Load employee time tracking for this payroll's month/year so we can derive workDays when missing
    const timeTrackings = await prisma.employeeTimeTracking.findMany({
      where: {
        employeeId: { in: employeeIds },
        year: period.year,
        month: period.month
      }
    })

    const timeTrackingByEmployee: Record<string, any> = {}
    for (const t of timeTrackings) {
      timeTrackingByEmployee[t.employeeId] = t
    }

    const monthRequiredWorkDays = getWorkingDaysInMonth(period.year, period.month)

    // Compute cumulative totals (sick/leave/absence) from prior payroll entries for each employee
    let priorPeriodIds: string[] = []
    if (period.periodStart) {
      const priorPeriods = await prisma.payrollPeriods.findMany({
        where: {
          businessId: period.businessId,
          periodStart: { lt: period.periodStart }
        },
        select: { id: true }
      })
      priorPeriodIds = priorPeriods.map(p => p.id)
    }

    let cumulativeByEmployee: Record<string, any> = {}
    if (priorPeriodIds.length > 0) {
      const grouped = await prisma.payrollEntries.groupBy({
        by: ['employeeId'],
        where: { payrollPeriodId: { in: priorPeriodIds } },
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

    for (const entry of period.payrollEntries) {
      const empId = (entry as any).employeeId
      const contract = empId ? latestContractByEmployee[empId] : null

      // derive workDays similar to period route
      const timeTracking = empId ? timeTrackingByEmployee[empId] : null
      const derivedWorkDays = (entry.workDays && entry.workDays > 0)
        ? entry.workDays
        : (timeTracking
          ? ((timeTracking.workDays && timeTracking.workDays > 0) ? timeTracking.workDays : monthRequiredWorkDays)
          : monthRequiredWorkDays)

      const cumulative = empId ? (cumulativeByEmployee[empId] || { cumulativeSickDays: 0, cumulativeLeaveDays: 0, cumulativeAbsenceDays: 0 }) : { cumulativeSickDays: 0, cumulativeLeaveDays: 0, cumulativeAbsenceDays: 0 }

      // Use helper to compute merged benefits and totals
      const totals = await computeTotalsForEntry((entry as any).id)

      const _pbId = empId ? employeePrimaryBusinessIdMap[empId] : null
      let _pb = _pbId ? businessById[_pbId] : null

      // Check if contract has explicit company name - if so, override primaryBusiness
      const contractCompanyName = contract?.pdfGenerationData?.companyName || contract?.companyName
      if (contractCompanyName) {
        _pb = _pb || {}
        _pb.name = contractCompanyName
        _pb.shortName = computeShortName(contractCompanyName)
      } else if (_pb && !_pb.shortName) {
        _pb.shortName = computeShortName(_pb.name)
      }

      // Normalize deductions/adjustments like regenerate export so they match
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
      const grossRaw = grossFromTotals
      const netComputed = grossRaw // Net = Gross (doesn't subtract deductions)

      enrichedEntries.push({
        ...entry,
        payrollEntryBenefits: entry.payrollEntryBenefits || [],
        contract: contract || null,
        employee: (entry as any).employee || null,
        mergedBenefits: totals.combined || [],
        totalBenefitsAmount: Number(totals.benefitsTotal || 0),
        workDays: derivedWorkDays,
        // Include current entry's day counts into the cumulative totals so Excel sees actual values (matches period API)
        cumulativeSickDays: Number(cumulative.cumulativeSickDays || 0) + Number(entry.sickDays || 0),
        cumulativeLeaveDays: Number(cumulative.cumulativeLeaveDays || 0) + Number(entry.leaveDays || 0),
        cumulativeAbsenceDays: Number(cumulative.cumulativeAbsenceDays || 0) + Number(entry.absenceDays || 0),
        // Pass raw grossPay (pre-absence) to generator. The generator will compute Net Gross = gross - absence.
        grossPay: grossRaw,
        absenceDeduction: absenceDeduction,
        netPay: Number(totals.netPay ?? netComputed),
        // expose adjustments and derived deduction fields so excelRows picks them up
        adjustmentsTotal: additionsTotal,
        adjustmentsAsDeductions: adjustmentsAsDeductions,
        totalDeductions: totalDeductions,
        // copy employee name parts if available (these come from included employee select)
        employeeFirstName: (entry as any).employee?.firstName ?? null,
        employeeLastName: (entry as any).employee?.lastName ?? null,
        employeeFullName: (entry as any).employee?.fullName ?? entry.employeeName,
        employeeDateOfBirth: (entry as any).dateOfBirth,
        employeeHireDate: (entry as any).hireDate,
        primaryBusiness: _pb ? { ..._pb, shortName: _pb.shortName } : null,
        // Attach job title from employee or contract fallback for generator
        jobTitle: (entry as any).employee?.jobTitles?.title || contract?.pdfGenerationData?.jobTitle || (entry as any).jobTitle || (entry as any).employeeJobTitle || ''
      })
    }

    // Generate Excel file using enriched entries; include benefits in gross/net
    const excelRows = enrichedEntries.map(entry => ({
      employeeNumber: entry.employeeNumber,
      employeeName: entry.employeeFullName || entry.employeeName,
      employeeFirstName: (entry as any).employeeFirstName || null,
      employeeLastName: (entry as any).employeeLastName || null,
      employeeDateOfBirth: (entry as any).employeeDateOfBirth || null,
      employeeHireDate: (entry as any).employeeHireDate || null,
      jobTitle: (entry as any).jobTitle || '',
      // include primaryBusiness info per entry so generator can pick correct shortName
      primaryBusiness: ((entry as any).primaryBusiness && { name: (entry as any).primaryBusiness.name, shortName: (entry as any).primaryBusiness.shortName }) || ((entry as any).contract?.pdfGenerationData?.businessName ? { name: (entry as any).contract.pdfGenerationData.businessName, shortName: undefined } : undefined),
      employee: (entry as any).employee || null,
      contract: (entry as any).contract || null,
      nationalId: entry.nationalId,
      dateOfBirth: entry.dateOfBirth,
      hireDate: entry.hireDate,
      terminationDate: entry.terminationDate,
      workDays: entry.workDays,
      cumulativeSickDays: (entry as any).cumulativeSickDays || 0,
      cumulativeLeaveDays: (entry as any).cumulativeLeaveDays || 0,
      cumulativeAbsenceDays: (entry as any).cumulativeAbsenceDays || 0,
      baseSalary: parseFloat(entry.baseSalary.toString()),
      commission: parseFloat((entry as any).commission?.toString?.() || '0'),
      livingAllowance: parseFloat(((entry as any).livingAllowance || 0).toString()),
      vehicleAllowance: parseFloat(((entry as any).vehicleAllowance || 0).toString()),
      travelAllowance: parseFloat(((entry as any).travelAllowance || 0).toString()),
      overtimePay: parseFloat(entry.overtimePay.toString()),
      advanceDeductions: parseFloat(entry.advanceDeductions.toString()),
      loanDeductions: parseFloat(entry.loanDeductions.toString()),
      miscDeductions: parseFloat(entry.miscDeductions.toString()),
      adjustmentsTotal: Number((entry as any).adjustmentsTotal || 0),
      adjustmentsAsDeductions: Number((entry as any).adjustmentsAsDeductions || 0),
      absenceDeduction: Number((entry as any).absenceDeduction ?? (entry as any).absenceAmount ?? 0),
      grossPay: parseFloat(entry.grossPay.toString()),
      totalDeductions: parseFloat(entry.totalDeductions.toString()),
      netPay: parseFloat(entry.netPay.toString()),
      // include merged benefits and totals for excel generator
      mergedBenefits: entry.mergedBenefits || [],
      totalBenefitsAmount: entry.totalBenefitsAmount || 0,
      payrollEntryBenefits: (entry.payrollEntryBenefits || []).map(benefit => ({
        id: benefit.id,
        benefitTypeId: benefit.benefitTypeId,
        benefitName: benefit.benefitName,
        amount: parseFloat(benefit.amount.toString()),
        isActive: benefit.isActive
      }))
    }))

    // Group and sort entries by company, then by last name within each company
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
          const aLast = (a.employee && a.employee.lastName) || a.employeeLastName || ''
          const bLast = (b.employee && b.employee.lastName) || b.employeeLastName || ''
          const cmp = String(aLast).localeCompare(String(bLast))
          if (cmp !== 0) return cmp
          // If last names are the same, sort by first name
          const aFirst = (a.employee && a.employee.firstName) || a.employeeFirstName || ''
          const bFirst = (b.employee && b.employee.firstName) || b.employeeFirstName || ''
          return String(aFirst).localeCompare(String(bFirst))
        })
        sortedRows.push(...group)
      }

      // Replace excelRows with sorted rows
      excelRows.splice(0, excelRows.length, ...sortedRows)
    } catch (sortErr) {
      console.warn('Failed to group/sort excel rows by company/lastName for original export:', sortErr)
    }

    // Use umbrella business name for umbrella payrolls, otherwise use regular business name
    const exportBusinessName = period.businesses.isUmbrellaBusiness && period.businesses.umbrellaBusinessName
      ? period.businesses.umbrellaBusinessName
      : period.businesses.name

    const excelBuffer = await generatePayrollExcel(
      {
        year: period.year,
        month: period.month,
        periodStart: period.periodStart || new Date(),
        periodEnd: period.periodEnd || new Date(),
        status: period.status
      },
      excelRows as any,
      exportBusinessName
    )

    // Save file to public/exports directory
    const exportId = nanoid(12)
    const exportsDir = path.join(process.cwd(), 'public', 'exports', 'payroll')

    // Ensure directory exists
    await mkdir(exportsDir, { recursive: true })

    const filePath = path.join(exportsDir, fileName)
    await writeFile(filePath, excelBuffer)

    const fileUrl = `/exports/payroll/${fileName}`
    const fileSize = excelBuffer.length

    // Create export record
    console.log('runtime check prisma.payrollExport exists:', typeof prisma.payrollExport)
    const exportRecord = await prisma.$transaction(async (tx) => {
      console.log('runtime tx keys sample:', Object.keys(tx).slice(0, 30))
      const newExport = await tx.payrollExport.create({
        data: {
          id: `EX-${nanoid(12)}`,
          payrollPeriodId,
          businessId,
          year: period.year,
          month: period.month,
          fileName,
          fileUrl,
          fileSize,
          format: 'excel',
          includesMonths: includesMonths || [period.month],
          employeeCount,
          totalGrossPay,
          totalNetPay,
          exportedBy: session.user.id,
          generationType: generationType || 'single_month',
          notes: notes || null,
          exportedAt: new Date()
        },
        include: {
          businesses: {
            select: { id: true, name: true, type: true }
          },
          exporter: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      // Update period status to exported
      await tx.payrollPeriod.update({
        where: { id: payrollPeriodId },
        data: {
          status: 'exported',
          exportedAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Attach computed shortName to business for API consumers
      if (newExport?.business && !(newExport.business as any).shortName) {
        ; (newExport.business as any).shortName = computeShortName(newExport.businesses.name)
      }

      return newExport
    })

    return NextResponse.json(exportRecord, { status: 201 })
  } catch (error) {
    console.error('Payroll export creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll export' },
      { status: 500 }
    )
  }
}
