import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/payroll/periods/[periodId]/reports/paye
 * Returns PAYE + Aids Levy data for all captured slips in the period.
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
      select: { id: true, year: true, month: true, businesses: { select: { name: true } } },
    })
    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    const slips = await prisma.payrollSlips.findMany({
      where: {
        payrollPeriodId: periodId,
        status: { in: ['CAPTURED', 'DISTRIBUTED'] },
      },
      include: {
        payroll_entries: { select: { employeeName: true, employeeNumber: true, nationalId: true } },
        employees: { select: { fullName: true, employeeNumber: true, nationalId: true } },
      },
      orderBy: { payroll_entries: { employeeName: 'asc' } },
    })

    const rows = slips.map((s) => ({
      employeeName: s.payroll_entries?.employeeName || s.employees?.fullName || '',
      employeeNumber: s.payroll_entries?.employeeNumber || s.employees?.employeeNumber || '',
      nationalId: s.payroll_entries?.nationalId || s.employees?.nationalId || '',
      totalEarnings: Number(s.totalEarnings || 0),
      payeTax: Number(s.payeTax || 0),
      aidsLevy: Number(s.aidsLevy || 0),
    }))

    const totals = {
      totalEarnings: rows.reduce((sum, r) => sum + r.totalEarnings, 0),
      payeTax: rows.reduce((sum, r) => sum + r.payeTax, 0),
      aidsLevy: rows.reduce((sum, r) => sum + r.aidsLevy, 0),
    }

    return NextResponse.json({
      success: true,
      period: { year: period.year, month: period.month, businessName: period.businesses?.name },
      rows,
      totals,
    })
  } catch (error) {
    console.error('Error generating PAYE report:', error)
    return NextResponse.json({ error: 'Failed to generate PAYE report' }, { status: 500 })
  }
}
