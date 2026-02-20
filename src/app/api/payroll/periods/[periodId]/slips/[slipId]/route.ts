import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string; slipId: string }>
}

/**
 * PUT /api/payroll/periods/[periodId]/slips/[slipId]
 * Updates a single PayrollSlip with captured data. Sets status = CAPTURED.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slipId } = await params
    const body = await request.json()

    const {
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
    } = body

    const slip = await prisma.payrollSlips.update({
      where: { id: slipId },
      data: {
        totalEarnings: totalEarnings != null ? totalEarnings : undefined,
        payeTax: payeTax != null ? payeTax : undefined,
        aidsLevy: aidsLevy != null ? aidsLevy : undefined,
        nssaEmployee: nssaEmployee != null ? nssaEmployee : undefined,
        necEmployee: necEmployee != null ? necEmployee : undefined,
        netPayRound: netPayRound != null ? netPayRound : undefined,
        loanDeductions: loanDeductions != null ? loanDeductions : undefined,
        advanceDeductions: advanceDeductions != null ? advanceDeductions : undefined,
        miscDeductions: miscDeductions != null ? miscDeductions : undefined,
        otherDeductions: otherDeductions !== undefined ? otherDeductions : undefined,
        totalDeductions: totalDeductions != null ? totalDeductions : undefined,
        wcif: wcif != null ? wcif : undefined,
        necCompanyContrib: necCompanyContrib != null ? necCompanyContrib : undefined,
        otherContributions: otherContributions !== undefined ? otherContributions : undefined,
        nettPay: nettPay != null ? nettPay : undefined,
        normalHours: normalHours != null ? normalHours : undefined,
        leaveDaysDue: leaveDaysDue != null ? leaveDaysDue : undefined,
        payPoint: payPoint !== undefined ? payPoint : undefined,
        costCode: costCode !== undefined ? costCode : undefined,
        notes: notes !== undefined ? notes : undefined,
        status: 'CAPTURED',
        capturedAt: new Date(),
        capturedBy: user.id,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, slip })
  } catch (error) {
    console.error('Error updating payroll slip:', error)
    return NextResponse.json({ error: 'Failed to update payroll slip' }, { status: 500 })
  }
}
