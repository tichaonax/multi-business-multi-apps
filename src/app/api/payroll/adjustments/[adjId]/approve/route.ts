import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

// POST /api/payroll/adjustments/[adjId]/approve
// Body: { action: 'approve' | 'reject', overrideAmount?: number }
//
// Approves or rejects a pending clock-in adjustment (overtime_credit / overtime).
// On approve: sets status = 'approved', optionally overrides amount, recalcs entry.
// On reject:  deletes the record, recalcs entry.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ adjId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user, 'canEditPayrollEntry')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { adjId } = await params
  const body = await req.json()
  const { action, overrideAmount } = body

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 })
  }

  const adj = await prisma.payrollAdjustments.findUnique({ where: { id: adjId } })
  if (!adj) return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 })

  if ((adj as any).status !== 'pending') {
    return NextResponse.json({ error: 'Adjustment is not pending' }, { status: 400 })
  }

  const entryId = (adj as any).payrollEntryId

  if (action === 'reject') {
    await prisma.payrollAdjustments.delete({ where: { id: adjId } })
  } else {
    // approve
    const updateData: any = { status: 'approved' }
    if (overrideAmount != null && !isNaN(Number(overrideAmount))) {
      updateData.amount = Number(overrideAmount)
    }
    await prisma.payrollAdjustments.update({ where: { id: adjId }, data: updateData })
  }

  // Recalculate the payroll entry totals
  if (entryId) await recalcEntry(entryId)

  return NextResponse.json({ success: true, action })
}

async function recalcEntry(entryId: string) {
  const entry = await prisma.payrollEntries.findUnique({
    where: { id: entryId },
    include: { payroll_entry_benefits: true, payroll_adjustments: true, payroll_periods: true },
  })
  if (!entry) return

  const benefitsTotal = (entry.payroll_entry_benefits || [])
    .filter((b: any) => b.isActive)
    .reduce((s: number, b: any) => s + Number(b.amount), 0)

  let additionsTotal = 0
  let deductionsTotal = 0
  for (const a of entry.payroll_adjustments || []) {
    if ((a as any).status === 'pending') continue  // exclude pending items from totals
    const amt = Number((a as any).amount || 0)
    if (amt >= 0) additionsTotal += amt
    else deductionsTotal += Math.abs(amt)
  }

  const baseSalary = Number(entry.baseSalary || 0)
  const commission = Number(entry.commission || 0)
  const overtimePay = Number(entry.overtimePay || 0)
  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal
  const advances = Number(entry.advanceDeductions || 0)
  const loans = Number(entry.loanDeductions || 0)
  const misc = Number(entry.miscDeductions || 0)
  const totalDeductions = advances + loans + misc + deductionsTotal
  const netPay = grossPay - totalDeductions

  await prisma.payrollEntries.update({
    where: { id: entryId },
    data: { benefitsTotal, adjustmentsTotal: additionsTotal, grossPay, netPay, totalDeductions, updatedAt: new Date() },
  })

  if (entry.payrollPeriodId) {
    const allEntries = await prisma.payrollEntries.findMany({ where: { payrollPeriodId: entry.payrollPeriodId } })
    const pt = allEntries.reduce(
      (acc: any, e: any) => ({
        totalGrossPay: acc.totalGrossPay + Number(e.grossPay),
        totalDeductions: acc.totalDeductions + Number(e.totalDeductions),
        totalNetPay: acc.totalNetPay + Number(e.netPay),
      }),
      { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
    )
    await prisma.payrollPeriods.update({
      where: { id: entry.payrollPeriodId },
      data: { totalGrossPay: pt.totalGrossPay, totalDeductions: pt.totalDeductions, totalNetPay: pt.totalNetPay, updatedAt: new Date() },
    })
  }
}
