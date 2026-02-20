import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'

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
      select: { id: true, month: true },
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
      const { grossPay } = await computeTotalsForEntry(entry.id, period.month)

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
