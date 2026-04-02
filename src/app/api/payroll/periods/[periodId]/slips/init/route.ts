import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'
import { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * POST /api/payroll/periods/[periodId]/slips/init
 * Creates or refreshes PENDING PayrollSlips records for every PayrollEntry in the period.
 * Uses computeTotalsForEntry to get the correct gross (same as the exported spreadsheet),
 * not the potentially stale entry.grossPay from the database.
 * - Existing PENDING slips: refreshes totalEarnings + deduction pre-fills
 * - Existing CAPTURED/DISTRIBUTED slips: skipped (don't overwrite entered data)
 * - No slip yet: creates PENDING with correct values
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const entries = await prisma.payrollEntries.findMany({
      where: { payrollPeriodId: periodId },
      select: {
        id: true,
        employeeId: true,
        loanDeductions: true,
        advanceDeductions: true,
        miscDeductions: true,
        payroll_slip: { select: { id: true, status: true } },
      },
    })

    // Fetch approved per diem for this period, keyed by employeeId
    const employeeIds = entries.map(e => e.employeeId).filter(Boolean) as string[]
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

    let created = 0
    let refreshed = 0
    let skipped = 0

    for (const entry of entries) {
      if (!entry.employeeId) { skipped++; continue }

      const slip = entry.payroll_slip

      // Skip already-captured slips — don't overwrite entered data
      if (slip && ['CAPTURED', 'DISTRIBUTED'].includes(slip.status)) {
        skipped++
        continue
      }

      // Compute correct gross using the same logic as the exported spreadsheet
      const { grossPay: grossFromEntry } = await computeTotalsForEntry(entry.id, period.month)
      const perDiem = entry.employeeId ? (perDiemByEmployee[entry.employeeId] || 0) : 0
      const grossPay = grossFromEntry + perDiem

      if (slip) {
        // Refresh existing PENDING slip with correct totalEarnings
        await prisma.payrollSlips.update({
          where: { id: slip.id },
          data: {
            totalEarnings: grossPay,
            loanDeductions: entry.loanDeductions,
            advanceDeductions: entry.advanceDeductions,
            miscDeductions: entry.miscDeductions,
            updatedAt: new Date(),
          },
        })
        refreshed++
      } else {
        await prisma.payrollSlips.create({
          data: {
            payrollPeriodId: periodId,
            payrollEntryId: entry.id,
            employeeId: entry.employeeId,
            totalEarnings: grossPay,
            loanDeductions: entry.loanDeductions,
            advanceDeductions: entry.advanceDeductions,
            miscDeductions: entry.miscDeductions,
            status: 'PENDING',
          },
        })
        created++
      }
    }

    return NextResponse.json({ success: true, created, refreshed, skipped })
  } catch (error) {
    console.error('Error initializing payroll slips:', error)
    return NextResponse.json({ error: 'Failed to initialize payroll slips' }, { status: 500 })
  }
}
