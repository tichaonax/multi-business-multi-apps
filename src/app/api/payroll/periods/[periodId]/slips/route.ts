import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/payroll/periods/[periodId]/slips
 * Returns all PayrollSlips for the period, including PayrollEntry data for reconciliation.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, month: true, year: true },
    })
    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })
    }

    const slips = await prisma.payrollSlips.findMany({
      where: { payrollPeriodId: periodId },
      include: {
        payroll_entries: {
          select: {
            id: true,
            employeeId: true,
            employeeName: true,
            employeeNumber: true,
            grossPay: true,
            loanDeductions: true,
            advanceDeductions: true,
            miscDeductions: true,
            totalDeductions: true,
            payeAmount: true,
            aidsLevy: true,
            nssaEmployee: true,
          },
        },
        employees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            nationalId: true,
          },
        },
      },
      orderBy: { payroll_entries: { employeeName: 'asc' } },
    })

    // Fetch approved per diem for this period, keyed by employeeId
    const employeeIds = slips.map(s => s.employeeId).filter(Boolean) as string[]
    const perDiemRows = await prisma.perDiemEntries.groupBy({
      by: ['employeeId'],
      where: {
        approvalStatus: 'approved',
        payrollYear: period.year,
        payrollMonth: period.month,
        ...(employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {}),
      },
      _sum: { amount: true },
    })
    const perDiemByEmployee: Record<string, number> = {}
    for (const row of perDiemRows) {
      if (row.employeeId) perDiemByEmployee[row.employeeId] = Number(row._sum.amount ?? 0)
    }

    // Compute live gross for each entry (includes benefits + per diem)
    const entryGrossMap: Record<string, number> = {}
    await Promise.all(slips.map(async s => {
      if (!s.payrollEntryId) return
      const { grossPay } = await computeTotalsForEntry(s.payrollEntryId, period.month)
      const pd = s.employeeId ? (perDiemByEmployee[s.employeeId] || 0) : 0
      entryGrossMap[s.payrollEntryId] = grossPay + pd
    }))

    return NextResponse.json({
      success: true,
      slips: slips.map((s: typeof slips[number]) => ({
        id: s.id,
        payrollEntryId: s.payrollEntryId,
        employeeId: s.employeeId,
        employeeName: s.payroll_entries?.employeeName || s.employees?.fullName || '',
        employeeNumber: s.payroll_entries?.employeeNumber || s.employees?.employeeNumber || '',
        nationalId: s.employees?.nationalId || '',
        status: s.status,
        // Earnings
        totalEarnings: s.totalEarnings ? Number(s.totalEarnings) : null,
        entryGrossPay: s.payrollEntryId ? (entryGrossMap[s.payrollEntryId] ?? (s.payroll_entries ? Number(s.payroll_entries.grossPay || 0) : null)) : null,
        // Statutory deductions
        payeTax: s.payeTax ? Number(s.payeTax) : null,
        aidsLevy: s.aidsLevy ? Number(s.aidsLevy) : null,
        nssaEmployee: s.nssaEmployee ? Number(s.nssaEmployee) : null,
        entryPayeTax: s.payroll_entries ? Number(s.payroll_entries.payeAmount || 0) : null,
        entryAidsLevy: s.payroll_entries ? Number(s.payroll_entries.aidsLevy || 0) : null,
        entryNssaEmployee: s.payroll_entries ? Number(s.payroll_entries.nssaEmployee || 0) : null,
        necEmployee: s.necEmployee ? Number(s.necEmployee) : null,
        netPayRound: s.netPayRound ? Number(s.netPayRound) : null,
        // Employee deductions (pre-filled from entry)
        loanDeductions: s.loanDeductions ? Number(s.loanDeductions) : null,
        advanceDeductions: s.advanceDeductions ? Number(s.advanceDeductions) : null,
        miscDeductions: s.miscDeductions ? Number(s.miscDeductions) : null,
        entryLoanDeductions: s.payroll_entries ? Number(s.payroll_entries.loanDeductions || 0) : null,
        entryAdvanceDeductions: s.payroll_entries ? Number(s.payroll_entries.advanceDeductions || 0) : null,
        entryMiscDeductions: s.payroll_entries ? Number(s.payroll_entries.miscDeductions || 0) : null,
        otherDeductions: s.otherDeductions,
        totalDeductions: s.totalDeductions ? Number(s.totalDeductions) : null,
        // Employer contributions
        wcif: s.wcif ? Number(s.wcif) : null,
        necCompanyContrib: s.necCompanyContrib ? Number(s.necCompanyContrib) : null,
        otherContributions: s.otherContributions,
        // Result
        nettPay: s.nettPay ? Number(s.nettPay) : null,
        // Header fields
        normalHours: s.normalHours ? Number(s.normalHours) : null,
        leaveDaysDue: s.leaveDaysDue ? Number(s.leaveDaysDue) : null,
        payPoint: s.payPoint,
        costCode: s.costCode,
        notes: s.notes,
        // Timestamps
        capturedAt: s.capturedAt,
        capturedBy: s.capturedBy,
        distributedAt: s.distributedAt,
        distributedBy: s.distributedBy,
      })),
    })
  } catch (error) {
    console.error('Error fetching payroll slips:', error)
    return NextResponse.json({ error: 'Failed to fetch payroll slips' }, { status: 500 })
  }
}
