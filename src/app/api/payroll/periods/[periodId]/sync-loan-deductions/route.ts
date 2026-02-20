import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/payroll/periods/[periodId]/sync-loan-deductions
 * Checks whether any entries have stale loan deductions (read-only — no changes made).
 * Returns { needsSync: boolean, affectedCount: number }
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { periodId } = await params

    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, status: true },
    })

    if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })

    // Approved/closed periods are locked — no sync ever needed
    if (period.status === 'approved' || period.status === 'exported' || period.status === 'closed') {
      return NextResponse.json({ needsSync: false, affectedCount: 0 })
    }

    const entries = await prisma.payrollEntries.findMany({
      where: { payrollPeriodId: periodId, employeeId: { not: null } },
      select: { employeeId: true, loanDeductions: true },
    })

    if (entries.length === 0) {
      return NextResponse.json({ needsSync: false, affectedCount: 0 })
    }

    const employeeIds = entries.map((e: any) => e.employeeId).filter(Boolean)
    const activeLoans = await prisma.accountOutgoingLoans.findMany({
      where: {
        recipientEmployeeId: { in: employeeIds },
        status: 'ACTIVE',
        paymentType: 'PAYROLL_DEDUCTION',
      },
      select: { recipientEmployeeId: true, monthlyInstallment: true, remainingBalance: true },
    })

    const loanMap = new Map(
      activeLoans.map((l: any) => [
        l.recipientEmployeeId,
        Math.min(Number(l.monthlyInstallment ?? 0), Number(l.remainingBalance ?? 0)),
      ])
    )

    let affectedCount = 0
    for (const entry of entries) {
      const correct = loanMap.get(entry.employeeId!) ?? 0
      const stored = Number(entry.loanDeductions)
      if (correct !== stored) affectedCount++
    }

    return NextResponse.json({ needsSync: affectedCount > 0, affectedCount })
  } catch (error) {
    console.error('Error checking loan deduction sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/payroll/periods/[periodId]/sync-loan-deductions
 * Recalculates loanDeductions on all entries in the period from active loans.
 * Safe to run on draft/in_progress/review periods before approval.
 * Does NOT create deposits or record repayments — that still happens at approval.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManagePayroll') && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { periodId } = await params

    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, status: true },
    })

    if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })

    if (period.status === 'approved' || period.status === 'exported' || period.status === 'closed') {
      return NextResponse.json({ error: 'Cannot sync loan deductions on an approved/closed period' }, { status: 400 })
    }

    // Get all entries for this period
    const entries = await prisma.payrollEntries.findMany({
      where: { payrollPeriodId: periodId, employeeId: { not: null } },
      select: { id: true, employeeId: true, loanDeductions: true, grossPay: true, totalDeductions: true },
    })

    if (entries.length === 0) {
      return NextResponse.json({ success: true, updated: 0, message: 'No entries to sync' })
    }

    // Batch-fetch active PAYROLL_DEDUCTION loans for all employees in this period
    const employeeIds = entries.map((e: any) => e.employeeId).filter(Boolean)
    const activeLoans = await prisma.accountOutgoingLoans.findMany({
      where: {
        recipientEmployeeId: { in: employeeIds },
        status: 'ACTIVE',
        paymentType: 'PAYROLL_DEDUCTION',
      },
      select: { recipientEmployeeId: true, monthlyInstallment: true, remainingBalance: true },
    })

    const loanMap = new Map(
      activeLoans.map((l: any) => [
        l.recipientEmployeeId,
        Math.min(Number(l.monthlyInstallment ?? 0), Number(l.remainingBalance ?? 0)),
      ])
    )

    let updated = 0

    for (const entry of entries) {
      const correctDeduction = loanMap.get(entry.employeeId!) ?? 0
      const storedDeduction = Number(entry.loanDeductions)

      if (correctDeduction === storedDeduction) continue // already correct

      const correctedTotalDeductions = Number(entry.totalDeductions) - storedDeduction + correctDeduction
      const correctedNetPay = Number(entry.grossPay) - correctedTotalDeductions

      await prisma.payrollEntries.update({
        where: { id: entry.id },
        data: {
          loanDeductions: correctDeduction,
          totalDeductions: correctedTotalDeductions,
          netPay: correctedNetPay,
        },
      })
      updated++
    }

    // Recalculate period totals
    if (updated > 0) {
      const allEntries = await prisma.payrollEntries.findMany({
        where: { payrollPeriodId: periodId },
        select: { grossPay: true, totalDeductions: true, netPay: true },
      })
      const totalGrossPay = allEntries.reduce((s: number, e: any) => s + Number(e.grossPay), 0)
      const totalDeductions = allEntries.reduce((s: number, e: any) => s + Number(e.totalDeductions), 0)
      const totalNetPay = allEntries.reduce((s: number, e: any) => s + Number(e.netPay), 0)

      await prisma.payrollPeriods.update({
        where: { id: periodId },
        data: { totalGrossPay, totalDeductions, totalNetPay },
      })
    }

    return NextResponse.json({
      success: true,
      updated,
      message: updated > 0
        ? `Updated loan deductions for ${updated} employee${updated !== 1 ? 's' : ''}`
        : 'All loan deductions are already up to date',
    })
  } catch (error) {
    console.error('Error syncing loan deductions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
