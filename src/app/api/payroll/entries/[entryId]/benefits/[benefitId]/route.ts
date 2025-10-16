import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ entryId: string; benefitId: string }>
}

// PUT /api/payroll/entries/[entryId]/benefits/[benefitId] - Update benefit (toggle active, change amount, add reason)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entryId, benefitId } = await params

    if (!hasPermission(session.user, 'canEditPayrollEntry')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const { isActive, deactivatedReason, amount } = data

    // Verify benefit exists
    const benefit = await prisma.payrollEntryBenefits.findUnique({
      where: { id: benefitId },
      include: {
        payroll_entries: {
          include: { payroll_periods: true }
        }
      }
    })

    if (!benefit) {
      return NextResponse.json(
        { error: 'Benefit not found' },
        { status: 404 }
      )
    }

    if (benefit.payrollEntryId !== entryId) {
      return NextResponse.json(
        { error: 'Benefit does not belong to this entry' },
        { status: 400 }
      )
    }

    // Check if period is editable
    if (benefit.payroll_entries.payroll_periods.status === 'exported' || benefit.payroll_entries.payroll_periods.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot modify benefits in exported or closed payroll period' },
        { status: 400 }
      )
    }

    // Update benefit in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedBenefit = await tx.payrollEntryBenefit.update({
        where: { id: benefitId },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(deactivatedReason !== undefined && { deactivatedReason }),
          ...(amount !== undefined && { amount: parseFloat(amount) }),
          updatedAt: new Date()
        },
        include: {
          benefit_types: true
        }
      })

      // Recalculate totals
      await recalculateEntryTotals(tx, entryId)

      return updatedBenefit
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update payroll entry benefit error:', error)
    return NextResponse.json(
      { error: 'Failed to update benefit' },
      { status: 500 }
    )
  }
}

// DELETE /api/payroll/entries/[entryId]/benefits/[benefitId] - Delete manual benefit
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entryId, benefitId } = await params

    if (!hasPermission(session.user, 'canEditPayrollEntry')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify benefit exists
    const benefit = await prisma.payrollEntryBenefits.findUnique({
      where: { id: benefitId },
      include: {
        payroll_entries: {
          include: { payroll_periods: true }
        }
      }
    })

    if (!benefit) {
      return NextResponse.json(
        { error: 'Benefit not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of manual benefits
    if (benefit.source !== 'manual') {
      return NextResponse.json(
        { error: 'Can only delete manually added benefits. Use deactivate for contract benefits.' },
        { status: 400 }
      )
    }

    // Check if period is editable
    if (benefit.payroll_entries.payroll_periods.status === 'exported' || benefit.payroll_entries.payroll_periods.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot delete benefits from exported or closed payroll period' },
        { status: 400 }
      )
    }

    // Delete benefit in transaction
    await prisma.$transaction(async (tx) => {
      await tx.payrollEntryBenefit.delete({
        where: { id: benefitId }
      })

      // Recalculate totals
      await recalculateEntryTotals(tx, entryId)
    })

    return NextResponse.json({ message: 'Benefit deleted successfully' })
  } catch (error) {
    console.error('Delete payroll entry benefit error:', error)
    return NextResponse.json(
      { error: 'Failed to delete benefit' },
      { status: 500 }
    )
  }
}

// Helper function to recalculate entry totals
async function recalculateEntryTotals(tx: any, entryId: string) {
  const entry = await tx.payroll_entries.findUnique({
    where: { id: entryId },
    include: {
      PayrollEntryBenefits: true
    }
  })

  if (!entry) return

  // Calculate benefits total (only active benefits)
  const benefitsTotal = entry.payroll_entry_benefits
    .filter((b: any) => b.isActive)
    .reduce((sum: number, b: any) => sum + Number(b.amount), 0)

  // Calculate gross pay
  const baseSalary = Number(entry.baseSalary)
  const commission = Number(entry.commission)
  const overtimePay = Number(entry.overtimePay)
  const adjustmentsTotal = Number(entry.adjustmentsTotal)

  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + adjustmentsTotal

  // Calculate net pay
  const totalDeductions = Number(entry.totalDeductions)
  const netPay = grossPay - totalDeductions

  // Update entry
  await tx.payroll_entries.update({
    where: { id: entryId },
    data: {
      benefitsTotal,
      grossPay,
      netPay,
      updatedAt: new Date()
    }
  })

  // Update period totals
  const allEntries = await tx.payroll_entries.findMany({
    where: { payrollPeriodId: entry.payrollPeriodId }
  })

  const periodTotals = allEntries.reduce(
    (acc: any, e: any) => ({
      totalGrossPay: acc.totalGrossPay + Number(e.grossPay),
      totalDeductions: acc.totalDeductions + Number(e.totalDeductions),
      totalNetPay: acc.totalNetPay + Number(e.netPay)
    }),
    { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
  )

  await tx.payroll_periods.update({
    where: { id: entry.payrollPeriodId },
    data: {
      totalGrossPay: periodTotals.totalGrossPay,
      totalDeductions: periodTotals.totalDeductions,
      totalNetPay: periodTotals.totalNetPay,
      updatedAt: new Date()
    }
  })
}
