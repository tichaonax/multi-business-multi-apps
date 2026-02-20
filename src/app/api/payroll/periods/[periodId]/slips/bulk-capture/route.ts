import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * POST /api/payroll/periods/[periodId]/slips/bulk-capture
 * Saves captured data for multiple slips at once. Sets status = CAPTURED on each.
 * Body: { slips: Array<{ slipId, totalEarnings, payeTax, aidsLevy, ... }> }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slips } = await request.json()
    if (!Array.isArray(slips) || slips.length === 0) {
      return NextResponse.json({ error: 'slips array required' }, { status: 400 })
    }

    const now = new Date()
    let updated = 0

    for (const slip of slips) {
      const {
        slipId,
        totalEarnings,
        payeTax,
        aidsLevy,
        nssaEmployee,
        necEmployee,
        netPayRound,
        loanDeductions,
        advanceDeductions,
        miscDeductions,
        otherDeductions,
        totalDeductions,
        wcif,
        necCompanyContrib,
        otherContributions,
        nettPay,
        normalHours,
        leaveDaysDue,
        payPoint,
        costCode,
        notes,
      } = slip

      if (!slipId) continue

      await prisma.payrollSlips.update({
        where: { id: slipId },
        data: {
          totalEarnings: totalEarnings ?? undefined,
          payeTax: payeTax ?? undefined,
          aidsLevy: aidsLevy ?? undefined,
          nssaEmployee: nssaEmployee ?? undefined,
          necEmployee: necEmployee ?? undefined,
          netPayRound: netPayRound ?? undefined,
          loanDeductions: loanDeductions ?? undefined,
          advanceDeductions: advanceDeductions ?? undefined,
          miscDeductions: miscDeductions ?? undefined,
          otherDeductions: otherDeductions !== undefined ? otherDeductions : undefined,
          totalDeductions: totalDeductions ?? undefined,
          wcif: wcif ?? undefined,
          necCompanyContrib: necCompanyContrib ?? undefined,
          otherContributions: otherContributions !== undefined ? otherContributions : undefined,
          nettPay: nettPay ?? undefined,
          normalHours: normalHours ?? undefined,
          leaveDaysDue: leaveDaysDue ?? undefined,
          payPoint: payPoint !== undefined ? payPoint : undefined,
          costCode: costCode !== undefined ? costCode : undefined,
          notes: notes !== undefined ? notes : undefined,
          status: 'CAPTURED',
          capturedAt: now,
          capturedBy: user.id,
          updatedAt: now,
        },
      })
      updated++
    }

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('Error bulk capturing payroll slips:', error)
    return NextResponse.json({ error: 'Failed to save payroll slips' }, { status: 500 })
  }
}
