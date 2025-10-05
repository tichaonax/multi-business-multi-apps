import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkingDaysInMonth, computeTotalsForEntry } from '@/lib/payroll/helpers'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'
import { generatePayrollExcel } from '@/lib/payroll/excel-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    const exports = await prisma.payrollExport.findMany({
      where,
      include: {
        business: {
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
      notes
    } = data

    // Validation
    if (!payrollPeriodId || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify period exists
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
      include: {
        business: {
          select: { name: true }
        },
        payrollEntries: {
          include: {
            employee: {
              select: {
                employeeNumber: true,
                fullName: true,
                nationalId: true,
                dateOfBirth: true,
                hireDate: true,
                terminationDate: true
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
    const fileName = `Payroll_${period.year}_${monthName}_${Date.now()}.xlsx`

    // Prepare entries with mergedBenefits and totals (match period route merging logic)
    const enrichedEntries = []

    // Fetch contracts for employees in this period to merge contract benefits
    const employeeIds = Array.from(new Set(period.payrollEntries.map(e => (e as any).employeeId).filter(Boolean)))
    const contracts = await prisma.employeeContract.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: { startDate: 'desc' },
      include: { contract_benefits: { include: { benefitType: { select: { id: true, name: true, type: true, defaultAmount: true } } } } }
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
      const priorPeriods = await prisma.payrollPeriod.findMany({
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
      const grouped = await prisma.payrollEntry.groupBy({
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

      enrichedEntries.push({
        ...entry,
        payrollEntryBenefits: entry.payrollEntryBenefits || [],
        contract: contract || null,
        mergedBenefits: totals.combined || [],
        totalBenefitsAmount: Number(totals.benefitsTotal || 0),
        workDays: derivedWorkDays,
        cumulativeSickDays: cumulative.cumulativeSickDays,
        cumulativeLeaveDays: cumulative.cumulativeLeaveDays,
        cumulativeAbsenceDays: cumulative.cumulativeAbsenceDays,
        grossPay: Number(totals.grossPay ?? Number(entry.grossPay || 0)),
        netPay: Number(totals.netPay ?? Number(entry.netPay || 0))
      })
    }

    // Generate Excel file using enriched entries; include benefits in gross/net
    const excelRows = enrichedEntries.map(entry => ({
      employeeNumber: entry.employeeNumber,
      employeeName: entry.employeeName,
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
          business: {
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

    return NextResponse.json(exportRecord, { status: 201 })
  } catch (error) {
    console.error('Payroll export creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll export' },
      { status: 500 }
    )
  }
}
